"use client"

import type React from "react"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, MapPin, Calendar, DollarSign, Eye, EyeOff, Briefcase, Clock, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { supabase } from "@/lib/supabase/client"
import { useAuth }  from "@/lib/auth-context"
import type { Database } from "@/lib/supabase/types"

export default function NewJobPage() {
  const searchParams   = useSearchParams()
  const selectionType  = (searchParams.get("type") ?? "fulltime") as
    | "fulltime"
    | "internship_short"
    | "event"

  const router = useRouter()
  const { toast } = useToast()
  const { user }    = useAuth() 
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccessOptions, setShowSuccessOptions] = useState(false)

  const [formData, setFormData] = useState({
    /* 共通 */
    title: "",
    department: "",
    employmentType:
      selectionType === "internship_short"
        ? "インターン"
        : selectionType === "event"
        ? "説明会"
        : "正社員",
    description: "",
    requirements: "",
    location: "",
    workingDays: "",
    workingHours: "",
    salary: "",
    benefits: "",
    applicationDeadline: "",
    status: "非公開",

    /* intern only */
    startDate: "",
    endDate: "",
    durationWeeks: "",
    workDaysPerWeek: "",
    allowance: "",

    /* event only */
    eventDate: "",
    capacity: "",
    venue: "",
    format: "onsite",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Required fields
    if (!formData.title.trim()) newErrors.title = "求人タイトルを入力してください"
    if (!formData.description.trim()) newErrors.description = "職務内容を入力してください"
    if (!formData.location.trim()) newErrors.location = "勤務地を入力してください"
    if (selectionType === "fulltime" && !formData.workingDays.trim())
      newErrors.workingDays = "勤務日を入力してください"
    if (selectionType === "fulltime" && !formData.salary.trim())
      newErrors.salary = "給与を入力してください"

    // internship_short 必須
    if (selectionType === "internship_short") {
      if (!formData.startDate.trim()) newErrors.startDate = "開始日を入力してください"
      if (!formData.endDate.trim())   newErrors.endDate   = "終了日を入力してください"
    }

    // event 必須
    if (selectionType === "event") {
      if (!formData.eventDate.trim()) newErrors.eventDate = "開催日を入力してください"
      if (!formData.capacity.trim())  newErrors.capacity  = "定員を入力してください"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "入力エラー",
        description: "必須項目をすべて入力してください。",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({ title: "未ログイン", description: "再度ログインしてください", variant: "destructive" })
      return
    }

    setIsSaving(true)

    try {
      /* 0) 会社プロフィール（UI 用） ------------------------------ */
      const { data: profile, error: profileErr } = await supabase
        .from("companies")
        .select("name")               // ← actual column name
        .eq("user_id", user.id)
        .maybeSingle()

      if (profileErr) throw profileErr;
      if (!profile)   throw new Error("まず会社プロフィールを登録してください");
    
      /* 1) companies.id を取得。無ければその場で作成 -------------- */
      let companyId: string | undefined

      console.log("auth uid =", user?.id)
    
      const { data: company, error: compErr } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
    
      if (compErr) throw compErr
    
      if (company && company.id) {
        companyId = company.id
      } else {
        // 無ければ INSERT → 返ってきた id を使う
        const { data: inserted, error: insertCompErr } = await supabase
          .from("companies")
          .insert({
            user_id: user.id,
            id     : crypto.randomUUID(),
            name   : "未設定企業名",
          })
          .select("id")
          .single()

        if (insertCompErr) throw insertCompErr
        companyId = inserted.id
      }
    
      if (!companyId) throw new Error("会社IDの取得に失敗しました")
    
      /* 2) selections へ INSERT  */
      const payload = {
        id                : crypto.randomUUID(),
        company_id        : companyId,
        selection_type    : selectionType,
        title             : formData.title,
        description       : formData.description,
        requirements      : formData.requirements || null,
        location          : formData.location    || null,
        work_type         : formData.employmentType,
        salary_min        : null,                // ← 現行フォームは単一入力なので min/max は null
        salary_max        : null,
        published         : formData.status === "公開",
        application_deadline: formData.applicationDeadline || null,
      } as const

      const jobId = payload.id;    // ← 新しく追加
    
      const { error: insertErr } = await supabase
        .from("jobs")
        .insert(payload)
        .select()
    
      if (insertErr) throw insertErr

      // ---- 子テーブルへ詳細を保存 --------------------------
      if (selectionType === "fulltime") {
        await supabase
          .from("fulltime_details")
          .upsert({
            job_id      : jobId,
            working_days: formData.workingDays || null,
            salary_min  : null,
            salary_max  : null,
            is_ongoing  : false,
          } as Database["public"]["Tables"]["fulltime_details"]["Insert"])
      } else if (selectionType === "internship_short") {
        await supabase
          .from("internship_details")
          .upsert({
            job_id            : jobId,
            start_date        : formData.startDate        || null,
            end_date          : formData.endDate          || null,
            duration_weeks    : formData.durationWeeks
                                  ? Number(formData.durationWeeks) : null,
            work_days_per_week: formData.workDaysPerWeek
                                  ? Number(formData.workDaysPerWeek) : null,
            allowance         : formData.allowance        || null,
          } as Database["public"]["Tables"]["internship_details"]["Insert"])
      } else if (selectionType === "event") {
        await supabase
          .from("event_details")
          .upsert({
            job_id    : jobId,
            event_date: formData.eventDate || null,
            capacity  : formData.capacity ? Number(formData.capacity) : null,
            venue     : formData.venue     || null,
            format    : formData.format,
            is_online : formData.format !== "onsite",
          } as Database["public"]["Tables"]["event_details"]["Insert"])
      }

      toast({ title: "作成完了", description: "新しい選考が作成されました。" })
      setShowSuccessOptions(true)
    } catch (err: any) {
      console.error(err)
      toast({
        title: "エラー",
        description: err?.details ?? err?.message ?? "求人の作成に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 pb-24">
      <div className="flex flex-col space-y-6">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button variant="outline" onClick={() => router.push("/company/jobs")} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            選考一覧へ戻る
          </Button>

          <h1 className="text-2xl font-bold">
            {selectionType === "internship_short"
              ? "新しい短期インターンを作成"
              : selectionType === "event"
              ? "新しいイベントを作成"
              : "新しい本選考を作成"}
          </h1>
        </div>

        {showSuccessOptions ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-600 dark:text-green-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium">
                    {selectionType === "internship_short"
                      ? "インターンが作成されました"
                      : selectionType === "event"
                      ? "イベントが作成されました"
                      : "選考が作成されました"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">次に何をしますか？</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => router.push("/company/job")} className="w-full sm:w-auto">
                    選考一覧へ戻る
                  </Button>
                  <Button
                    onClick={() => {
                      setFormData({
                        /* 共通 */
                        title: "",
                        department: "",
                        employmentType: "正社員",
                        description: "",
                        requirements: "",
                        location: "",
                        workingDays: "",
                        workingHours: "",
                        salary: "",
                        benefits: "",
                        applicationDeadline: "",
                        status: "非公開",
                        /* intern only */
                        startDate: "",
                        endDate: "",
                        durationWeeks: "",
                        workDaysPerWeek: "",
                        allowance: "",
                        /* event only */
                        eventDate: "",
                        capacity: "",
                        venue: "",
                        format: "onsite",
                      })
                      setShowSuccessOptions(false)
                    }}
                    className="w-full sm:w-auto"
                  >
                    {selectionType === "internship_short"
                      ? "別のインターンを作成"
                      : selectionType === "event"
                      ? "別のイベントを作成"
                      : "別の選考を作成"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <CardTitle>基本情報</CardTitle>
                </div>
                <CardDescription>求人の基本的な情報を入力してください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title" className="flex items-center gap-1">
                    求人タイトル<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`mt-1 ${errors.title ? "border-red-500" : ""}`}
                    placeholder="例: フロントエンドエンジニア"
                  />
                  {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                  <p className="text-sm text-muted-foreground mt-1">求職者が検索しやすいタイトルを設定してください</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">部署</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                      <Input
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="pl-10 mt-1"
                        placeholder="例: 開発部"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="employmentType">雇用形態</Label>
                    <Select
                      value={formData.employmentType}
                      onValueChange={(value) => handleSelectChange("employmentType", value)}
                    >
                      <SelectTrigger id="employmentType" className="mt-1">
                        <SelectValue placeholder="雇用形態を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="正社員">正社員</SelectItem>
                        <SelectItem value="契約社員">契約社員</SelectItem>
                        <SelectItem value="パート・アルバイト">パート・アルバイト</SelectItem>
                        <SelectItem value="インターン">インターン</SelectItem>
                        <SelectItem value="業務委託">業務委託</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="flex items-center gap-1">
                    職務内容<span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={`mt-1 min-h-[150px] ${errors.description ? "border-red-500" : ""}`}
                    placeholder="職務内容の詳細を記入してください。具体的な業務内容、プロジェクト、チーム構成などを含めると良いでしょう。"
                  />
                  {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
                </div>

                <div>
                  <Label htmlFor="requirements">応募要件</Label>
                  <Textarea
                    id="requirements"
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleInputChange}
                    className="mt-1 min-h-[100px]"
                    placeholder="必須スキル、経験年数、学歴、資格などの応募要件を記入してください。"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Working Conditions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle>勤務条件</CardTitle>
                </div>
                <CardDescription>勤務地や給与などの条件を入力してください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="location" className="flex items-center gap-1">
                    勤務地<span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className={`pl-10 mt-1 ${errors.location ? "border-red-500" : ""}`}
                      placeholder="例: 東京都渋谷区"
                    />
                  </div>
                  {errors.location && <p className="text-sm text-red-500 mt-1">{errors.location}</p>}
                </div>

                {selectionType === "fulltime" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="workingDays" className="flex items-center gap-1">
                          勤務日<span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                          <Input
                            id="workingDays"
                            name="workingDays"
                            value={formData.workingDays}
                            onChange={handleInputChange}
                            className={`pl-10 mt-1 ${errors.workingDays ? "border-red-500" : ""}`}
                            placeholder="例: 月曜日〜金曜日（週休2日）"
                          />
                        </div>
                        {errors.workingDays && <p className="text-sm text-red-500 mt-1">{errors.workingDays}</p>}
                      </div>

                      <div>
                        <Label htmlFor="workingHours">勤務時間</Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                          <Input
                            id="workingHours"
                            name="workingHours"
                            value={formData.workingHours}
                            onChange={handleInputChange}
                            className="pl-10 mt-1"
                            placeholder="例: 9:00〜18:00（休憩1時間）"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectionType === "fulltime" && (
                  <div>
                    <Label htmlFor="salary" className="flex items-center gap-1">
                      給与<span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                      <Input
                        id="salary"
                        name="salary"
                        value={formData.salary}
                        onChange={handleInputChange}
                        className={`pl-10 mt-1 ${errors.salary ? "border-red-500" : ""}`}
                        placeholder="例: 年収500万円〜800万円"
                      />
                    </div>
                    {errors.salary && <p className="text-sm text-red-500 mt-1">{errors.salary}</p>}
                  </div>
                )}

                {selectionType === "fulltime" && (
                  <div>
                    <Label htmlFor="benefits">福利厚生</Label>
                    <Textarea
                      id="benefits"
                      name="benefits"
                      value={formData.benefits}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="例: 社会保険完備、交通費支給、リモートワーク可、フレックスタイム制など"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="applicationDeadline">応募締切日</Label>
                    <Input
                      id="applicationDeadline"
                      name="applicationDeadline"
                      type="date"
                      value={formData.applicationDeadline}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">空欄の場合、締切日なしとなります</p>
                  </div>

                  <div>
                    <Label htmlFor="startDate">勤務開始日</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="例: 2023年4月1日 または 応相談"
                    />
                  </div>
                </div>

                {/* intern only fields */}
                {selectionType === "internship_short" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">開始日</Label>
                        <Input id="startDate" name="startDate" type="date"
                          value={formData.startDate} onChange={handleInputChange} className="mt-1"/>
                      </div>
                      <div>
                        <Label htmlFor="endDate">終了日</Label>
                        <Input id="endDate" name="endDate" type="date"
                          value={formData.endDate} onChange={handleInputChange} className="mt-1"/>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="durationWeeks">期間（週）</Label>
                        <Input id="durationWeeks" name="durationWeeks"
                          value={formData.durationWeeks} onChange={handleInputChange} className="mt-1"
                          placeholder="例: 2"/>
                      </div>
                      <div>
                        <Label htmlFor="workDaysPerWeek">週あたり勤務日数</Label>
                        <Input id="workDaysPerWeek" name="workDaysPerWeek"
                          value={formData.workDaysPerWeek} onChange={handleInputChange} className="mt-1"
                          placeholder="例: 3"/>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="allowance">報酬・交通費</Label>
                      <Input id="allowance" name="allowance"
                        value={formData.allowance} onChange={handleInputChange} className="mt-1"
                        placeholder="例: 日当1万円＋交通費支給"/>
                    </div>
                  </>
                )}

                {/* event only fields */}
                {selectionType === "event" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="eventDate">開催日</Label>
                        <Input id="eventDate" name="eventDate" type="date"
                          value={formData.eventDate} onChange={handleInputChange} className="mt-1"/>
                      </div>
                      <div>
                        <Label htmlFor="capacity">定員</Label>
                        <Input id="capacity" name="capacity"
                          value={formData.capacity} onChange={handleInputChange} className="mt-1"
                          placeholder="例: 50"/>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="venue">会場 / URL</Label>
                      <Input id="venue" name="venue"
                        value={formData.venue} onChange={handleInputChange} className="mt-1"
                        placeholder="例: 本社セミナールーム or Zoom URL"/>
                    </div>
                    <div>
                      <Label htmlFor="format">開催形態</Label>
                      <Select
                        value={formData.format}
                        onValueChange={(v) => handleSelectChange("format", v)}
                      >
                        <SelectTrigger id="format" className="mt-1">
                          <SelectValue placeholder="形式を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="onsite">対面</SelectItem>
                          <SelectItem value="online">オンライン</SelectItem>
                          <SelectItem value="hybrid">ハイブリッド</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Publication Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <CardTitle>公開設定</CardTitle>
                </div>
                <CardDescription>求人の公開状態を設定してください</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange("status", value)}
                  className="flex flex-col space-y-3"
                >
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="公開" id="public" />
                    <Label htmlFor="public" className="flex items-center cursor-pointer">
                      <Eye className="mr-2 h-4 w-4 text-green-600" />
                      公開
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                        公開中
                      </Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="非公開" id="private" />
                    <Label htmlFor="private" className="flex items-center cursor-pointer">
                      <EyeOff className="mr-2 h-4 w-4 text-gray-500" />
                      非公開
                      <Badge variant="outline" className="ml-2">
                        下書き
                      </Badge>
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-sm text-muted-foreground mt-3">
                  「公開」を選択すると、すぐに求人が公開されます。「非公開」を選択すると、下書きとして保存され、後で公開することができます。
                </p>
              </CardContent>
            </Card>

            {/* Sticky Save Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-10">
              <div className="container mx-auto flex justify-end">
                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                      保存中...
                    </div>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {selectionType === "internship_short"
                        ? "インターンを作成"
                        : selectionType === "event"
                        ? "イベントを作成"
                        : "選考を作成"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
