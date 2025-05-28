

/* ------------------------------------------------------------------
   app/student/scouts/[id]/page.tsx ― スカウト詳細 (学生側)
------------------------------------------------------------------- */
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase/client"
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Clock,
  Loader2,
  Mail,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

/* ----------------------------- 型 ------------------------------ */
type ScoutDetail = {
  id: string
  message: string
  created_at: string | null
  status: "new" | "pending" | "accepted" | "declined"
  offer_position?: string | null
  offer_amount?: string | null
  companies?: { name: string; logo: string | null } | null
  jobs?: { title: string | null } | null
}

/* ---------------------------- 画面 ----------------------------- */
export default function ScoutDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()

  const [data, setData] = useState<ScoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* -------- Supabase Fetch -------- */
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("scouts")
        .select(
          `
            id, message, created_at, status,
            offer_position, offer_amount,
            companies:companies!scouts_company_id_fkey(name, logo),
            jobs:jobs!scouts_job_id_fkey(title)
          `,
        )
        .eq("id", params.id)
        .maybeSingle()

      if (error || !data) {
        setError("スカウトが見つかりませんでした。")
      } else {
        setData(data as ScoutDetail)
      }
      setLoading(false)
    })()
  }, [params.id])

  /* -------- 状態ごとの UI -------- */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-red-500" />
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-600 mb-4">{error ?? "エラーが発生しました"}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
      </div>
    )
  }

  /* -------------- 表示 -------------- */
  const badgeColor =
    data.status === "new"
      ? "bg-blue-500"
      : data.status === "pending"
      ? "bg-yellow-400 text-yellow-900"
      : data.status === "accepted"
      ? "bg-green-500"
      : "bg-gray-400"

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          一覧に戻る
        </Button>

        {/* Header */}
        <div className="rounded-xl bg-white shadow p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 rounded-full border bg-white overflow-hidden">
              <Image
                src={data.companies?.logo || "/placeholder.svg"}
                alt="logo"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{data.companies?.name}</h2>
              <p className="text-sm text-gray-500 line-clamp-1">
                {data.jobs?.title ?? "—"}
              </p>
            </div>
            <Badge className={`${badgeColor} text-white`}>
              {data.status === "new"
                ? "新着"
                : data.status === "pending"
                ? "未対応"
                : data.status === "accepted"
                ? "承諾"
                : "辞退"}
            </Badge>
          </div>

          {/* Offer panel */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-600">
              オファー内容
            </h3>
            <p className="text-sm">
              <span className="font-medium">ポジション: </span>
              {data.offer_position ?? "—"}
            </p>
            <p className="text-sm">
              <span className="font-medium">年収レンジ: </span>
              {data.offer_amount ? `${data.offer_amount} 万円` : "未定"}
            </p>
          </div>

          <Separator />

          <p className="whitespace-pre-wrap text-gray-800">{data.message}</p>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <Clock size={14} />
            {data.created_at
              ? new Date(data.created_at).toLocaleDateString()
              : "--"}
          </div>
        </div>
      </main>
    </div>
  )
}