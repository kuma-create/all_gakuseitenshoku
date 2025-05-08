/* ───────────────────────────────────────────────
   app/job/[id]/page.tsx
   - increment_job_view RPC で “1 ユーザー 1 日 1 カウント”
   - JobDescription を dynamic import（初回 LCP を短縮）
────────────────────────────────────────────── */
"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import Image from "next/image"
import {
  ArrowLeft,
  Briefcase,
  Building,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  ListFilter,
  Loader2,
  MapPin,
  Plus,
  Quote,
  Send,
  Share2,
  Star,
  Users,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  SkeletonBlock,
  SkeletonText,
  SkeletonCircle,
} from "@/components/ui/skeleton"

/* Supabase client（client component 用） */
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
const supabase = createClientComponentClient()

/* 認証情報 ⇒ userType を取得 */
import { useAuth } from "@/lib/auth-context"

/* ---------- JobDescription を動的に読み込む ---------- */
const JobDescription = dynamic(() => import("./JobDescription"), {
  loading: () => <SkeletonBlock h={300} />,
  ssr: false,
})

/* ---------- 型（簡略） ---------- */
type JobRow = any
type CompanyRow = any

export default function JobDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { userType } = useAuth()

  /* ------------ state ------------ */
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [job, setJob] = useState<JobRow | null>(null)
  const [company, setCompany] = useState<CompanyRow | null>(null)
  const [jobTags, setJobTags] = useState<string[]>([])
  const [related, setRelated] = useState<any[]>([])
  const [hasApplied, setHasApplied] = useState(false)
  const [isInterested, setIsInterested] = useState(false)
  const [showForm, setShowForm] = useState(false)

  /* ---------- RPC: PV インクリメント ---------- */
  const trackJobView = useCallback(
    async (jobId: string) => {
      if (userType !== "student") return
      const { error } = await supabase.rpc("increment_job_view", {
        _job_id: jobId,
      })
      if (error) console.error("PV カウント失敗:", error)
    },
    [userType],
  )

  /* ---------- データ取得 ---------- */
  useEffect(() => {
    if (!params.id) return
    ;(async () => {
      try {
        setLoading(true)

        /* Job + Company */
        const { data: j, error: je } = await supabase
          .from("jobs")
          .select(
            `
            *,
            company:companies(
              id,name,description,logo_url,cover_image_url,
              industry,founded_year,employee_count,location,website_url
            )
          `,
          )
          .eq("id", params.id)
          .single()
        if (je) throw je
        if (!j) throw new Error("求人が見つかりませんでした")

        /* Tags */
        const { data: tags } = await supabase
          .from("job_tags")
          .select("tag")
          .eq("job_id", params.id)

        /* PV カウント */
        trackJobView(params.id)

        /* 応募済みチェック */
        const { data: { user } } = await supabase.auth.getUser()
        const { data: applied } = await supabase
          .from("applications")
          .select("id")
          .eq("job_id", params.id)
          .eq("student_id", user?.id ?? "")
          .maybeSingle()

        /* Related jobs */
        const { data: rel } = await supabase
          .from("jobs")
          .select(
            `
            id,title,location,salary_min,salary_max,
            company:companies(name,logo_url)
          `,
          )
          .eq("company_id", j.company_id)
          .neq("id", params.id)
          .limit(3)

        /* 興味あり localStorage */
        const saved = JSON.parse(localStorage.getItem("savedJobs") || "[]")

        /* state 反映 */
        setJob(j)
        setCompany(j.company)
        setJobTags(tags?.map((t) => t.tag) ?? [])
        setRelated(rel ?? [])
        setHasApplied(Boolean(applied))
        setIsInterested(saved.includes(Number(params.id)))
      } catch (e: any) {
        console.error(e)
        setError(e.message ?? "求人取得に失敗しました")
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id, trackJobView])

  /* ---------- 応募処理 ---------- */
  const handleApply = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("サインインが必要です")
      const { error } = await supabase.from("applications").insert({
        job_id: params.id,
        student_id: user.id,
        status: "applied",
      })
      if (error) throw error
      setHasApplied(true)
      setShowForm(false)
    } catch (e) {
      alert("応募に失敗しました")
    }
  }

  /* ---------- 興味あり toggle ---------- */
  const toggleSave = () => {
    const saved: number[] = JSON.parse(localStorage.getItem("savedJobs") || "[]")
    const next = isInterested
      ? saved.filter((id) => id !== Number(params.id))
      : [...saved, Number(params.id)]
    localStorage.setItem("savedJobs", JSON.stringify(next))
    setIsInterested(!isInterested)
  }

  /* ---------- Loading / Error ---------- */
  if (loading)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-red-500" />
        <p className="text-lg font-medium text-gray-700">読み込み中…</p>
      </div>
    )
  if (error)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md border-red-200 bg-red-50">
          <CardContent className="space-y-4 p-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="font-medium text-red-800">{error}</p>
            <Button onClick={() => history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  if (!job) return null

  /* ───────────────── JSX ───────────────── */
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-red-600"
          >
            <ArrowLeft size={14} /> 求人一覧に戻る
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* ===== LEFT column ===== */}
          <div className="md:col-span-2">
            {/* Header */}
            <Card className="mb-6 overflow-hidden border-0 shadow-md">
              <div className="h-32 w-full bg-gradient-to-r from-red-500 to-red-600 opacity-90" />
              <CardContent className="relative -mt-16 bg-white p-6">
                <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <Image
                    src={
                      company?.logo_url ||
                      "/placeholder.svg?height=128&width=128&text=Company"
                    }
                    alt="logo"
                    width={80}
                    height={80}
                    className="rounded-xl border-4 border-white bg-white object-cover shadow-md"
                  />
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold">{job.title}</h1>
                    <div className="mt-1 flex gap-2">
                      <Link
                        href={`/company/${company?.id}`}
                        className="font-medium text-red-600 hover:underline"
                      >
                        {company?.name}
                      </Link>
                      {new Date(job.created_at).getTime() >
                        Date.now() - 7 * 864e5 && (
                        <Badge className="bg-red-500">新着</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {jobTags.map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="bg-red-50 text-xs text-red-700"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* chips */}
                <div className="grid gap-4 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
                  {[
                    ["勤務地", job.location, MapPin],
                    ["勤務形態", job.work_style || "ハイブリッド", Building],
                    [
                      "給与",
                      `年収${job.salary_min}〜${job.salary_max}万円`,
                      Briefcase,
                    ],
                    [
                      "応募締切",
                      job.deadline
                        ? new Date(job.deadline).toLocaleDateString("ja-JP")
                        : "期限なし",
                      Calendar,
                    ],
                  ].map(([label, val, Icon]) => (
                    <div key={label as string} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <Icon as any size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="font-medium">{val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* JobDescription（動的 import） */}
            <JobDescription html={job.description.replace(/\n/g, "<br />")} />

            {/* 以下：Requirements / WorkingConditions など元コードそのまま */}
            {/* … */}
          </div>

          {/* ===== RIGHT column ===== */}
          <div className="space-y-6">
            {/* Apply card */}
            <Card className="sticky top-4 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="rounded-lg bg-red-50 p-4 text-center">
                    <p className="font-bold text-red-700">
                      この求人に興味がありますか？
                    </p>
                    <p className="text-sm text-gray-700">
                      応募はカンタン 1 分で完了
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {hasApplied ? (
                      <Button disabled className="w-full bg-green-600">
                        <Check className="mr-1 h-4 w-4" />
                        応募済み
                      </Button>
                    ) : job.status === "closed" ? (
                      <Button disabled className="w-full bg-gray-400">
                        募集終了
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-red-600"
                        onClick={() => setShowForm(true)}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        応募する
                      </Button>
                    )}

                    <Button
                      variant={isInterested ? "default" : "outline"}
                      onClick={toggleSave}
                      className={isInterested ? "bg-yellow-500" : ""}
                    >
                      <Star
                        size={16}
                        className={isInterested ? "fill-current" : ""}
                      />
                      {isInterested ? "興味あり済み" : "興味ありに登録"}
                    </Button>

                    <Button variant="outline">
                      <Share2 size={16} /> シェア
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 企業情報 / 関連求人カード …（元コードをそのまま配置） */}
          </div>
        </div>

        {/* 応募フォーム Dialog（元コードを使用） */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          {/* … */}
        </Dialog>
      </main>
    </div>
  )
}
