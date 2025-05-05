"use client"

import { useState, useEffect } from "react"
import Link   from "next/link"
import Image  from "next/image"
import {
  Briefcase, Building, Calendar, ChevronRight, Filter, Heart, Info, MapPin,
  RefreshCw, Search, SortAsc, Star, Zap, Loader2,
} from "lucide-react"

import { Button }   from "@/components/ui/button"
import { Card }     from "@/components/ui/card"
import { Input }    from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge }    from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label }    from "@/components/ui/label"
import { Slider }   from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import { supabase, type Job, type JobTag } from "@/lib/supabase"
import { useAuthGuard } from "@/lib/use-auth-guard"   /* ★ 追加 */

type JobWithTags = Job & {
  tags: string[]
  company: { name: string; logo_url: string; cover_image_url: string }
  is_new: boolean
  is_featured: boolean
}

export default function JobsPage() {
  /* ← 学生専用ページにしたいのでガードを呼ぶ */
  const ready = useAuthGuard("student")

  /* ロード前は Skeleton */
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-red-500" />
        <span>認証を確認中...</span>
      </div>
    )
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState("all")
  const [selectedJobType, setSelectedJobType] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [salaryRange, setSalaryRange] = useState([300, 1000])
  const [savedJobs, setSavedJobs] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [jobs, setJobs] = useState<JobWithTags[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch jobs from Supabase
  useEffect(() => {
    async function fetchJobs() {
      try {
        setIsLoading(true)

        // Fetch jobs with company information
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select(`
            *,
            company:company_id (
              name,
              logo_url,
              cover_image_url
            )
          `)
          .eq("status", "active")
          .order("created_at", { ascending: false })

        if (jobsError) throw jobsError

        // Fetch tags for all jobs
        const jobIds = jobsData?.map((job) => job.id) || []
        const { data: tagsData, error: tagsError } = await supabase.from("job_tags").select("*").in("job_id", jobIds)

        if (tagsError) throw tagsError

        // Group tags by job_id
        const tagsByJobId: Record<number, string[]> = {}
        tagsData?.forEach((tagItem: JobTag) => {
          if (!tagsByJobId[tagItem.job_id]) {
            tagsByJobId[tagItem.job_id] = []
          }
          tagsByJobId[tagItem.job_id].push(tagItem.tag)
        })

        // Combine jobs with their tags and add additional fields
        const jobsWithTags =
          jobsData?.map((job) => {
            const createdDate = new Date(job.created_at)
            const isNew = new Date().getTime() - createdDate.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days

            return {
              ...job,
              tags: tagsByJobId[job.id] || [],
              is_new: isNew,
              is_featured: Math.random() > 0.7, // Random for demo purposes
            }
          }) || []

        setJobs(jobsWithTags)
      } catch (err) {
        console.error("Error fetching jobs:", err)
        setError("求人情報の取得に失敗しました。")
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobs()
  }, [])

  // Load saved jobs from localStorage
  useEffect(() => {
    const savedJobsFromStorage = localStorage.getItem("savedJobs")
    if (savedJobsFromStorage) {
      setSavedJobs(JSON.parse(savedJobsFromStorage))
    }
  }, [])

  // おすすめ求人（サイドバー用）
  const recommendedJobs = [
    {
      id: 101,
      company: "テックスタートアップ株式会社",
      position: "フルスタックエンジニア",
      logo: "/abstract-geometric-ts.png",
    },
    {
      id: 102,
      company: "AIソリューションズ株式会社",
      position: "機械学習エンジニア",
      logo: "/abstract-ai-network.png",
    },
    {
      id: 103,
      company: "デジタルマーケティング株式会社",
      position: "Webマーケター",
      logo: "/social-media-direct-message.png",
    },
  ]

  // 人気のタグ
  const popularTags = [
    "React",
    "Python",
    "AWS",
    "UI/UX",
    "Java",
    "データ分析",
    "プロジェクト管理",
    "マーケティング",
    "営業",
    "コンサルティング",
  ]

  // 業界リスト
  const industries = [
    { value: "all", label: "すべての業界" },
    { value: "it", label: "IT・通信" },
    { value: "finance", label: "金融・保険" },
    { value: "consulting", label: "コンサルティング" },
    { value: "manufacturing", label: "メーカー" },
    { value: "trading", label: "商社" },
    { value: "media", label: "広告・メディア" },
  ]

  // 職種リスト
  const jobTypes = [
    { value: "all", label: "すべての職種" },
    { value: "engineer", label: "エンジニア" },
    { value: "consultant", label: "コンサルタント" },
    { value: "designer", label: "デザイナー" },
    { value: "marketing", label: "マーケティング" },
    { value: "sales", label: "営業" },
    { value: "datascientist", label: "データサイエンティスト" },
  ]

  // 勤務地リスト
  const locations = [
    { value: "all", label: "すべての勤務地" },
    { value: "tokyo", label: "東京都" },
    { value: "osaka", label: "大阪府" },
    { value: "nagoya", label: "愛知県" },
    { value: "fukuoka", label: "福岡県" },
    { value: "remote", label: "リモート可" },
  ]

  // 検索フィルタリング
  const filteredJobs = jobs.filter((job) => {
    // 検索クエリでフィルタリング
    const matchesQuery =
      searchQuery === "" ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase())

    // 業界でフィルタリング (実際のデータに合わせて調整が必要)
    const matchesIndustry = selectedIndustry === "all" // 実際のデータに合わせて実装

    // 職種でフィルタリング (実際のデータに合わせて調整が必要)
    const matchesJobType = selectedJobType === "all" // 実際のデータに合わせて実装

    // 勤務地でフィルタリング
    const matchesLocation =
      selectedLocation === "all" || job.location.toLowerCase().includes(selectedLocation.toLowerCase())

    // 年収でフィルタリング
    const matchesSalary = job.salary_min <= salaryRange[1] && job.salary_max >= salaryRange[0]

    return matchesQuery && matchesIndustry && matchesJobType && matchesLocation && matchesSalary
  })

  // 求人を保存する関数
  const toggleSaveJob = (id: number) => {
    if (savedJobs.includes(id)) {
      const newSavedJobs = savedJobs.filter((jobId) => jobId !== id)
      setSavedJobs(newSavedJobs)
      localStorage.setItem("savedJobs", JSON.stringify(newSavedJobs))
    } else {
      const newSavedJobs = [...savedJobs, id]
      setSavedJobs(newSavedJobs)
      localStorage.setItem("savedJobs", JSON.stringify(newSavedJobs))
    }
  }

  // タグの色を取得する関数
  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      React: "bg-blue-100 text-blue-800",
      TypeScript: "bg-blue-100 text-blue-800",
      "Next.js": "bg-blue-100 text-blue-800",
      コンサルティング: "bg-purple-100 text-purple-800",
      DX: "bg-purple-100 text-purple-800",
      プロジェクト管理: "bg-purple-100 text-purple-800",
      Java: "bg-green-100 text-green-800",
      "Spring Boot": "bg-green-100 text-green-800",
      マイクロサービス: "bg-green-100 text-green-800",
      "UI/UX": "bg-pink-100 text-pink-800",
      Figma: "bg-pink-100 text-pink-800",
      プロトタイピング: "bg-pink-100 text-pink-800",
      Python: "bg-orange-100 text-orange-800",
      機械学習: "bg-orange-100 text-orange-800",
      データ分析: "bg-orange-100 text-orange-800",
    }

    return colors[tag] || "bg-gray-100 text-gray-800"
  }

  // フィルターをリセットする関数
  const resetFilters = () => {
    setSelectedIndustry("all")
    setSelectedJobType("all")
    setSelectedLocation("all")
    setSalaryRange([300, 1000])
    setSearchQuery("")
  }

  // フィルターコンテンツ（モバイルとデスクトップで共有）
  const FilterContent = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="industry">業界</Label>
        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
          <SelectTrigger id="industry">
            <SelectValue placeholder="業界を選択" />
          </SelectTrigger>
          <SelectContent>
            {industries.map((industry) => (
              <SelectItem key={industry.value} value={industry.value}>
                {industry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="jobType">職種</Label>
        <Select value={selectedJobType} onValueChange={setSelectedJobType}>
          <SelectTrigger id="jobType">
            <SelectValue placeholder="職種を選択" />
          </SelectTrigger>
          <SelectContent>
            {jobTypes.map((jobType) => (
              <SelectItem key={jobType.value} value={jobType.value}>
                {jobType.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="location">勤務地</Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger id="location">
            <SelectValue placeholder="勤務地を選択" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.value} value={location.value}>
                {location.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <div className="flex justify-between">
          <Label htmlFor="salary">年収範囲</Label>
          <span className="text-sm text-gray-500">
            {salaryRange[0]}万円 〜 {salaryRange[1]}万円
          </span>
        </div>
        <Slider
          id="salary"
          defaultValue={salaryRange}
          min={300}
          max={1000}
          step={50}
          value={salaryRange}
          onValueChange={setSalaryRange}
          className="py-4"
        />
      </div>

      <div className="grid gap-2">
        <Label>雇用形態</Label>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="fulltime" />
            <label htmlFor="fulltime" className="text-sm">
              正社員
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="contract" />
            <label htmlFor="contract" className="text-sm">
              契約社員
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="intern" />
            <label htmlFor="intern" className="text-sm">
              インターン
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>働き方</Label>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="remote" />
            <label htmlFor="remote" className="text-sm">
              リモート可
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="flextime" />
            <label htmlFor="flextime" className="text-sm">
              フレックス制
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-red-500 mb-4" />
        <p className="text-lg font-medium text-gray-700">求人情報を読み込み中...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">エラーが発生しました</h3>
          <p className="text-red-700">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            再読み込み
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-red-500 to-red-700 py-6 sm:py-12">
        <div className="container mx-auto px-4">
          <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">求人一覧</h1>
          <p className="text-base text-white/90 sm:text-lg">あなたにぴったりの求人を探しましょう</p>

          <div className="mt-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-lg sm:mt-8 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="企業名、職種などで検索"
                className="border-2 pl-10 focus:border-red-500 focus:ring-red-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {/* モバイル用フィルターシート */}
              <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-2 hover:bg-gray-100 md:hidden"
                    onClick={() => setIsFilterSheetOpen(true)}
                  >
                    <Filter size={16} />
                    <span>詳細検索</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
                  <SheetHeader>
                    <SheetTitle>詳細検索</SheetTitle>
                    <SheetDescription>条件を指定して求人を絞り込みましょう</SheetDescription>
                  </SheetHeader>
                  <FilterContent />
                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="outline" onClick={resetFilters}>
                      リセット
                    </Button>
                    <Button
                      type="submit"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => setIsFilterSheetOpen(false)}
                    >
                      検索する
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* デスクトップ用フィルターダイアログ */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden gap-2 border-2 hover:bg-gray-100 md:inline-flex"
                  >
                    <Filter size={16} />
                    <span>詳細検索</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>詳細検索</DialogTitle>
                  </DialogHeader>
                  <FilterContent />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetFilters}>
                      リセット
                    </Button>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700">
                      検索する
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" className="hidden gap-2 border-2 hover:bg-gray-100 sm:inline-flex">
                <SortAsc size={16} />
                <span>並び替え</span>
              </Button>

              <div className="hidden sm:inline-flex">
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger className="w-[180px] border-2">
                    <SelectValue placeholder="業界で絞り込み" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ── 職種セレクト（md 以上で表示）── */}
              <div className="hidden md:inline-flex">
                <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                  <SelectTrigger className="w-[180px] border-2">
                    <SelectValue placeholder="職種で絞り込み" />
                  </SelectTrigger>

                  <SelectContent>
                    {jobTypes.map((jobType) => (
                      <SelectItem key={jobType.value} value={jobType.value}>
                        {jobType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* メインコンテンツ */}
          <div className="w-full lg:w-2/3">
            <Tabs defaultValue="all" className="w-full">
              <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:mb-6 sm:flex-row sm:items-center">
                <TabsList className="grid w-full max-w-md grid-cols-4 rounded-xl bg-gray-100 p-1">
                  <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm">
                    すべて
                  </TabsTrigger>
                  <TabsTrigger value="recommended" className="rounded-lg text-xs sm:text-sm">
                    おすすめ
                  </TabsTrigger>
                  <TabsTrigger value="new" className="rounded-lg text-xs sm:text-sm">
                    新着
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="rounded-lg text-xs sm:text-sm">
                    保存済み
                  </TabsTrigger>
                </TabsList>

                <div className="flex w-full items-center justify-between sm:w-auto sm:gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode("grid")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode("list")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </Button>
                </div>
              </div>

              <TabsContent value="all" className="mt-0">
                {filteredJobs.length > 0 ? (
                  viewMode === "grid" ? (
                    <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                      {filteredJobs.map((job) => (
                        <Card
                          key={job.id}
                          className="group overflow-hidden rounded-xl border-0 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="relative h-32 w-full overflow-hidden sm:h-40">
                            <Image
                              src={
                                job.company.cover_image_url ||
                                "/placeholder.svg?height=200&width=600&query=tech company"
                              }
                              alt={`${job.company.name}のカバー画像`}
                              width={600}
                              height={200}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

                            {job.is_featured && (
                              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-xs font-medium text-yellow-900 sm:left-4 sm:top-4 sm:px-3">
                                <Star size={12} className="sm:h-3.5 sm:w-3.5" />
                                <span className="text-[10px] sm:text-xs">おすすめ求人</span>
                              </div>
                            )}

                            <div className="absolute bottom-2 left-2 flex items-center gap-2 sm:bottom-4 sm:left-4 sm:gap-3">
                              <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-white shadow-md sm:h-16 sm:w-16 sm:border-4">
                                <Image
                                  src={job.company.logo_url || "/placeholder.svg?height=80&width=80&query=company logo"}
                                  alt={`${job.company.name}のロゴ`}
                                  width={80}
                                  height={80}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white sm:text-base">{job.company.name}</h3>
                                <div className="mt-0.5 flex items-center gap-1 sm:mt-1 sm:gap-2">
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-white bg-white/20 text-[10px] font-normal text-white backdrop-blur-sm sm:text-xs"
                                  >
                                    {job.employment_type || "正社員"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 sm:p-6">
                            <div className="mb-2 flex items-start justify-between sm:mb-3">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-gray-900 line-clamp-1 sm:text-xl">
                                  {job.title}
                                </h3>
                                {job.is_new && (
                                  <Badge className="bg-red-500 text-[10px] text-white sm:text-xs">NEW</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 rounded-full ${
                                  savedJobs.includes(job.id) ? "text-red-500" : "text-gray-400"
                                }`}
                                onClick={() => toggleSaveJob(job.id)}
                              >
                                <Heart size={18} className={savedJobs.includes(job.id) ? "fill-red-500" : ""} />
                                <span className="sr-only">保存する</span>
                              </Button>
                            </div>

                            <p className="mb-3 text-xs text-gray-600 line-clamp-2 sm:mb-4 sm:text-sm">
                              {job.description}
                            </p>

                            <div className="mb-3 flex flex-wrap gap-1 sm:mb-4 sm:gap-2">
                              {job.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className={`rounded-full text-[10px] sm:text-xs ${getTagColor(tag)}`}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-gray-500 sm:mb-6 sm:grid-cols-2 sm:gap-3 sm:text-sm">
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <MapPin size={14} className="text-gray-400 sm:h-4 sm:w-4" />
                                <span className="line-clamp-1">{job.location}</span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <Building size={14} className="text-gray-400 sm:h-4 sm:w-4" />
                                <span className="line-clamp-1">{job.work_style || "ハイブリッド"}</span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <Briefcase size={14} className="text-gray-400 sm:h-4 sm:w-4" />
                                <span className="line-clamp-1">
                                  年収{job.salary_min}万円〜{job.salary_max}万円
                                </span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <Calendar size={14} className="text-gray-400 sm:h-4 sm:w-4" />
                                <span className="line-clamp-1">
                                  掲載日: {new Date(job.created_at).toLocaleDateString("ja-JP")}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 sm:gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full border-2 px-3 text-xs sm:px-4 sm:text-sm"
                                onClick={() => toggleSaveJob(job.id)}
                              >
                                <Heart
                                  size={14}
                                  className={`mr-1 sm:mr-1.5 sm:h-4 sm:w-4 ${
                                    savedJobs.includes(job.id) ? "fill-red-500 text-red-500" : ""
                                  }`}
                                />
                                {savedJobs.includes(job.id) ? "保存済み" : "保存する"}
                              </Button>
                              <Link href={`/jobs/${job.id}`}>
                                <Button
                                  size="sm"
                                  className="h-8 rounded-full bg-red-600 px-3 text-xs hover:bg-red-700 sm:px-4 sm:text-sm"
                                >
                                  詳細を見る
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {filteredJobs.map((job) => (
                        <Card
                          key={job.id}
                          className="group overflow-hidden rounded-xl border-0 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="flex flex-col md:flex-row">
                            <div className="relative h-28 w-full md:h-auto md:w-1/4">
                              <Image
                                src={
                                  job.company.cover_image_url ||
                                  "/placeholder.svg?height=200&width=200&query=tech company"
                                }
                                alt={`${job.company.name}のカバー画像`}
                                width={200}
                                height={200}
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent md:bg-gradient-to-r"></div>

                              <div className="absolute bottom-2 left-2 flex items-center gap-2 md:bottom-auto md:left-auto md:right-4 md:top-4">
                                <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-white shadow-md md:h-12 md:w-12">
                                  <Image
                                    src={
                                      job.company.logo_url || "/placeholder.svg?height=48&width=48&query=company logo"
                                    }
                                    alt={`${job.company.name}のロゴ`}
                                    width={48}
                                    height={48}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex-1 p-3 md:p-4">
                              <div className="mb-2 flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-gray-900 sm:text-base">{job.company.name}</h3>
                                    {job.is_featured && (
                                      <Badge
                                        variant="outline"
                                        className="bg-yellow-100 text-[10px] text-yellow-800 sm:text-xs"
                                      >
                                        おすすめ
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className="text-base font-bold text-gray-900 line-clamp-1 sm:text-lg">
                                    {job.title}
                                  </h4>
                                  <div className="mt-0.5 flex items-center gap-1 sm:mt-1 sm:gap-2">
                                    <Badge
                                      variant="outline"
                                      className="bg-gray-100 text-[10px] text-gray-800 sm:text-xs"
                                    >
                                      {job.employment_type || "正社員"}
                                    </Badge>
                                    {job.is_new && (
                                      <Badge className="bg-red-500 text-[10px] text-white sm:text-xs">NEW</Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 rounded-full ${
                                    savedJobs.includes(job.id) ? "text-red-500" : "text-gray-400"
                                  }`}
                                  onClick={() => toggleSaveJob(job.id)}
                                >
                                  <Heart size={18} className={savedJobs.includes(job.id) ? "fill-red-500" : ""} />
                                  <span className="sr-only">保存する</span>
                                </Button>
                              </div>

                              <p className="mb-2 text-xs text-gray-600 line-clamp-2 sm:mb-3 sm:text-sm">
                                {job.description}
                              </p>

                              <div className="mb-2 flex flex-wrap gap-1 sm:mb-3 sm:gap-2">
                                {job.tags.map((tag, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className={`rounded-full text-[10px] sm:text-xs ${getTagColor(tag)}`}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>

                              <div className="mb-3 grid grid-cols-2 gap-1 text-[10px] text-gray-500 sm:mb-4 sm:grid-cols-4 sm:gap-2 sm:text-xs">
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} className="text-gray-400 sm:h-3.5 sm:w-3.5" />
                                  <span className="line-clamp-1">{job.location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Building size={12} className="text-gray-400 sm:h-3.5 sm:w-3.5" />
                                  <span className="line-clamp-1">{job.work_style || "ハイブリッド"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Briefcase size={12} className="text-gray-400 sm:h-3.5 sm:w-3.5" />
                                  <span className="line-clamp-1">
                                    年収{job.salary_min}万円〜{job.salary_max}万円
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar size={12} className="text-gray-400 sm:h-3.5 sm:w-3.5" />
                                  <span className="line-clamp-1">
                                    掲載日: {new Date(job.created_at).toLocaleDateString("ja-JP")}
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 rounded-full border-2 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs"
                                  onClick={() => toggleSaveJob(job.id)}
                                >
                                  <Heart
                                    size={12}
                                    className={`mr-1 sm:h-3.5 sm:w-3.5 ${
                                      savedJobs.includes(job.id) ? "fill-red-500 text-red-500" : ""
                                    }`}
                                  />
                                  {savedJobs.includes(job.id) ? "保存済み" : "保存する"}
                                </Button>
                                <Link href={`/jobs/${job.id}`}>
                                  <Button
                                    size="sm"
                                    className="h-7 rounded-full bg-red-600 px-2 text-[10px] hover:bg-red-700 sm:h-8 sm:px-3 sm:text-xs"
                                  >
                                    詳細を見る
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center sm:p-8">
                    <div className="mb-3 rounded-full bg-gray-100 p-3">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-medium text-gray-600 sm:text-lg">
                      検索条件に一致する求人が見つかりませんでした
                    </h3>
                    <p className="mt-2 text-xs text-gray-500 sm:text-sm">検索条件を変更して再度お試しください</p>
                    <Button variant="outline" className="mt-4 text-xs sm:text-sm" onClick={resetFilters}>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      検索条件をリセット
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recommended" className="mt-0">
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center sm:p-8">
                  <h3 className="text-base font-medium text-gray-600 sm:text-lg">あなたにおすすめの求人</h3>
                  <p className="mt-2 text-xs text-gray-500 sm:text-sm">
                    プロフィールに基づいたおすすめの求人が表示されます
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="new" className="mt-0">
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center sm:p-8">
                  <h3 className="text-base font-medium text-gray-600 sm:text-lg">新着の求人</h3>
                  <p className="mt-2 text-xs text-gray-500 sm:text-sm">最近追加された求人が表示されます</p>
                </div>
              </TabsContent>

              <TabsContent value="saved" className="mt-0">
                {savedJobs.length > 0 ? (
                  <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                    {filteredJobs
                      .filter((job) => savedJobs.includes(job.id))
                      .map((job) => (
                        <Card
                          key={job.id}
                          className="group overflow-hidden rounded-xl border-0 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                        >
                          {/* Card content - same as in the "all" tab */}
                          <div className="relative h-32 w-full overflow-hidden sm:h-40">
                            <Image
                              src={
                                job.company.cover_image_url ||
                                "/placeholder.svg?height=200&width=600&query=tech company"
                              }
                              alt={`${job.company.name}のカバー画像`}
                              width={600}
                              height={200}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Rest of the card content */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

                            <div className="absolute bottom-2 left-2 flex items-center gap-2 sm:bottom-4 sm:left-4 sm:gap-3">
                              <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-white shadow-md sm:h-16 sm:w-16 sm:border-4">
                                <Image
                                  src={job.company.logo_url || "/placeholder.svg?height=80&width=80&query=company logo"}
                                  alt={`${job.company.name}のロゴ`}
                                  width={80}
                                  height={80}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-white sm:text-base">{job.company.name}</h3>
                                <div className="mt-0.5 flex items-center gap-1 sm:mt-1 sm:gap-2">
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-white bg-white/20 text-[10px] font-normal text-white backdrop-blur-sm sm:text-xs"
                                  >
                                    {job.employment_type || "正社員"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 sm:p-6">
                            {/* Card body content */}
                            <div className="mb-2 flex items-start justify-between sm:mb-3">
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-gray-900 line-clamp-1 sm:text-xl">
                                  {job.title}
                                </h3>
                                {job.is_new && (
                                  <Badge className="bg-red-500 text-[10px] text-white sm:text-xs">NEW</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-red-500"
                                onClick={() => toggleSaveJob(job.id)}
                              >
                                <Heart size={18} className="fill-red-500" />
                                <span className="sr-only">保存を解除</span>
                              </Button>
                            </div>

                            <p className="mb-3 text-xs text-gray-600 line-clamp-2 sm:mb-4 sm:text-sm">
                              {job.description}
                            </p>

                            <div className="mb-3 flex flex-wrap gap-1 sm:mb-4 sm:gap-2">
                              {job.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className={`rounded-full text-[10px] sm:text-xs ${getTagColor(tag)}`}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-gray-500 sm:mb-6 sm:grid-cols-2 sm:gap-3 sm:text-sm">
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <MapPin size={14} className="text-gray-400 sm:h-4 sm:w-4" />
                                <span className="line-clamp-1">{job.location}</span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <Building size={14} className="text-gray-400 sm:h-4 sm:w-4" />
                                <span className="line-clamp-1">{job.work_style || "ハイブリッド"}</span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <Briefcase size={14} className="text-gray-400 sm:h-4 sm:w-4" />
                                <span className="line-clamp-1">
                                  年収{job.salary_min}万円〜{job.salary_max}万円
                                </span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <Calendar size={14} className="text-gray-400 sm:h-4 sm:w-4" />
                                <span className="line-clamp-1">
                                  掲載日: {new Date(job.created_at).toLocaleDateString("ja-JP")}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 sm:gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full border-2 px-3 text-xs sm:px-4 sm:text-sm"
                                onClick={() => toggleSaveJob(job.id)}
                              >
                                <Heart size={14} className="mr-1 fill-red-500 text-red-500 sm:mr-1.5 sm:h-4 sm:w-4" />
                                保存を解除
                              </Button>
                              <Link href={`/jobs/${job.id}`}>
                                <Button
                                  size="sm"
                                  className="h-8 rounded-full bg-red-600 px-3 text-xs hover:bg-red-700 sm:px-4 sm:text-sm"
                                >
                                  詳細を見る
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center sm:p-8">
                    <h3 className="text-base font-medium text-gray-600 sm:text-lg">保存した求人</h3>
                    <p className="mt-2 text-xs text-gray-500 sm:text-sm">保存した求人がここに表示されます</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* サイドバー - デスクトップのみ表示 */}
          <div className="hidden w-full lg:block lg:w-1/3">
            <div className="space-y-6">
              {/* 検索フィルター */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
                  <h3 className="text-lg font-bold text-white">求人検索</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="sidebar-industry">業界</Label>
                      <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                        <SelectTrigger id="sidebar-industry" className="mt-1 w-full">
                          <SelectValue placeholder="業界を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry.value} value={industry.value}>
                              {industry.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sidebar-jobType">職種</Label>
                      <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                        <SelectTrigger id="sidebar-jobType" className="mt-1 w-full">
                          <SelectValue placeholder="職種を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobTypes.map((jobType) => (
                            <SelectItem key={jobType.value} value={jobType.value}>
                              {jobType.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="sidebar-location">勤務地</Label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger id="sidebar-location" className="mt-1 w-full">
                          <SelectValue placeholder="勤務地を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.value} value={location.value}>
                              {location.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex justify-between">
                        <Label htmlFor="sidebar-salary">年収範囲</Label>
                        <span className="text-sm text-gray-500">
                          {salaryRange[0]}万円 〜 {salaryRange[1]}万円
                        </span>
                      </div>
                      <Slider
                        id="sidebar-salary"
                        defaultValue={salaryRange}
                        min={300}
                        max={1000}
                        step={50}
                        value={salaryRange}
                        onValueChange={setSalaryRange}
                        className="mt-2 py-4"
                      />
                    </div>

                    <Button className="w-full bg-red-600 hover:bg-red-700">検索する</Button>
                  </div>
                </div>
              </Card>

              {/* おすすめ求人 */}
              <Card>
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4">
                  <h3 className="text-lg font-bold text-yellow-900">おすすめ求人</h3>
                </div>
                <div className="divide-y">
                  {recommendedJobs.map((job) => (
                    <div key={job.id} className="flex items-center gap-3 p-4">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-200">
                        <Image
                          src={job.logo || "/placeholder.svg?height=40&width=40&query=company logo"}
                          alt={`${job.company}のロゴ`}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{job.company}</h4>
                        <p className="text-sm text-gray-500">{job.position}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  ))}
                </div>
                <div className="border-t p-3 text-center">
                  <Button variant="link" className="text-sm text-red-600 hover:text-red-700">
                    すべてのおすすめを見る
                  </Button>
                </div>
              </Card>

              {/* 求人検索のコツ */}
              <Card>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                  <h3 className="text-lg font-bold text-white">求人検索のコツ</h3>
                </div>
                <div className="p-4">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <Zap size={16} className="mt-0.5 text-blue-500" />
                      <span>複数のキーワードを組み合わせて検索すると、より絞り込まれた結果が得られます。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap size={16} className="mt-0.5 text-blue-500" />
                      <span>「保存する」ボタンを使って、気になる求人を後で確認できます。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap size={16} className="mt-0.5 text-blue-500" />
                      <span>プロフィールを完成させると、あなたに合ったおすすめ求人が表示されます。</span>
                    </li>
                  </ul>
                </div>
              </Card>

              {/* 人気のタグ */}
              <Card>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
                  <h3 className="text-lg font-bold text-white">人気のタグ</h3>
                </div>
                <div className="flex flex-wrap gap-2 p-4">
                  {popularTags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer rounded-full bg-gray-100 hover:bg-gray-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card>

              {/* 求人情報 */}
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 text-white">
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Info size={16} />
                    <h3 className="text-lg font-bold">求人情報</h3>
                  </div>
                  <Separator className="mb-3 bg-gray-700" />
                  <div className="space-y-2 text-sm">
                    <p>現在の検索結果: {filteredJobs.length}件</p>
                    <p>新着求人: {jobs.filter((job) => job.is_new).length}件（過去7日間）</p>
                    <p>最終更新: {new Date().toLocaleDateString("ja-JP")}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
