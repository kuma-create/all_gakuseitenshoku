"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

type JobAppEntry = {
  job_title: string
  cnt: number
}

export default function AnalyticsPage() {
  const [chart, setChart] = useState<JobAppEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // ① 認証ユーザーを取得
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("ログイン情報を取得できません")
        setLoading(false)
        return
      }

      // ② company_members から所属企業 ID を取得（owner / recruiter 共通）
      const { data: member, error: memErr } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (memErr) {
        console.error(memErr)
        setError("企業情報の取得に失敗しました")
        setLoading(false)
        return
      }

      const companyId = member?.company_id
      if (!companyId) {
        setError("企業が紐付いていません")
        setLoading(false)
        return
      }

      // ③ 企業別の応募数データを取得
      const { data, error } = await supabase
        .from("job_app_count")
        .select("job_title, cnt")
        .eq("company_id", companyId)
        .order("cnt", { ascending: false })

      if (error) {
        console.error(error)
        setError("データの取得に失敗しました")
      } else {
        // Supabase から返る型を絞り込む
        setChart((data ?? []) as JobAppEntry[])
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <span className="text-gray-500">読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80">
        <span className="text-red-500">{error}</span>
      </div>
    )
  }

  if (chart.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <span className="text-gray-500">表示するデータがありません</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">応募数分析</h1>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chart}
          margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="job_title"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-15}
            dy={20}
            dx={-5}
          />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="cnt" name="応募数" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
