"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

// ファイル冒頭の imports の下あたり
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
const supabase = createClientComponentClient()   // 既に client があれば不要


export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [isInterested, setIsInterested] = useState(false)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [job, setJob] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jobTags, setJobTags] = useState<string[]>([])
  const [company, setCompany] = useState<any>(null)
  const [relatedJobs, setRelatedJobs] = useState<any[]>([])

  // Fetch job details from Supabase
  useEffect(() => {
    async function fetchJobDetails() {
      try {
        setIsLoading(true)

        // Fetch job with company information
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select(`
            *,
            company:companies (
              id,
              name,
              description,
              logo_url,
              cover_image_url,
              industry,
              founded_year,
              employee_count,
              location,
              website_url
            )
          `)
          .eq("id", params.id)
          .single()

        if (jobError) throw jobError
        if (!jobData) throw new Error("求人が見つかりませんでした")

        // Fetch tags for this job
        const { data: tagsData, error: tagsError } = await supabase
          .from("job_tags")
          .select("tag")
          .eq("job_id", params.id)

        if (tagsError) throw tagsError

        // Extract tags
        const tags = tagsData?.map((item) => item.tag) || []

        // Update view count
        const { error: updateError } = await supabase
          .from("jobs")
          .update({ views: (jobData.views || 0) + 1 })
          .eq("id", params.id)

        if (updateError) console.error("Error updating view count:", updateError)

        // Check if user has applied
        // In a real app, this would check against the user's ID
        const { data: applicationData } = await supabase
          .from("applications")
          .select("id")
          .eq("job_id", params.id)
          .eq("student_id", (await supabase.auth.getUser()).data.user?.id ?? "")
          .limit(1)

        // Fetch related jobs (same company or similar tags)
        const { data: relatedJobsData } = await supabase
          .from("jobs")
          .select(`
            id,
            title,
            company_id,
            location,
            salary_min,
            salary_max,
            company:companies (
              name,
              logo_url
            )
          `)
          .eq("company_id", jobData.company_id)
          .neq("id", params.id)
          .limit(3)

        setJob(jobData)
        setCompany(jobData.company)
        setJobTags(tags)
        setHasApplied(applicationData !== null && applicationData.length > 0)
        setRelatedJobs(relatedJobsData || [])

        // Check if job is in saved jobs
        const savedJobsFromStorage = localStorage.getItem("savedJobs")
        if (savedJobsFromStorage) {
          const savedJobs = JSON.parse(savedJobsFromStorage)
          setIsInterested(savedJobs.includes(Number(params.id)))
        }
      } catch (err) {
        console.error("Error fetching job details:", err)
        setError(err instanceof Error ? err.message : "求人情報の取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobDetails()
  }, [params.id])

  const handleApply = async () => {
    try {
 // ① ログインユーザーを取得
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("サインインが必要です")
    
        // ② student_id を含めて INSERT
        const { error } = await supabase.from("applications").insert({
          job_id: params.id,          // uuid のまま
          student_id: user.id,        // ここが必須
          status: "applied",          // テーブルの default と合わせる
        })
      if (error) throw error

      setHasApplied(true)
      setShowApplicationForm(false)
    } catch (error) {
      console.error("Error applying for job:", error)
      alert("応募に失敗しました。もう一度お試しください。")
    }
  }

  const toggleSaveJob = () => {
    const savedJobsFromStorage = localStorage.getItem("savedJobs")
    let savedJobs: number[] = savedJobsFromStorage ? JSON.parse(savedJobsFromStorage) : []

    if (isInterested) {
      // Remove from saved jobs
      savedJobs = savedJobs.filter((id) => id !== Number(params.id))
    } else {
      // Add to saved jobs
      savedJobs.push(Number(params.id))
    }

    localStorage.setItem("savedJobs", JSON.stringify(savedJobs))
    setIsInterested(!isInterested)
  }

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
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">エラーが発生しました</h3>
          <p className="text-red-700">{error}</p>
          <Button className="mt-4" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md w-full text-center">
          <div className="text-yellow-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">求人が見つかりませんでした</h3>
          <p className="text-yellow-700">お探しの求人は存在しないか、削除された可能性があります。</p>
          <Button className="mt-4" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            求人一覧に戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        {/* Back link */}
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-red-600 sm:text-sm"
          >
            <ArrowLeft size={16} />
            <span>求人一覧に戻る</span>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left column: Job details */}
          <div className="md:col-span-2">
            {/* Header card */}
            <Card className="mb-6 overflow-hidden border-0 shadow-md">
              <div className="h-32 w-full bg-gradient-to-r from-red-500 to-red-600 opacity-90"></div>
              <CardContent className="relative -mt-16 bg-white p-6">
                <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-white shadow-md">
                    <Image
                      src={company?.logo_url || "/placeholder.svg?height=128&width=128&query=company logo"}
                      alt={`${company?.name}のロゴ`}
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">{job.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/company/${company?.id}`}
                        className="text-base font-medium text-red-600 hover:text-red-700 hover:underline sm:text-lg"
                      >
                        {company?.name}
                      </Link>
                      {new Date(job.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                        <Badge className="bg-red-500 text-xs font-medium uppercase text-white">新着</Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {jobTags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="bg-red-50 text-xs text-red-700">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <MapPin size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">勤務地</p>
                      <p className="font-medium">{job.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <Building size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">勤務形態</p>
                      <p className="font-medium">{job.work_style || "ハイブリッド"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">給与</p>
                      <p className="font-medium">
                        年収{job.salary_min}万円〜{job.salary_max}万円
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">応募締切</p>
                      <p className="font-medium">
                        {job.deadline ? new Date(job.deadline).toLocaleDateString("ja-JP") : "期限なし"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job description card */}
            <Card className="mb-6 border-0 shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <FileText className="h-5 w-5 text-red-600" />
                  業務内容
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose max-w-none text-gray-700">
                  <div dangerouslySetInnerHTML={{ __html: job.description.replace(/\n/g, "<br />") }} />
                </div>
              </CardContent>
            </Card>

            {/* Requirements card */}
            <Card className="mb-6 border-0 shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <CheckCircle className="h-5 w-5 text-red-600" />
                  応募条件・スキル
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-base font-medium">応募資格</h3>
                    <ul className="space-y-2 text-gray-700">
                      {(job.requirements || "")
                        .split("\n")
                        .filter(Boolean)
                        .map((req: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="mt-1 text-red-600">
                              <Check size={16} />
                            </div>
                            <span>{req}</span>
                          </li>
                        ))
                        }
                    </ul>
                  </div>

                  {job.preferred_skills && (
                    <div>
                      <h3 className="mb-3 text-base font-medium">歓迎スキル</h3>
                      <ul className="space-y-2 text-gray-700">
                        {job.preferred_skills
                          .split("\n")
                          .filter(Boolean)
                          .map((skill: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="mt-1 text-green-600">
                                <Plus size={16} />
                              </div>
                              <span>{skill}</span>
                            </li>
                          ))
                          }
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Working conditions card */}
            <Card className="mb-6 border-0 shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Clock className="h-5 w-5 text-red-600" />
                  勤務時間・給与
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-2 text-base font-medium">勤務時間</h3>
                    <p className="text-gray-700">{job.working_hours || "9:00〜18:00（休憩1時間）"}</p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-2 text-base font-medium">給与</h3>
                    <p className="text-gray-700">
                      年収{job.salary_min}万円〜{job.salary_max}万円（経験・能力を考慮の上、当社規定により決定）
                    </p>
                    <p className="mt-1 text-sm text-gray-600">※賞与年2回（業績に応じて変動）</p>
                  </div>

                  <div>
                    <h3 className="mb-3 text-base font-medium">福利厚生</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(job.benefits || "各種社会保険完備\n交通費支給\n在宅勤務手当\n書籍購入補助")
                        .split("\n")
                        .filter(Boolean)
                        .map((benefit: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="text-green-600">
                              <Check size={16} />
                            </div>
                            <span className="text-gray-700">{benefit}</span>
                          </div>
                        ))
                        }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Company info and apply */}
          <div className="space-y-6">
            {/* Apply card */}
            <Card className="sticky top-4 border-0 shadow-md">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="rounded-lg bg-red-50 p-4 text-center">
                    <h3 className="text-lg font-bold text-red-700">この求人に興味がありますか？</h3>
                    <p className="mt-1 text-sm text-gray-700">応募はカンタン1分で完了します</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {hasApplied ? (
                      <Button disabled className="w-full bg-green-600 hover:bg-green-700">
                        <Check className="mr-1 h-4 w-4" />
                        応募済み
                      </Button>
                    ) : job.status === "closed" ? (
                      <Button disabled className="w-full bg-gray-400">
                        募集終了
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={() => setShowApplicationForm(true)}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        この求人に応募する
                      </Button>
                    )}
                    <Button
                      variant={isInterested ? "default" : "outline"}
                      className={`w-full gap-1 ${isInterested ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                      onClick={toggleSaveJob}
                    >
                      <Star size={16} className={isInterested ? "fill-current" : ""} />
                      <span>{isInterested ? "興味ありに登録済み" : "興味ありに登録"}</span>
                    </Button>
                    <Button variant="outline" className="w-full gap-1">
                      <Share2 size={16} />
                      <span>シェアする</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company info card */}
            <Card className="border-0 shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Building className="h-5 w-5 text-red-600" />
                  企業情報
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
                    <Image
                      src={company?.logo_url || "/placeholder.svg?height=64&width=64&query=company logo"}
                      alt={`${company?.name}のロゴ`}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{company?.name}</h3>
                    <p className="text-sm text-gray-500">{company?.industry}</p>
                  </div>
                </div>

                <div className="mb-4 space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 text-gray-400" />
                    <span className="text-gray-700">{company?.location}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users size={16} className="mt-0.5 text-gray-400" />
                    <span className="text-gray-700">社員数：{company?.employee_count || "非公開"}名</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar size={16} className="mt-0.5 text-gray-400" />
                    <span className="text-gray-700">設立：{company?.founded_year || "非公開"}年</span>
                  </div>
                </div>

                <div className="mb-4 rounded-lg bg-gray-50 p-4">
                  <h4 className="mb-2 text-sm font-medium">会社概要</h4>
                  <p className="text-sm text-gray-700">
                    {company?.description?.split("\n")[0] || "情報がありません"}...
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" size="sm" asChild className="gap-1">
                    <Link href={`/company/${company?.id}`}>
                      <ExternalLink size={14} />
                      企業詳細を見る
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Company culture card */}
            <Card className="border-0 shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Users className="h-5 w-5 text-red-600" />
                  働く魅力・カルチャー
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 overflow-hidden rounded-lg">
                  <Image
                    src={company?.cover_image_url || "/modern-tech-workspace.png"}
                    alt="オフィス環境"
                    width={400}
                    height={200}
                    className="h-auto w-full object-cover"
                  />
                </div>

                <div className="mb-4 rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start gap-2">
                    <Quote className="mt-1 h-5 w-5 text-red-500" />
                    <div>
                      <p className="italic text-gray-700">
                        "当社では社員一人ひとりの成長を大切にし、定期的な勉強会やスキルアップのための支援制度を設けています。チームワークを重視した風通しの良い環境で、最新技術に触れながら成長できる職場です。"
                      </p>
                      <p className="mt-2 text-right text-sm font-medium">- 人事担当</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">開発環境・技術スタック</h4>
                  <div className="flex flex-wrap gap-2">
                    {jobTags.map((tech, i) => (
                      <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related jobs card */}
            <Card className="border-0 shadow-md">
              <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <ListFilter className="h-5 w-5 text-red-600" />
                  関連求人
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {relatedJobs.length > 0 ? (
                    relatedJobs.map((relatedJob) => (
                      <div
                        key={relatedJob.id}
                        className="flex gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="relative h-12 w-12 overflow-hidden rounded-md border border-gray-200">
                          <Image
                            src={
                              relatedJob.company?.logo_url || "/placeholder.svg?height=48&width=48&query=company logo"
                            }
                            alt={`${relatedJob.company?.name}のロゴ`}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">
                            <Link href={`/jobs/${relatedJob.id}`} className="hover:text-red-600 hover:underline">
                              {relatedJob.title}
                            </Link>
                          </h4>
                          <p className="text-xs text-gray-500">{relatedJob.company?.name}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <MapPin size={12} />
                            <span>{relatedJob.location}</span>
                            <span>•</span>
                            <span>年収{relatedJob.salary_min}万円〜</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-gray-500">関連する求人はありません</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Application form dialog */}
        <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">求人応募</DialogTitle>
              <DialogDescription>
                {job.title} ({company?.name}) への応募情報を入力してください。
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-1">
                {/* Application reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-medium">
                    応募理由 <span className="text-xs text-gray-500">(任意)</span>
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="この求人に応募する理由や自己PRなどを入力してください"
                    className="min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-gray-500">0/1000文字</p>
                </div>

                {/* Resume */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">職務経歴書</Label>

                  <div className="rounded-md border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">職務経歴書が未登録です</p>
                        <p className="text-xs text-gray-500">
                          応募には職務経歴書の登録が必要です。プロフィールページから登録してください。
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/student/profile">プロフィールへ</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox id="use-resume" />
                    <Label htmlFor="use-resume" className="text-sm">
                      登録済みの職務経歴書を使用する
                    </Label>
                  </div>
                </div>

                {/* Interview schedule */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">面接希望日程</Label>
                  <p className="text-xs text-gray-500">以下の候補日から面接希望日を選択してください（複数選択可）</p>

                  <div className="space-y-2">
                    {[1, 2, 3].map((id) => (
                      <div
                        key={id}
                        className="flex items-center gap-3 rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                      >
                        <Checkbox id={`date-${id}`} />
                        <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-red-500" />
                            <Label htmlFor={`date-${id}`} className="text-sm font-normal">
                              2023年6月{id}日
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            <span className="text-sm">14:00〜15:00</span>
                          </div>
                        </div>
                        <div className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          予約可能
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Privacy agreement */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">個人情報の取り扱いについて</Label>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
                    <p>
                      応募にあたり、入力いただいた個人情報は、選考および採用活動のために利用します。
                      また、法令に基づく場合を除いて、お客様の同意なく第三者に提供することはありません。
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="privacy-agreement" required />
                    <Label htmlFor="privacy-agreement" className="text-sm">
                      個人情報の取り扱いに同意します
                    </Label>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setShowApplicationForm(false)} className="w-full sm:w-auto">
                キャンセル
              </Button>
              <Button onClick={handleApply} className="w-full bg-red-600 hover:bg-red-700 sm:w-auto">
                応募する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mobile fixed apply button */}
        {!hasApplied && job.status === "active" && (
          <div className="fixed bottom-0 left-0 z-10 w-full border-t border-gray-200 bg-white p-4 shadow-lg md:hidden">
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
              onClick={() => setShowApplicationForm(true)}
            >
              <Send className="mr-2 h-5 w-5" />
              この求人に応募する
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
