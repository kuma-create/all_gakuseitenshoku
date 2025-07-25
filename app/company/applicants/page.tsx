"use client"

/* ------------------------------------------------------------------
   応募者一覧 – 会社ダッシュボード
   Supabase から applications ↔ student_profiles ↔ jobs を結合して取得
------------------------------------------------------------------- */

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
  Filter,
  MessageSquare,
  Search,
  Star,
  User,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/* ---------- Supabase 型定義 ---------- */
type ApplicationRow =
  Database["public"]["Tables"]["applications"]["Row"]
type StudentRow =
  Database["public"]["Tables"]["student_profiles"]["Row"]
type JobRow = Database["public"]["Tables"]["jobs"]["Row"]

export type JoinedApplicant = {
  id: string
  status: string
  appliedDate: string
  interestLevel: number
  selfPR: string
  lastActivity: string
  /* student */
  studentId: string
  name: string
  university: string
  faculty: string
  avatar: string | null
  /* job */
  jobId: string | null
  jobTitle: string
  /* optional */
  industry: string | null
}

/* ---------- 定数 (以前と同じ) ---------- */
// 選考ステータスの定義
const STATUS_OPTIONS = [
  { value: "未対応", color: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
  { value: "書類選考中", color: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  { value: "一次面接調整中", color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100" },
  { value: "一次面接済", color: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
  { value: "二次面接調整中", color: "bg-violet-100 text-violet-800 hover:bg-violet-100" },
  { value: "二次面接済", color: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100" },
  { value: "最終面接調整中", color: "bg-pink-100 text-pink-800 hover:bg-pink-100" },
  { value: "最終面接済", color: "bg-rose-100 text-rose-800 hover:bg-rose-100" },
  { value: "内定", color: "bg-green-100 text-green-800 hover:bg-green-100" },
  { value: "内定辞退", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  { value: "不採用", color: "bg-red-100 text-red-800 hover:bg-red-100" },
  { value: "チャット中", color: "bg-cyan-100 text-cyan-800 hover:bg-cyan-100" },
  { value: "スカウト承諾", color: "bg-teal-100 text-teal-800 hover:bg-teal-100" },
]

/* ---------- Supabase からデータ取得 ---------- */
/**
 * Fetch applicants visible to the current company user.
 * 1) applications (all) +  scouts (status='承諾')
 * 2) Collect unique student_id / job_id lists
 * 3) Bulk‑fetch their profiles / jobs
 * 4) Merge into JoinedApplicant[]
 *
 * — No server‑side embeds are used to avoid PGRST201 ambiguity errors.
 */
async function fetchApplicants(): Promise<JoinedApplicant[]> {
  /* ---------- 0) 会社コンテキストを取得 ---------- */
  const { data: { user } } = await supabase.auth.getUser()
  console.log("👤 auth.user.id =", user?.id);
  if (!user) return [] // 未ログイン

  /* 会社 / company_members から company_id を取得
     1) companies.user_id = auth.user.id （オーナーアカウント）
     2) company_members.user_id = auth.user.id （招待アカウント）
     どちらも該当しなければ一覧は空配列を返す
  */
  const { data: companyRow, error: companyErr } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  let companyId: string | undefined = companyRow?.id as string | undefined

  if (!companyId) {
    const { data: memberRow, error: memberErr } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (memberErr) {
      console.warn("[fetchApplicants] company_members lookup failed:", memberErr)
    }
    companyId = memberRow?.company_id as string | undefined
  }

  if (!companyId) {
    console.warn("[fetchApplicants] companyId not found for auth.user.id =", user.id)
    return []
  }
  console.log("🏢 companyId =", companyId);

  /* ---------- A) 会社の求人一覧を取得 ---------- */
  const { data: jobs, error: jobsErr } = await supabase
    .from("jobs")
    .select("id,title,company_id")
    .eq("company_id", companyId)

  if (jobsErr) throw jobsErr;
  console.log("📥 jobs length =", jobs?.length ?? 0);
  const jobIdArray = (jobs ?? []).map((j: any) => j.id)

  /* ---------- ① applications ---------- */
  const { data: appRows, error: appErr } = await supabase
    .from("applications")
    .select(
      "id,status,applied_at,interest_level,self_pr,last_activity,student_id,job_id",
    )
    // 自社のレコードに限定
    .eq("company_id", companyId)
    // 念のため求人 ID でも絞る（RLS 保険）
    .in(
      "job_id",
      jobIdArray.length
        ? jobIdArray
        : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("applied_at", { ascending: false })

  if (appErr) throw appErr
  const appsRaw: any[] = appRows ?? []
  console.log("📥 appsRaw length =", appsRaw.length)

  /* ---------- ② scouts (承諾のみ) ---------- */
  const { data: scoutRows, error: scoutErr } = await supabase
    .from("scouts")
    .select(
      "id,status:status,accepted_at,student_id,job_id", // alias for uniform field names
    )
    .eq("status", "承諾")
    .order("accepted_at", { ascending: false })

  if (scoutErr) {
    console.warn(
      "[fetchApplicants] scouts query failed – proceed without scouts:",
      scoutErr,
    )
  }
  const scoutsRaw = scoutRows ?? [];
  console.log("📥 scoutsRaw length =", scoutsRaw.length);

  /* ---------- ③ 集計: ID リスト ---------- */
  const studentIds = new Set<string>()
  ;[...appsRaw, ...scoutsRaw].forEach((r: any) => {
    if (r.student_id) studentIds.add(r.student_id)
  })

  /* ---------- ④ プロフィールを一括取得 ---------- */
  const studentIdArray = Array.from(studentIds)
  const studentQuery = studentIdArray.length
    ? supabase
        .from("student_profiles")
        .select("id,name,university,faculty,grade,graduation_year,avatar_url,industry")
        .in("id", studentIdArray)
    : Promise.resolve({ data: [] as any[], error: null })

  const { data: students, error: stuErr } = await studentQuery
  if (stuErr) throw stuErr

  const studentMap = new Map(
    (students ?? []).map((s: any) => [s.id, s]),
  )
  const jobMap = new Map((jobs ?? []).map((j: any) => [j.id, j]))

  /* ---------- scouts を自社求人のみに限定 ---------- */
  const scoutsRawFiltered = scoutsRaw.filter((r: any) => {
    const j = jobMap.get(r.job_id)
    return j && j.company_id === companyId
  })

  /* ---------- ⑤ applications → Joined ---------- */
  const apps: JoinedApplicant[] = appsRaw.flatMap((row: any) => {
    const student = studentMap.get(row.student_id)
    if (!student) return []

    const job = row.job_id ? jobMap.get(row.job_id) : null

    return [
      {
        id: row.id,
        status: row.status,
        appliedDate: row.applied_at,
        interestLevel: row.interest_level ?? 0,
        selfPR: row.self_pr ?? "",
        lastActivity: row.last_activity ?? row.applied_at,
        studentId: student.id,
        name: student.name,
        university: student.university,
        faculty: student.faculty,
        avatar: student.avatar_url,
        industry: student.industry,
        jobId: row.job_id ?? null,
        jobTitle: job ? job.title : "(削除された求人)",
      },
    ]
  })

  /* ---------- ⑥ scouts → Joined ---------- */
  const scouts: JoinedApplicant[] = scoutsRawFiltered.flatMap((row: any) => {
    const student = studentMap.get(row.student_id)
    if (!student) return []

    const job = row.job_id ? jobMap.get(row.job_id) : null

    return [
      {
        id: row.id,
        status: "スカウト承諾",
        appliedDate: row.accepted_at,
        interestLevel: 0,
        selfPR: "",
        lastActivity: row.accepted_at,
        studentId: student.id,
        name: student.name,
        university: student.university,
        faculty: student.faculty,
        avatar: student.avatar_url,
        industry: student.industry,
        jobId: row.job_id ?? null,
        jobTitle: job ? job.title : "(削除された求人)",
      },
    ]
  })

  /* ---------- ⑦ 結合して応募日順 ---------- */
  return [...apps, ...scouts].sort(
    (a, b) =>
      new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime(),
  )
}

/* ---------- React Component ---------- */
export default function ApplicantsPage() {
  const router = useRouter()

  /* --- UI States --- */
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortField, setSortField] = useState("appliedDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<string[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [jobFilter, setJobFilter] = useState<string | null>(null)

  /* --- Data Fetching --- */
  const { data: applicants = [], isLoading, error } = useSWR(
    "company-applicants",
    fetchApplicants,
  )
  console.log("[ApplicantsPage] SWR applicants fetched:", applicants);

  /* --- Job 一覧は応募データから動的生成 --- */
  const jobs = useMemo(() => {
    const map = new Map<string, string>()
    applicants.forEach((a) => {
      if (a.jobId && !map.has(a.jobId)) map.set(a.jobId, a.jobTitle)
    })
    return Array.from(map, ([id, title]) => ({ id, title }))
  }, [applicants])

  /* --- フィルタリング & ソート --- */
  const filteredApplicants = useMemo(() => {
    const keyword = searchTerm.toLowerCase()

    const matches = (a: JoinedApplicant) => {
      const nameLc = (a.name ?? "").toLowerCase()
      const univLc = (a.university ?? "").toLowerCase()
      const prLc   = (a.selfPR ?? "").toLowerCase()

      const matchesSearch =
        nameLc.includes(keyword) ||
        univLc.includes(keyword) ||
        prLc.includes(keyword)

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && a.status === "未対応") ||
        (statusFilter === "inProgress" &&
          [
            "書類選考中",
            "一次面接調整中",
            "一次面接済",
            "二次面接調整中",
            "二次面接済",
            "最終面接調整中",
            "最終面接済",
            "チャット中",
            "スカウト承諾",
          ].includes(a.status)) ||
        (statusFilter === "passed" && a.status === "内定") ||
        (statusFilter === "rejected" && ["不採用", "内定辞退"].includes(a.status))

      const matchesJob = !jobFilter || a.jobId === jobFilter

      return matchesSearch && matchesStatus && matchesJob
    }

    const sortApplicants = (x: JoinedApplicant, y: JoinedApplicant) => {
      let result = 0
      switch (sortField) {
        case "name":
          result = x.name.localeCompare(y.name)
          break
        case "university":
          result = x.university.localeCompare(y.university)
          break
        case "appliedDate":
          result = new Date(x.appliedDate).getTime() - new Date(y.appliedDate).getTime()
          break
        case "status":
          result = x.status.localeCompare(y.status)
          break
        case "interestLevel":
          result = x.interestLevel - y.interestLevel
          break
        default:
          result = 0
      }
      return sortDirection === "asc" ? result : -result
    }

    return applicants.filter(matches).sort(sortApplicants)
  }, [applicants, searchTerm, statusFilter, jobFilter, sortField, sortDirection])

  /* --- UI ユーティリティ --- */
  const getStatusBadgeVariant = (status: string) => {
    const found = STATUS_OPTIONS.find((s) => s.value === status)
    return found ? found.color : "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }

  const renderInterestLevel = (lvl: number) => {
    const stars = Math.round(lvl / 20) // 0〜100 → 0〜5
    return (
      <div className="flex items-center text-yellow-500">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < stars ? "fill-current" : ""}`}
          />
        ))}
      </div>
    )
  }

  const toggleApplicant = (id: string) => {
    setSelectedApplicantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleSelectAll = () => {
    if (selectedApplicantIds.length === filteredApplicants.length) {
      setSelectedApplicantIds([])
    } else {
      setSelectedApplicantIds(filteredApplicants.map((a) => a.id))
    }
  }

  /* --- バルク操作（例: ステータス更新） --- */
  const bulkUpdateStatus = async (status: string) => {
    if (selectedApplicantIds.length === 0) return
    const enumStatus = status as Database["public"]["Enums"]["application_status"];
    await supabase
      .from("applications")
      .update({ status: enumStatus })
      .in("id", selectedApplicantIds);

    // mutate to revalidate
    setSelectedApplicantIds([])
  }

  /** 会社⇔学生のチャットを開く（既存がなければ作成） */
  const openChat = async (studentId: string, jobId: string | null) => {
    if (!jobId) {
      console.error("jobId is null – cannot open chat");
      return;
    }
    /** 0) job から company_id を取得 */
    const { data: jobRow, error: jobErr } = await supabase
      .from("jobs")
      .select("company_id")
      .eq("id", jobId)
      .single()

    if (jobErr || !jobRow) {
      console.error("jobs query error:", jobErr)
      return
    }
    const companyId = jobRow.company_id as string
    const cId = companyId as string
    if (!companyId) {
      console.error("job.company_id is null – cannot open chat")
      return
    }

    /** 1) 既存ルームを (company_id, student_id) で検索 */
    const { data: existing, error: existErr } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("company_id", cId)
      .eq("student_id", studentId)
      .maybeSingle()

    if (existErr) {
      console.error("chat_rooms select error:", existErr)
      return
    }
    if (existing) {
      router.push(`/company/chat/${existing.id}`)
      return
    }

    /** 2) 新規作成 */
    const roomId = crypto.randomUUID()
    const { error: insertErr } = await supabase
      .from("chat_rooms")
      .insert([
        {
          id: roomId,
          company_id: cId,
          student_id: studentId,
          job_id: jobId,
        },
      ])

    if (insertErr) {
      // 重複なら改めて取得して遷移 (ほぼ同時クリック等)
      if (insertErr.code === "23505") {
        const { data: dup } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("company_id", cId)
          .eq("student_id", studentId)
          .maybeSingle()
        if (dup) {
          router.push(`/company/chat/${dup.id}`)
        } else {
          console.error("duplicate but room not found:", insertErr)
        }
      } else {
        console.error("chat_rooms insert error:", insertErr)
      }
      return
    }

    router.push(`/company/chat/${roomId}`)
  }

  /* ---------- JSX (既存 UI を極力維持) ---------- */
  return (
    <div className="container mx-auto py-8 px-4">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold mb-2">応募者一覧</h1>
          <p className="text-gray-500">
            応募者の管理、選考ステータスの更新、コミュニケーションを行います
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-2">
          <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            詳細フィルター
            <ChevronDown
              className={`ml-2 h-4 w-4 transition-transform ${
                showAdvancedFilters ? "rotate-180" : ""
              }`}
            />
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* 検索 & フィルター */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="名前・大学・キーワードで検索..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={`${sortField}-${sortDirection}`}
              onValueChange={(v) => {
                const [f, d] = v.split("-")
                setSortField(f)
                setSortDirection(d as "asc" | "desc")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="並び順" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appliedDate-desc">応募日（新しい順）</SelectItem>
                <SelectItem value="appliedDate-asc">応募日（古い順）</SelectItem>
                <SelectItem value="name-asc">名前（昇順）</SelectItem>
                <SelectItem value="name-desc">名前（降順）</SelectItem>
                <SelectItem value="university-asc">大学（昇順）</SelectItem>
                <SelectItem value="university-desc">大学（降順）</SelectItem>
                <SelectItem value="interestLevel-desc">志望度（高い順）</SelectItem>
                <SelectItem value="interestLevel-asc">志望度（低い順）</SelectItem>
                <SelectItem value="status-asc">ステータス（昇順）</SelectItem>
                <SelectItem value="status-desc">ステータス（降順）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 詳細フィルター */}
        {showAdvancedFilters && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium mb-3">詳細フィルター</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">求人</label>
                <Select value={jobFilter || "all"} onValueChange={setJobFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="求人を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての求人</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 志望度フィルター（ダミー） */}
              <div>
                <label className="text-sm text-gray-500 mb-1 block">志望度</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="志望度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="high">高い（★★★★〜）</SelectItem>
                    <SelectItem value="medium">中程度（★★★〜）</SelectItem>
                    <SelectItem value="low">低い（★★以下）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setJobFilter(null)
                  setSortField("appliedDate")
                  setSortDirection("desc")
                }}
              >
                フィルターをリセット
              </Button>
            </div>
          </div>
        )}

        {/* ステータスごとのタブ */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="mb-6 w-full md:w-auto flex overflow-x-auto">
            {/* タブトリガー共通部分は省略: 既存コードと同等 */}
            {[
              { key: "all", label: "すべて" },
              { key: "pending", label: "未対応" },
              { key: "inProgress", label: "対応中" },
              { key: "passed", label: "通過" },
              { key: "rejected", label: "不通過" },
            ].map(({ key, label }) => (
              <TabsTrigger key={key} value={key} className="flex-1 md:flex-none">
                {label}
                <Badge variant="secondary" className="ml-2">
                  {
                    applicants.filter((a) => {
                      if (key === "all") return true
                      if (key === "pending") return a.status === "未対応"
                      if (key === "passed") return a.status === "内定"
                      if (key === "rejected") return ["不採用", "内定辞退"].includes(a.status)
                      return (
                        [
                          "書類選考中",
                          "一次面接調整中",
                          "一次面接済",
                          "二次面接調整中",
                          "二次面接済",
                          "最終面接調整中",
                          "最終面接済",
                          "チャット中",
                          "スカウト承諾",
                        ].includes(a.status) && key === "inProgress"
                      )
                    }).length
                  }
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 一覧表示 (既存構造を活かして map) */}
          <TabsContent value={statusFilter} className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              {filteredApplicants.map((applicant) => (
                <Card key={applicant.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* 左側: 基本情報 */}
                      <div className="p-4 md:p-6 flex-grow">
                        <div className="flex items-start">
                          <Checkbox
                            checked={selectedApplicantIds.includes(applicant.id)}
                            onCheckedChange={() => toggleApplicant(applicant.id)}
                            className="mr-3 mt-1"
                          />
                          <div className="flex flex-col md:flex-row md:items-center w-full">
                            <div className="flex items-center mb-3 md:mb-0 md:mr-4">
                              <Avatar className="h-12 w-12 mr-3">
                                <AvatarImage src={applicant.avatar ?? "/placeholder.svg"} alt={applicant.name} />
                                <AvatarFallback>{(applicant.name ?? "?").charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-lg">{applicant.name}</h3>
                                <p className="text-gray-500 text-sm">
                                  {applicant.university} {applicant.faculty}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center md:ml-auto gap-2 md:gap-6">
                              <div>
                                <p className="text-sm text-gray-500">志望業界</p>
                                <p className="font-medium">{applicant.industry ?? "—"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">志望度</p>
                                {renderInterestLevel(applicant.interestLevel)}
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">応募日</p>
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>{applicant.appliedDate}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pl-8">
                          <p className="text-sm text-gray-500 mb-1">自己PR</p>
                          <p className="text-sm">
                            {applicant.selfPR.length > 100
                              ? `${applicant.selfPR.substring(0, 100)}...`
                              : applicant.selfPR}
                          </p>
                        </div>
                      </div>

                      {/* 右側: ステータス & アクション */}
                      <div className="bg-gray-50 p-4 md:p-6 md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l">
                        <div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Badge
                                className={`cursor-pointer text-sm px-3 py-1.5 mb-4 ${getStatusBadgeVariant(applicant.status)}`}
                              >
                                {applicant.status}
                              </Badge>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>選考ステータスの変更</DialogTitle>
                                <DialogDescription>
                                  {applicant.name} さんのステータスを変更します
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-2 mt-4">
                                {STATUS_OPTIONS.map((opt) => (
                                  <Button
                                    key={opt.value}
                                    variant="outline"
                                    className={opt.color}
                                    onClick={() => bulkUpdateStatus(opt.value)}
                                  >
                                    {opt.value}
                                  </Button>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <p className="text-sm text-gray-500 mb-1">応募求人</p>
                          <p className="font-medium mb-4">{applicant.jobTitle}</p>
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                          <Button
                            variant="default"
                            onClick={() => router.push(`/company/applicants/${applicant.id}`)}
                          >
                            <User className="h-4 w-4 mr-2" />
                            詳細を見る
                          </Button>
                          <Button
                            variant="outline"
                            disabled={!applicant.jobId}
                            onClick={() => applicant.jobId && openChat(applicant.studentId, applicant.jobId)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            チャットを開く
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredApplicants.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <div className="text-gray-400 mb-4">
                    <User className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">応募者が見つかりません</h3>
                  <p className="text-gray-500 mb-4">
                    検索条件に一致する応募者はありません。
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setJobFilter(null)
                    }}
                  >
                    フィルターをリセット
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
