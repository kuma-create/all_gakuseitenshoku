/* ───────────────────────────────────────────────
   app/company/jobs/page.tsx
   - 会社側：求人一覧（Supabase 実データ版）
────────────────────────────────────────────── */
"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  Search,
  SlidersHorizontal,
  Plus,
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  Edit,
  Eye,
  Users,
  Trash2,
  MoreHorizontal,
} from "lucide-react"

import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { useAuth } from "@/lib/auth-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

/* ------------------------------------------------------------------ */
/*                           Supabase 型定義                           */
/* ------------------------------------------------------------------ */
type JobRow = Database["public"]["Tables"]["jobs"]["Row"]

/* 会社ごとの応募レコードだけ読み込むので job_id だけで十分 */
type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"]

/* UI 用に拡張した型（location / work_type は JobRow に既存） */
interface JobItem extends JobRow {
  applicants : number
  status     : "公開中" | "下書き" | "締切済"
  postedDate : string            // YYYY-MM-DD
  expiryDate : string            // YYYY-MM-DD | ""
  /* jobs テーブルに無い場合だけ追加 */
  department?: string | null
}

/* ------------------------------------------------------------------ */
/*                             画面本体                                */
/* ------------------------------------------------------------------ */
export default function CompanyJobsPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [jobs, setJobs]       = useState<JobItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  /* フィルタ UI 用 state */
  const [searchTerm , setSearchTerm ] = useState("")
  const [statusTab  , setStatusTab  ] = useState("all")
  const [sortOption , setSortOption ] = useState<"posted"|"applicants"|"expiry">("posted")

  /* ------------------ Supabase からデータ取得 --------------------- */
  useEffect(() => {
    if (!user) return

    ;(async () => {
      setLoading(true)
      setError(null)

      /* 1) 会社 ID を取得（重複やゼロ件でも落ちない） */
      const { data: companyRow, error: companyErr } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (companyErr) {
        setError(companyErr.message)
        setLoading(false)
        return
      }
      if (!companyRow) {
        setError("会社プロフィールが登録されていません")
        setLoading(false)
        return
      }

      /* 2) 会社の求人を取得 */
      const { data: jobsData, error: jobsErr } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", companyRow.id)

      if (jobsErr) {
        setError(jobsErr.message)
        setLoading(false)
        return
      }

      /* 3) 応募数を集計 */
      const { data: appsData, error: appsErr } = await supabase
        .from("applications")
        .select("job_id")

      if (appsErr) {
        setError(appsErr.message)
        setLoading(false)
        return
      }

      const counts: Record<string, number> = {}
      appsData.forEach(a => {
        if (!a.job_id) return
        counts[a.job_id] = (counts[a.job_id] ?? 0) + 1
      })

      /* 4) UI 用整形 */
      const now    = new Date()
      const toDate = (d: string | null) => (d ? d.slice(0, 10) : "")

      const jobItems: JobItem[] = jobsData.map(j => {
        const status: JobItem["status"] =
          !j.published
            ? "下書き"
            : j.published_until && new Date(j.published_until) < now
            ? "締切済"
            : "公開中"

        return {
          ...j,
          applicants: counts[j.id] ?? 0,
          status,
          postedDate: toDate(j.created_at),
          expiryDate: toDate(j.published_until),
          department: (j as any).department ?? null,
        }
      })

      setJobs(jobItems)
      setLoading(false)
    })()
  }, [user])

  /* -------------------- 検索・フィルタ・ソート -------------------- */
  const filteredJobs = useMemo(() => {
    let data = jobs.filter(j =>
      `${j.title}${j.department ?? ""}${j.location ?? ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )

    if (statusTab !== "all") data = data.filter(j => j.status === statusTab)

    data.sort((a, b) => {
      if (sortOption === "posted")
        return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
      if (sortOption === "applicants")
        return b.applicants - a.applicants
      return new Date(a.expiryDate || "2099-12-31").getTime() -
             new Date(b.expiryDate || "2099-12-31").getTime()
    })

    return data
  }, [jobs, searchTerm, statusTab, sortOption])

  /* ステータス別件数 */
  const counts = useMemo(() => ({
    all   : jobs.length,
    公開中 : jobs.filter(j => j.status === "公開中").length,
    下書き : jobs.filter(j => j.status === "下書き").length,
    締切済 : jobs.filter(j => j.status === "締切済").length,
  }), [jobs])

  /* バッジ色 */
  const badgeColor = (s: JobItem["status"]) => ({
    公開中 : "bg-green-100 text-green-800 hover:bg-green-100",
    下書き : "bg-gray-100 text-gray-800 hover:bg-gray-100",
    締切済 : "bg-red-100 text-red-800 hover:bg-red-100",
  }[s])

  /* 残り日数 */
  const remainDays = (expiry: string) => {
    if (!expiry) return "-"
    const diff = new Date(expiry).getTime() - Date.now()
    return diff <= 0 ? 0 : Math.ceil(diff / 86_400_000)
  }

  /* 削除 */
  const deleteJob = async (id: string) => {
    if (!window.confirm("この求人を削除しますか？")) return
    await supabase.from("jobs").delete().eq("id", id)
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  /* ------------------------------ UI ------------------------------ */
  if (loading) return <p className="p-4">Loading…</p>
  if (error)   return <p className="p-4 text-red-600">{error}</p>

  return (
    <div className="container mx-auto py-8 px-4">
      {/* 見出し */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">求人一覧</h1>
          <p className="text-gray-500">登録済みの求人を管理・編集できます</p>
        </div>
        <Link href="/company/jobs/new" className="mt-4 md:mt-0">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> 新しい求人を作成
          </Button>
        </Link>
      </div>

      {/* 検索・ソート */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="求人名、部署、勤務地などで検索..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={sortOption} onValueChange={v => setSortOption(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue placeholder="並び替え" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="posted">公開順</SelectItem>
              <SelectItem value="applicants">応募数順</SelectItem>
              <SelectItem value="expiry">締切日順</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ステータス タブ */}
        <Tabs defaultValue="all" className="mb-6" onValueChange={setStatusTab}>
          <TabsList className="grid grid-cols-4 mb-2">
            <TabsTrigger value="all">すべて ({counts.all})</TabsTrigger>
            <TabsTrigger value="公開中">公開中 ({counts.公開中})</TabsTrigger>
            <TabsTrigger value="下書き">下書き ({counts.下書き})</TabsTrigger>
            <TabsTrigger value="締切済">締切済 ({counts.締切済})</TabsTrigger>
          </TabsList>

          <TabsContent value={statusTab} className="mt-0">
            <JobGrid
              jobs={filteredJobs}
              badgeColor={badgeColor}
              remainDays={remainDays}
              deleteJob={deleteJob}
              push={router.push}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                           下位コンポーネント                         */
/* ------------------------------------------------------------------ */
function JobGrid({
  jobs,
  badgeColor,
  remainDays,
  deleteJob,
  push,
}: {
  jobs       : JobItem[]
  badgeColor : (s: JobItem["status"]) => string | undefined
  remainDays : (e: string) => number | string
  deleteJob  : (id: string) => void
  push       : (path: string) => void
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {jobs.map(job => (
          <Card key={job.id} className="overflow-hidden border border-gray-200 transition-all hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <Badge className={badgeColor(job.status)}>{job.status}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => push(`/company/jobs/${job.id}`)}>
                      <Edit className="mr-2 h-4 w-4" /> 編集する
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => push(`/company/applicants?jobId=${job.id}`)}
                      disabled={job.applicants === 0}
                    >
                      <Users className="mr-2 h-4 w-4" /> 応募者を見る
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteJob(job.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> 削除する
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="text-xl font-semibold mb-2 line-clamp-2">{job.title}</h3>

              <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Briefcase className="h-4 w-4 mr-1.5 text-gray-500" />
                  <span>{job.department ?? "-"}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1.5 text-gray-500" />
                  <span>{job.work_type ?? "-"}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1.5 text-gray-500" />
                  <span>{job.location ?? "-"}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1.5 text-gray-500" />
                  <span>
                    {job.expiryDate
                      ? `残り${remainDays(job.expiryDate)}日`
                      : "期限なし"}
                  </span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <Stat
                  icon={<Users className="h-4 w-4 mr-1.5 text-blue-500" />}
                  label="応募者数"
                  value={`${job.applicants}名`}
                />
                <Stat
                  icon={<Eye className="h-4 w-4 mr-1.5 text-blue-500" />}
                  label="閲覧数"
                  value={`${job.views ?? 0}回`}
                />
              </div>
            </CardContent>

            <CardFooter className="bg-gray-50 px-5 py-3 flex justify-between">
              <Button variant="outline" size="sm" onClick={() => push(`/company/jobs/${job.id}`)}>
                <Edit className="h-4 w-4 mr-1.5" /> 編集
              </Button>
              <Button
                variant={job.applicants > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => push(`/company/applicants?jobId=${job.id}`)}
                disabled={job.applicants === 0}
                className={job.applicants > 0 ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <Users className="h-4 w-4 mr-1.5" />
                {job.applicants > 0 ? `応募者を見る (${job.applicants})` : "応募者なし"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {jobs.length === 0 && <Empty />}
    </>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-semibold flex items-center">
        {icon}
        {value}
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
      <div className="text-gray-400 mb-4">
        <Briefcase className="h-12 w-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium mb-2">まだ求人が登録されていません</h3>
      <p className="text-gray-500 mb-4">
        新しい求人を作成して、優秀な人材を募集しましょう
      </p>
      <Link href="/company/jobs/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" /> 新しい求人を作成
        </Button>
      </Link>
    </div>
  )
}
