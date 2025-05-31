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
  Building,
  MapPin,
  Users,
  DollarSign,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

/* ----------------------------- 型 ------------------------------ */
type ScoutDetail = {
  id: string
  message: string
  created_at: string | null
  status: "new" | "sent" | "accepted" | "declined"
  offer_position?: string | null
  offer_amount?: string | null
  companies?: { name: string; logo: string | null } | null
  jobs?: { title: string | null } | null
  company_id: string
  student_id: string
  job_id: string | null
}

type CompanyInfo = {
  id: string
  name: string
  logo: string | null
  industry: string | null
  employee_count: string | null
  location: string | null
  description: string | null
}

type JobSummary = {
  id: string
  title: string | null
  location: string | null
  salary_range: string | null
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

  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [chatRoomId, setChatRoomId] = useState<string | null>(null)

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
            company_id, student_id, job_id,
            companies:companies!scouts_company_id_fkey(
              id, name, logo, industry, employee_count, location, description
            ),
            jobs:jobs!scouts_job_id_fkey(id, title)
          `
        )
        .eq("id", params.id)
        .maybeSingle()

      if (error || !data) {
        setError("スカウトが見つかりませんでした。")
      } else {
        setData(data as ScoutDetail)

        // 会社情報を保存
        const c = (data as any).companies
        if (c) setCompany(c as CompanyInfo)

        // 同一企業の公開求人を取得
        if (c?.id) {
          const { data: jobList } = await supabase
            .from("jobs")
            .select("id, title, location, salary_range")
            .eq("company_id", c.id)
            .eq("is_active", true)
          if (jobList) setJobs(jobList as JobSummary[])
        }

        // 既存チャットルームがあれば取得
        const { data: room } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("company_id", (data as any).company_id)
          .eq("student_id", (data as any).student_id)
          .eq("job_id", (data as any).job_id)
          .maybeSingle()
        if (room?.id) setChatRoomId(room.id)
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
      : data.status === "sent"
      ? "bg-yellow-400 text-yellow-900"
      : data.status === "accepted"
      ? "bg-green-500"
      : "bg-gray-400"

  /* -------- アクション -------- */
  const patchStatus = async (next: "accepted" | "declined") => {
    const now = new Date().toISOString();
    const updates: any = { status: next };
    if (next === "accepted") updates.accepted_at = now;
    if (next === "declined") updates.declined_at = now;

    // scouts.status 更新
    const { error } = await supabase
      .from("scouts")
      .update(updates)
      .eq("id", data.id);

    if (error) {
      alert("更新に失敗しました");
      return;
    }

    if (next === "accepted") {
      const { data: chat } = await supabase
        .from("chat_rooms")
        .upsert(
          {
            company_id: data.company_id,
            student_id: data.student_id,
            job_id:     data.job_id,
          },
          { onConflict: "company_id,student_id,job_id" }
        )
        .select("id")
        .single();

      if (chat?.id) {
        // 既に初回メッセージがあるかチェック
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact" })
          .eq("chat_room_id", chat.id);

        if ((count ?? 0) === 0) {
          await supabase.from("messages").insert({
            chat_room_id: chat.id,
            sender_id: data.company_id,
            content: data.message,
            is_read: false,
          });
        }
      }

      setChatRoomId(chat?.id ?? null);
    }

    setData({ ...data, status: next } as ScoutDetail);
  };

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
                : data.status === "sent"
                ? "未対応"
                : data.status === "accepted"
                ? "承諾"
                : "辞退"}
            </Badge>
          </div>

          {/* Scout message */}
          <div className="whitespace-pre-wrap text-gray-800">
            {data.message}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <Clock size={14} />
            {data.created_at
              ? new Date(data.created_at).toLocaleDateString()
              : "--"}
          </div>
          <Separator className="my-4" />

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

          {/* Company info */}
          {company && (
            <div className="rounded-lg border bg-white p-6 flex gap-6">
              <div className="relative h-24 w-24 rounded-lg border overflow-hidden">
                <Image
                  src={company.logo ?? "/placeholder.svg"}
                  alt="logo"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-semibold">{company.name}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Building size={14} />
                  {company.industry ?? "—"}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Users size={14} />
                  {company.employee_count ?? "—"} 名規模
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin size={14} />
                  {company.location ?? "—"}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  {company.description ?? "企業説明は未登録です。"}
                </p>
              </div>
            </div>
          )}

          {/* Job list */}
          {jobs.length > 0 && (
            <>
              <h3 className="mt-8 mb-4 text-base font-semibold">公開求人</h3>
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-lg border bg-gray-50 p-4 hover:bg-white transition"
                  >
                    <p className="font-medium">{job.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <MapPin size={12} />
                      {job.location ?? "—"}
                      <DollarSign size={12} />
                      {job.salary_range ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ───────── Action footer ───────── */}
          {data.status === "sent" && (
            <>
              <Separator className="my-6" />
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("本当に辞退しますか？　この操作は取り消せません。")) {
                      patchStatus("declined");
                    }
                  }}
                >
                  辞退する
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => patchStatus("accepted")}
                >
                  承諾する
                </Button>
              </div>
            </>
          )}
          {data.status === "accepted" && chatRoomId && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push(`/student/chats/${chatRoomId}`)}
            >
              チャットを開く
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}