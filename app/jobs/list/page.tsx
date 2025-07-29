"use client"

import type React from "react"

import { ArrowLeft, Briefcase, Heart, MapPin, Search, Star, SlidersHorizontal } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Head from "next/head"
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

import Footer from "@/components/footer"

/** Supabase 型を拡張 */
type JobRow = Database["public"]["Tables"]["jobs"]["Row"] & {
  companies: { name: string; logo: string | null; industry?: string | null } | null
  industry?: string | null
  job_type?: string | null
  selection_type?: string | null
  is_featured?: boolean | null
  salary_range?: string | null
  salary_min?: number | null
  salary_max?: number | null
  tags?: string[] | null
  cover_image_url?: string | null
  job_tags?: { tag: string }[] | null
}


/* 選考種類フィルター */
const SELECTION_TYPES = [
  { value: "all",             label: "すべての選考" },
  { value: "fulltime",        label: "本選考" },
  { value: "internship_short", label: "インターン（短期）" },
  { value: "internship_long", label: "インターン(長期)" },
  { value: "intern_long",     label: "インターン(長期)" }, // 旧キー（互換用）
  { value: "event",           label: "説明会／イベント" },
] as const

/* 選考種類 → 表示ラベル */
const SELECTION_LABELS = {
  fulltime:        "本選考",
  internship_short: "インターン（短期）",
  internship_long: "インターン(長期)",
  intern_long:     "インターン(長期)", // 旧キー（互換用）
  event:           "説明会／イベント",
} as const

/* 選考種類コード → 表示ラベルを安全に取得 */
const getSelectionLabel = (type?: string | null) => {
  const key = (type ?? "fulltime").trim() as keyof typeof SELECTION_LABELS
  return SELECTION_LABELS[key] ?? SELECTION_LABELS.fulltime
}

/* 年収フィルターの選択肢 */
const SALARY_OPTIONS = [
  { value: "all", label: "すべての年収" },
  { value: "200", label: "200万以上" },
  { value: "400", label: "400万以上" },
  { value: "600", label: "600万以上" },
  { value: "800", label: "800万以上" },
  { value: "1000", label: "1000万以上" },
] as const

export default function JobSearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const qParam = searchParams.get("q") ?? ""
  // --- SEO meta ----------------------------------------------------
  const pageTitle = qParam ? `${qParam}の求人検索結果 | 学生転職` : "求人検索結果 | 学生転職"
  const pageDescription = qParam
    ? `「${qParam}」の求人を検索。業界・職種・年収など細かくフィルターして自分に合った仕事を見つけましょう。`
    : "学生向け転職サービス「学生転職」の求人検索ページ。業界・職種・年収など細かくフィルターして自分に合った仕事を見つけましょう。"
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
  // --- 初期化: localStorage から保存済み ID を読み込む --------------------
  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem("savedJobs")
    if (raw) {
      try {
        const arr: string[] = JSON.parse(raw)
        setSaved(new Set(arr))
      } catch {
        /* ignore malformed JSON */
      }
    }
  }, [])
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
selection_type,
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
          // use selection_type column (fallback to fulltime)
          const sel = row.selection_type ?? "fulltime"
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

  /* ------------- helpers ------------------ */
  const toggleSave = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      // 変更を localStorage に保存
      if (typeof window !== "undefined") {
        localStorage.setItem("savedJobs", JSON.stringify(Array.from(next)))
      }
      return next
    })

  const tagColor = () => "bg-gray-100 text-gray-800"

  /* ------------- UI ----------------------- */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim()
    router.replace(`/jobs/search?tab=${category}&q=${encodeURIComponent(q)}`)
  }

  // アクティブなフィルターの数を計算
  const activeFiltersCount = [industry, jobType, selectionType, salaryMin].filter((f) => f !== "all").length

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
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
      </Head>

      <div className="min-h-screen bg-gray-50">
      {/* Search Header - Sticky */}
      <section className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          {/* Back button and title */}
          <div className="flex items-center gap-4 mb-4">
            <Link href="/jobs" className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors">
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">戻る</span>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">"{qParam}" の検索結果</h1>
              <p className="text-sm text-gray-500">{displayed.length}件の求人が見つかりました</p>
            </div>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="職種、キーワード、会社名で検索"
                className="pl-12 pr-4 h-12 rounded-full border-gray-300 focus:border-red-500 focus:ring-red-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-red-600 hover:bg-red-700"
              >
                検索
              </Button>
            </div>
          </form>


          {/* Filters and view controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* Mobile filter button */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 lg:hidden relative">
                    <SlidersHorizontal size={16} />
                    フィルター
                    {activeFiltersCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs bg-red-600">
                        {activeFiltersCount}
                      </Badge>
                    )}
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

              {/* Desktop filters */}
              <div className="hidden lg:flex items-center gap-2">
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="w-32 h-9 rounded-full text-sm">
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
                  <SelectTrigger className="w-32 h-9 rounded-full text-sm">
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
                  <SelectTrigger className="w-40 h-9 rounded-full text-sm">
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
                  <SelectTrigger className="w-32 h-9 rounded-full text-sm">
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
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <Button
                variant={view === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("grid")}
                className="h-8 w-8 p-0 rounded-md"
              >
                <svg width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <rect x="1" y="1" width="6" height="6" />
                  <rect x="9" y="1" width="6" height="6" />
                  <rect x="1" y="9" width="6" height="6" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
                className="h-8 w-8 p-0 rounded-md"
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
          </div>

          {/* Active filters display */}
          {activeFiltersCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {industry !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  業界: {industry}
                  <button onClick={() => setIndustry("all")} className="ml-1 hover:text-red-600">
                    ×
                  </button>
                </Badge>
              )}
              {jobType !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  職種: {jobType}
                  <button onClick={() => setJobType("all")} className="ml-1 hover:text-red-600">
                    ×
                  </button>
                </Badge>
              )}
              {selectionType !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  選考: {SELECTION_TYPES.find((s) => s.value === selectionType)?.label}
                  <button onClick={() => setSelectionType("all")} className="ml-1 hover:text-red-600">
                    ×
                  </button>
                </Badge>
              )}
              {salaryMin !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  年収: {SALARY_OPTIONS.find((s) => s.value === salaryMin)?.label}
                  <button onClick={() => setSalaryMin("all")} className="ml-1 hover:text-red-600">
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIndustry("all")
                  setJobType("all")
                  setSelectionType("all")
                  setSalaryMin("all")
                }}
                className="h-6 text-xs text-red-600 hover:text-red-700"
              >
                すべてクリア
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <main className="container mx-auto max-w-7xl px-4 py-6">
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

      <Footer />
    </div>
    </>
)}

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
    <div className="space-y-6 py-4">
      <h3 className="text-lg font-semibold">フィルター</h3>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">業界</label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="rounded-lg">
              <SelectValue placeholder="業界を選択" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((i) => (
                <SelectItem key={i} value={i}>
                  {i === "all" ? "すべての業界" : i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">職種</label>
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="rounded-lg">
              <SelectValue placeholder="職種を選択" />
            </SelectTrigger>
            <SelectContent>
              {jobTypes.map((j) => (
                <SelectItem key={j} value={j}>
                  {j === "all" ? "すべての職種" : j}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">選考種類</label>
          <Select value={selectionType} onValueChange={setSelectionType}>
            <SelectTrigger className="rounded-lg">
              <SelectValue placeholder="選考種類を選択" />
            </SelectTrigger>
            <SelectContent>
              {SELECTION_TYPES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">年収</label>
          <Select value={salaryMin} onValueChange={setSalaryMin}>
            <SelectTrigger className="rounded-lg">
              <SelectValue placeholder="年収を選択" />
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
      </div>
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
  if (!jobs.length) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Search size={48} className="mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">検索結果が見つかりませんでした</h3>
        <p className="text-gray-500">検索条件を変更してもう一度お試しください</p>
      </div>
    )
  }

  /* ----- list view ----- */
  if (view === "list") {
    return (
      <div className="space-y-4">
        {jobs.map((j) => (
          <Card key={j.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex">
              <Link href={`/jobs/${j.id}`} className="flex flex-1 hover:bg-gray-50 transition-colors">
                {j.cover_image_url && (
                  <div className="w-48 h-32 flex-shrink-0">
                    <Image
                      src={j.cover_image_url || "/placeholder.svg"}
                      alt="cover"
                      width={192}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2 text-xs rounded-full">
                        {getSelectionLabel(j.selection_type)}
                      </Badge>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{j.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{j.companies?.name ?? "-"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span>{j.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase size={14} />
                      <span>
                        {j.salary_min ?? "-"}万 – {j.salary_max ?? "応相談"}万
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(j.tags ?? []).slice(0, 4).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Link>
              <div className="flex items-start p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSave(j.id)
                  }}
                  className="rounded-full"
                >
                  <Heart size={20} className={saved.has(j.id) ? "fill-red-500 text-red-500" : "text-gray-400"} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  /* ----- grid view ----- */
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((j) => (
        <Card
          key={j.id}
          className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 rounded-xl"
        >
          <Link href={`/jobs/${j.id}`} className="block">
            {j.cover_image_url && (
              <div className="relative h-40 w-full overflow-hidden">
                <Image
                  src={j.cover_image_url || "/placeholder.svg"}
                  alt="cover"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {j.is_featured && (
                  <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-yellow-400 px-3 py-1 text-xs font-medium text-yellow-900">
                    <Star size={12} />
                    おすすめ
                  </div>
                )}
              </div>
            )}
            <div className="p-5">
              <Badge variant="outline" className="mb-3 text-xs rounded-full">
                {getSelectionLabel(j.selection_type)}
              </Badge>
              <h3 className="mb-2 line-clamp-2 font-bold text-gray-900 leading-tight">{j.title}</h3>
              <p className="line-clamp-1 text-sm text-gray-600 mb-3">{j.companies?.name ?? "-"}</p>

              <div className="flex flex-wrap gap-1 mb-3">
                {(j.tags ?? []).slice(0, 3).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>

              <div className="text-xs text-gray-500">
                {j.salary_min ?? "-"}万 – {j.salary_max ?? "応相談"}万
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 bg-white/90 hover:bg-white rounded-full shadow-sm"
            onClick={(e) => {
              e.stopPropagation()
              toggleSave(j.id)
            }}
          >
            <Heart size={18} className={saved.has(j.id) ? "fill-red-500 text-red-500" : "text-gray-400"} />
          </Button>
        </Card>
      ))}
    </div>
  )
}
