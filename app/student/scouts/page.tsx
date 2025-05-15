/* ------------------------------------------------------------------
   app/student/scouts/page.tsx
   - 学生向けスカウト一覧（認証ガード付き）
------------------------------------------------------------------ */
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase }  from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { ScoutNotification } from "@/components/scout-notification"
import { Loader2 } from "lucide-react"

/* -------------------------------- 型 -------------------------------- */

type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"]

type ScoutWithRelations = ScoutRow & {
  companies: { name: string; logo: string | null } | null
  jobs:      { title: string | null } | null
}

export type UIScout = {
  id:          string
  companyName: string
  position:    string
  message:     string
  createdAt:   string
  status:      "pending" | "accepted" | "declined"
  companyLogo: string
}

/* ------------------------------ 画面 ------------------------------ */

export default function ScoutsPage() {
  const router = useRouter()

  const [scouts,  setScouts]  = useState<UIScout[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  /* ------------------------ データ取得 ------------------------ */
  const fetchScouts = useCallback(
    async (uid: string) => {
      setLoading(true)

      const { data, error } = await supabase
        .from("scouts")
        .select(
          `
          *,
          companies:companies(name, logo),
          jobs:jobs(title)
        `,
        )
        .eq("target_id", uid)                         // ★ 認証ユーザーのみ
        .order("created_at", { ascending: false })
        .returns<ScoutWithRelations[]>()

      if (error) {
        console.error("Failed to fetch scouts:", error)
        setError(error.message)
        setScouts([])
      } else {
        const uiScouts: UIScout[] = (data ?? []).map((row) => ({
          id:          row.id,
          companyName: row.companies?.name ?? "Unknown Company",
          position:    row.jobs?.title      ?? "Unknown Position",
          message:     row.message,
          createdAt:   row.created_at       ?? "",
          status:      (row.status as UIScout["status"]) ?? "pending",
          companyLogo: row.companies?.logo  ?? "/placeholder.svg",
        }))
        setError(null)
        setScouts(uiScouts)
      }
      setLoading(false)
    },
    [],
  )

  /* --------------------- 認証ガード＋初回取得 -------------------- */
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // 未ログインならログイン画面へ
        router.replace("/login")
        return
      }

      if (!cancelled) await fetchScouts(user.id)
    })()

    return () => {
      cancelled = true
    }
  }, [fetchScouts, router])

  /* ---------------------- ステータス更新 ----------------------- */
  const patchStatus = async (id: string, next: UIScout["status"]) => {
    setLoading(true)

    const { error } = await supabase
      .from("scouts")
      .update({ status: next })
      .eq("id", id)

    if (error) {
      console.error(`Error updating scout status to ${next}:`, error)
    } else {
      setScouts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: next } : s)),
      )
    }
    setLoading(false)
  }

  const handleAccept  = (id: string) => patchStatus(id, "accepted")
  const handleDecline = (id: string) => patchStatus(id, "declined")

  /* ------------------------ レンダリング ------------------------ */
  return (
    <div className="container mx-auto space-y-6 py-8">
      <h1 className="text-3xl font-bold">スカウト一覧</h1>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          読み込み中...
        </div>
      )}

      {!loading && error && (
        <p className="text-red-500">Error: {error}</p>
      )}

      {!loading && !error && scouts.length === 0 && (
        <p className="text-center text-muted-foreground">
          現在、スカウトはありません。
        </p>
      )}

      <div className="space-y-4">
        {scouts.map((scout) => (
          <ScoutNotification
            key={scout.id}
            scout={scout}
            onAccept={handleAccept}
            onDecline={handleDecline}
            isLoading={loading}
          />
        ))}
      </div>
    </div>
  )
}
