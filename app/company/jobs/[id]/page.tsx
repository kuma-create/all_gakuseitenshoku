"use client"


import { supabase } from "@/lib/supabase/client";
import type React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ---------- local form type ----------
type FormData = {
  /* 共通 */
  title: string
  description: string
  requirements: string
  department: string
  employmentType: string
  location: string
  workingDays: string
  workingHours: string          // 追加
  salary: string
  coverImageUrl: string
  benefits: string              // 追加
  applicationDeadline: string   // 追加
  status: string
  /* Internship */
  startDate: string
  endDate: string
  durationWeeks: string
  workDaysPerWeek: string
  allowance: string
  /* Event */
  eventDate: string
  capacity: string
  venue: string
  format: "onsite" | "online" | "hybrid"
}

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Save,
  Trash2,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"

/**
 * Supabase から選考 1 件を取得し、フロントで使いやすい shape に整形して返す
 */
const fetchSelection = async (id: string) => {
  /* 1) selections_view から基本情報を取得（salary_range, cover_image_url は除外） */
  const { data, error } = await supabase
    .from("selections_view")
    .select(
      `
        id,
        title,
        description,
        location,
        working_days,
        start_date,
        end_date,
        duration_weeks,
        work_days_per_week,
        allowance,
        event_date,
        capacity,
        venue,
        format,
        is_online,
        published,
        views,
        company_id,
        selection_type,
        created_at
      `
    )
    .eq("id", id)
    .single()

  if (error || !data) throw error ?? new Error("Selection not found")

  /* 2) jobs テーブルから salary_range / cover_image_url を取得 */
  const { data: jobData, error: jobError } = await supabase
    .from("jobs")
    .select("salary_range, cover_image_url")
    .eq("id", id)
    .single()

  if (jobError || !jobData) throw jobError ?? new Error("Job extra fields not found")

  /* 3) フロント用の shape に整形して返す */
  return {
    id        : data.id,
    title     : data.title,
    description: data.description ?? "",
    requirements : "", // placeholder
    department : "",
    employmentType : "",     // ← added placeholder
    workingHours   : "",     // ← added placeholder
    benefits       : "",     // ← added placeholder
    applicationDeadline: "", // ← added placeholder
    location   : data.location ?? "",
    workingDays: data.working_days ?? "",
    salary      : jobData.salary_range ?? "",
    coverImageUrl: jobData.cover_image_url ?? "",

    startDate        : data.start_date        ?? "",
    endDate          : data.end_date          ?? "",
    durationWeeks    : data.duration_weeks    ?? "",
    workDaysPerWeek  : data.work_days_per_week ?? "",
    allowance        : data.allowance         ?? "",

    eventDate : data.event_date ?? "",
    capacity  : String(data.capacity ?? ""),
    venue     : data.venue     ?? "",
    format    : data.format    ?? "onsite",
    selectionType: data.selection_type ?? "fulltime",
    status : data.published ? "公開" : "非公開",
    applicants: 0,
    views     : data.views ?? 0,
    companyId : data.company_id,
    createdAt : data.created_at,
    updatedAt : data.created_at,
  }
}

export default function JobEditPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()

  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [job, setJob] = useState<any>(null)
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({ title: "未ログイン", description: "再度ログインしてください", variant: "destructive" })
      return
    }

    setIsUploadingCover(true)
    try {
      const ext = file.name.split(".").pop()
      const fileName = `${crypto.randomUUID()}.${ext}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from("job-covers")
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw uploadErr

      const { data: pub } = supabase.storage.from("job-covers").getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, coverImageUrl: pub.publicUrl }))

      // エラークリア
      setErrors(prev => {
        const ne = { ...prev }
        delete ne.coverImageUrl
        return ne
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: "アップロード失敗",
        description: err?.message ?? "画像のアップロードに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsUploadingCover(false)
    }
  }
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showSuccessCard, setShowSuccessCard] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state
  const [formData, setFormData] = useState<FormData>({
    /* 共通 */
    title: "",
    description: "",
    requirements: "",
    department: "",
    employmentType: "正社員",      // 追加
    location: "",
    workingDays: "",
    workingHours: "",             // 追加
    salary: "",
    coverImageUrl: "",
    benefits: "",                 // 追加
    applicationDeadline: "",      // 追加
    status: "",

    /* インターン専用 */
    startDate: "",
    endDate: "",
    durationWeeks: "",
    workDaysPerWeek: "",
    allowance: "",

    /* イベント専用 */
    eventDate: "",
    capacity: "",
    venue: "",
    format: "onsite",
  })

  useEffect(() => {
    const loadSelection = async () => {
      try {
        const selectionData = await fetchSelection(id)
        setJob(selectionData)
        setFormData({
          title      : selectionData.title,
          description: selectionData.description,
          requirements        : selectionData.requirements        ?? "",
          department : selectionData.department,
          location   : selectionData.location,
          workingDays: selectionData.workingDays,
          salary: selectionData.salary,
          coverImageUrl: selectionData.coverImageUrl,
          status     : selectionData.status,
          employmentType      : selectionData.employmentType      ?? "正社員",
          workingHours        : selectionData.workingHours        ?? "",
          benefits            : selectionData.benefits            ?? "",
          applicationDeadline : selectionData.applicationDeadline ?? "",
          /* Internship */
          startDate       : selectionData.startDate,
          endDate         : selectionData.endDate,
          durationWeeks   : selectionData.durationWeeks,
          workDaysPerWeek : selectionData.workDaysPerWeek,
          allowance       : selectionData.allowance,
          /* Event */
          eventDate : selectionData.eventDate,
          capacity  : selectionData.capacity,
          venue     : selectionData.venue,
          format    : selectionData.format,
        } as FormData)
      } catch (error) {
        toast({
          title: "エラー",
          description: "選考情報の取得に失敗しました。",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSelection()
  }, [id, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "求人タイトルは必須です"
    }

    if (!formData.description.trim()) {
      newErrors.description = "職務内容は必須です"
    }

    if (!formData.coverImageUrl.trim()) {
      newErrors.coverImageUrl = "背景写真は必須です"
    }

    if (!formData.location.trim()) {
      newErrors.location = "勤務地は必須です"
    }

    if (job.selectionType === "fulltime" && !formData.workingDays.trim()) {
      newErrors.workingDays = "勤務日は必須です"
    }
    if (job.selectionType === "fulltime" && !formData.salary.trim())
      newErrors.salary = "給与は必須です"

    if (job.selectionType === "internship_short") {
      if (!formData.startDate.trim()) newErrors.startDate = "開始日は必須です"
      if (!formData.endDate.trim())   newErrors.endDate   = "終了日は必須です"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "入力エラー",
        description: "必須項目を入力してください。",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      /* --- 保存対象を作成（空文字列は null に変換） ------------------- */
      const toNull = (v: string) => (v?.trim() ? v : null)

      const payload = {
        /* 共通 */
        title          : formData.title.trim(),
        description    : formData.description.trim(),
        requirements   : toNull(formData.requirements),
        department     : toNull(formData.department),
        employment_type: toNull(formData.employmentType),
        location       : formData.location.trim(),
        working_days   : toNull(formData.workingDays),
        working_hours  : toNull(formData.workingHours),
        salary_range   : toNull(formData.salary),
        cover_image_url: formData.coverImageUrl.trim(),
        benefits       : toNull(formData.benefits),
        application_deadline: toNull(formData.applicationDeadline),

        /* Internship */
        start_date        : toNull(formData.startDate),
        end_date          : toNull(formData.endDate),
        duration_weeks    : toNull(formData.durationWeeks),
        work_days_per_week: toNull(formData.workDaysPerWeek),
        allowance         : toNull(formData.allowance),

        /* Event */
        event_date : toNull(formData.eventDate),
        capacity   : formData.capacity ? Number(formData.capacity) : null,
        venue      : toNull(formData.venue),
        format     : toNull(formData.format),

        /* 公開状態 */
        published: formData.status === "公開",
      }

      const { error: updateErr } = await supabase
        .from("jobs")
        .update(payload)
        .eq("id", id)

      if (updateErr) throw updateErr

      /* --- 更新後のローカル状態を同期 ------------------------------ */
      setJob((prev: any) => ({ ...prev, ...payload }))
      setShowSuccessCard(true)

      toast({
        title: "保存完了",
        description: "選考情報が更新されました。",
      })
    } catch (err: any) {
      toast({
        title: "エラー",
        description: err?.message ?? "選考情報の更新に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      // In a real app, this would be an API call to delete the selection
      await supabase.from("jobs").delete().eq("id", id)

      setIsDeleteDialogOpen(false)
      router.push("/company/jobs")

      toast({
        title: "削除完了",
        description: "選考が削除されました。",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "選考の削除に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold">選考が見つかりませんでした</h1>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/company/jobs")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          選考一覧に戻る
        </Button>
      </div>
    )
  }

  if (showSuccessCard) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Card className="border-green-100 bg-green-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <CardTitle>選考情報を更新しました</CardTitle>
            </div>
            <CardDescription>選考情報が正常に更新されました。次のアクションを選択してください。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="default" className="flex-1" onClick={() => router.push("/company/jobs")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                選考一覧に戻る
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push(`/company/scout?jobID=${id!}`)}>
                <Users className="mr-2 h-4 w-4" />
                この選考でスカウトを送る
              </Button>
            </div>
            <Button variant="link" className="w-full" onClick={() => setShowSuccessCard(false)}>
              続けて編集する
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="flex flex-col space-y-6">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.push("/company/jobs")} className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            選考一覧へ戻る
          </Button>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Edit className="mr-1 h-3 w-3" />
            編集中
          </Badge>
        </div>
        </div>

        {/* Basic Information Section */}
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">基本情報</CardTitle>
            </div>
            <CardDescription>選考の基本的な情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="title" className="flex items-center">
                選考タイトル <span className="text-red-500 ml-1">*</span>
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
            </div>

            {/* --- Move: Cover image upload block after title --- */}
            <div>
              <Label className="flex items-center gap-1">
                背景写真アップロード <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-4 mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm"
                  onChange={handleCoverUpload}
                />
                {isUploadingCover && (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                )}
              </div>
              {formData.coverImageUrl && (
                <img
                  src={formData.coverImageUrl}
                  alt="cover preview"
                  className="mt-2 h-24 w-full object-cover rounded"
                />
              )}
              {errors.coverImageUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.coverImageUrl}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                画像をアップロードすると自動で URL が設定されます
              </p>
            </div>

            {job.selectionType !== "event" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">部署</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
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
                    onValueChange={(v) => setFormData((p) => ({ ...p, employmentType: v }))}
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
            )}

            <div>
              <Label htmlFor="description" className="flex items-center">
                職務内容 <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className={`mt-1 min-h-[200px] ${errors.description ? "border-red-500" : ""}`}
                placeholder="業務内容、必須スキル、歓迎スキルなどを詳しく記入してください"
              />
              {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
              <p className="text-sm text-gray-500 mt-1">見出しや箇条書きを使用すると読みやすくなります。</p>
            </div>

            {/* --- Add: requirements textarea after description --- */}
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

        {/* Working Conditions Section */}
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">勤務条件</CardTitle>
            </div>
            <CardDescription>勤務地や給与などの条件を入力してください</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="location" className="flex items-center">
                勤務地 <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className={`mt-1 ${errors.location ? "border-red-500" : ""}`}
                placeholder="例: 東京都渋谷区"
              />
              {errors.location && <p className="text-sm text-red-500 mt-1">{errors.location}</p>}
            </div>

            {job.selectionType === "fulltime" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workingDays" className="flex items-center">
                    勤務日 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="workingDays"
                    name="workingDays"
                    value={formData.workingDays}
                    onChange={handleInputChange}
                    className={`mt-1 ${errors.workingDays ? "border-red-500" : ""}`}
                    placeholder="例: 月曜日〜金曜日（週休2日）"
                  />
                  {errors.workingDays && <p className="text-sm text-red-500 mt-1">{errors.workingDays}</p>}
                </div>

                <div>
                  <Label htmlFor="workingHours">勤務時間</Label>
                  <Input
                    id="workingHours"
                    name="workingHours"
                    value={formData.workingHours}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="例: 9:00〜18:00（休憩1時間）"
                  />
                </div>
              </div>
            )}

            {job.selectionType === "fulltime" && (
              <>
                <div>
                  <Label htmlFor="salary" className="flex items-center">
                    給与 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="salary"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    className={`mt-1 ${errors.salary ? "border-red-500" : ""}`}
                    placeholder="例: 500〜800"
                  />
                  {errors.salary && <p className="text-sm text-red-500 mt-1">{errors.salary}</p>}
                </div>
                {/* 福利厚生 */}
                <div>
                  <Label htmlFor="benefits">福利厚生</Label>
                  <Textarea
                    id="benefits"
                    name="benefits"
                    value={formData.benefits}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="例: 社会保険完備、交通費支給、リモートワーク可 など"
                  />
                </div>
                {/* 応募締切日/勤務開始日 */}
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
              </>
            )}

            {job.selectionType === "internship_short" && (
              <>
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
                      value={formData.durationWeeks} onChange={handleInputChange} className="mt-1"/>
                  </div>
                  <div>
                    <Label htmlFor="workDaysPerWeek">週あたり勤務日数</Label>
                    <Input id="workDaysPerWeek" name="workDaysPerWeek"
                      value={formData.workDaysPerWeek} onChange={handleInputChange} className="mt-1"/>
                  </div>
                </div>
                <div>
                  <Label htmlFor="allowance">報酬・交通費</Label>
                  <Input id="allowance" name="allowance"
                    value={formData.allowance} onChange={handleInputChange} className="mt-1"/>
                </div>
              </>
            )}

            {job.selectionType === "event" && (
              <>
                {/* 応募締切日 & 勤務開始日 */}
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
                      type="date"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="例: 2023年4月1日 または 応相談"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventDate">開催日</Label>
                    <Input id="eventDate" name="eventDate" type="date"
                      value={formData.eventDate} onChange={handleInputChange} className="mt-1"/>
                  </div>
                  <div>
                    <Label htmlFor="capacity">定員</Label>
                    <Input id="capacity" name="capacity"
                      value={formData.capacity} onChange={handleInputChange} className="mt-1"/>
                  </div>
                </div>
                <div>
                  <Label htmlFor="venue">会場 / URL</Label>
                  <Input id="venue" name="venue"
                    value={formData.venue} onChange={handleInputChange} className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="format">開催形態</Label>
                  <RadioGroup
                    className="mt-2 flex gap-4"
                    value={formData.format}
                    onValueChange={(v) => setFormData((p) => ({ ...p, format: v as FormData["format"] }))}
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="onsite" id="onsite" />
                      <Label htmlFor="onsite">対面</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="online" id="online" />
                      <Label htmlFor="online">オンライン</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="hybrid" id="hybrid" />
                      <Label htmlFor="hybrid">ハイブリッド</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Publication Settings Section */}
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">公開設定</CardTitle>
            </div>
            <CardDescription>求人の公開状態を設定してください</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">現在の状態:</p>
                {formData.status === "公開" ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                    <Eye className="mr-1 h-3 w-3" />
                    公開中
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
                    <EyeOff className="mr-1 h-3 w-3" />
                    非公開
                  </Badge>
                )}
              </div>

              <RadioGroup value={formData.status} onValueChange={handleStatusChange} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="公開" id="public" />
                  <Label htmlFor="public" className="flex items-center cursor-pointer">
                    <Eye className="mr-2 h-4 w-4 text-green-600" />
                    公開
                    <span className="text-sm text-gray-500 ml-2">（学生に表示されます）</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="非公開" id="private" />
                  <Label htmlFor="private" className="flex items-center cursor-pointer">
                    <EyeOff className="mr-2 h-4 w-4 text-gray-600" />
                    非公開
                    <span className="text-sm text-gray-500 ml-2">（下書きとして保存されます）</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card (Read-only) */}
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex items-center space-x-2">
              <ChevronRight className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">選考の状況</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">閲覧数</p>
                <p className="text-xl font-semibold">{job.views}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">応募者数</p>
                <p className="text-xl font-semibold">{job.applicants}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">作成日</p>
                <p>{job.createdAt}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">最終更新日</p>
                <p>{job.createdAt}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white p-4 border-t shadow-lg rounded-t-lg -mx-4">
          <div className="container mx-auto max-w-3xl flex flex-col sm:flex-row gap-3">
            <Button variant="default" onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存する
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => router.push("/company/jobs")} className="flex-1 sm:flex-none">
              キャンセル
            </Button>
          </div>
        </div>

        {/* Delete Section */}
        <Card className="border-red-100 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              危険な操作
            </CardTitle>
            <CardDescription className="text-red-600">
              この選考を削除すると、関連するすべてのデータが完全に削除されます。この操作は取り消せません。
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              選考を削除する
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              選考を削除しますか？
            </DialogTitle>
            <DialogDescription>
              <p className="mb-4">この操作は取り消せません。本当にこの選考を削除しますか？</p>
              <div className="bg-red-50 p-3 rounded-md border border-red-200 text-red-800 text-sm">
                <p className="font-medium">削除されるデータ:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>選考情報</li>
                  <li>応募者データ</li>
                  <li>関連するスカウト履歴</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                "削除する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
