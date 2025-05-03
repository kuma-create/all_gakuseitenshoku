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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [isInterested, setIsInterested] = useState(false)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [job, setJob] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jobTags, setJobTags] = useState<string[]>([])
  const [company, setCompany] = useState<any>(null)

  // Fetch job details from Supabase
  useEffect(() => {
    async function fetchJobDetails() {
      try {
        setIsLoading(true)
        
        // Fetch job with company information
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select(`
            *,
            company:company_id (
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
          .eq('id', params.id)
          .single()
        
        if (jobError) throw jobError
        if (!jobData) throw new Error('求人が見つかりませんでした')

        // Fetch tags for this job
        const { data: tagsData, error: tagsError } = await supabase
          .from('job_tags')
          .select('tag')
          .eq('job_id', params.id)
        
        if (tagsError) throw tagsError

        // Extract tags
        const tags = tagsData?.map(item => item.tag) || []

        // Update view count
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ views: (jobData.views || 0) + 1 })
          .eq('id', params.id)
        
        if (updateError) console.error('Error updating view count:', updateError)

        // Check if user has applied
        // In a real app, this would check against the user's ID
        const { data: applicationData } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', params.id)
          .limit(1)
        
        setJob(jobData)
        setCompany(jobData.company)
        setJobTags(tags)
        setHasApplied(applicationData && applicationData.length > 0)

        // Check if job is in saved jobs
        const savedJobsFromStorage = localStorage.getItem('savedJobs')
        if (savedJobsFromStorage) {
          const savedJobs = JSON.parse(savedJobsFromStorage)
          setIsInterested(savedJobs.includes(Number(params.id)))
        }
      } catch (err) {
        console.error('Error fetching job details:', err)
        setError(err instanceof Error ? err.message : '求人情報の取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobDetails()
  }, [params.id])

  const handleApply = async () => {
    try {
      // In a real app, this would include the user's ID
      const { error } = await supabase
        .from('applications')
        .insert([
          { 
            job_id: Number(params.id),
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
      
      if (error) throw error
      
      setHasApplied(true)
      setShowApplicationForm(false)
    } catch (error) {
      console.error('Error applying for job:', error)
      alert('応募に失敗しました。もう一度お試しください。')
    }
  }

  const toggleSaveJob = () => {
    const savedJobsFromStorage = localStorage.getItem('savedJobs')
    let savedJobs: number[] = savedJobsFromStorage ? JSON.parse(savedJobsFromStorage) : []
    
    if (isInterested) {
      // Remove from saved jobs
      savedJobs = savedJobs.filter(id => id !== Number(params.id))
    } else {
      // Add to saved jobs
      savedJobs.push(Number(params.id))
    }
    
    localStorage.setItem('savedJobs', JSON.stringify(savedJobs))
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
                      {new Date(job.created_at).getTime() > (Date.now() - 7 * 24 * 60 * 60 * 1000) && (
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
                      <p className="font-medium">年収{job.salary_min}万円〜{job.salary_max}万円</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">応募締切</p>
                      <p className="font-medium">{job.deadline ? new Date(job.deadline).toLocaleDateString('ja-JP') : "期限なし"}</p>
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
                  <div dangerouslySetInnerHTML={{ __html: job.description.replace(/\n/g, '<br />') }} />
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
                      {(job.requirements || "").split('\n').filter(Boolean).map((req: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="mt-1 text-red-600">
                            <Check size={16} />
                          </div>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {job.preferred_skills && (
                    <div>
                      <h3 className="mb-3 text-base font-medium">歓迎スキル</h3>
                      <ul className="space-y-2 text-gray-700">
                        {job.preferred_skills.split('\n').filter(Boolean).map((skill: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="mt-1 text-green-600">
                              <Plus size={16} />
                            </div>
                            <span>{skill}</span>
                          </li>
                        ))}
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
                    <p className="text-gray-700">年収{job.salary_min}万円〜{job.salary_max}万円（経験・能力を考慮の上、当社規定により決定）</p>
                    <p className="mt-1 text-sm text-gray-600">※賞与年2回（業績に応じて変動）</p>
                  </div>

                  <div>
                    <h3 className="mb-3 text-base font-medium">福利厚生</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(job.benefits || "各種社会保険完備\n交通費支給\n在宅勤務手当\n書籍購入補助").split('\n').filter(Boolean).map((benefit: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="text-green-600">
                            <Check size={16} />
                          </div>
                          <span className="text-gray-700">{benefit}</span>
                        </div>
                      ))}
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
                  <p className="text-sm text-gray-700">{company?.description?.split("\n")[0] || "情報がありません"}...</p>
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
                  {/* This would be populated with real related jobs from Supabase */}
                  {[1, 2, 3].map((id) => (
                    <div key={id} className="flex gap-3 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border border-gray-200">
                        <Image
                          src="/abstract-geometric-logo.png"
                          alt="企業ロゴ"
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">
                          <Link href={`/jobs/${id}`} className="hover:text-red-600 hover:underline">
                            フロントエンドエンジニア募集
                          </Link>
                        </h4>
                        <p className="text-xs text-gray-500">株式会社テック</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <MapPin size={12} />
                          <span>東京都</span>
                          <span>•</span>
                          <span>年収400万円〜</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
                      \
