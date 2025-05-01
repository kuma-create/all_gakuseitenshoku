"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Search, Filter, MapPin, Briefcase, Calendar, ChevronRight, Bookmark, BookmarkCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

type Job = {
  id: string
  title: string
  description: string
  location: string | null
  job_type: string | null
  salary_range: string | null
  requirements: string | null
  application_deadline: string | null
  is_active: boolean
  created_at: string
  company_id: string
  companies: {
    id: string
    name: string
    industry: string | null
    logo_url: string | null
  } | null
}

type FilterOption = {
  value: string
  label: string
}

interface JobsClientProps {
  initialJobs: Job[]
  industries: FilterOption[]
  jobTypes: FilterOption[]
  locations: FilterOption[]
}

export default function JobsClient({ initialJobs, industries, jobTypes, locations }: JobsClientProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [filteredJobs, setFilteredJobs] = useState<Job[]>(initialJobs)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState("all")
  const [selectedJobType, setSelectedJobType] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [salaryRange, setSalaryRange] = useState([0, 100])
  const [savedJobs, setSavedJobs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 保存済み求人を取得
  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase.from("saved_jobs").select("job_id").eq("student_id", user.id)

        if (!error && data) {
          setSavedJobs(data.map((item) => item.job_id))
        }
      } catch (error) {
        console.error("Error fetching saved jobs:", error)
      }
    }

    fetchSavedJobs()
  }, [user, supabase])

  // 求人を保存/削除する関数
  const toggleSaveJob = async (jobId: string) => {
    if (!user) {
      toast({
        title: "ログインが必要です",
        description: "求人を保存するにはログインしてください",
      })
      return
    }

    setIsLoading(true)

    try {
      const isSaved = savedJobs.includes(jobId)

      if (isSaved) {
        // 保存済みの場合は削除
        const { error } = await supabase.from("saved_jobs").delete().eq("student_id", user.id).eq("job_id", jobId)

        if (!error) {
          setSavedJobs(savedJobs.filter((id) => id !== jobId))
          toast({
            title: "求人を削除しました",
            description: "保存リストから削除されました",
          })
        }
      } else {
        // 保存されていない場合は追加
        const { error } = await supabase.from("saved_jobs").insert({
          student_id: user.id,
          job_id: jobId,
          created_at: new Date().toISOString(),
        })

        if (!error) {
          setSavedJobs([...savedJobs, jobId])
          toast({
            title: "求人を保存しました",
            description: "保存リストに追加されました",
          })
        }
      }
    } catch (error) {
      console.error("Error toggling saved job:", error)
      toast({
        title: "エラーが発生しました",
        description: "操作に失敗しました。もう一度お試しください。",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 検索とフィルタリング
  useEffect(() => {
    let result = [...jobs]

    // 検索クエリでフィルタリング
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (job) =>
          job.title?.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query) ||
          job.companies?.name?.toLowerCase().includes(query),
      )
    }

    // 業界でフィルタリング
    if (selectedIndustry !== "all") {
      result = result.filter((job) => job.companies?.industry?.toLowerCase() === selectedIndustry.toLowerCase())
    }

    // 職種でフィルタリング
    if (selectedJobType !== "all") {
      result = result.filter((job) => job.job_type?.toLowerCase() === selectedJobType.toLowerCase())
    }

    // 勤務地でフィルタリング
    if (selectedLocation !== "all") {
      result = result.filter((job) => job.location?.toLowerCase().includes(selectedLocation.toLowerCase()))
    }

    // 給与範囲でフィルタリング
    if (salaryRange[0] > 0 || salaryRange[1] < 100) {
      result = result.filter((job) => {
        if (!job.salary_range) return true

        const [min, max] = job.salary_range.split("〜").map((s) => Number.parseInt(s.replace(/[^0-9]/g, "")))
        return (!min || min >= salaryRange[0]) && (!max || max <= salaryRange[1])
      })
    }

    setFilteredJobs(result)
  }, [jobs, searchQuery, selectedIndustry, selectedJobType, selectedLocation, salaryRange])

  // フィルターをリセット
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedIndustry("all")
    setSelectedJobType("all")
    setSelectedLocation("all")
    setSalaryRange([0, 100])
  }

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">求人検索</h1>
        <p className="text-muted-foreground">{filteredJobs.length}件の求人が見つかりました</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="キーワードで検索（職種、企業名など）"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              フィルター
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>求人フィルター</SheetTitle>
              <SheetDescription>条件を指定して求人を絞り込みます</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label>業界</Label>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>職種</Label>
                <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>勤務地</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>給与範囲（万円）</Label>
                  <span className="text-sm text-muted-foreground">
                    {salaryRange[0]}万円 - {salaryRange[1]}万円
                  </span>
                </div>
                <Slider
                  value={salaryRange}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(value) => setSalaryRange(value as [number, number])}
                  className="py-4"
                />
              </div>
            </div>

            <SheetFooter className="mt-6 flex-row justify-between gap-2">
              <Button variant="outline" onClick={resetFilters} className="flex-1">
                リセット
              </Button>
              <SheetClose asChild>
                <Button className="flex-1 bg-red-600 hover:bg-red-700">適用</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* アクティブなフィルター表示 */}
      {(selectedIndustry !== "all" ||
        selectedJobType !== "all" ||
        selectedLocation !== "all" ||
        salaryRange[0] > 0 ||
        salaryRange[1] < 100) && (
        <div className="mb-6 flex flex-wrap gap-2">
          {selectedIndustry !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              業界: {industries.find((i) => i.value === selectedIndustry)?.label}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedIndustry("all")} />
            </Badge>
          )}

          {selectedJobType !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              職種: {jobTypes.find((j) => j.value === selectedJobType)?.label}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedJobType("all")} />
            </Badge>
          )}

          {selectedLocation !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              勤務地: {locations.find((l) => l.value === selectedLocation)?.label}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSelectedLocation("all")} />
            </Badge>
          )}

          {(salaryRange[0] > 0 || salaryRange[1] < 100) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              給与: {salaryRange[0]}万円〜{salaryRange[1]}万円
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => setSalaryRange([0, 100])} />
            </Badge>
          )}

          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 text-xs text-muted-foreground">
            すべてクリア
          </Button>
        </div>
      )}

      {/* 求人リスト */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="mb-2 text-lg font-medium">求人が見つかりませんでした</h3>
          <p className="mb-4 text-sm text-muted-foreground">検索条件を変更して、もう一度お試しください</p>
          <Button onClick={resetFilters}>フィルターをリセット</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-md">
                      {job.companies?.logo_url ? (
                        <Image
                          src={job.companies.logo_url || "/placeholder.svg"}
                          alt={job.companies.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-200 text-lg font-bold">
                          {job.companies?.name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{job.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{job.companies?.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleSaveJob(job.id)
                    }}
                    disabled={isLoading}
                  >
                    {savedJobs.includes(job.id) ? (
                      <BookmarkCheck className="h-5 w-5 text-red-600" />
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )}
                    <span className="sr-only">{savedJobs.includes(job.id) ? "保存済み" : "保存する"}</span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pb-2">
                <div className="mb-4 flex flex-wrap gap-1">
                  {job.location && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </Badge>
                  )}
                  {job.job_type && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Briefcase className="h-3 w-3" />
                      {job.job_type}
                    </Badge>
                  )}
                  {job.salary_range && (
                    <Badge variant="outline" className="text-xs">
                      {job.salary_range}
                    </Badge>
                  )}
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
              </CardContent>

              <CardFooter className="flex items-center justify-between pt-2">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="mr-1 h-3 w-3" />
                  {formatDate(job.created_at)}
                </div>
                <Link href={`/jobs/${job.id}`}>
                  <Button size="sm" className="gap-1 bg-red-600 hover:bg-red-700">
                    詳細を見る
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
