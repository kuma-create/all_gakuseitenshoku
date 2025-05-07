// lib/hooks/use-student-profile.ts
/* ────────────────────────────────────────────────
   “学生プロフィール” を取得／編集／保存する共通フック
──────────────────────────────────────────────── */
"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

/* ---------- 型 ---------- */
type Row = Database["public"]["Tables"]["student_profiles"]["Row"]
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
    .maybeSingle()
  if (error) throw error

  /* 無ければ “空プロフィール” を生成 */
  if (data) return data as Row

  const empty: Row = {
    id: "",
    user_id: user.id,

    /* ---------- 基本 ---------- */
    full_name: "",
    last_name: "",
    first_name: "",
    last_name_kana: "",
    first_name_kana: "",
    birth_date: null,
    gender: null,
    phone: "",
    email: user.email ?? null,       // ← string | undefined → null 許容に変換
    address: "",

    /* ---------- 学歴 ---------- */
    university: "",
    faculty: "",
    department: null,
    admission_month: null,
    graduation_month: null,
    graduation_year: null,
    enrollment_status: null,
    research_theme: "",

    /* ---------- スキル ---------- */
    qualification_text: "",
    skill_text: "",
    language_skill: "",
    framework_lib: "",
    dev_tools: "",
    skills: null,

    /* ---------- PR ---------- */
    pr_title: "",
    pr_body: "",
    pr_text: "",
    strength1: "",
    strength2: "",
    strength3: "",
    motive: "",

    /* ---------- 希望 ---------- */
    desired_industries: null,
    desired_positions: null,
    desired_locations: null,
    work_style: null,
    employment_type: null,
    salary_range: null,
    work_style_options: null,
    preference_note: "",

    /* ---------- その他 ---------- */
    profile_image: null,
    created_at: null,
  }

  return empty
}

async function saveMyProfile(payload: Row) {
  const { error } = await supabase
    .from("student_profiles")
    .upsert(payload, { onConflict: "user_id" })
  if (error) throw error
}

/* ---------- React Hook ---------- */
export function useStudentProfile() {
  const [data, setData]           = useState<Row | null>(null)   // サーバー確定値
  const [local, setLocal]         = useState<LocalState>({})     // 編集バッファ
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  /* 初期ロード */
  useEffect(() => {
    ;(async () => {
      try {
        const profile = await fetchMyProfile()
        setData(profile)
        setLocal(profile)            // 初期バッファも確定値と一致
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  /* ローカル編集パッチ適用 */
  const updateLocal = useCallback(
    (patch: LocalState | ((prev: LocalState) => LocalState)) => {
      setLocal((prev) => {
        const next =
          typeof patch === "function" ? patch(prev) : { ...prev, ...patch }
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
      const merged: Row = { ...data, ...local } as Row
      delete (merged as any).__editing
      await saveMyProfile(merged)
      setData(merged)
      setLocal(merged)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }, [data, local])

  /* 完成度 % （必須 3 項目充足率のシンプル例） */
  const completionRate = (() => {
    if (!local) return 0
    const req: (keyof Row)[] = ["full_name", "university", "faculty"]
    const done = req.filter((k) => !!local[k]).length
    return Math.round((done / req.length) * 100)
  })()

  return {
    data:        local as Row,
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
