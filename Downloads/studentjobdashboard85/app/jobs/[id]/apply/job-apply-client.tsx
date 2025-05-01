"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Check, Clock, FileText, Upload, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

type Job = {
  id: number
  job_title: string
  job_description: string
  location: string
  employment_type: string
  salary_min: number
  salary_max: number
  work_style: string
  application_deadline: string
  companies: {
    id: number
    name: string
    description: string
    logo_url: string | null
  }
}

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  university: string | null
  major: string | null
  graduation_year: number | null
  skills: string[] | null
  interests: string[] | null
  resume_url: string | null
  avatar_url: string | null
}

type InterviewDate = {
  id: number
  date: string
  time: string
  available: boolean
}

type ExistingApplication = {
  id: number
  status: string
}

type JobApplyClientProps = {
  jobId: string
  jobTitle: string
  companyName: string
  userId: string
  job: Job
  profile: Profile | null
  interviewDates: InterviewDate[]
  existingApplication: ExistingApplication | null
}

export default function JobApplyClient({
  jobId,
  jobTitle,
  companyName,
  userId,
  job,
  profile,
  interviewDates,
  existingApplication,
}: JobApplyClientProps) {
  const [coverLetter, setCoverLetter] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDates, setSelectedDates] = useState<number[]>([])
  const [motivation, setMotivation] = useState("")
  const [selfPR, setSelfPR] = useState("")
  const [questions, setQuestions] = useState("")
  const [useExistingResume, setUseExistingResume] = useState(profile?.resume_url ? true : false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [motivationCount, setMotivationCount] = useState(0)
  const [selfPRCount, setSelfPRCount] = useState(0)
  const [questionsCount, setQuestionsCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 文字数カウント用のハンドラー
  const handleMotivationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setMotivation(text)
    setMotivationCount(text.length)
  }

  const handleSelfPRChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setSelfPR(text)
    setSelfPRCount(text.length)
  }

  const handleQuestionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setQuestions(text)
    setQuestionsCount(text.length)
  }

  // 面接日程の選択を切り替える
  const toggleDateSelection = (dateId: number) => {
    setSelectedDates((prev) => (prev.includes(dateId) ? prev.filter((id) => id !== dateId) : [...prev, dateId]))
  }

  // ファイルアップロード処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
      setUseExistingResume(false)
    }
  }

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (step === 1) {
      // バリデーション
      if (motivation.trim() === "") {
        toast({
          title: "入力エラー",
          description: "志望動機は必須項目です",
          variant: "destructive",
        })
        return
      }

      if (selectedDates.length === 0) {
        toast({
          title: "入力エラー",
          description: "面接希望日を少なくとも1つ選択してください",
          variant: "destructive",
        })
        return
      }

      if (!privacyAgreed) {
        toast({
          title: "入力エラー",
          description: "個人情報の取り扱いに同意してください",
          variant: "destructive",
        })
        return
      }

      // ステップ2に進む
      setStep(2)
      return
    }

    // 最終送信処理
    setIsSubmitting(true)

    try {
      let resumeUrl = profile?.resume_url || null

      // 新しい履歴書がアップロードされた場合
      if (resumeFile && !useExistingResume) {
        const fileName = `resumes/${Date.now()}_${resumeFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("student-files")
          .upload(fileName, resumeFile)

        if (uploadError) {
          throw new Error("履歴書のアップロードに失敗しました: " + uploadError.message)
        }

        // 公開URLを取得
        const { data: publicUrlData } = supabase.storage.from("student-files").getPublicUrl(fileName)

        resumeUrl = publicUrlData.publicUrl
      }

      // 応募データをデータベースに保存
      const { data, error } = await supabase
        .from("applications")
        .insert({
          student_id: userId,
          job_id: jobId,
          status: "pending",
          motivation: motivation,
          self_pr: selfPR || null,
          questions: questions || null,
          interview_dates: selectedDates,
          resume_url: resumeUrl,
          cover_letter: coverLetter,
        })
        .select()

      if (error) {
        throw new Error("応募の送信に失敗しました: " + error.message)
      }

      // 成功
      toast({
        title: "応募完了",
        description: "求人への応募が完了しました",
      })

      // 応募完了ページに遷移
      router.push(`/jobs/${job.id}/apply/complete`)
    } catch (error: any) {
      console.error("Error submitting application:", error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "応募の送信中にエラーが発生しました",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setLoading(false)
    }
  }

  // 既に応募済みの場合
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <header className="sticky top-0 z-10 bg-white shadow-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Link href={`/jobs/${job.id}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">求人詳細に戻る</span>
              </Link>
            </div>
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">求人応募</h1>
            </div>
            <div className="w-[100px]"></div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <Alert className="mb-6">
              <AlertTitle>既に応募済みです</AlertTitle>
              <AlertDescription>
                この求人には既に応募済みです。現在の応募ステータスは「
                {existingApplication.status === "pending"
                  ? "審査中"
                  : existingApplication.status === "reviewing"
                    ? "書類選考中"
                    : existingApplication.status === "interview"
                      ? "面接調整中"
                      : existingApplication.status === "offer"
                        ? "内定"
                        : existingApplication.status === "rejected"
                          ? "不採用"
                          : "審査中"}
                」です。
              </AlertDescription>
            </Alert>

            <div className="flex justify-center">
              <Button asChild>
                <Link href="/dashboard">マイページに戻る</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href={`/jobs/${job.id}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">求人詳細に戻る</span>
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">求人応募</h1>
          </div>
          <div className="w-[100px]"></div> {/* スペーサー */}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          {/* 応募ステップ */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step === 1 ? "bg-red-600 text-white" : "bg-green-600 text-white"
                  }`}
                >
                  {step > 1 ? <Check className="h-4 w-4" /> : <span className="text-sm font-medium">1</span>}
                </div>
                <span className="text-sm font-medium text-gray-900">応募情報の入力</span>
              </div>
              <div className="h-0.5 w-12 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step === 2 ? "bg-red-600 text-white" : "bg-gray-300 text-gray-600"
                  }`}
                >
                  <span className="text-sm font-medium">2</span>
                </div>
                <span className="text-sm font-medium text-gray-500">応募内容の確認</span>
              </div>
              <div className="h-0.5 w-12 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-gray-600">
                  <span className="text-sm font-medium">3</span>
                </div>
                <span className="text-sm font-medium text-gray-500">応募完了</span>
              </div>
            </div>
          </div>

          {step === 1 ? (
            <>
              {/* 求人情報 */}
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 overflow-hidden rounded-md">
                      <Image
                        src={job.companies.logo_url || "/placeholder.svg?height=48&width=48&query=company"}
                        alt={`${job.companies.name}のロゴ`}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{job.job_title}</CardTitle>
                      <CardDescription>{job.companies.name}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">勤務地:</span>
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">雇用形態:</span>
                      <span>{job.employment_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">給与:</span>
                      <span>
                        {job.salary_min}万円〜{job.salary_max}万円
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 面接希望日程 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">面接希望日程</CardTitle>
                  <CardDescription>以下の候補日から面接希望日を選択してください。複数選択可能です。</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {interviewDates.map((date) => (
                      <div key={date.id} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                        <Checkbox
                          id={`date-${date.id}`}
                          checked={selectedDates.includes(date.id)}
                          onCheckedChange={() => toggleDateSelection(date.id)}
                          disabled={!date.available}
                        />
                        <div className="flex flex-1 items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <Label htmlFor={`date-${date.id}`} className="text-sm font-normal">
                              {date.date}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{date.time}</span>
                          </div>
                        </div>
                        <div className="text-xs text-green-600">{date.available ? "予約可能" : "予約不可"}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 志望動機 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">志望動機</CardTitle>
                  <CardDescription>この企業・ポジションを志望する理由を記入してください。</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="志望動機を入力してください"
                    className="min-h-[150px]"
                    value={motivation}
                    onChange={handleMotivationChange}
                    maxLength={1000}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{motivationCount}/1000文字</span>
                    <span>※必須</span>
                  </div>
                </CardContent>
              </Card>

              {/* 自己PR */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">自己PR</CardTitle>
                  <CardDescription>あなたの強みや経験をアピールしてください。</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="自己PRを入力してください"
                    className="min-h-[150px]"
                    value={selfPR}
                    onChange={handleSelfPRChange}
                    maxLength={1000}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{selfPRCount}/1000文字</span>
                    <span>※任意</span>
                  </div>
                </CardContent>
              </Card>

              {/* 質問事項 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">質問事項</CardTitle>
                  <CardDescription>企業への質問があれば記入してください。</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="質問事項を入力してください"
                    className="min-h-[100px]"
                    value={questions}
                    onChange={handleQuestionsChange}
                    maxLength={500}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{questionsCount}/500文字</span>
                    <span>※任意</span>
                  </div>
                </CardContent>
              </Card>

              {/* 添付書類 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">添付書類</CardTitle>
                  <CardDescription>履歴書や職務経歴書などの添付書類をアップロードしてください。</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-md border border-dashed border-gray-300 p-4">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-700">ファイルをドラッグ＆ドロップ</p>
                          <p className="text-xs text-gray-500">または</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          ファイルを選択
                        </Button>
                        <input
                          ref={fileInputRef}
                          id="resume-upload"
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                        />
                        <p className="mt-1 text-xs text-gray-500">PDF, DOC, DOCX (最大5MB)</p>
                      </div>
                      {resumeFile && (
                        <div className="mt-2 flex items-center justify-between rounded-md bg-gray-50 p-2">
                          <div className="flex items-center">
                            <FileText className="mr-2 h-4 w-4 text-gray-500" />
                            <span className="text-sm">{resumeFile.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResumeFile(null)}
                            className="h-6 text-xs text-red-500 hover:text-red-700"
                          >
                            削除
                          </Button>
                        </div>
                      )}
                    </div>

                    {profile?.resume_url && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="use-resume"
                          checked={useExistingResume}
                          onCheckedChange={(checked) => {
                            setUseExistingResume(checked === true)
                            if (checked) setResumeFile(null)
                          }}
                        />
                        <Label htmlFor="use-resume" className="text-sm font-normal">
                          登録済みの職務経歴書を使用する
                        </Label>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 個人情報の取り扱い */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-lg">個人情報の取り扱いについて</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="privacy-policy">
                      <AccordionTrigger className="text-sm font-medium">個人情報保護方針</AccordionTrigger>
                      <AccordionContent className="text-sm text-gray-600">
                        <p>
                          当社は、お客様の個人情報を適切に管理し、特定の目的以外には利用しません。
                          また、法令に基づく場合を除いて、お客様の同意なく第三者に提供することはありません。
                        </p>
                        <p className="mt-2">
                          個人情報の取り扱いについて詳しくは、当社の個人情報保護方針をご覧ください。
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="mt-4 flex items-center gap-2">
                    <Checkbox
                      id="privacy-agreement"
                      checked={privacyAgreed}
                      onCheckedChange={(checked) => setPrivacyAgreed(checked === true)}
                    />
                    <Label htmlFor="privacy-agreement" className="text-sm font-normal">
                      個人情報の取り扱いに同意します
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* 確認画面 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">応募内容の確認</CardTitle>
                  <CardDescription>以下の内容で応募を完了します。内容をご確認ください。</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium">応募求人</h3>
                      <p className="text-sm">
                        {job.job_title} - {job.companies.name}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium">面接希望日程</h3>
                      <ul className="list-inside list-disc text-sm">
                        {interviewDates
                          .filter((date) => selectedDates.includes(date.id))
                          .map((date) => (
                            <li key={date.id}>
                              {date.date} {date.time}
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium">志望動機</h3>
                      <p className="whitespace-pre-wrap text-sm">{motivation}</p>
                    </div>

                    {selfPR && (
                      <div>
                        <h3 className="text-sm font-medium">自己PR</h3>
                        <p className="whitespace-pre-wrap text-sm">{selfPR}</p>
                      </div>
                    )}

                    {questions && (
                      <div>
                        <h3 className="text-sm font-medium">質問事項</h3>
                        <p className="whitespace-pre-wrap text-sm">{questions}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium">添付書類</h3>
                      {resumeFile ? (
                        <p className="text-sm">{resumeFile.name}</p>
                      ) : useExistingResume && profile?.resume_url ? (
                        <p className="text-sm">登録済みの職務経歴書を使用</p>
                      ) : (
                        <p className="text-sm text-gray-500">添付書類なし</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* 操作ボタン */}
          <div className="flex justify-between">
            {step === 1 ? (
              <Button variant="outline" className="gap-1" asChild>
                <Link href={`/jobs/${job.id}`}>
                  <ArrowLeft className="h-4 w-4" />
                  戻る
                </Link>
              </Button>
            ) : (
              <Button variant="outline" className="gap-1" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" />
                入力に戻る
              </Button>
            )}

            <Button
              type="submit"
              className="gap-1 bg-red-600 hover:bg-red-700"
              onClick={handleSubmit}
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  送信中...
                </>
              ) : step === 1 ? (
                <>
                  内容を確認する
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  応募を完了する
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
