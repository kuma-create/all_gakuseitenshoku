// app/(student)/resume.tsx
// Mobile Resume Editor — based on /app/resume/page.tsx (Web)

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useNavigation } from "@react-navigation/native";

/* =========================
   Types (Web 版を踏襲)
========================= */
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type GenderOption = "male" | "female" | "other";
type EducationStatus = "enrolled" | "graduated" | "expected";
type SectionKey = "basic" | "education" | "work" | "skills" | "pr" | "conditions";

type FormData = {
  basic: {
    lastName: string;
    firstName: string;
    lastNameKana: string;
    firstNameKana: string;
    birthdate: string;
    gender: GenderOption;
    email: string;
    phone: string;
    address: string;
  };
  education: {
    university: string;
    faculty: string;
    admissionDate: string;
    graduationDate: string;
    status: EducationStatus;
    researchTheme: string;
  };
  skills: { certifications: string; skills: string; languages: string; frameworks: string; tools: string; };
  pr: { title: string; content: string; strengths: string[]; motivation: string; };
  conditions: { industries: string[]; jobTypes: string[]; locations: string[]; workStyle: string; salary: string; workPreferences: string[]; remarks: string; };
};

type WorkExperience = {
  id: number;
  isOpen: boolean;
  company: string;
  position: string;
  jobTypes: string[];
  startDate: string;  // YYYY-MM
  endDate: string;    // YYYY-MM
  isCurrent: boolean;
  description: string;
  technologies: string;
  achievements: string;
};

/* =========================
   Constants / Defaults
========================= */
const JOB_TYPE_OPTIONS = [
  "エンジニア", "営業", "コンサルタント", "経営・経営企画", "総務・人事",
  "経理・財務", "企画", "マーケティング", "デザイナー", "広報", "その他",
] as const;

const POSITION_OPTIONS = [
  "メンバー",
  "リーダー",
  "マネージャー",
  "責任者",
  "役員",
  "代表",
  "その他",
] as const;

const DEFAULT_FORM: FormData = {
  basic: { lastName:"", firstName:"", lastNameKana:"", firstNameKana:"", birthdate:"", gender:"male", email:"", phone:"", address:"" },
  education: { university:"", faculty:"", admissionDate:"", graduationDate:"", status:"enrolled", researchTheme:"" },
  skills: { certifications:"", skills:"", languages:"", frameworks:"", tools:"" },
  pr: { title:"", content:"", strengths:["","",""], motivation:"" },
  conditions: { industries:[], jobTypes:[], locations:[], workStyle:"", salary:"", workPreferences:[], remarks:"" },
};

/* =========================
   Helpers
========================= */
const clamp01 = (n: number) => Math.max(0, Math.min(100, n));
const getCompletionColor = (p: number) =>
  p < 50 ? "#ef4444" : p < 80 ? "#f59e0b" : p < 95 ? "#22c55e" : "#16a34a";

/* =========================
   Screen
========================= */
export default function ResumeMobileScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // autosave controls (profile.tsx parity)
  const dirtyRef = useRef(false);
  const firstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  const lastSavedKeyRef = useRef<string>("");

  // Stable stringify to dedupe saves reliably
  const stableStringify = (obj: any) => {
    const out: any = {};
    Object.keys(obj).sort().forEach(k => { out[k] = obj[k]; });
    return JSON.stringify(out);
  };

  const [initialLoaded, setInitialLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([
    { id:1, isOpen:true, company:"", position:"", jobTypes:[], startDate:"", endDate:"", isCurrent:false, description:"", technologies:"", achievements:"" },
  ]);

  const [completionPercentage, setCompletionPercentage] = useState(0);

  /* -------- Load existing resume + profile prefill -------- */
  useEffect(() => {
    (async () => {
      try {
        const { data:{ session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) { router.replace("/auth/login"); return; }

        // resumes
        const { data: resumeRow, error: rErr } = await supabase
          .from("resumes")
          .select("id, form_data, work_experiences")
          .eq("user_id", uid)
          .maybeSingle();

        if (resumeRow?.form_data) {
          const incoming = resumeRow.form_data as Partial<FormData>;
          setFormData({
            basic: { ...DEFAULT_FORM.basic, ...(incoming.basic||{}) },
            education: { ...DEFAULT_FORM.education, ...(incoming.education||{}) },
            skills: { ...DEFAULT_FORM.skills, ...(incoming.skills||{}) },
            pr: { ...DEFAULT_FORM.pr, ...(incoming.pr||{}) },
            conditions: { ...DEFAULT_FORM.conditions, ...(incoming.conditions||{}) },
          });
        }
        if (Array.isArray(resumeRow?.work_experiences)) {
          setWorkExperiences(resumeRow!.work_experiences as unknown as WorkExperience[]);
        }
        if (rErr && rErr.code !== "PGRST116") console.warn("resume fetch:", rErr.message);

        // student_profiles (prefill)
        const { data: profile, error: pErr } = await supabase
          .from("student_profiles")
          .select("last_name, first_name, last_name_kana, first_name_kana, birth_date, gender, phone, address, admission_month, graduation_month, university, faculty, research_theme")
          .eq("user_id", uid)
          .maybeSingle();

        if (!pErr && profile) {
          setFormData(prev => ({
            ...prev,
            basic: {
              ...prev.basic,
              lastName: profile.last_name ?? prev.basic.lastName,
              firstName: profile.first_name ?? prev.basic.firstName,
              lastNameKana: profile.last_name_kana ?? prev.basic.lastNameKana,
              firstNameKana: profile.first_name_kana ?? prev.basic.firstNameKana,
              birthdate: profile.birth_date ?? prev.basic.birthdate,
              gender: (profile.gender as GenderOption) ?? prev.basic.gender,
              email: session?.user?.email ?? prev.basic.email,
              phone: profile.phone ?? prev.basic.phone,
              address: profile.address ?? prev.basic.address,
            },
            education: {
              ...prev.education,
              university: profile.university ?? prev.education.university,
              faculty: profile.faculty ?? prev.education.faculty,
              admissionDate: (profile.admission_month ?? "").toString(),
              graduationDate: (profile.graduation_month ?? "").toString(),
              researchTheme: profile.research_theme ?? prev.education.researchTheme,
            }
          }));
        }
      } catch (e) {
        console.error("load resume error", e);
      } finally {
        // Prime lastSaved snapshot key with defaults (prevents first empty save)
        const prime = stableStringify({
          form_data: DEFAULT_FORM as unknown as Json,
          work_experiences: [{ id:1, isOpen:true, company:"", position:"", jobTypes:[], startDate:"", endDate:"", isCurrent:false, description:"", technologies:"", achievements:"" }] as unknown as Json,
          updated_at: "",
        });
        lastSavedKeyRef.current = prime;
        setInitialLoaded(true);
        setLoading(false);
      }
    })();
  }, [router]);

  /* -------- Completion (work section only, Web 版と同じ配点) -------- */
  useEffect(() => {
    let work = 0;
    const rows = workExperiences;
    if (rows.length > 0) {
      const requiredPerRow = 6;
      const totalRequired = rows.length * requiredPerRow;
      const filled = rows.reduce((cnt, w) => {
        if (w.company.trim()) cnt++;
        if (w.position.trim()) cnt++;
        if (w.startDate.trim()) cnt++;
        if (w.isCurrent || w.endDate.trim()) cnt++;
        if (w.description.trim()) cnt++;
        if (w.achievements.trim()) cnt++;
        return cnt;
      }, 0);
      work = Math.round((filled / totalRequired) * 100);
    }
    setCompletionPercentage(clamp01(work));
  }, [workExperiences]);

  // cleanup on unmount: clear timer
  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const save = useCallback(async () => {
    const mySeq = ++saveSeqRef.current;
    try {
      setSaving(true);
      const { data:{ session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setSaving(false); return; }

      // Build payload
      const payload = {
        form_data: formData as unknown as Json,
        work_experiences: workExperiences as unknown as Json,
        updated_at: new Date().toISOString(),
      };

      // Dedupe: skip if nothing changed since last save
      const key = stableStringify(payload);
      if (key === lastSavedKeyRef.current) {
        setSaving(false);
        dirtyRef.current = false;
        return;
      }

      // Upsert
      const { data: existing, error: selectErr } = await supabase
        .from("resumes").select("id").eq("user_id", uid).maybeSingle();
      if (selectErr && selectErr.code !== "PGRST116") {
        console.error("resumes select error", selectErr);
        setSaving(false); return;
      }
      let err;
      if (existing?.id) {
        const { error } = await supabase.from("resumes").update(payload).eq("id", existing.id);
        err = error;
      } else {
        const { error } = await supabase.from("resumes").insert({ user_id: uid, ...payload });
        err = error;
      }
      if (err) throw err;

      if (mySeq !== saveSeqRef.current) return; // stale
      lastSavedKeyRef.current = key;
    } catch (e) {
      console.error("resume save error", e);
    } finally {
      setSaving(false);
      dirtyRef.current = false;
    }
  }, [formData, workExperiences]);

  const handleBlur = useCallback(async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    await save();
  }, [save]);

  // Debounced autosave when state changes (after initial load)
  useEffect(() => {
    if (!initialLoaded) return;
    if (firstRender.current) { firstRender.current = false; return; }
    if (!dirtyRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      dirtyRef.current = false;
      await save();
    }, 300);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [initialLoaded, formData, workExperiences, save]);

  // Save on navigation away
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      const action = e.data.action;
      (async () => {
        try { await handleBlur(); } finally { /* @ts-ignore */ navigation.dispatch(action); }
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

  /* -------- Mutations -------- */
  const addWork = useCallback(() => {
    setWorkExperiences(prev => {
      const newId = prev.length ? Math.max(...prev.map(p => p.id)) + 1 : 1;
      return [...prev, { id:newId, isOpen:true, company:"", position:"", jobTypes:[], startDate:"", endDate:"", isCurrent:false, description:"", technologies:"", achievements:"" }];
    });
    dirtyRef.current = true;
  }, []);
  const removeWork = useCallback((id:number) => { setWorkExperiences(prev => prev.filter(w => w.id !== id)); dirtyRef.current = true; }, []);
  const toggleOpen = useCallback((id:number) => {
    setWorkExperiences(prev => prev.map(w => w.id === id ? { ...w, isOpen: !w.isOpen } : w));
  }, []);
  const patchWork = useCallback((id:number, patch: Partial<WorkExperience>) => {
    setWorkExperiences(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w));
    dirtyRef.current = true;
  }, []);
  const toggleJobType = useCallback((id:number, val:string) => {
    setWorkExperiences(prev => prev.map(w => {
      if (w.id !== id) return w;
      const set = new Set(w.jobTypes ?? []);
      set.has(val) ? set.delete(val) : set.add(val);
      return { ...w, jobTypes: [...set] };
    }));
    dirtyRef.current = true;
  }, []);

  const setPosition = useCallback((id:number, val:string) => {
    setWorkExperiences(prev => prev.map(w => {
      if (w.id !== id) return w;
      const next = w.position === val ? "" : val;
      return { ...w, position: next };
    }));
    dirtyRef.current = true;
  }, []);

  /* -------- UI -------- */
  if (!initialLoaded || loading) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop:8 }}>読込中…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex:1 }}>
      {/* Header */}
      <View style={{ paddingHorizontal:16, paddingTop:16, paddingBottom:10, backgroundColor:"#f8fafc" }}>
        <Text style={{ fontSize:18, fontWeight:"700" }}>職務経歴書</Text>
        <Text style={{ fontSize:12, color:"#64748b", marginTop:4 }}>キャリア情報を入力してスカウト率を高めましょう</Text>

        {/* Progress */}
        <View style={{ flexDirection:"row", alignItems:"center", marginTop:12 }}>
          <Text style={{ fontSize:12 }}>完成度 {completionPercentage}%</Text>
          <View style={{ height:6, flex:1, backgroundColor:"#e2e8f0", borderRadius:4, marginLeft:8 }}>
            <View style={{ height:6, width:`${completionPercentage}%`, backgroundColor:getCompletionColor(completionPercentage), borderRadius:4 }} />
          </View>
          {saving && <ActivityIndicator style={{ marginLeft:8 }} size="small" />}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding:16, paddingBottom:96 }}>
        {/* Work Experiences (top section like web) */}
        <View style={{ borderWidth:1, borderColor:"#c7d2fe", backgroundColor:"#eef2ff", padding:12, borderRadius:8, marginBottom:12 }}>
          <Text style={{ fontSize:14, fontWeight:"700", color:"#3730a3" }}>職歴</Text>
          <Text style={{ fontSize:12, color:"#4338ca", marginTop:2 }}>アルバイトやインターンの経験を追加してください</Text>
        </View>

        {workExperiences.length === 0 ? (
          <View style={{ backgroundColor:"#fffbeb", borderWidth:1, borderColor:"#f59e0b", borderRadius:8, padding:12, marginBottom:12 }}>
            <Text style={{ fontSize:12, color:"#92400e" }}>職歴情報がありません。まずは1件追加しましょう。</Text>
          </View>
        ) : null}

        {workExperiences.map(exp => (
          <View key={exp.id} style={{ borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, backgroundColor:"#fff", marginBottom:12 }}>
            <Pressable onPress={()=>toggleOpen(exp.id)} style={{ padding:12, flexDirection:"row", alignItems:"center", justifyContent:"space-between" }}>
              <Text style={{ fontSize:14, fontWeight:"600" }}>
                {exp.company ? `${exp.company}${exp.position ? " / "+exp.position : ""}` : `職歴 #${exp.id}`}
              </Text>
              <Text style={{ fontSize:12, color:"#64748b" }}>{exp.isOpen ? "閉じる" : "開く"}</Text>
            </Pressable>

            {exp.isOpen && (
              <View style={{ padding:12, gap:10 }}>
                <Field label="企業・組織名" value={exp.company} onChangeText={(v)=>patchWork(exp.id,{company:v})} placeholder="〇〇株式会社" />
                {/* 職種（複数選択） */}
                <View>
                  <Text style={{ fontSize:12, marginBottom:6 }}>職種（複数選択可）</Text>
                  <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
                    {JOB_TYPE_OPTIONS.map(opt => {
                      const selected = (exp.jobTypes || []).includes(opt);
                      return (
                        <Pressable key={opt} onPress={()=>toggleJobType(exp.id, opt)} style={{
                          paddingVertical:6, paddingHorizontal:10, borderRadius:999, borderWidth:1,
                          borderColor: selected ? "#0ea5e9" : "#e5e7eb",
                          backgroundColor: selected ? "#e0f2fe" : "#fff"
                        }}>
                          <Text style={{ fontSize:12, color: selected ? "#0369a1" : "#334155" }}>{opt}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 役職・ポジション（単一選択） */}
                <View>
                  <Text style={{ fontSize:12, marginBottom:6 }}>役職・ポジション（単一選択）</Text>
                  <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
                    {POSITION_OPTIONS.map(opt => {
                      const selected = exp.position === opt;
                      return (
                        <Pressable
                          key={opt}
                          onPress={() => setPosition(exp.id, opt)}
                          style={{
                            paddingVertical:6,
                            paddingHorizontal:10,
                            borderRadius:999,
                            borderWidth:1,
                            borderColor: selected ? "#0ea5e9" : "#e5e7eb",
                            backgroundColor: selected ? "#e0f2fe" : "#fff",
                          }}
                        >
                          <Text style={{ fontSize:12, color: selected ? "#0369a1" : "#334155" }}>{opt}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 開始年月/終了年月 */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="開始年月 (YYYY-MM)"
                      value={exp.startDate}
                      onChangeText={(v) => patchWork(exp.id, { startDate: v })}
                      placeholder="2024-04"
                    />
                  </View>
                  {!exp.isCurrent && (
                    <View style={{ flex: 1 }}>
                      <Field
                        label="終了年月 (YYYY-MM)"
                        value={exp.endDate}
                        onChangeText={(v) => patchWork(exp.id, { endDate: v })}
                        placeholder="2024-09"
                      />
                    </View>
                  )}
                </View>

                {/* 在籍中 */}
                <Pressable
                  onPress={() => {
                    const next = !exp.isCurrent;
                    patchWork(exp.id, next ? { isCurrent: true, endDate: "" } : { isCurrent: false });
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: "#cbd5e1",
                      backgroundColor: exp.isCurrent ? "#0ea5e9" : "#fff",
                    }}
                  />
                  <Text style={{ fontSize: 12 }}>現在も在籍中</Text>
                </Pressable>

                {/* 業務内容 */}
                <Multiline label="業務内容" value={exp.description} onChangeText={(v)=>patchWork(exp.id,{description:v})} placeholder="担当業務や役割、工夫点など（最大500文字）" maxLength={500} rows={5} />

                {/* 使用技術 */}
                <Field label="使用技術・ツール（カンマ区切り）" value={exp.technologies} onChangeText={(v)=>patchWork(exp.id,{technologies:v})} placeholder="React, TypeScript, Figma など" />
                {!!exp.technologies && exp.technologies.split(",").some(t=>t.trim()) && (
                  <View style={{ flexDirection:"row", flexWrap:"wrap", gap:6 }}>
                    {exp.technologies.split(",").map((t,i)=>{
                      const trimmed = t.trim();
                      if (!trimmed) return null;
                      return (
                        <View key={i} style={{ borderWidth:1, borderColor:"#bfdbfe", backgroundColor:"#eff6ff", paddingVertical:4, paddingHorizontal:8, borderRadius:999 }}>
                          <Text style={{ fontSize:11, color:"#1d4ed8" }}>{trimmed}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 成果・実績 */}
                <Multiline label="成果・実績" value={exp.achievements} onChangeText={(v)=>patchWork(exp.id,{achievements:v})} placeholder="数値や評価など具体的に" rows={4} />

                <View style={{ flexDirection:"row", justifyContent:"flex-end" }}>
                  <Pressable onPress={()=>removeWork(exp.id)} style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:8, borderWidth:1, borderColor:"#fecaca", backgroundColor:"#fee2e2" }}>
                    <Text style={{ fontSize:12, color:"#b91c1c" }}>この職歴を削除</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ))}

        <Pressable onPress={addWork} style={{ paddingVertical:12, borderRadius:8, borderWidth:1, borderColor:"#94a3b8", borderStyle:"dashed", alignItems:"center", backgroundColor:"#fff" }}>
          <Text style={{ fontSize:13, color:"#0f172a" }}>＋ 職歴を追加</Text>
        </Pressable>
      </ScrollView>

      {/* Footer */}
      <View style={{ position:"absolute", left:0, right:0, bottom:0, padding:12, backgroundColor:"#fff", borderTopWidth:1, borderTopColor:"#e5e7eb", flexDirection:"row", alignItems:"center" }}>
        <Text style={{ fontSize:12 }}>完成度 {completionPercentage}%</Text>
        <View style={{ height:6, flex:1, backgroundColor:"#e2e8f0", borderRadius:4, marginLeft:8 }}>
          <View style={{ height:6, width:`${completionPercentage}%`, backgroundColor:getCompletionColor(completionPercentage), borderRadius:4 }} />
        </View>
        <Text style={{ marginLeft:8, fontSize:12, color:"#64748b" }}>{saving ? "自動保存中..." : "自動保存"}</Text>
      </View>
    </View>
  );
}

/* =========================
   Tiny UI Parts
========================= */
function Field({
  label, value, onChangeText, placeholder, keyboardType,
}:{
  label:string; value:string; onChangeText:(t:string)=>void; placeholder?:string; keyboardType?:any;
}) {
  return (
    <View>
      <Text style={{ fontSize:12, marginBottom:4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        style={{ borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, paddingHorizontal:12, paddingVertical:10, fontSize:14, backgroundColor:"#fff" }}
      />
    </View>
  );
}

function Multiline({
  label, value, onChangeText, placeholder, rows=4, maxLength,
}:{
  label:string; value:string; onChangeText:(t:string)=>void; placeholder?:string; rows?:number; maxLength?:number;
}) {
  return (
    <View>
      <Text style={{ fontSize:12, marginBottom:4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        numberOfLines={rows}
        multiline
        maxLength={maxLength}
        style={{ borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, paddingHorizontal:12, paddingVertical:10, fontSize:14, backgroundColor:"#fff", textAlignVertical:"top" }}
      />
      {typeof maxLength === "number" && (
        <Text style={{ alignSelf:"flex-end", marginTop:4, fontSize:12, color:"#64748b" }}>{value.length}/{maxLength}文字</Text>
      )}
    </View>
  );
}