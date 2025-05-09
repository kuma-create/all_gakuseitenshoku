/* ──────────────────────────────────────────────────────────────
   app/jobs/page.tsx
────────────────────────────────────────────────────────────── */
"use client"

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react"
import { Loader2, Search, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuthGuard } from "@/lib/use-auth-guard"
import type { JobWithTags } from "@/lib/supabase/models"

import { JobCard } from "@/components/job-card"
import { Input }   from "@/components/ui/input"
import { Button }  from "@/components/ui/button"
import { Label }   from "@/components/ui/label"
import { Slider }  from "@/components/ui/slider"
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

export default function JobsPage() {
  const ready = useAuthGuard("student")
  return ready ? <JobsPageInner /> : (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="mr-2 h-6 w-6 animate-spin text-red-500" />
      <span>認証確認中...</span>
    </div>
  )
}

/* ------------------------------ Inner ------------------------------ */
function JobsPageInner() {
  /* ------------- state ------------- */
  const [searchQuery, setSearchQuery] = useState("")
  const [location,    setLocation]    = useState("")
  const [salaryRange, setSalaryRange] = useState<[number, number]>([300, 1000])
  const [jobs,        setJobs]        = useState<JobWithTags[]>([])
  const [saved,       setSaved]       = useState<string[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filterOpen,  setFilterOpen]  = useState(false)

  /* ------------- fetch ------------- */
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from("jobs")
        .select("*, companies(*), job_tags(tag)")
        .eq("published", true)
        .order("created_at", { ascending: false })

      setJobs((data ?? []) as unknown as JobWithTags[])
      setLoading(false)
    })()
  }, [])
  
  console.log("🚩 jobs raw", jobs.slice(0, 3));          // 3 件だけサンプル出力

  /* ------------- filter ------------- */
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()

    return jobs.filter(j => {
      /* --- テキスト検索 --- */
      const textOk =
        q === "" ||
        j.title.toLowerCase().includes(q) ||
        (j.company?.name ?? "").toLowerCase().includes(q)

      /* --- 勤務地 --- */
      const locOk =
        location === "" ||
        (j.location ?? "").includes(location)

      /* --- 給与レンジ (NULL/0 も含める) --- */
      const min = j.salary_min ?? 0
      const max = j.salary_max ?? Number.MAX_SAFE_INTEGER
      const salaryOk = min <= salaryRange[1] && max >= salaryRange[0]

      return textOk && locOk && salaryOk
    })
  }, [jobs, searchQuery, location, salaryRange])

  const toggleSave = useCallback((id: string) => {
    setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  /* ------------- render ------------- */
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* ================= HEADER ================= */}
      <section className="bg-gradient-to-r from-red-500 to-red-700 py-10">
        <div className="container space-y-6">
          <h1 className="text-3xl font-bold text-white">求人一覧</h1>

          {/* ---- search bar ---- */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="企業名・職種で検索"
              className="pl-10"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* ---- filter button (mobile) ---- */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 sm:hidden">
                <Filter size={16} />
                詳細検索
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>詳細検索</SheetTitle>
              </SheetHeader>
              <FilterForm
                location={location}
                setLocation={setLocation}
                salaryRange={salaryRange}
                setSalaryRange={setSalaryRange}
              />
              <Button className="mt-6 w-full" onClick={() => setFilterOpen(false)}>
                この条件で検索
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </section>

      {/* ================= LIST ================= */}
      <section className="container mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <p>読み込み中...</p>
        ) : filtered.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">
            求人が見つかりませんでした
          </p>
        ) : (
          filtered.map(j => (
            <JobCard
              key={j.id}
              job={j}
              saved={saved.includes(j.id)}
              onToggleSave={toggleSave}
              variant="grid"
            />
          ))
        )}
      </section>
    </main>
  )
}

/* ------------------------------ Filter Form ------------------------------ */
type FProps = {
  location: string
  setLocation: (v: string) => void
  salaryRange: [number, number]
  setSalaryRange: (r: [number, number]) => void
}
function FilterForm({ location, setLocation, salaryRange, setSalaryRange }: FProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Label htmlFor="loc">勤務地</Label>
        <Input
          id="loc"
          placeholder="例: 東京"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>給与レンジ (万円)</Label>
        <Slider
          min={0}
          max={2000}
          step={50}
          value={salaryRange}
          onValueChange={val => setSalaryRange(val as [number, number])}
        />
        <span className="text-xs text-neutral-600">
          {salaryRange[0]} 万 〜 {salaryRange[1]} 万
        </span>
      </div>
    </div>
  )
}
