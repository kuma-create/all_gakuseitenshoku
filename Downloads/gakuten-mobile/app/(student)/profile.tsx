// app/(student)/profile.tsx
// Mobile Student Profile – minimal RN version with autosave & tabs
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AppState } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../src/lib/supabase"; // <- keep relative to avoid alias issues
// import type { Database } from "../../src/lib/supabase/types"; // (optional) if types exist

// ---- options (same as web) ----
const INDUSTRY_OPTIONS = [
  "IT・通信","メーカー","商社","金融","コンサルティング","マスコミ",
  "広告・マーケティング","サービス","小売・流通","医療・福祉",
  "教育","公務員",
] as const;

const JOB_TYPE_OPTIONS = [
  "エンジニア","営業","経営","経営企画","企画","マーケティング","広報","コンサルタント","研究・開発",
  "デザイナー","総務・人事","経理・財務","生産管理","品質管理","物流","販売・サービス","その他"
] as const;

const LOCATION_OPTIONS = [
  "東京","神奈川","千葉","埼玉","大阪","京都","兵庫","奈良",
  "愛知","福岡","北海道","宮城","広島","沖縄","海外","リモート可",
] as const;

const WORK_PREF_OPTIONS = [
  "フレックスタイム制","リモートワーク可","副業可","残業少なめ",
  "土日祝休み","有給取得しやすい","育児支援制度あり","研修制度充実",
] as const;

const WORK_STYLE_CHOICES = ["正社員","インターン","アルバイト","契約社員"] as const;

// ---- helpers ----
const isFilled = (v: unknown) => Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";
const pct = (arr: unknown[]) => Math.round((arr.filter(isFilled).length / Math.max(arr.length,1)) * 100);
const toggleIn = (arr: string[] | null | undefined, v: string) => {
  const base = Array.isArray(arr) ? arr : [];
  return base.includes(v) ? base.filter(x => x !== v) : [...base, v];
};

// ---- component ----
export default function StudentProfileMobile() {
  const router = useRouter();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"basic" | "pr" | "pref">("basic");
  const [profile, setProfile] = useState<any>({});

  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);
  // --- Track編集中のフィールド ---
  const activeFieldRef = useRef<string | null>(null);
  const saveSeqRef = useRef(0);
  const lastSavedKeyRef = useRef<string>("");
  // Avoid losing first character when using IME (JP/KR/CN):
  // we defer autosave until compositionend.
  const composingRef = useRef(false);
  const setActiveField = useCallback((k: string | null) => { activeFieldRef.current = k; }, []);

  // Keys that are allowed to be sent to student_profiles (server-managed keys excluded)
  const UPDATABLE_KEYS = [
    'user_id','last_name','first_name','last_name_kana','first_name_kana','phone','birth_date',
    'postal_code','prefecture','city','address_line','hometown',
    'university','faculty','department','admission_month','graduation_month','research_theme',
    'pr_title','about','pr_text','strength1','strength2','strength3',
    'work_style','salary_range','desired_positions','work_style_options','preferred_industries','desired_locations',
    'preference_note','gender'
  ] as const;

  // Stable stringify (sorted keys) to dedupe saves reliably
  const stableStringify = (obj: any) => {
    const out: any = {};
    Object.keys(obj).sort().forEach(k => { out[k] = obj[k]; });
    return JSON.stringify(out);
  };

  // ---- focus management ----
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const register = useCallback((name: string) => (el: TextInput | null) => {
    inputRefs.current[name] = el;
  }, []);

  const focusNext = useCallback((current: string) => {
    const orderBasic = [
      "last_name","first_name","last_name_kana","first_name_kana",
      "phone","birth_date","postal_code","prefecture","city",
      "address_line","hometown",
      // 学歴
      "university","faculty","department","graduation_month","research_theme",
    ];
    const orderPR = [
      "pr_title","about","pr_text","strength1","strength2","strength3"
    ];
    const orderPref = [
      "work_style","salary_range","preference_note"
    ];
    const order = tab === "basic" ? orderBasic : tab === "pr" ? orderPR : orderPref;
    const idx = order.indexOf(current);
    if (idx >= 0 && idx < order.length - 1) {
      const nextName = order[idx + 1];
      const next = inputRefs.current[nextName];
      next?.focus?.();
    }
  }, [tab]);

  // load
  useEffect(() => {
    (async () => {
      try {
        const { data: { session }, error: se } = await supabase.auth.getSession();
        if (se) throw se;
        if (!session?.user) {
          router.replace("/auth/login");
          return;
        }
        const user_id = session.user.id;
        const { data, error } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", user_id)
          .maybeSingle();
        if (error) throw error;
        setProfile(data ?? { user_id });
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const save = useCallback(async () => {
    const mySeq = ++saveSeqRef.current;
    try {
      setSaving(true);
      // do not save while date fields are partially typed (prevents flicker & value reset)
      const isIncomplete = (v: any) => {
        if (typeof v !== "string") return false;
        const s = v.trim();
        if (!s) return false;
        if (/^\d{1,3}$/.test(s)) return true;
        if (/^\d{4}$/.test(s)) return true;
        if (/^\d{4}-$/.test(s)) return true;
        if (/^\d{4}-\d$/.test(s)) return true;
        if (/^\d{4}-\d{2}-$/.test(s)) return true;
        if (/^\d{4}-\d{2}-\d$/.test(s)) return true;
        return false;
      };
      if (isIncomplete(profile.admission_month) || isIncomplete(profile.graduation_month) || isIncomplete(profile.birth_date)) {
        setSaving(false);
        return; // wait for more input
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setSaving(false); return; }

      const normDate = (val: any) => {
        if (typeof val !== 'string') return val ?? null;
        const v = val.trim();
        if (!v) return null;
        if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        return null;
      };
      const payload: any = { user_id: session.user.id };
      UPDATABLE_KEYS.forEach((k) => {
        if (k === 'user_id') return;
        let val = (profile as any)[k];
        if (k === 'admission_month' || k === 'graduation_month' || k === 'birth_date') {
          val = normDate(val);
        }
        if (val === '') val = null;
        if (val !== undefined) payload[k] = val;
      });

      // prevent redundant saves: if nothing changed vs last saved payload, skip
      const key = stableStringify(payload);
      if (key === lastSavedKeyRef.current) {
        setSaving(false);
        dirtyRef.current = false;
        return;
      }

      let saved: any = null; let error: any = null;
      if (profile?.id) {
        const res = await supabase.from("student_profiles").update(payload).eq("id", profile.id).select().single();
        saved = res.data; error = res.error;
      } else {
        const res = await supabase.from("student_profiles").insert(payload).select().single();
        saved = res.data; error = res.error;
      }
      if (error) throw error;
      if (saved) {
        if (mySeq !== saveSeqRef.current) return; // stale
        // remember last-saved snapshot to avoid save storms
        lastSavedKeyRef.current = stableStringify(payload);
        const serverOnly = new Set(["id","user_id","created_at","updated_at"]);
        const sent = payload;
        const activeKey = activeFieldRef.current;
        setProfile((prev:any) => {
          const next:any = { ...prev, ...sent };
          Object.keys(saved).forEach((k) => {
            if (k === activeKey) return;
            const val = (saved as any)[k];
            const weSent = Object.prototype.hasOwnProperty.call(sent, k) && sent[k] !== undefined;
            if ((!weSent || serverOnly.has(k)) && val !== null && val !== undefined) next[k] = val;
          });
          return next;
        });
      }
    } catch (e) {
      console.error("profile save error", e);
    } finally {
      setSaving(false);
      dirtyRef.current = false;
    }
  }, [profile]);

  const handleBlur = React.useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    await save();
  }, [save]);

  // Web版と同じ: state確定→300ms待って保存（dirty時のみ）。
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (!dirtyRef.current) return; // 変更なしなら保存しない

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // デバウンス後に即保存（markDirty は立て直さない）
      dirtyRef.current = false;
      await save();
    }, 300);

    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [profile, save]);


  // Save on page navigation (beforeRemove)
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      if (!dirtyRef.current) return; // nothing to save
      e.preventDefault();
      const action = e.data.action;
      // trigger immediate save, then continue navigation when done
      (async () => {
        try {
          await handleBlur();
        } finally {
          // proceed with the original navigation
          // @ts-ignore
          navigation.dispatch(action);
        }
      })();
    });
    return sub;
  }, [navigation, handleBlur]);

  // Save when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if ((state === 'background' || state === 'inactive') && dirtyRef.current) {
        handleBlur();
      }
    });
    return () => sub.remove();
  }, [handleBlur]);

  const update = useCallback((patch: Record<string, any>) => {
    setProfile((p: any) => ({ ...p, ...patch }));
    dirtyRef.current = true;
  }, []);

  // completion
  const sectionPct = useMemo(() => {
    const basicList = [
      profile?.last_name, profile?.first_name, profile?.postal_code,
      profile?.prefecture, profile?.city, profile?.address_line,
      profile?.birth_date, profile?.gender,
    ];
    const prList = [profile?.pr_title, profile?.pr_text, profile?.about];
    const prefList = [
      profile?.desired_positions, profile?.work_style_options,
      profile?.preferred_industries, profile?.desired_locations,
    ];
    return {
      basic: pct(basicList),
      pr: pct(prList),
      pref: pct(prefList),
    } as const;
  }, [profile]);
  const completion = Math.round((sectionPct.basic + sectionPct.pr + sectionPct.pref) / 3);

  if (loading) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop:8 }}>読み込み中…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <Text style={{ color:"red" }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* header */}
      <View style={{ paddingHorizontal:16, paddingTop:16, paddingBottom:8, backgroundColor: "#f8fafc" }}>
        <Text style={{ fontSize:18, fontWeight:"700" }}>マイプロフィール</Text>
        <Text style={{ color:"#64748b", marginTop:4, fontSize:12 }}>学生情報を入力・更新してスカウト率を高めましょう</Text>

        {/* progress */}
        <View style={{ flexDirection:"row", alignItems:"center", marginTop:12 }}>
          <Text style={{ fontSize:12 }}>完成度 {completion}%</Text>
          <View style={{ height:6, flex:1, backgroundColor:"#e2e8f0", borderRadius:4, marginLeft:8 }}>
            <View style={{ height:6, width:`${completion}%`, backgroundColor: completion<30?"#ef4444": completion<70?"#f59e0b":"#22c55e", borderRadius:4 }} />
          </View>
          {saving && <ActivityIndicator style={{ marginLeft:8 }} size="small" />}
        </View>

        {/* tabs */}
        <View style={{ flexDirection:"row", gap:8, marginTop:12 }}>
          {(["basic","pr","pref"] as const).map(k => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ paddingVertical:6, paddingHorizontal:12, borderRadius:999, borderWidth:1, borderColor: tab===k?"#0ea5e9":"#e5e7eb", backgroundColor: tab===k?"#e0f2fe":"#fff" }}>
              <Text style={{ fontSize:12, color: tab===k?"#0369a1":"#334155" }}>
                {k==="basic"?"基本情報":k==="pr"?"自己PR":"希望条件"} {sectionPct[k]}%
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* content */}
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16, paddingBottom:96 }}>
        {tab === "basic" && (
          <View style={{ gap:12 }}>
            <Field name="last_name" label="姓" value={profile.last_name ?? ""} onChangeText={(v)=>update({ last_name:v })} required
              onFocus={() => setActiveField("last_name")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("last_name")} onSubmitEditing={() => { handleBlur(); focusNext("last_name"); }}
            />
            <Field name="first_name" label="名" value={profile.first_name ?? ""} onChangeText={(v)=>update({ first_name:v })} required
              onFocus={() => setActiveField("first_name")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("first_name")} onSubmitEditing={() => { handleBlur(); focusNext("first_name"); }}
            />
            <Field name="last_name_kana" label="セイ" value={profile.last_name_kana ?? ""} onChangeText={(v)=>update({ last_name_kana:v })} 
              onFocus={() => setActiveField("last_name_kana")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("last_name_kana")} onSubmitEditing={() => { handleBlur(); focusNext("last_name_kana"); }}
            />
            <Field name="first_name_kana" label="メイ" value={profile.first_name_kana ?? ""} onChangeText={(v)=>update({ first_name_kana:v })} 
              onFocus={() => setActiveField("first_name_kana")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("first_name_kana")} onSubmitEditing={() => { handleBlur(); focusNext("first_name_kana"); }}
            />
            <Field name="phone" label="電話番号" value={profile.phone ?? ""} onChangeText={(v)=>update({ phone: v.replace(/[^0-9+\-]/g, "") })} keyboardType="phone-pad"
              onFocus={() => setActiveField("phone")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("phone")} onSubmitEditing={() => { handleBlur(); focusNext("phone"); }}
            />
            <Field name="birth_date" label="生年月日" value={profile.birth_date ?? ""} onChangeText={(v)=>update({ birth_date:v })} placeholder="YYYY-MM-DD"
              onFocus={() => setActiveField("birth_date")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("birth_date")} onSubmitEditing={() => { handleBlur(); focusNext("birth_date"); }}
            />
            <Field name="postal_code" label="郵便番号" value={profile.postal_code ?? ""} onChangeText={(v)=>update({ postal_code: v.replace(/[^0-9-]/g, "") })} 
              onFocus={() => setActiveField("postal_code")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("postal_code")} onSubmitEditing={() => { handleBlur(); focusNext("postal_code"); }}
            />
            <Field name="prefecture" label="都道府県" value={profile.prefecture ?? ""} onChangeText={(v)=>update({ prefecture:v })} 
              onFocus={() => setActiveField("prefecture")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("prefecture")} onSubmitEditing={() => { handleBlur(); focusNext("prefecture"); }}
            />
            <Field name="city" label="市区町村" value={profile.city ?? ""} onChangeText={(v)=>update({ city:v })} 
              onFocus={() => setActiveField("city")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("city")} onSubmitEditing={() => { handleBlur(); focusNext("city"); }}
            />
            <Field name="address_line" label="番地・建物名など" value={profile.address_line ?? ""} onChangeText={(v)=>update({ address_line:v })} 
              onFocus={() => setActiveField("address_line")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("address_line")} onSubmitEditing={() => { handleBlur(); focusNext("address_line"); }}
            />
            <Field name="hometown" label="出身地" value={profile.hometown ?? ""} onChangeText={(v)=>update({ hometown:v })} 
              onFocus={() => setActiveField("hometown")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("hometown")} onSubmitEditing={() => { handleBlur(); focusNext("hometown"); }}
            />

            {/* 学歴 */}
            <Section title="学歴" />
            <Field name="university" label="大学名" value={profile.university ?? ""} onChangeText={(v)=>update({ university:v })} 
              onFocus={() => setActiveField("university")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("university")} onSubmitEditing={() => { handleBlur(); focusNext("university"); }}
            />
            <Field name="faculty" label="学部/研究科" value={profile.faculty ?? ""} onChangeText={(v)=>update({ faculty:v })} 
              onFocus={() => setActiveField("faculty")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("faculty")} onSubmitEditing={() => { handleBlur(); focusNext("faculty"); }}
            />
            <Field name="department" label="学科/専攻" value={profile.department ?? ""} onChangeText={(v)=>update({ department:v })} 
              onFocus={() => setActiveField("department")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("department")} onSubmitEditing={() => { handleBlur(); focusNext("department"); }}
            />
            <Field name="graduation_month" label="卒業予定月 (YYYY-MM)" value={profile.graduation_month?.slice(0,7) ?? ""} onChangeText={(v)=>update({ graduation_month:v })} 
              onFocus={() => setActiveField("graduation_month")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("graduation_month")} onSubmitEditing={() => { handleBlur(); focusNext("graduation_month"); }}
            />
            <Multiline name="research_theme" label="研究テーマ" value={profile.research_theme ?? ""} onChangeText={(v)=>update({ research_theme:v })} 
              onFocus={() => setActiveField("research_theme")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("research_theme")} onSubmitEditing={() => { handleBlur(); focusNext("research_theme"); }}
            />
          </View>
        )}

        {tab === "pr" && (
          <View style={{ gap:12 }}>
            <Field name="pr_title" label="PRタイトル" value={profile.pr_title ?? ""} onChangeText={(v)=>update({ pr_title:v })} placeholder="あなたを一言で"
              onFocus={() => setActiveField("pr_title")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("pr_title")} onSubmitEditing={() => { handleBlur(); focusNext("pr_title"); }}
            />
            <Multiline name="about" label="自己紹介 (200字)" value={profile.about ?? ""} onChangeText={(v)=>update({ about:v })} maxLength={200}
              onFocus={() => setActiveField("about")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("about")} onSubmitEditing={() => { handleBlur(); focusNext("about"); }}
            />
            <Multiline name="pr_text" label="自己PR (800字)" value={profile.pr_text ?? ""} onChangeText={(v)=>update({ pr_text:v })} maxLength={800}
              onFocus={() => setActiveField("pr_text")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("pr_text")} onSubmitEditing={() => { handleBlur(); focusNext("pr_text"); }}
            />

            <Section title="強み (最大3つ)" />
            {[1,2,3].map(i => (
              <Field key={i} name={`strength${i}`} label={`強み${i}`} value={profile[`strength${i}`] ?? ""} onChangeText={(v)=>update({ [`strength${i}`]: v }) as any} placeholder="例: 問題解決力"
                onFocus={() => setActiveField(`strength${i}`)} onBlur={() => { setActiveField(null); handleBlur(); }}
                innerRef={register(`strength${i}`)} onSubmitEditing={() => { handleBlur(); focusNext(`strength${i}`); }}
              />
            ))}

            <Tip />
          </View>
        )}

        {tab === "pref" && (
          <View style={{ gap:12 }}>
            <Section title="希望条件" />
            <Field name="work_style" label="希望勤務形態" value={profile.work_style ?? ""} onChangeText={(v)=>update({ work_style:v })} placeholder="例: 正社員 / インターン"
              onFocus={() => setActiveField("work_style")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("work_style")} onSubmitEditing={() => { handleBlur(); focusNext("work_style"); }}
            />
            <Field name="salary_range" label="希望年収" value={profile.salary_range ?? ""} onChangeText={(v)=>update({ salary_range:v })} placeholder="400万〜500万"
              onFocus={() => setActiveField("salary_range")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("salary_range")} onSubmitEditing={() => { handleBlur(); focusNext("salary_range"); }}
            />

            <TagGroup title="希望職種" options={JOB_TYPE_OPTIONS as readonly string[]} values={profile.desired_positions ?? []} onToggle={(opt)=>update({ desired_positions: toggleIn(profile.desired_positions, opt) })} />
            <TagGroup title="働き方オプション" options={WORK_PREF_OPTIONS as readonly string[]} values={profile.work_style_options ?? []} onToggle={(opt)=>update({ work_style_options: toggleIn(profile.work_style_options, opt) })} />
            <TagGroup title="希望業界" options={INDUSTRY_OPTIONS as readonly string[]} values={(Array.isArray(profile.preferred_industries)? profile.preferred_industries.map(String): [])} onToggle={(opt)=>update({ preferred_industries: toggleIn(profile.preferred_industries, opt) })} />
            <TagGroup title="希望勤務地" options={LOCATION_OPTIONS as readonly string[]} values={profile.desired_locations ?? []} onToggle={(opt)=>update({ desired_locations: toggleIn(profile.desired_locations, opt) })} />

            <Multiline name="preference_note" label="備考" value={profile.preference_note ?? ""} onChangeText={(v)=>update({ preference_note:v })} 
              onFocus={() => setActiveField("preference_note")} onBlur={() => { setActiveField(null); handleBlur(); }}
              innerRef={register("preference_note")} onSubmitEditing={() => { handleBlur(); focusNext("preference_note"); }}
            />
          </View>
        )}
      </ScrollView>

      {/* sticky footer */}
      <View style={{ position:"absolute", left:0, right:0, bottom:0, padding:12, backgroundColor:"#fff", borderTopWidth:1, borderTopColor:"#e5e7eb", flexDirection:"row", alignItems:"center" }}>
        <Text style={{ fontSize:12 }}>完成度 {completion}%</Text>
        <View style={{ height:6, flex:1, backgroundColor:"#e2e8f0", borderRadius:4, marginLeft:8 }}>
          <View style={{ height:6, width:`${completion}%`, backgroundColor: completion<30?"#ef4444": completion<70?"#f59e0b":"#22c55e", borderRadius:4 }} />
        </View>
        <Text style={{ marginLeft:8, fontSize:12, color:"#64748b" }}>自動保存</Text>
      </View>
    </View>
  );
}

// ---------------- UI bits ----------------
function Section({ title }: { title: string }) {
  return (
    <View style={{ marginTop:4, paddingVertical:6 }}>
      <Text style={{ fontSize:14, fontWeight:"700" }}>{title}</Text>
    </View>
  );
}

function Field({ name, label, value, onChangeText, placeholder, keyboardType, required, maxLength, onFocus, onBlur, innerRef, onSubmitEditing }:{
  name: string;
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  required?: boolean;
  maxLength?: number;
  onFocus?: () => void;
  onBlur?: () => void;
  innerRef?: React.Ref<TextInput>;
  onSubmitEditing?: () => void;
}) {
  // Use composingRef and scheduleSave from closure.
  return (
    <View>
      <Text style={{ fontSize:12, marginBottom:4 }}>
        {label}{required ? " *" : ""}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onFocus={onFocus}
        onBlur={onBlur}
        ref={innerRef}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        blurOnSubmit={false}
        style={{ borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, paddingHorizontal:12, paddingVertical:10, fontSize:14, backgroundColor:"#fff" }}
      />
    </View>
  );
}

function Multiline({ name, label, value, onChangeText, placeholder, maxLength, rows=4, onFocus, onBlur, innerRef, onSubmitEditing }:{
  name: string; label: string; value: string; onChangeText:(t:string)=>void; placeholder?: string; maxLength?: number; rows?: number; onFocus?: () => void; onBlur?: () => void; innerRef?: React.Ref<TextInput>; onSubmitEditing?: () => void;
}) {
  // Use composingRef and scheduleSave from closure.
  return (
    <View>
      <Text style={{ fontSize:12, marginBottom:4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        maxLength={maxLength}
        multiline
        numberOfLines={rows}
        onFocus={onFocus}
        onBlur={onBlur}
        ref={innerRef}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        blurOnSubmit={true}
        style={{ borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, paddingHorizontal:12, paddingVertical:10, fontSize:14, backgroundColor:"#fff", textAlignVertical:"top" }}
      />
      {typeof maxLength === "number" && (
        <Text style={{ alignSelf:"flex-end", marginTop:4, fontSize:12, color:"#64748b" }}>{value.length}/{maxLength}文字</Text>
      )}
    </View>
  );
}

function Tag({ label, selected, onPress }:{ label:string; selected:boolean; onPress:()=>void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:999, borderWidth:1, borderColor: selected?"#0ea5e9":"#e5e7eb", backgroundColor: selected?"#e0f2fe":"#fff" }}>
      <Text style={{ fontSize:12, color: selected?"#0369a1":"#334155" }}>{label}</Text>
    </Pressable>
  );
}

function TagGroup({ title, options, values, onToggle }:{
  title: string; options: readonly string[]; values: string[]; onToggle: (v:string)=>void;
}) {
  return (
    <View>
      <Text style={{ fontSize:12, marginBottom:8 }}>{title}</Text>
      <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
        {options.map(opt => (
          <Tag key={opt} label={opt} selected={values?.includes(opt)} onPress={() => onToggle(opt)} />
        ))}
      </View>
    </View>
  );
}

function Tip() {
  return (
    <View style={{ backgroundColor:"#eff6ff", borderRadius:8, padding:12 }}>
      <Text style={{ fontSize:13, fontWeight:"700", color:"#1d4ed8" }}>自己PRのコツ</Text>
      <Text style={{ fontSize:12, color:"#1e40af", marginTop:4 }}>・数字や結果を用いて具体性を出す</Text>
      <Text style={{ fontSize:12, color:"#1e40af" }}>・役割だけでなく、課題→行動→成果 を示す</Text>
    </View>
  );
}