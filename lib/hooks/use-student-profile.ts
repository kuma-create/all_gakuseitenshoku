/* ────────────────────────────────────────────
   lib/hooks/use-student-profile.ts
   “学生プロフィール” を取得／編集／保存する共通フック
─────────────────────────────────────────── */
"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

/* ---------- 型 ---------- */
type Row    = Database["public"]["Tables"]["student_profiles"]["Row"]
type Insert = Database["public"]["Tables"]["student_profiles"]["Insert"]
type LocalState = Partial<Row> & { __editing?: boolean }

/* ---------- サーバー CRUD ---------- */
async function fetchMyProfile(): Promise<Row> {
  /* 認証ユーザー取得 */
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error("認証エラー")

  /* 既存レコード取得 */
  const { data, error } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<Row>()
  if (error) throw error
  if (data) return data

  /* ------------------ 空プロフィール生成 ------------------ */
  const emptyInsert: Insert = {
    id: crypto.randomUUID(),
    user_id: user.id,

    /* --- 基本 --- */
    full_name: "",
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
    birth_date: null,
    gender: null,
    phone: "",
    email: user.email ?? "",
    address: "",
    avatar: null,

    /* --- 学歴 --- */
    university: "",
    faculty: "",
    department: null,
    academic_year: null,
    admission_month: null,
    graduation_month: null,
    graduation_year: null,
    enrollment_status: null,
    research_theme: "",

    /* --- スキル・経験 --- */
    qualification_text: "",
    skill_text: "",
    language_skill: "",
    framework_lib: "",
    dev_tools: "",
    skills: null,
    experience: "",

    /* --- PR --- */
    pr_title: "",
    pr_body: "",
    pr_text: "",
    strength1: "",
    strength2: "",
    strength3: "",
    motive: "",
    about: "",

    /* --- 希望 --- */
    desired_industries: null,
    desired_positions: null,
    desired_locations: null,
    work_style: null,
    employment_type: null,
    salary_range: null,
    work_style_options: null,
    preference_note: "",

    /* --- メタ --- */
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  /* DB へ INSERT（`onConflict` で将来の race condition も回避） */
  const { data: inserted, error: insErr } = await supabase
    .from("student_profiles")
    .insert(emptyInsert)
    .select("*")
    .single<Row>()
  if (insErr || !inserted) throw insErr ?? new Error("insert failed")

  return inserted
}

async function saveMyProfile(payload: Insert) {
  const { error } = await supabase
    .from("student_profiles")
    .upsert(payload, { onConflict: "user_id" })
  if (error) throw error
}

/* ---------- React Hook ---------- */
export function useStudentProfile() {
  const [data, setData]       = useState<Row | null>(null)   // サーバー確定値
  const [local, setLocal]     = useState<LocalState>({})     // 編集バッファ
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  /* 初期ロード */
  useEffect(() => {
    ;(async () => {
      try {
        const profile = await fetchMyProfile()
        setData(profile)
        setLocal(profile) // バッファ初期化
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  /* ローカル編集パッチ */
  const updateLocal = useCallback(
    (patch: LocalState | ((prev: LocalState) => LocalState)) => {
      setLocal((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch }
        return { ...next, __editing: true }
      })
    },
    [],
  )

  /* 編集リセット */
  const resetLocal = useCallback(() => {
    if (data) setLocal(data)
  }, [data])

  /* 保存 */
  const save = useCallback(async () => {
    if (!data) return
    try {
      setSaving(true)
      const merged: Insert = { ...data, ...local } as Insert
      delete (merged as any).__editing
      merged.updated_at = new Date().toISOString()
      await saveMyProfile(merged)
      setData(merged as Row)
      setLocal(merged as Row)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [data, local])

  /* 完成度 % */
  const completionRate = (() => {
    if (!local) return 0
    const req: (keyof Row)[] = ["full_name", "university", "faculty"]
    const done = req.filter((k) => !!local[k]).length
    return Math.round((done / req.length) * 100)
  })()

  return {
    data: local as Row,
    loading,
    error,
    saving,
    updateLocal,
    resetLocal,
    save,
    editing: !!local.__editing,
    completionRate,
  }
}
