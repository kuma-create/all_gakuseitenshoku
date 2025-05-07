"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { ScoutNotification } from "@/components/scout-notification"

// --- Supabase からの生データ型 --- 
type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"]
type ScoutWithRelations = ScoutRow & {
  company_profiles: { company_name: string; logo_url: string } | null
  jobs:               { position:     string                 } | null
}

// --- UI コンポーネントが期待する型 ---
export type UIScout = {
  id:          string
  companyName: string
  position:    string
  message:     string
  createdAt:   string
  status:      "pending" | "accepted" | "declined"
  companyLogo: string
}

export default function ScoutsPage() {
  // ← ここで必ず宣言すること！
  const [scouts, setScouts] = useState<UIScout[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  /** Supabase から取ってきて UIScout[] にマッピング */
  const fetchScouts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("scouts")
      .select(`
        *,
        company_profiles:company_profiles(company_name, logo_url),
        jobs:jobs(position)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch scouts:", error)
      setScouts([])
      setLoading(false)
      return
    }
    if (!data) {
      setScouts([])
      setLoading(false)
      return
    }

    // Supabase の any[] → 自前の型にキャスト
    const rows = data as ScoutWithRelations[]
    const uiScouts: UIScout[] = rows.map((row) => ({
      id:          row.id,
      companyName: row.company_profiles?.company_name ?? "Unknown Company",
      position:    row.jobs?.position         ?? "Unknown Position",
      message:     row.message,
      createdAt:   row.created_at  ?? "",
      status:      (row.status as UIScout["status"]) ?? "pending",
      companyLogo: row.company_profiles?.logo_url ?? "/placeholder.svg",
    }))
    setScouts(uiScouts)
    setLoading(false)
  }

  useEffect(() => {
    fetchScouts()
  }, [])

  /** スカウトを承認して DB と state を両方更新 */
  const handleAccept = async (id: string) => {
    setLoading(true)
    const { error } = await supabase
      .from("scouts")
      .update({ status: "accepted" })
      .eq("id", id)
    if (error) {
      console.error("Error accepting scout:", error)
    } else {
      setScouts((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "accepted" } : s
        )
      )
    }
    setLoading(false)
  }

  /** スカウトを辞退して DB と state を両方更新 */
  const handleDecline = async (id: string) => {
    setLoading(true)
    const { error } = await supabase
      .from("scouts")
      .update({ status: "declined" })
      .eq("id", id)
    if (error) {
      console.error("Error declining scout:", error)
    } else {
      setScouts((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "declined" } : s
        )
      )
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">スカウト一覧</h1>

      {loading && <p>読み込み中...</p>}

      {scouts.length === 0 && !loading && (
        <p className="text-center text-muted-foreground">現在、スカウトはありません。</p>
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
