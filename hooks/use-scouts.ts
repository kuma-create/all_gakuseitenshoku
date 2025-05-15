/* ------------------------------------------------------------------
   hooks/use-scouts.ts  – company 側スカウト取得フック（ガード付き）
------------------------------------------------------------------ */
"use client"

import { useEffect, useState } from "react"
import { supabase }            from "@/lib/supabase/client"

type ScoutRow = {
  id: string
  created_at: string
  company: {
    id: string
    name: string
    logo: string | null        // logo_url → logo
  }
  student: {
    id: string
    full_name: string          // display_name → full_name
    avatar_url: string | null
  }
}

export const useScouts = (companyId?: string | null) => {
  const [rows,    setRows]    = useState<ScoutRow[]>([])
  const [loading, setLoading] = useState(true)       // ★ 初期値 true
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false      // ★ Abort 用フラグ

    const fetch = async () => {
      /* ---------- 認証チェック ---------- */
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !companyId) {
        // 未ログイン or companyId なし → 何もしない
        if (!cancelled) {
          setRows([])
          setLoading(false)
        }
        return
      }

      setLoading(true)

      /* ---------- スカウト取得 ---------- */
      const { data, error } = await supabase
        .from("scouts")
        .select(`
          id,
          created_at,
          company:companies(id,name,logo),
          student:student_profiles(id,full_name,avatar_url)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (cancelled) return      // Unmount 後の setState 防止

      if (error) {
        setError(error.message)
        setRows([])
      } else {
        setError(null)
        setRows(data as ScoutRow[])
      }
      setLoading(false)
    }

    fetch()

    /* ---------- Clean-up ---------- */
    return () => {
      cancelled = true
    }
  }, [companyId])

  return { rows, loading, error }
}
