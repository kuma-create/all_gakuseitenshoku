"use client"

import type React from "react"

import { Briefcase, ChevronRight, Filter, Heart, MapPin, Search, Star } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

/** Supabase 型を拡張 */
type JobRow = Database["public"]["Tables"]["jobs"]["Row"] & {
  companies: { name: string; logo: string | null; industry?: string | null } | null
  industry?: string | null
  job_type?: string | null
  selection_type?: string | null
  is_featured?: boolean | null
  salary_range?: string | null
  application_deadline?: string | null
  salary_min?: number | null
  salary_max?: number | null
  tags?: string[] | null
  cover_image_url?: string | null
  job_tags?: { tag: string }[] | null
}

const SALARY_MAX = 1200

/* 選考種類フィルター */
const SELECTION_TYPES = [
  { value: "all", label: "すべての選考" },
  { value: "fulltime", label: "本選考" },
  { value: "internship_short", label: "インターン（短期）" },
  { value: "event", label: "説明会／イベント" },
] as const

/* 年収フィルターの選択肢 */
const SALARY_OPTIONS = [
  { value: "all", label: "すべての年収" },
  { value: "200", label: "200万以上" },
  { value: "400", label: "400万以上" },
  { value: "600", label: "600万以上" },
  { value: "800", label: "800万以上" },
  { value: "1000", label: "1000万以上" },
] as const

/* 特集バナー */
const FEATURED_BANNERS = [
  {
    id: 1,
    title: "日系大手",
    subtitle: "インターン特集",
    color: "bg-blue-500",
    textColor: "text-white",
    image: "/placeholder.svg?height=300&width=600",
    companies: [
      { name: "Sony", logo: "/placeholder.svg?height=60&width=60" },
      { name: "Bandai", logo: "/placeholder.svg?height=60&width=60" },
      { name: "JR", logo: "/placeholder.svg?height=60&width=60" },
      { name: "Hitachi", logo: "/placeholder.svg?height=60&width=60" },
    ],
  },
  {
    id: 2,
    title: "選考優遇",
    subtitle: "が狙える企業特集",
    color: "bg-yellow-400",
    textColor: "text-blue-600",
    image: "/placeholder.svg?height=300&width=600",
    companies: [
      { name: "JAL", logo: "/placeholder.svg?height=60&width=60" },
      { name: "ADK", logo: "/placeholder.svg?height=60&width=60" },
      { name: "三井不動産", logo: "/placeholder.svg?height=60&width=60" },
      { name: "Benesse", logo: "/placeholder.svg?height=60&width=60" },
    ],
  },
]

/* イベント情報 */
const EVENTS = [
  {
    id: 1,
    title: "【オンライン面談｜就活のお悩み、プロへご相談ください】就活のオーダーメイド",
    image: "/placeholder.svg?height=200&width=400",
    badge: "PickUp!",
    badgeColor: "bg-blue-600",
    type: "説明会・セミナー",
    date: "2025年6月10日",
  },
  {
    id: 2,
    title: "【オンライン開催】『不安な就活に突破口を/就活大逆転セミナー』",
    image: "/placeholder.svg?height=200&width=400",
    badge: "締切4日前！",
    badgeColor: "bg-red-500",
    type: "オンライン",
    date: "2025年6月8日",
  },
]

/* ────────────────────────────────────────── */
export default function JobsPage() {
  /* ---------------- state ---------------- */
  const searchParams = useSearchParams()
  const qParam = searchParams.get("q") ?? ""
  const tabParam = (searchParams.get("tab") ?? "company") as "company" | "fulltime" | "intern" | "event"
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [error, setError] = useState<string | null>(null)

  /* UI filter states */
  const [search, setSearch] = useState(qParam)
  const [industry, setIndustry] = useState("all")
  const [jobType, setJobType] = useState("all")
  const [selectionType, setSelectionType] = useState("all")
  const [salaryMin, setSalaryMin] = useState<string>("all")
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [view, setView] = useState<"grid" | "list">("grid")
  const [filterOpen, setFilterOpen] = useState(false)
  const [category, setCategory] = useState<"company" | "fulltime" | "intern" | "event">(tabParam)

  /* ---------------- fetch ----------------- */
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          `
id,
title,
description,
created_at,
work_type,
is_recommended,
salary_range,
application_deadline,
location,
cover_image_url,
companies!jobs_company_id_fkey (
  name,
  industry,
  logo
),
job_tags!job_tags_job_id_fkey (
  tag
)
`,
        )
        .eq("published", true)
        .order("created_at", { ascending: false })
        .returns<JobRow[]>()

      if (error) {
        console.error("jobs fetch error", error)
        setError("選考情報取得に失敗しました")
      } else {
        const normalized = (data ?? []).map((row) => {
          // derive selection_type from work_type
          let sel: JobRow["selection_type"] = "fulltime"
          if (row.work_type?.includes("インターン")) sel = "internship_short"
          else if (row.work_type?.includes("イベント") || row.work_type?.includes("説明会")) sel = "event"

          return {
            ...row,
            selection_type: sel,
            industry: row.companies?.industry ?? null,
            tags: (row.job_tags ?? []).map((t) => t.tag),
            ...(() => {
              const rgx = /^(\d+)[^\d]+(\d+)?/
              const m = (row.salary_range ?? "").match(rgx)
              const min = m ? Number(m[1]) : null
              const max = m && m[2] ? Number(m[2]) : null
              return { salary_min: min, salary_max: max }
            })(),
            salary_range: row.salary_range ?? null,
            application_deadline: row.application_deadline ?? null,
          }
        })
        setJobs(normalized)
      }
      setLoading(false)
    })()
  }, [])

  /* ------------- derived options ---------- */
  const industries = useMemo(() => {
    const set = new Set(jobs.map((j) => j.industry ?? "").filter(Boolean))
    return ["all", ...Array.from(set)] as string[]
  }, [jobs])

  const jobTypes = useMemo(() => {
    const set = new Set(jobs.map((j) => j.job_type ?? "").filter(Boolean))
    return ["all", ...Array.from(set)] as string[]
  }, [jobs])

  /* ------------- filter logic ------------- */
  const displayed = useMemo(() => {
    return jobs.filter((j) => {
      const q = search.toLowerCase()
      const matchesQ =
        q === "" ||
        j.title?.toLowerCase().includes(q) ||
        j.companies?.name?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q)

      const matchesInd = industry === "all" || (j.industry ?? "").toLowerCase().includes(industry.toLowerCase())

      const matchesJob = jobType === "all" || (j.job_type ?? "").toLowerCase().includes(jobType.toLowerCase())

      const matchesSalary = salaryMin === "all" || (j.salary_max ?? j.salary_min ?? 0) >= Number(salaryMin)

      const matchesCategory = selectionType === "all" || (j.selection_type ?? "") === selectionType

      return matchesQ && matchesInd && matchesJob && matchesSalary && matchesCategory
    })
  }, [jobs, search, industry, jobType, salaryMin, selectionType])

  const closingSoon = useMemo(() => {
    return jobs.filter((j) => {
      if (j.selection_type !== "internship_short" || !j.application_deadline) return false
      const daysLeft =
        (new Date(j.application_deadline).getTime() - Date.now()) / 86400000
      return daysLeft >= 0 && daysLeft <= 7 // 7日以内に締切
    })
  }, [jobs])

  /* ------------- helpers ------------------ */
  const toggleSave = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const tagColor = () => "bg-gray-100 text-gray-800"

  /* ------------- UI ----------------------- */
  const router = useRouter()
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim()
    router.push(`/jobs/list?tab=${category}&q=${encodeURIComponent(q)}`)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="60" />
        </svg>
        読み込み中…
      </div>
    )
  }
  if (error) {
    return (
      <main className="container py-8">
        <p className="text-destructive">{error}</p>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Featured Banners Carousel */}

      {/* Featured Banners Carousel */}
      <section className="py-6 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {FEATURED_BANNERS.map((banner) => (
              <div key={banner.id} className={`${banner.color} rounded-xl overflow-hidden shadow-lg relative`}>
                <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between">
                  <div>
                    <h2 className={`text-3xl font-bold ${banner.textColor}`}>{banner.title}</h2>
                    <div
                      className={`inline-block ${banner.textColor} border-2 border-white px-4 py-1 rounded-full mt-2`}
                    >
                      {banner.subtitle}
                    </div>
                  </div>
                  <div>
                    <div className="flex gap-2 mt-4">
                      {banner.companies.map((company, idx) => (
                        <div key={idx} className="bg-white rounded-md p-1 w-16 h-16 flex items-center justify-center">
                          <Image
                            src={company.logo || "/placeholder.svg"}
                            alt={company.name}
                            width={60}
                            height={60}
                            className="object-contain"
                          />
                        </div>
                      ))}
                    </div>
                    <Button className="mt-4 bg-amber-400 hover:bg-amber-500 text-gray-800 font-bold">
                      今すぐチェック
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/2 opacity-20">
                  <Image src={banner.image || "/placeholder.svg"} alt={banner.title} fill className="object-cover" />
                </div>
                <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium rounded-bl-lg">
                  2025.06.02 更新
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 bg-gradient-to-r from-red-500 to-red-600">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">選考一覧</h1>
            <p className="text-gray-600 mb-6">あなたにぴったりの会社を探しましょう</p>

            {/* Tabs for category */}
            <Tabs value={category} onValueChange={(v) => setCategory(v as any)} className="mb-4">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger
                  value="company"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow"
                >
                  企業
                </TabsTrigger>
                <TabsTrigger
                  value="fulltime"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow"
                >
                  本選考
                </TabsTrigger>
                <TabsTrigger
                  value="intern"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow"
                >
                  インターン
                </TabsTrigger>
                <TabsTrigger
                  value="event"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow"
                >
                  イベント
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* search & toggles */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Input
                  placeholder="職種、キーワード、会社名"
                  className="pr-10 rounded-full border-gray-300"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-0 top-0 h-full rounded-l-none rounded-r-full bg-red-600 hover:bg-red-700"
                >
                  <Search size={16} />
                </Button>
              </div>

              {/* filter toggle (mobile) */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 md:hidden rounded-full">
                    <Filter size={16} />
                    フィルター
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                  <FilterPanel
                    industries={industries}
                    jobTypes={jobTypes}
                    industry={industry}
                    setIndustry={setIndustry}
                    jobType={jobType}
                    setJobType={setJobType}
                    selectionType={selectionType}
                    setSelectionType={setSelectionType}
                    salaryMin={salaryMin}
                    setSalaryMin={setSalaryMin}
                  />
                </SheetContent>
              </Sheet>

              {/* grid/list toggle */}
              <div className="flex gap-2">
                <Button
                  variant={view === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setView("grid")}
                  className="rounded-full"
                >
                  <svg width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                    <rect x="1" y="1" width="6" height="6" />
                    <rect x="9" y="1" width="6" height="6" />
                    <rect x="1" y="9" width="6" height="6" />
                    <rect x="9" y="9" width="6" height="6" />
                  </svg>
                </Button>
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setView("list")}
                  className="rounded-full"
                >
                  <svg width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="4" y1="4" x2="15" y2="4" />
                    <line x1="4" y1="8" x2="15" y2="8" />
                    <line x1="4" y1="12" x2="15" y2="12" />
                    <circle cx="2" cy="4" r="1" />
                    <circle cx="2" cy="8" r="1" />
                    <circle cx="2" cy="12" r="1" />
                  </svg>
                </Button>
              </div>
            </form>

            {/* desktop inline filters */}
            <div className="mt-4 hidden flex-wrap gap-3 md:flex">
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="w-40 rounded-full">
                  <SelectValue placeholder="業界" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i === "all" ? "すべての業界" : i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-40 rounded-full">
                  <SelectValue placeholder="職種" />
                </SelectTrigger>
                <SelectContent>
                  {jobTypes.map((j) => (
                    <SelectItem key={j} value={j}>
                      {j === "all" ? "すべての職種" : j}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectionType} onValueChange={setSelectionType}>
                <SelectTrigger className="w-48 rounded-full">
                  <SelectValue placeholder="選考種類" />
                </SelectTrigger>
                <SelectContent>
                  {SELECTION_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={salaryMin} onValueChange={setSalaryMin}>
                <SelectTrigger className="w-40 rounded-full">
                  <SelectValue placeholder="年収" />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 注目のキーワード (Featured Keywords) */}
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">注目キーワード</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer rounded-full px-3">IT</Badge>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer rounded-full px-3">
                  コンサル
                </Badge>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer rounded-full px-3">
                  金融
                </Badge>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer rounded-full px-3">
                  メーカー
                </Badge>
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer rounded-full px-3">
                  商社
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Banners Section */}
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-col items-center justify-center p-4 text-center border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-400 rounded-full -mr-8 -mt-8 opacity-50"></div>
            <h3 className="text-lg font-bold">全1000社!!</h3>
            <p className="text-xl font-bold">就活面接質問</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 text-center border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400 rounded-full -mr-8 -mt-8 opacity-50"></div>
            <h3 className="text-lg font-bold">質問の答えを選ぶだけ!!</h3>
            <p className="text-xl font-bold">ガクチカ自動生成</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 text-center border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-16 h-16 bg-orange-400 rounded-full -mr-8 -mt-8 opacity-50"></div>
            <h3 className="text-lg font-bold">見逃し厳禁!</h3>
            <p className="text-xl font-bold">締切間近</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 text-center border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-400 rounded-full -mr-8 -mt-8 opacity-50"></div>
            <h3 className="text-lg font-bold">もう書き方に悩まない!!</h3>
            <p className="text-xl font-bold">先輩のESを見る</p>
          </Card>
        </div>
      </section>

      {/* Events Section */}
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">学生転職主催イベント</h2>
          <Link href="#" className="text-red-600 hover:underline flex items-center">
            すべて見る
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {EVENTS.map((event) => (
            <Card key={event.id} className="overflow-hidden border-0 shadow-lg">
              <div className="relative">
                <Image
                  src={event.image || "/placeholder.svg"}
                  alt={event.title}
                  width={600}
                  height={200}
                  className="w-full h-48 object-cover"
                />
                <div className={`absolute top-4 left-0 ${event.badgeColor} text-white px-4 py-1 font-bold`}>
                  {event.badge}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg line-clamp-2 mb-2">{event.title}</h3>
                <div className="flex gap-2 mt-4">
                  <Badge variant="outline" className="rounded-full">
                    {event.type}
                  </Badge>
                  <span className="text-sm text-gray-500">{event.date}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* content */}
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="all">
          <TabsList className="mb-6 grid max-w-md grid-cols-3 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow">
              すべて
            </TabsTrigger>
            <TabsTrigger value="saved" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow">
              保存済み
            </TabsTrigger>
            <TabsTrigger value="new" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow">
              新着
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <JobGrid jobs={displayed} view={view} saved={saved} toggleSave={toggleSave} tagColor={tagColor} />
          </TabsContent>

          <TabsContent value="saved">
            <JobGrid
              jobs={displayed.filter((j) => saved.has(j.id))}
              view={view}
              saved={saved}
              toggleSave={toggleSave}
              tagColor={tagColor}
            />
          </TabsContent>

          <TabsContent value="new">
            <JobGrid
              jobs={displayed.filter((j) => {
                const diff = (Date.now() - new Date(j.created_at!).getTime()) / 86400000
                return diff < 7
              })}
              view={view}
              saved={saved}
              toggleSave={toggleSave}
              tagColor={tagColor}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* "締め切り間近なインターン" Section */}
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">締め切り間近なインターン</h2>
          <Link
            href="/jobs/list?tab=intern"
            className="flex items-center gap-1 text-red-600 hover:underline"
          >
            すべて見る
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 期限が迫っているインターンをグリッド表示（既存の JobGrid を再利用） */}
        <JobGrid
          jobs={closingSoon}
          view={view}
          saved={saved}
          toggleSave={toggleSave}
          tagColor={tagColor}
        />
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row w-full shrink-0 items-center border-t bg-white px-4 py-6 md:px-6">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} ONE CAREER. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            利用規約
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            プライバシーポリシー
          </Link>
        </nav>
      </footer>
    </div>
  )
}

/* =============== components ================ */
function FilterPanel({
  industries,
  jobTypes,
  industry,
  setIndustry,
  jobType,
  setJobType,
  selectionType,
  setSelectionType,
  salaryMin,
  setSalaryMin,
}: {
  industries: string[]
  jobTypes: string[]
  industry: string
  setIndustry: (v: string) => void
  jobType: string
  setJobType: (v: string) => void
  selectionType: string
  setSelectionType: (v: string) => void
  salaryMin: string
  setSalaryMin: (v: string) => void
}) {
  return (
    <div className="space-y-4 py-4">
      <Select value={industry} onValueChange={setIndustry}>
        <SelectTrigger className="rounded-full">
          <SelectValue placeholder="業界" />
        </SelectTrigger>
        <SelectContent>
          {industries.map((i) => (
            <SelectItem key={i} value={i}>
              {i === "all" ? "すべての業界" : i}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={jobType} onValueChange={setJobType}>
        <SelectTrigger className="rounded-full">
          <SelectValue placeholder="職種" />
        </SelectTrigger>
        <SelectContent>
          {jobTypes.map((j) => (
            <SelectItem key={j} value={j}>
              {j === "all" ? "すべての職種" : j}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectionType} onValueChange={setSelectionType}>
        <SelectTrigger className="rounded-full">
          <SelectValue placeholder="選考種類" />
        </SelectTrigger>
        <SelectContent>
          {SELECTION_TYPES.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={salaryMin} onValueChange={setSalaryMin}>
        <SelectTrigger className="rounded-full">
          <SelectValue placeholder="年収" />
        </SelectTrigger>
        <SelectContent>
          {SALARY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function JobGrid({
  jobs,
  view,
  saved,
  toggleSave,
  tagColor,
}: {
  jobs: JobRow[]
  view: "grid" | "list"
  saved: Set<string>
  toggleSave: (id: string) => void
  tagColor: (t: string) => string
}) {
  if (!jobs.length) return <p className="text-center text-gray-500">該当する選考情報がありません</p>

  /* ----- list view ----- */
  if (view === "list") {
    return (
      <div className="flex flex-col gap-4">
        {jobs.map((j) => (
          <Card key={j.id} className="flex overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
            <Link href={`/jobs/${j.id}`} className="flex flex-1 hover:bg-gray-50">
              {j.cover_image_url && (
                <Image
                  src={j.cover_image_url || "/placeholder.svg"}
                  alt="cover"
                  width={160}
                  height={120}
                  className="h-auto w-40 object-cover"
                />
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Badge variant="outline" className="mb-0.5 text-[10px] rounded-full w-fit">
                  {
                    {
                      fulltime: "本選考",
                      internship_short: "インターン（短期）",
                      event: "説明会／イベント",
                    }[j.selection_type ?? "fulltime"]
                  }
                </Badge>
                <h3 className="text-lg font-bold">{j.title}</h3>
                <p className="text-sm text-gray-600">
                  {j.companies?.name ?? "-"} / {j.location}
                </p>
                <div className="flex gap-1 text-xs text-gray-500">
                  <MapPin size={12} />
                  <span>{j.location}</span>
                  <Briefcase size={12} />
                  <span>
                    {j.salary_min ?? "-"}万 – {j.salary_max ?? "応相談"}万
                  </span>
                </div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                toggleSave(j.id)
              }}
            >
              <Heart className={saved.has(j.id) ? "fill-red-500 text-red-500" : ""} />
            </Button>
          </Card>
        ))}
      </div>
    )
  }

  /* ----- grid view ----- */
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map((j) => (
        <Card
          key={j.id}
          className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow rounded-xl"
        >
          <Link href={`/jobs/${j.id}`} className="block">
            {j.cover_image_url && (
              <div className="relative h-32 w-full overflow-hidden">
                <Image
                  src={j.cover_image_url || "/placeholder.svg"}
                  alt="cover"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {j.is_featured && (
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-xs font-medium text-yellow-900">
                    <Star size={12} />
                    おすすめ
                  </div>
                )}
              </div>
            )}
            <div className="p-4">
              <Badge variant="outline" className="mb-0.5 text-[10px] rounded-full">
                {
                  {
                    fulltime: "本選考",
                    internship_short: "インターン（短期）",
                    event: "説明会／イベント",
                  }[j.selection_type ?? "fulltime"]
                }
              </Badge>
              <h3 className="mb-1 line-clamp-1 font-bold">{j.title}</h3>
              <p className="line-clamp-1 text-sm text-gray-600">{j.companies?.name ?? "-"}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(j.tags ?? []).slice(0, 3).map((t) => (
                  <Badge key={t} className="bg-red-100 text-red-700 rounded-full">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-500">
                {j.salary_min ?? "-"}万 – {j.salary_max ?? "応相談"}万
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 bg-white/80 hover:bg-white rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              toggleSave(j.id)
            }}
          >
            <Heart size={18} className={saved.has(j.id) ? "fill-red-500 text-red-500" : ""} />
          </Button>
        </Card>
      ))}
    </div>
  )
}
