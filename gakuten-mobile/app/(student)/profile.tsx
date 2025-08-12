

// app/(student)/profile.tsx
// Mobile Student Profile – minimal RN version with autosave & tabs
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"basic" | "pr" | "pref">("basic");
  const [profile, setProfile] = useState<any>({});

  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    dirtyRef.current = true;
    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        const payload = { ...profile };
        // normalize month inputs to YYYY-MM
        if (typeof payload.admission_month === "string") payload.admission_month = payload.admission_month.slice(0,7);
        if (typeof payload.graduation_month === "string") payload.graduation_month = payload.graduation_month.slice(0,7);
        const { error } = await supabase.from("student_profiles").upsert(payload, { onConflict: "user_id" });
        if (error) throw error;
      } catch (e) {
        console.error("profile save error", e);
      } finally {
        setSaving(false);
        dirtyRef.current = false;
      }
    }, 400);
  }, [profile]);

  const update = useCallback((patch: Record<string, any>) => {
    setProfile((p: any) => ({ ...p, ...patch }));
    scheduleSave();
  }, [scheduleSave]);

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
            <Field label="姓" value={profile.last_name ?? ""} onChangeText={(v)=>update({ last_name:v })} required />
            <Field label="名" value={profile.first_name ?? ""} onChangeText={(v)=>update({ first_name:v })} required />
            <Field label="セイ" value={profile.last_name_kana ?? ""} onChangeText={(v)=>update({ last_name_kana:v })} />
            <Field label="メイ" value={profile.first_name_kana ?? ""} onChangeText={(v)=>update({ first_name_kana:v })} />
            <Field label="電話番号" value={profile.phone ?? ""} onChangeText={(v)=>update({ phone:v })} keyboardType="phone-pad" />
            <Field label="生年月日" value={profile.birth_date ?? ""} onChangeText={(v)=>update({ birth_date:v })} placeholder="YYYY-MM-DD" />
            <Field label="郵便番号" value={profile.postal_code ?? ""} onChangeText={(v)=>update({ postal_code:v })} />
            <Field label="都道府県" value={profile.prefecture ?? ""} onChangeText={(v)=>update({ prefecture:v })} />
            <Field label="市区町村" value={profile.city ?? ""} onChangeText={(v)=>update({ city:v })} />
            <Field label="番地・建物名など" value={profile.address_line ?? ""} onChangeText={(v)=>update({ address_line:v })} />
            <Field label="出身地" value={profile.hometown ?? ""} onChangeText={(v)=>update({ hometown:v })} />

            {/* 学歴 */}
            <Section title="学歴" />
            <Field label="大学名" value={profile.university ?? ""} onChangeText={(v)=>update({ university:v })} />
            <Field label="学部/研究科" value={profile.faculty ?? ""} onChangeText={(v)=>update({ faculty:v })} />
            <Field label="学科/専攻" value={profile.department ?? ""} onChangeText={(v)=>update({ department:v })} />
            <Field label="入学年月 (YYYY-MM)" value={profile.admission_month?.slice(0,7) ?? ""} onChangeText={(v)=>update({ admission_month:v })} />
            <Field label="卒業予定月 (YYYY-MM)" value={profile.graduation_month?.slice(0,7) ?? ""} onChangeText={(v)=>update({ graduation_month:v })} />
            <Multiline label="研究テーマ" value={profile.research_theme ?? ""} onChangeText={(v)=>update({ research_theme:v })} />
          </View>
        )}

        {tab === "pr" && (
          <View style={{ gap:12 }}>
            <Field label="PRタイトル" value={profile.pr_title ?? ""} onChangeText={(v)=>update({ pr_title:v })} placeholder="あなたを一言で" />
            <Multiline label="自己紹介 (200字)" value={profile.about ?? ""} onChangeText={(v)=>update({ about:v })} maxLength={200} />
            <Multiline label="自己PR (800字)" value={profile.pr_text ?? ""} onChangeText={(v)=>update({ pr_text:v })} maxLength={800} />

            <Section title="強み (最大3つ)" />
            {[1,2,3].map(i => (
              <Field key={i} label={`強み${i}`} value={profile[`strength${i}`] ?? ""} onChangeText={(v)=>update({ [`strength${i}`]: v }) as any} placeholder="例: 問題解決力" />
            ))}

            <Tip />
          </View>
        )}

        {tab === "pref" && (
          <View style={{ gap:12 }}>
            <Section title="希望条件" />
            <Field label="希望勤務形態" value={profile.work_style ?? ""} onChangeText={(v)=>update({ work_style:v })} placeholder="例: 正社員 / インターン" />
            <Field label="希望年収" value={profile.salary_range ?? ""} onChangeText={(v)=>update({ salary_range:v })} placeholder="400万〜500万" />

            <TagGroup title="希望職種" options={JOB_TYPE_OPTIONS as readonly string[]} values={profile.desired_positions ?? []} onToggle={(opt)=>update({ desired_positions: toggleIn(profile.desired_positions, opt) })} />
            <TagGroup title="働き方オプション" options={WORK_PREF_OPTIONS as readonly string[]} values={profile.work_style_options ?? []} onToggle={(opt)=>update({ work_style_options: toggleIn(profile.work_style_options, opt) })} />
            <TagGroup title="希望業界" options={INDUSTRY_OPTIONS as readonly string[]} values={(Array.isArray(profile.preferred_industries)? profile.preferred_industries.map(String): [])} onToggle={(opt)=>update({ preferred_industries: toggleIn(profile.preferred_industries, opt) })} />
            <TagGroup title="希望勤務地" options={LOCATION_OPTIONS as readonly string[]} values={profile.desired_locations ?? []} onToggle={(opt)=>update({ desired_locations: toggleIn(profile.desired_locations, opt) })} />

            <Multiline label="備考" value={profile.preference_note ?? ""} onChangeText={(v)=>update({ preference_note:v })} />
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

function Field({ label, value, onChangeText, placeholder, keyboardType, required, maxLength }:{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  required?: boolean;
  maxLength?: number;
}) {
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
        style={{ borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, paddingHorizontal:12, paddingVertical:10, fontSize:14, backgroundColor:"#fff" }}
      />
    </View>
  );
}

function Multiline({ label, value, onChangeText, placeholder, maxLength, rows=4 }:{
  label: string; value: string; onChangeText:(t:string)=>void; placeholder?: string; maxLength?: number; rows?: number;
}) {
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