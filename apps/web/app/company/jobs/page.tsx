/* ───────────────────────────────────────────────
   app/company/jobs/page.tsx
   会社側：求人一覧（Supabase 実データ版）
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
  MapPin,
  Edit,
  Eye,
  Users,
  Trash2,
  MoreHorizontal,
  Copy,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/* ------------------------------------------------------------------
   Supabase 型定義
------------------------------------------------------------------ */
type JobRow = Database["public"]["Tables"]["jobs"]["Row"] & {
  // relations are fetched separately to avoid FK ambiguity
}

/* UI 用に拡張した型 */
interface JobItem extends JobRow {
  applicants : number
  status     : "公開中" | "下書き" | "締切済"
  postedDate : string
  expiryDate : string
  workingDays?: string | null
  eventDate?: string | null
  internStartDate?: string | null
  displayDate?: string | null
  /* ↓ SelectionRow に含まれていない場合の型エラー回避 */
}

/* ------------------------------------------------------------------
   画面本体
------------------------------------------------------------------ */
export default function CompanyJobsPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [jobs, setJobs]       = useState<JobItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  /* フィルタ用 state */
  const [searchTerm , setSearchTerm ] = useState("")
  const [statusTab  , setStatusTab  ] = useState("all")
  const [selTypeFilter, setSelTypeFilter] = useState("all");
  const [sortOption , setSortOption ] =
    useState<"posted"|"applicants"|"expiry">("posted")
  const [typePickerOpen, setTypePickerOpen] = useState(false)

  const SELECTION_TYPES = [
    { value: "all",              label: "すべての選考" },
    { value: "fulltime",         label: "本選考" },
    { value: "internship_short", label: "インターン（短期）" },
    { value: "intern_long",      label: "インターン（長期）" },   // ★ 追加
    { value: "event",            label: "説明会／イベント" },
  ] as const;

  /* ---------------- Supabase からデータ取得 ---------------- */
  useEffect(() => {
    if (!user) return

    ;(async () => {
      setLoading(true)
      setError(null)

      /* ❶ company_members 経由で会社 ID 取得 (owner / recruiter 共通) */
      const { data: member, error: memErr } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (memErr) { setError(memErr.message); setLoading(false); return }
      if (!member) {
        setError("会社アカウントがありません")
        setLoading(false)
        return
      }

      const companyId = member.company_id  // ★ ここで変数を定義


      /* ❷ jobs テーブルのみ取得 */
      const { data: jobsData, error: jobsErr } = await supabase
        .from("jobs")
        .select(`
          id,
          company_id,
          title,
          location,
          published,
          selection_type,
          application_deadline,
          created_at,
          views
        `)
        .eq("company_id", companyId)
        .returns<JobRow[]>();

      if (jobsErr) { setError(jobsErr.message); setLoading(false); return }
      if (!jobsData) { setJobs([]); setLoading(false); return }

      // ❸ detail テーブルを個別に取得（FK が複数あり select のネストだと曖昧になるため）
      const ids = (jobsData ?? []).map(j => j.id).filter(Boolean) as string[]

      const [{ data: fulls }, { data: events }, { data: interns }] = await Promise.all([
        supabase.from("fulltime_details").select("selection_id, working_days").in("selection_id", ids),
        supabase.from("event_details").select("selection_id, event_date").in("selection_id", ids),
        supabase.from("internship_details").select("selection_id, start_date").in("selection_id", ids),
      ])

      const mapWorking: Record<string, string | null> = {}
      fulls?.forEach(r => { if (r.selection_id) mapWorking[r.selection_id] = r.working_days ?? null })

      const mapEvent: Record<string, string | null> = {}
      events?.forEach(r => { if (r.selection_id) mapEvent[r.selection_id] = r.event_date ?? null })

      const mapIntern: Record<string, string | null> = {}
      interns?.forEach(r => { if (r.selection_id) mapIntern[r.selection_id] = r.start_date ?? null })

      /* ❹ 応募数取得 */
      const { data: appsData, error: appsErr } = await supabase
        .from("applications")
        .select("job_id")                // ← 現状 DB は job_id のまま

      if (appsErr) { setError(appsErr.message); setLoading(false); return }

      const counts: Record<string, number> = {}
      appsData.forEach(a => {
        const sid = a.job_id as string | null
        if (sid) counts[sid] = (counts[sid] ?? 0) + 1
      })

      /* ❺ 整形 */
      const rows = (jobsData as JobRow[]) ?? [];
      const list: JobItem[] = rows.map(j => {
        const selId = j.id as string  // SelectionRow["id"] は string | null のため
        const deadline = j.application_deadline           // 新しい期限カラム
        const created   = j.created_at
        const now       = new Date()

        return {
          ...j,
          workingDays: mapWorking[selId] ?? null,
          eventDate: mapEvent[selId] ?? null,
          internStartDate: mapIntern[selId] ?? null,
          displayDate:
            j.selection_type === "event"
              ? (mapEvent[selId]?.slice(0, 10) ?? null)
              : j.selection_type === "internship_short"
              ? (mapIntern[selId]?.slice(0, 10) ?? null)
              : null,
          applicants: counts[selId] ?? 0,
          status: !j.published
            ? "下書き"
            : deadline && new Date(deadline) < now
            ? "締切済"
            : "公開中",
          postedDate : created?.slice(0,10) ?? "",
          expiryDate : deadline?.slice(0,10) ?? "",
        }
      })

      setJobs(list)
      setLoading(false)
    })()
  }, [user])

  /* ---------------- 検索・フィルタ・ソート ---------------- */
  const filteredJobs = useMemo(() => {
    let data = jobs
      .filter(j =>
        `${j.title}${j.location ?? ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
      .filter(j => selTypeFilter === "all" || j.selection_type === selTypeFilter);

    if (statusTab !== "all") data = data.filter(j => j.status === statusTab)

    data.sort((a,b) => {
      if (sortOption === "posted")
        return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
      if (sortOption === "applicants")
        return b.applicants - a.applicants
      return new Date(a.expiryDate||"2099-12-31").getTime()
           - new Date(b.expiryDate||"2099-12-31").getTime()
    })

    return data
  }, [jobs, searchTerm, statusTab, sortOption, selTypeFilter])

  const counts = useMemo(() => ({
    all   : jobs.length,
    公開中 : jobs.filter(j=>j.status==="公開中").length,
    下書き : jobs.filter(j=>j.status==="下書き").length,
    締切済 : jobs.filter(j=>j.status==="締切済").length,
  }), [jobs])

  const badgeColor = (s: JobItem["status"]) => ({
    公開中 : "bg-green-100 text-green-800",
    下書き : "bg-gray-100 text-gray-800",
    締切済 : "bg-red-100 text-red-800",
  }[s])

  const remain = (e:string) => {
    if(!e) return "-"
    const diff = new Date(e).getTime()-Date.now()
    return diff<=0?0:Math.ceil(diff/86_400_000)
  }

  const deleteJob = async(id:string)=>{
    if(!confirm("この求人を削除しますか？")) return
    await supabase.from("jobs").delete().eq("id", id)
    setJobs(prev=>prev.filter(j=>j.id!==id))
  }

  /* ---------------- UI ---------------- */
  if(loading) return <p className="p-4">Loading…</p>
  if(error)   return <p className="p-4 text-red-600">{error}</p>

  return (
    <div className="container mx-auto py-8 px-4">
      {/* ヘッダ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">選考一覧</h1>
          <p className="text-gray-500">登録済みの選考を管理・編集できます</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 mt-4 md:mt-0"
          onClick={()=>setTypePickerOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4"/> 新しい選考を作成
        </Button>
      </div>

      <Dialog open={typePickerOpen} onOpenChange={setTypePickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>選考種類を選択</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {SELECTION_TYPES.filter(t=>t.value!=="all").map(t=>(
              <Button
                key={t.value}
                variant="outline"
                className="justify-start"
                onClick={()=>{
                  setTypePickerOpen(false)
                  router.push(`/company/jobs/new?type=${t.value}`)
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </DialogContent>  
      </Dialog>

      {/* 検索・ソート */}
      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4"/>
            <Input
              placeholder="選考名、勤務地などで検索..."
              className="pl-10"
              value={searchTerm}
              onChange={e=>setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={sortOption} onValueChange={v=>setSortOption(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SlidersHorizontal className="h-4 w-4 mr-2"/>
              <SelectValue placeholder="並び替え"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="posted">公開順</SelectItem>
              <SelectItem value="applicants">応募数順</SelectItem>
              <SelectItem value="expiry">締切日順</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selTypeFilter} onValueChange={setSelTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="選考種類" />
            </SelectTrigger>
            <SelectContent>
              {SELECTION_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ステータス */}
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
              remainDays={remain}
              deleteJob={deleteJob}
              push={router.push}
              openPicker={()=>setTypePickerOpen(true)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   子コンポーネント
------------------------------------------------------------------ */
function JobGrid({
  jobs, badgeColor, remainDays, deleteJob, push, openPicker,
}:{
  jobs:JobItem[]
  badgeColor:(s:JobItem["status"])=>string|undefined
  remainDays:(e:string)=>number|string
  deleteJob:(id:string)=>void
  push:(path:string)=>void
  openPicker: () => void
}){
  return(
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {jobs.map(job=>(
          <Card key={job.id} className="overflow-hidden border border-gray-200 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex justify-between mb-3">
                <Badge className={badgeColor(job.status)}>{job.status}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4"/>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={()=>push(`/company/jobs/${job.id!}`)}>
                      <Edit className="mr-2 h-4 w-4"/> 編集する
                    </DropdownMenuItem>

                    {/* ▼▼ 追加：複製ボタン ▼▼ */}
                    <DropdownMenuItem onClick={()=>
                      push(`/company/jobs/new?type=${job.selection_type}&copy=${job.id!}`)
                    }>
                      <Copy className="mr-2 h-4 w-4"/> 複製する
                    </DropdownMenuItem>
                    {/* ▲▲ 追加ここまで ▲▲ */}
                    <DropdownMenuItem
                      onClick={()=>push(`/company/applicants?jobId=${job.id!}`)}
                      disabled={job.applicants===0}
                    >
                      <Users className="mr-2 h-4 w-4"/> 応募者を見る
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={()=>deleteJob(job.id!)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4"/> 削除する
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Badge variant="outline" className="mb-1 text-xs">
                {{
                  fulltime: "本選考",
                  internship_short: "インターン（短期）",
                  intern_long: "インターン（長期）",   // ★ 追加
                  event: "説明会／イベント",
                }[job.selection_type as string] ?? "その他"}
              </Badge>

              <h3 className="text-xl font-semibold mb-2 line-clamp-2">{job.title}</h3>

              <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-gray-600">
                <div className="flex items-center">
                  { (job.selection_type === "event" || job.selection_type === "internship_short") ? (
                    <Calendar className="h-4 w-4 mr-1.5 text-gray-500"/>
                  ) : (
                    <Briefcase className="h-4 w-4 mr-1.5 text-gray-500"/>
                  )}
                  <span>
                    { (job.selection_type === "event" || job.selection_type === "internship_short")
                      ? `開催日時：${job.displayDate ?? "-"}`
                      : (job.workingDays || "-") }
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1.5 text-gray-500"/> 
                  <span>{job.location ?? "-"}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1.5 text-gray-500"/> 
                  <span>{job.expiryDate?`残り${remainDays(job.expiryDate)}日`:"期限なし"}</span>
                </div>
              </div>

              <Separator className="my-4"/>

              <div className="grid grid-cols-2 gap-4">
                <Stat icon={<Users className="h-4 w-4 mr-1.5 text-blue-500"/>}
                      label="応募者数" value={`${job.applicants}名`}/>
                <Stat icon={<Eye className="h-4 w-4 mr-1.5 text-blue-500"/>}
                      label="閲覧数" value={`${job.views ?? 0}回`}/>
              </div>
            </CardContent>

            <CardFooter className="bg-gray-50 px-5 py-3 flex justify-between">
              <Button variant="outline" size="sm" onClick={()=>push(`/company/jobs/${job.id!}`)}>
                <Edit className="h-4 w-4 mr-1.5"/> 編集
              </Button>
              <Button
                variant={job.applicants>0?"default":"outline"}
                size="sm"
                onClick={()=>push(`/company/applicants?jobId=${job.id!}`)}
                disabled={job.applicants===0}
                className={job.applicants>0?"bg-blue-600 hover:bg-blue-700":""}
              >
                <Users className="h-4 w-4 mr-1.5"/>
                {job.applicants>0?`応募者を見る (${job.applicants})`:"応募者なし"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {jobs.length===0 && (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
          <div className="text-gray-400 mb-4">
            <Briefcase className="h-12 w-12 mx-auto"/>
          </div>
          <h3 className="text-lg font-medium mb-2">まだ選考が登録されていません</h3>
          <p className="text-gray-500 mb-4">新しい選考を作成して、優秀な人材を募集しましょう</p>
          <Button onClick={()=>openPicker()}>
            <Plus className="mr-2 h-4 w-4"/> 新しい選考を作成
          </Button>
        </div>
      )}
    </>
  )
}

function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){
  return(
    <div className="bg-gray-50 p-3 rounded-lg">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-semibold flex items-center">{icon}{value}</div>
    </div>
  )
}


