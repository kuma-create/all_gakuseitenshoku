/* ────────────────────────────────────────────────
   app/jobs/[id]/page.tsx
   - 学生ユーザ用：求人詳細ページ
   - ⭐ “興味あり” は job_interests テーブルで管理
   - 👁️ 1 日 1 回の pv カウント RPC: increment_job_view
──────────────────────────────────────────────── */
"use client"

import {
  useState,
  useEffect,
  useCallback,
  Fragment,
} from "react"
import Link from "next/link"
import Image from "next/image"
import dynamic, { type DynamicOptions } from "next/dynamic"
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Building2,
  Calendar,
  Check,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Users,
} from "lucide-react"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
const supabase = createClientComponentClient()

import { useAuth } from "@/lib/auth-context"
import { useJobInterest } from "@/lib/hooks/use-job-interest"

import type { Database } from "@/lib/supabase/types"
type JobRow     = Database["public"]["Tables"]["jobs"]["Row"]
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"]

/* Heavy な Markdown 描画を遅延読み込み */
const JobDescription = dynamic(
  () =>
    import("@/components/job-description").then((m) => ({
      default: m.JobDescription,
    })),          // 👈 named export → default に包んで返す
  { ssr: false, loading: () => <SkeletonDescription /> },
)


/* ---------- Skeleton ---------- */
function SkeletonDescription() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-muted-foreground/20" />
      ))}
    </div>
  )
}

/* =================================================================== */
/*                               Page                                  */
/* =================================================================== */
export default function JobPage({ params }: { params: { id: string } }) {
  /* -------------------- Auth -------------------- */
  const { userType, session } = useAuth()           // "student" / "company" / null
  const studentId = session?.user?.id ?? null

  /* -------------------- State ------------------- */
  const [loading,     setLoading]     = useState(true)
  const [job,         setJob]         = useState<JobRow | null>(null)
  const [company,     setCompany]     = useState<CompanyRow | null>(null)
  const [tags,        setTags]        = useState<string[]>([])
  const [error,       setError]       = useState<string | null>(null)
  const [hasApplied,  setHasApplied]  = useState(false)

  /* ⭐ “興味あり” */
  const { loading: interestLoading, interested, toggle } =
    useJobInterest(params.id)

  /* ----------------- Helpers -------------------- */
  const trackPV = useCallback(async () => {
    if (!params.id || !studentId) return
    const { error } = await supabase.rpc("increment_job_view", {
      _job_id: params.id,
    })
    if (error) console.error("increment_job_view error", error)
  }, [params.id, studentId])

  /* ----------------- Fetch ---------------------- */
  useEffect(() => {
    if (!params.id) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        /* Job + 会社 */
        const { data: j, error: je } = await supabase
          .from("jobs")
          .select(
            `
            *,
            company:companies!jobs_company_id_fkey(
              id, name, description, logo, cover_image_url,
              industry, founded_year, employee_count,
              location, recruit_website
            )
          `,
          )
          .eq("id", params.id)
          .single()
        if (je) throw je
        if (!j) throw new Error("求人が見つかりませんでした")

        /* Tags */
        const { data: jt } = await supabase
          .from("job_tags")
          .select("tag")
          .eq("job_id", params.id)

        /* 応募済み判定（学生のみ） */
        if (userType === "student" && studentId) {
          const { data: ap } = await supabase
            .from("applications")
            .select("id")
            .eq("job_id", params.id)
            .eq("student_id", studentId)
            .maybeSingle()
          setHasApplied(!!ap)
        }

        setJob(j)
        setCompany(j.company)
        setTags(jt?.map((t) => t.tag) ?? [])

        void trackPV()
      } catch (e: any) {
        console.error(e)
        setError(e.message ?? "データ取得に失敗しました")
      } finally {
        setLoading(false)
      }
    })()
  }, [params.id, userType, studentId, trackPV])

  /* ------------------- UI ----------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        読み込み中...
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error ?? "求人が見つかりません"}</p>
        <ButtonBack />
      </div>
    )
  }

  /* ------------ Render ------------- */
  return (
    <main className="pb-24">
      {/* ===== ヘッダー ===== */}
      <section className="relative h-48 w-full">
        {/* カバー画像 */}
        {company?.cover_image_url && (
          <Image
            src={company.cover_image_url}
            alt={`${company.name} cover`}
            fill
            className="object-cover opacity-80"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/40" />

        {/* 操作ボタン */}
        <div className="absolute left-4 top-4 flex gap-2">
          <ButtonBack />

          {/* ⭐ 興味あり */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow"
            disabled={interestLoading}
            onClick={toggle}
          >
            {interestLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : interested ? (
              <BookmarkCheck className="h-5 w-5 text-primary" />
            ) : (
              <Bookmark className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* 会社ロゴ */}
        {company?.logo && (
          <Image
            src={company.logo}
            width={96}
            height={96}
            alt={`${company.name} logo`}
            className="absolute bottom-4 right-4 rounded-lg object-contain shadow-lg"
          />
        )}
      </section>

      {/* ===== メイン情報 ===== */}
      <section className="container mt-6 space-y-8">
        {/* タイトル */}
        <h1 className="text-2xl font-bold">{job.title}</h1>

        {/* メタ */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {company && (
            <span className="flex items-center gap-1">
              <Building2 size={14} />
              {company.name}
            </span>
          )}
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {job.location}
            </span>
          )}
          {job.salary_min && (
            <span className="flex items-center gap-1">
              <DollarSign size={14} />
              {job.salary_min} 〜 {job.salary_max ?? "応相談"} 万円
            </span>
          )}
        </div>

        {/* タグ */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* 応募ボタン */}
        {userType === "student" && (
          <ApplySection jobId={job.id} hasApplied={hasApplied} />
        )}

        {/* ========= タブ ========= */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* ------- 左カラム：詳細 ------- */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">仕事内容</h2>
            <JobDescription markdown={job.description ?? ""} />
          </div>

          {/* ------- 右カラム：会社 ------- */}
          {company && (
            <aside className="space-y-6 rounded-lg border p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold">会社情報</h3>

              <InfoRow icon={Briefcase} label="業種">
                {company.industry || "-"}
              </InfoRow>
              <InfoRow icon={Calendar} label="設立">
                {company.founded_year ? `${company.founded_year} 年` : "-"}
              </InfoRow>
              <InfoRow icon={Users} label="従業員数">
                {company.employee_count
                  ? `${company.employee_count} 名`
                  : "-"}
              </InfoRow>
              <InfoRow icon={MapPin} label="所在地">
                {company.location || "-"}
              </InfoRow>

              {company.recruit_website && (
                <a
                  href={company.recruit_website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline"
                >
                  会社サイト <ExternalLink size={14} />
                </a>
              )}
            </aside>
          )}
        </div>
      </section>
    </main>
  )
}

/* =================================================================== */
/*                               Parts                                 */
/* =================================================================== */

/* -------- 戻るボタン -------- */
function ButtonBack() {
  return (
    <Link
      href="/jobs"
      className="inline-flex h-10 items-center gap-1 rounded-full bg-white/90 px-4 text-sm shadow"
    >
      <ArrowLeft size={16} /> 戻る
    </Link>
  )
}

/* -------- 応募エリア -------- */
function ApplySection({
  jobId,
  hasApplied,
}: {
  jobId: string
  hasApplied: boolean
}) {
  const [posting, setPosting] = useState(false)
  const handleApply = async () => {
    if (hasApplied) return
    setPosting(true)
    const supabase = createClientComponentClient<Database>()
    const { error } = await supabase.from("applications").insert({
      job_id: jobId,
    })
    if (error) {
      alert("応募に失敗しました")
    } else {
      alert("応募が完了しました！")
    }
    setPosting(false)
  }

  return (
    <div className="mt-6">
      <button
        className={`flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 text-white transition ${
          hasApplied
            ? "cursor-not-allowed bg-gray-400"
            : "bg-primary hover:bg-primary/90"
        }`}
        disabled={hasApplied || posting}
        onClick={handleApply}
      >
        {posting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : hasApplied ? (
          <>
            <Check size={16} /> 応募済み
          </>
        ) : (
          "応募する"
        )}
      </button>
    </div>
  )
}

/* -------- 会社情報の行 -------- */
type InfoProps = {
  icon: typeof Building2
  label: string
  children: React.ReactNode
}
function InfoRow({ icon: Icon, label, children }: InfoProps) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon size={16} className="mt-[2px] text-muted-foreground" />
      <div>
        <p className="font-medium text-muted-foreground">{label}</p>
        <p>{children}</p>
      </div>
    </div>
  )
}
