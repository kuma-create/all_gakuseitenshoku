/* -------------------------------------------------
   lib/hooks/use-student-scouts.ts
   - 学生向けスカウト取得（早期リターン & 正しい REST 形式）
------------------------------------------------- */
"use client"

import { useEffect, useState } from "react"
import { supabase }  from "@/lib/supabase/client"

export type UIScout = {
  id:          string
  companyName: string
  position:    string
  message:     string
  createdAt:   string
  status:      "pending" | "accepted" | "declined"
  companyLogo: string
}

export function useStudentScouts() {
  const [data,    setData]    = useState<UIScout[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      /* ---------- 認証ユーザー取得 ---------- */
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) {
          setData([])
          setLoading(false)
        }
        return
      }

      /* ---------- 正しい REST 形式で取得 ---------- */
      const { data: rows, error } = await supabase
        .from("scouts")
        .select(`
          id,
          message,
          status,
          created_at,
          companies (
            name,
            logo
          ),
          jobs (
            title
          )
        `)                         // ← コロンを使わず (table) 形式
        .eq("target_id", user.id)
        .order("created_at", { ascending: false })

      if (cancelled) return

      if (error) {
        setError(error.message)
        setData([])
      } else {
        const mapped = (rows ?? []).map((r) => ({
          id:          r.id,
          companyName: (r as any).companies?.name ?? "Unknown Company",
          position:    (r as any).jobs?.title     ?? "Unknown Position",
          message:     (r as any).message,
          createdAt:   (r as any).created_at ?? "",
          status:      (r as any).status as UIScout["status"],
          companyLogo: (r as any).companies?.logo ?? "/placeholder.svg",
        }))
        setError(null)
        setData(mapped)
      }
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [])

  return { scouts: data, loading, error }
}
