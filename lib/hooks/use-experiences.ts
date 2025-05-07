/* ──────────────────────────────────────────────────────────
   lib/hooks/use-experiences.ts
   - 学生の職務経歴 (experiences) を扱う共通フック
   - すべての CRUD をラップし、楽観的 UI 反映も行う
───────────────────────────────────────────────────────── */
"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

type Row = Database["public"]["Tables"]["experiences"]["Row"]

/* -------------------------------------------------- */
/*                       Hook                         */
/* -------------------------------------------------- */
export function useExperiences() {
  const [data,    setData]    = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  /* すべて取得（初回 / 手動リロード兼用） */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      /* 現在ログイン中の user_id を取得 */
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error("未ログイン、またはユーザー取得失敗")

      const { data, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false })

      if (error) throw error
      setData(data as Row[])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  /* 追加 ------------------------------------------------ */
  const add = useCallback(
    async (payload: Omit<Row, "id" | "created_at" | "user_id">) => {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) throw new Error("未ログイン")

      const { data: inserted, error } = await supabase
        .from("experiences")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      setData(prev => [inserted as Row, ...prev])     // 楽観的追加
      return inserted as Row
    },
    []
  )

  /* 更新 ------------------------------------------------ */
  const update = useCallback(
    async (id: string, patch: Partial<Row>) => {
      const { data: updated, error } = await supabase
        .from("experiences")
        .update(patch)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      setData(prev => prev.map(r => (r.id === id ? (updated as Row) : r)))
      return updated as Row
    },
    []
  )

  /* 削除 ------------------------------------------------ */
  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("experiences").delete().eq("id", id)
      if (error) throw error
      setData(prev => prev.filter(r => r.id !== id))
    },
    []
  )

  /* 初回ロード */
  useEffect(() => { fetchAll() }, [fetchAll])

  /* refresh エイリアスを公開 */
  const refresh = fetchAll

  return { data, loading, error, refresh, add, update, remove }
}
