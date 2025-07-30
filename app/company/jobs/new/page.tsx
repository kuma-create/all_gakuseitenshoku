"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  Briefcase,
  Clock,
  Building2,
  FileText,
  CheckCircle,
  Check,
  Plus,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

/** 数値入力を "1,200円" → 1200 のように変換 */
function parseNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  // 半角／全角数字・小数点のみ残す
  const cleaned = input.replace(/[^\d.]/g, "");
  return cleaned ? Number(cleaned) : null;
}

export default function NewJobPage() {
  const searchParams   = useSearchParams()
  const selectionType  = (searchParams.get("type") ?? "fulltime") as
    | "fulltime"
    | "intern_long"
    | "internship_short"
    | "event"

  const copyId = searchParams.get("copy") ?? null

  const router = useRouter()
  const { toast } = useToast()
  const { user }    = useAuth() 
  // --- helper flags ----------------------------
  const isFulltime   = selectionType === "fulltime";
  const isInternship = selectionType === "internship_short";
  const isInternLong = selectionType === "intern_long";
  const isEvent      = selectionType === "event";
  // ---------------------------------------------
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccessOptions, setShowSuccessOptions] = useState(false)

  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  
  const [formData, setFormData] = useState({
    /* 共通 */
    title: "",
    department: "",
    employmentType:
      selectionType === "internship_short" || selectionType === "intern_long"
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
    coverImageUrl: "",
    benefits: "",
    applicationDeadline: "",
    status: "非公開",

    /* intern only */
    startDate: "",
    endDate: "",
    durationWeeks: "",
    workDaysPerWeek: "",
    allowance: "",

    /* intern long only */
    minDurationMonths: "",
    hourlyWage      : "",
    remunerationType: "hourly", // "hourly" | "commission"
    commissionRate  : "",

    /* event only */
    eventDate: "",
    capacity: "",
    venue: "",
    format: "onsite",
    schedule: "",
  })

  useEffect(() => {
    if (!copyId) return;

    (async () => {
      try {
        // 1) main job record
        const { data: base, error: baseErr } = await supabase
          .from("jobs")
          .select(
            `selection_type, title, description, requirements,
             location, work_type, salary_range, cover_image_url,
             application_deadline, start_date`
          )
          .eq("id", copyId)
          .maybeSingle();

        if (baseErr) throw baseErr;
        if (!base) return;  // invalid id

        // pre‑fill common fields
        setFormData(prev => ({
          ...prev,
          title               : base.title        ?? "",
          employmentType      : base.work_type    ?? prev.employmentType,
          description         : base.description  ?? "",
          requirements        : base.requirements ?? "",
          location            : base.location     ?? "",
          salary              : base.salary_range ?? "",
          coverImageUrl       : base.cover_image_url ?? "",
          applicationDeadline : base.application_deadline ?? "",
          startDate           : base.start_date   ?? "",
        }));

        // 2) fetch detail table by type
        if (base.selection_type === "fulltime") {
          const { data: child } = await supabase
            .from("fulltime_details")
            .select(`working_days`)
            .eq("job_id", copyId)
            .maybeSingle();

          if (child) {
            setFormData(prev => ({
              ...prev,
              workingDays: child.working_days ?? "",
            }));
          }
        } else if (base.selection_type === "internship_short") {
          const { data: child } = await supabase
            .from("internship_details")
            .select(`start_date, end_date, duration_weeks, work_days_per_week, allowance`)
            .eq("job_id", copyId)
            .maybeSingle();

          if (child) {
            setFormData(prev => ({
              ...prev,
              startDate        : child.start_date        ?? "",
              endDate          : child.end_date          ?? "",
              durationWeeks    : child.duration_weeks?.toString() ?? "",
              workDaysPerWeek  : child.work_days_per_week?.toString() ?? "",
              allowance        : child.allowance         ?? "",
            }));
          }
        } else if (base.selection_type === "event") {
          const { data: child } = await supabase
            .from("event_details")
            .select(`event_date, capacity, venue, format`)
            .eq("job_id", copyId)
            .maybeSingle();

          if (child) {
            setFormData(prev => ({
              ...prev,
              eventDate : child.event_date ?? "",
              capacity  : child.capacity?.toString() ?? "",
              venue     : child.venue ?? "",
              format    : child.format ?? "onsite",
            }));
          }
        }
      } catch (err) {
        console.error(err);
        toast({
          title: "コピー失敗",
          description: "求人情報の取得に失敗しました。",
          variant: "destructive",
        });
      }
    })();
  }, [copyId]);

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
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!user) {
      toast({ title: "未ログイン", description: "再度ログインしてください", variant: "destructive" })
      return
    }

    setIsUploadingCover(true)
    try {
      const ext = file.name.split(".").pop()
      const fileName = `${crypto.randomUUID()}.${ext}`
      const filePath = `${user.id}/${fileName}`

      // アップロード（upsert: true で同名を上書き）
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from("job-covers")
        .upload(filePath, file, {
          contentType: file.type,   // ← 追加: MIME タイプを明示
          upsert: true,
        })

      if (uploadErr) throw uploadErr

      // 公開 URL を取得
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Required fields
    if (!formData.title.trim()) newErrors.title = "求人タイトルを入力してください"
    if (!formData.description.trim()) newErrors.description = "職務内容を入力してください"
    if (!formData.coverImageUrl.trim())
      newErrors.coverImageUrl = "背景写真URLを入力してください"
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

    // intern_long 必須
    if (selectionType === "intern_long") {
      if (!formData.startDate.trim()) newErrors.startDate = "開始日を入力してください";
      if (!formData.workDaysPerWeek.trim())
        newErrors.workDaysPerWeek = "週あたり勤務日数を入力してください";

      if (formData.remunerationType === "hourly") {
        if (!formData.hourlyWage.trim()) {
          newErrors.hourlyWage = "時給を入力してください";
        } else if (parseNumber(formData.hourlyWage) === null) {
          newErrors.hourlyWage = "数字で入力してください（例: 1500）";
        }
      } else {
        if (!formData.commissionRate.trim())
          newErrors.commissionRate = "歩合を入力してください";
      }
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
      const payload: Database["public"]["Tables"]["jobs"]["Insert"] = {
        id                   : crypto.randomUUID(),
        company_id           : companyId,
        user_id              : user.id, // 👈 追加: RLS 用
        selection_type       : selectionType,
        // 一覧表示用カテゴリ
        category             :
          selectionType === "internship_short" || selectionType === "intern_long"
            ? "インターン"
            : selectionType === "event"
            ? "イベント"
            : "本選考",
        title                : formData.title,
        description          : formData.description,
        department           : formData.department || null,
        requirements         : formData.requirements || null,
        location             : formData.location || null,
        work_type            : formData.employmentType,
        salary_range         : formData.salary || null,
        cover_image_url      : formData.coverImageUrl,
        published            : formData.status === "公開",
        application_deadline : formData.applicationDeadline || null,
        start_date           : formData.startDate || null,
      };

      const jobId = payload.id;    // ← 新しく追加
    
      const { error: insertErr } = await supabase
        .from("jobs")
        .insert(payload)
        .select()
    
      if (insertErr) throw insertErr

      // ---- 子テーブルへ詳細を保存 --------------------------
      if (selectionType === "fulltime") {
        const { error: ftErr } = await supabase
          .from("fulltime_details")
          .upsert(
            {
              selection_id : jobId,      // ← remove this line if the column doesn't exist
              job_id       : jobId,
              working_days : formData.workingDays || null,
              working_hours : formData.workingHours || null,
              benefits      : formData.benefits      || null,
              salary_min   : null,
              salary_max   : null,
              is_ongoing   : false,
            } as Database["public"]["Tables"]["fulltime_details"]["Insert"]
          )
        if (ftErr) throw ftErr;
      } else if (selectionType === "internship_short") {
        const { error: isErr } = await supabase
          .from("internship_details")
          .upsert(
            {
              selection_id      : jobId,   // ← remove if col doesn't exist
              job_id            : jobId,
              start_date        : formData.startDate || null,
              end_date          : formData.endDate   || null,
              duration_weeks    : formData.durationWeeks
                                    ? Number(formData.durationWeeks) : null,
              work_days_per_week: formData.workDaysPerWeek
                                    ? Number(formData.workDaysPerWeek) : null,
              is_paid           : !!formData.allowance,
              allowance         : formData.allowance || null,
              capacity          : null,
              format            : null,
              target_grad_years : null,
              sessions          : null,
              selection_flow    : null,
              perks             : null,
              contact_email     : null,
              notes             : null,
            } as Database["public"]["Tables"]["internship_details"]["Insert"]
          )
        if (isErr) throw isErr;
      } else if (selectionType === "intern_long") {
        const { error: ilErr } = await supabase
          .from("intern_long_details")
          .upsert(
            {
              selection_id        : jobId,   // FK (同値)
              job_id              : jobId,
              min_duration_months : parseNumber(formData.minDurationMonths),
              work_days_per_week  : parseNumber(formData.workDaysPerWeek),
              hourly_wage         : formData.remunerationType === "hourly"
                                      ? parseNumber(formData.hourlyWage)
                                      : null,
              is_paid             : formData.remunerationType === "hourly"
                                      ? !!parseNumber(formData.hourlyWage)
                                      : false,
              remuneration_type   : formData.remunerationType,
              commission_rate     : formData.commissionRate || null,
              start_date          : formData.startDate || null,
            } as Database["public"]["Tables"]["intern_long_details"]["Insert"]
          );
        if (ilErr) throw ilErr;
      } else if (selectionType === "event") {
        const { error: evErr } = await supabase
          .from("event_details")
          .insert({
            job_id: jobId,               // 紐づく求人ID
            selection_id: jobId,         // NOT NULL 制約用（jobs.id と同値で OK）
            event_date: formData.eventDate || null,
            capacity: formData.capacity ? Number(formData.capacity) : null,
            venue: formData.venue || null,
            format: formData.format,
            is_online: formData.format !== "onsite",
            target_grad_years: null,
            sessions: null,
            contact_email: null,
            notes: null,
          } as Database["public"]["Tables"]["event_details"]["Insert"])
        if (evErr) throw evErr;
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

    /* ---------- preview helpers ---------- */
    function SummaryItem({
      icon,
      label,
      value,
    }: {
      icon: React.ReactNode
      label: string
      value: React.ReactNode
    }) {
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
            {icon}
          </div>
          <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="font-medium">{value}</p>
          </div>
        </div>
      )
    }

    function SectionCard({
      icon: Icon,
      title,
      children,
    }: {
      icon: any
      title: string
      children: React.ReactNode
    }) {
      return (
        <Card className="mb-6 border-0 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Icon className="h-5 w-5 text-red-600" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">{children}</CardContent>
        </Card>
      )
    }

    function RequirementBlock({
      title,
      icon,
      list,
    }: {
      title: string
      icon: React.ReactNode
      list?: string
    }) {
      if (!list) return null
      return (
        <div className="mb-6 last:mb-0">
          <h3 className="mb-3 text-base font-medium">{title}</h3>
          <ul className="space-y-2 text-gray-700">
            {list
              .split("\n")
              .filter(Boolean)
              .map((l: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="mt-1 text-red-600">{icon}</div>
                  <span>{l}</span>
                </li>
              ))}
          </ul>
        </div>
      )
    }

    function ConditionBox({ title, text }: { title: string; text: string }) {
      return (
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-base font-medium">{title}</h3>
          <p className="text-gray-700">{text}</p>
        </div>
      )
    }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 pb-24">
      <div className="flex flex-col space-y-6">
        {/* Header with back & preview buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/company/jobs")}
            className="w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            選考一覧へ戻る
          </Button>

          <Button
            variant="outline"
            className="gap-2 sm:ml-auto"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4" />
            プレビュー
          </Button>
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
                  <Button variant="outline" onClick={() => router.push("/company/jobs")} className="w-full sm:w-auto">
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
                        coverImageUrl: "",
                        benefits: "",
                        applicationDeadline: "",
                        status: "非公開",
                        /* intern only */
                        startDate: "",
                        endDate: "",
                        durationWeeks: "",
                        workDaysPerWeek: "",
                        allowance: "",
                        /* intern long only */
                        minDurationMonths: "",
                        hourlyWage      : "",
                        remunerationType: "hourly",
                        commissionRate  : "",
                        /* event only */
                        eventDate: "",
                        capacity: "",
                        venue: "",
                        format: "onsite",
                        schedule: "",
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
                  />
                  {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
                  <p className="text-sm text-muted-foreground mt-1">求職者が検索しやすいタイトルを設定してください</p>
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    背景写真アップロード<span className="text-red-500">*</span>
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
                    <div className="mt-2 w-full max-w-[600px] aspect-[16/9]">
                      <img
                        src={formData.coverImageUrl}
                        alt="cover preview"
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  {errors.coverImageUrl && (
                    <p className="text-sm text-red-500 mt-1">{errors.coverImageUrl}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    画像をアップロードすると自動で URL が入力されます
                  </p>
                </div>

                {selectionType !== "event" && (
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
                )}

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
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* --- Full‑time specific fields ------------------------------------------------ */}
            {isFulltime && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <CardTitle>正社員向け詳細</CardTitle>
                  </div>
                  <CardDescription>正社員ポジション固有の条件を入力してください</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* workingDays / workingHours */}
                    <div>
                      <Label
                        htmlFor="workingDays"
                        className="flex items-center after:ml-0.5 after:text-red-600 after:content-['*']"
                      >
                        勤務日
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
                      <Label htmlFor="workingHours" className="flex items-center">勤務時間</Label>
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
                  {/* salary */}
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
                  {/* benefits */}
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
                </CardContent>
              </Card>
            )}

            {/* --- Internship specific fields ---------------------------------------------- */}
            {isInternship && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle>短期インターン詳細</CardTitle>
                  </div>
                  <CardDescription>インターンに必要な詳細情報を入力してください</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate" className="flex items-center gap-1">
                        開始日<span className="text-red-500">*</span>
                      </Label>
                      <Input id="startDate" name="startDate" type="date"
                        value={formData.startDate} onChange={handleInputChange} className="mt-1"/>
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="flex items-center gap-1">
                        終了日<span className="text-red-500">*</span>
                      </Label>
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
                </CardContent>
              </Card>
            )}

            {/* --- Long‑term Internship specific fields --------------------------- */}
            {isInternLong && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle>長期インターン詳細</CardTitle>
                  </div>
                  <CardDescription>
                    長期インターンに必要な詳細情報を入力してください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 開始日 */}
                    <div>
                      <Label htmlFor="startDate" className="flex items-center gap-1">
                        開始日<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className={`mt-1 ${errors.startDate ? "border-red-500" : ""}`}
                      />
                      {errors.startDate && (
                        <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>
                      )}
                    </div>

                    {/* 最低参加期間（月） */}
                    <div>
                      <Label htmlFor="minDurationMonths">最低参加期間（月）</Label>
                      <Input
                        id="minDurationMonths"
                        name="minDurationMonths"
                        type="number"
                        min="1"
                        value={formData.minDurationMonths}
                        onChange={handleInputChange}
                        className="mt-1"
                        placeholder="例: 3"
                      />
                    </div>

                    {/* 週あたり勤務日数 */}
                    <div>
                      <Label htmlFor="workDaysPerWeek" className="flex items-center gap-1">
                        週あたり勤務日数<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="workDaysPerWeek"
                        name="workDaysPerWeek"
                        type="number"
                        min="1"
                        value={formData.workDaysPerWeek}
                        onChange={handleInputChange}
                        className={`mt-1 ${errors.workDaysPerWeek ? "border-red-500" : ""}`}
                        placeholder="例: 3"
                      />
                      {errors.workDaysPerWeek && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.workDaysPerWeek}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 報酬形態 */}
                    <div>
                      <Label htmlFor="remunerationType" className="flex items-center gap-1">
                        報酬形態<span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.remunerationType}
                        onValueChange={(v) => handleSelectChange("remunerationType", v)}
                      >
                        <SelectTrigger id="remunerationType" className="mt-1">
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">時給</SelectItem>
                          <SelectItem value="commission">歩合</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 時給 or 歩合 */}
                    {formData.remunerationType === "hourly" ? (
                      <div>
                        <Label htmlFor="hourlyWage" className="flex items-center gap-1">
                          時給<span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                          <Input
                            id="hourlyWage"
                            name="hourlyWage"
                            value={formData.hourlyWage}
                            onChange={handleInputChange}
                            className={`pl-10 mt-1 ${
                              errors.hourlyWage ? "border-red-500" : ""
                            }`}
                            placeholder="例: 1500円"
                          />
                        </div>
                        {errors.hourlyWage && (
                          <p className="text-sm text-red-500 mt-1">{errors.hourlyWage}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="commissionRate" className="flex items-center gap-1">
                          歩合<span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="commissionRate"
                          name="commissionRate"
                          value={formData.commissionRate}
                          onChange={handleInputChange}
                          className={`mt-1 ${
                            errors.commissionRate ? "border-red-500" : ""
                          }`}
                          placeholder="例: アポイント1件あたり10000円"
                        />
                        {errors.commissionRate && (
                          <p className="text-sm text-red-500 mt-1">{errors.commissionRate}</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* --- Event specific fields ---------------------------------------------------- */}
            {isEvent && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle>イベント詳細</CardTitle>
                  </div>
                  <CardDescription>イベント開催に関する情報を入力してください</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventDate" className="flex items-center gap-1">
                        開催日<span className="text-red-500">*</span>
                      </Label>
                      <Input id="eventDate" name="eventDate" type="date"
                        value={formData.eventDate} onChange={handleInputChange} className="mt-1"/>
                    </div>
                    <div>
                      <Label htmlFor="capacity" className="flex items-center gap-1">
                        定員<span className="text-red-500">*</span>
                      </Label>
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
                </CardContent>
              </Card>
            )}

            {/* Preview trigger */}

            {/* Preview Modal */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-red-600" />
                    プレビュー
                  </DialogTitle>
                </DialogHeader>

                {/* --- Preview Card (same layout as before) --- */}
                <Card className="overflow-hidden border-0 shadow-md">
                  {/* header (always gradient, no cover image) */}
                  <div className="h-32 w-full bg-gradient-to-r from-red-500 to-red-600 opacity-90"></div>

                  <CardContent className="relative -mt-16 bg-white p-6">
                    {/* Title & meta */}
                    <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
                        {formData.title || "求人タイトル"}
                      </h1>
                      <p className="text-sm text-gray-500">
                        {formData.employmentType}
                      </p>
                    </div>

                    {/* summary */}
                    {isInternship ? (
                      /* ---------- Short‑term Internship preview ---------- */
                      <>
                        {/* internship summary grid */}
                        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                          <SummaryItem
                            icon={<Calendar size={16} />}
                            label="期間"
                            value={
                              formData.startDate && formData.endDate
                                ? `${formData.startDate} 〜 ${formData.endDate}`
                                : "未設定"
                            }
                          />
                          <SummaryItem
                            icon={<Clock size={16} />}
                            label="勤務日数"
                            value={
                              formData.workDaysPerWeek
                                ? `${formData.workDaysPerWeek}日 / 週`
                                : "応相談"
                            }
                          />
                          <SummaryItem
                            icon={<Briefcase size={16} />}
                            label="報酬"
                            value={formData.allowance || "応相談"}
                          />
                          <SummaryItem
                            icon={<MapPin size={16} />}
                            label="勤務地"
                            value={formData.location || "オンライン可"}
                          />
                        </div>

                        {/* description */}
                        <SectionCard icon={FileText} title="インターン内容">
                          <p className="whitespace-pre-wrap text-gray-700">
                            {formData.description || "職務内容がここに表示されます。"}
                          </p>
                        </SectionCard>

                        {/* requirements */}
                        {formData.requirements && (
                          <SectionCard icon={CheckCircle} title="応募条件">
                            <ul className="space-y-2 text-sm text-gray-700">
                              {formData.requirements
                                .split("\n")
                                .filter(Boolean)
                                .map((r: string, i: number) => (
                                  <li key={i} className="flex gap-2">
                                    <Plus size={16} className="text-red-600 mt-0.5" />
                                    <span>{r}</span>
                                  </li>
                                ))}
                            </ul>
                          </SectionCard>
                        )}
                      </>
                    ) : isInternLong ? (
                      /* ---------- Long‑term Internship preview ---------- */
                      <>
                        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                          <SummaryItem
                            icon={<Calendar size={16} />}
                            label="最低参加期間"
                            value={
                              formData.minDurationMonths
                                ? `${formData.minDurationMonths}ヶ月〜`
                                : "応相談"
                            }
                          />
                          <SummaryItem
                            icon={<Clock size={16} />}
                            label="週あたりの勤務日数"
                            value={
                              formData.workDaysPerWeek
                                ? `週${formData.workDaysPerWeek}日`
                                : "応相談"
                            }
                          />
                          <SummaryItem
                            icon={<Briefcase size={16} />}
                            label="報酬"
                            value={
                              formData.remunerationType === "hourly"
                                ? formData.hourlyWage
                                  ? `${formData.hourlyWage}円／時`
                                  : "要相談"
                                : formData.commissionRate
                                ? `歩合 ${formData.commissionRate}`
                                : "歩合"
                            }
                          />
                          <SummaryItem
                            icon={<MapPin size={16} />}
                            label="勤務地"
                            value={formData.location || "オンライン可"}
                          />
                        </div>

                        {/* description */}
                        <SectionCard icon={FileText} title="インターン内容">
                          <p className="whitespace-pre-wrap text-gray-700">
                            {formData.description || "職務内容がここに表示されます。"}
                          </p>
                        </SectionCard>

                        {/* requirements */}
                        {formData.requirements && (
                          <SectionCard icon={CheckCircle} title="応募条件">
                            <ul className="space-y-2 text-sm text-gray-700">
                              {formData.requirements
                                .split("\n")
                                .filter(Boolean)
                                .map((r: string, i: number) => (
                                  <li key={i} className="flex gap-2">
                                    <Plus size={16} className="text-red-600 mt-0.5" />
                                    <span>{r}</span>
                                  </li>
                                ))}
                            </ul>
                          </SectionCard>
                        )}
                      </>
                    ) : isEvent ? (
                      /* ---------- Event preview ---------- */
                      <>
                        {/* event summary grid */}
                        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                          <SummaryItem
                            icon={<Calendar size={16} />}
                            label="開催日"
                            value={
                              formData.eventDate
                                ? new Date(formData.eventDate).toLocaleDateString("ja-JP")
                                : "未設定"
                            }
                          />
                          <SummaryItem
                            icon={<Users size={16} />}
                            label="定員"
                            value={formData.capacity || "未設定"}
                          />
                          <SummaryItem
                            icon={<MapPin size={16} />}
                            label="会場 / URL"
                            value={formData.venue || "未設定"}
                          />
                          <SummaryItem
                            icon={<Briefcase size={16} />}
                            label="開催形態"
                            value={
                              formData.format === "online"
                                ? "オンライン"
                                : formData.format === "hybrid"
                                ? "ハイブリッド"
                                : "対面"
                            }
                          />
                        </div>

                        {/* event overview */}
                        <SectionCard icon={FileText} title="イベント概要">
                          <p className="whitespace-pre-wrap text-gray-700">
                            {formData.description || "イベント概要がここに表示されます。"}
                          </p>
                        </SectionCard>

                        {/* schedule */}
                        {formData.schedule && (
                          <SectionCard icon={Clock} title="スケジュール">
                            <p className="whitespace-pre-wrap text-gray-700">
                              {formData.schedule}
                            </p>
                          </SectionCard>
                        )}
                      </>
                    ) : (
                      /* ---------- Full‑time preview ---------- */
                      <>
                        {/* fulltime summary grid */}
                        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                          <SummaryItem
                            icon={<MapPin size={16} />}
                            label="勤務地"
                            value={formData.location || "未設定"}
                          />
                          <SummaryItem
                            icon={<Briefcase size={16} />}
                            label="雇用形態"
                            value={formData.employmentType}
                          />
                          <SummaryItem
                            icon={<DollarSign size={16} />}
                            label="給与"
                            value={formData.salary || "非公開"}
                          />
                          <SummaryItem
                            icon={<Calendar size={16} />}
                            label="応募締切"
                            value={
                              formData.applicationDeadline
                                ? new Date(formData.applicationDeadline).toLocaleDateString("ja-JP")
                                : "期限なし"
                            }
                          />
                        </div>

                        {/* description */}
                        <SectionCard icon={FileText} title="業務内容">
                          <div
                            className="prose max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{
                              __html: (formData.description ||
                                "職務内容がここに表示されます。"
                              ).replace(/\n/g, "<br/>"),
                            }}
                          />
                        </SectionCard>

                        {/* requirements */}
                        {formData.requirements && (
                          <SectionCard icon={CheckCircle} title="応募条件・スキル">
                            <RequirementBlock
                              title="応募資格"
                              icon={<Check size={16} />}
                              list={formData.requirements}
                            />
                          </SectionCard>
                        )}

                        {/* working conditions */}
                        <SectionCard icon={Clock} title="勤務時間・給与">
                          <div className="space-y-5">
                            <ConditionBox
                              title="勤務時間"
                              text={formData.workingHours || "9:00〜18:00（休憩1時間）"}
                            />
                            <ConditionBox
                              title="給与"
                              text={`${formData.salary || "非公開"}（経験・能力により決定）`}
                            />
                            <div>
                              <h3 className="mb-3 text-base font-medium">福利厚生</h3>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {(formData.benefits || "")
                                  .split("\n")
                                  .filter(Boolean)
                                  .map((b: string, i: number) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <Check size={16} className="text-green-600" />
                                      <span className="text-gray-700">{b}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </SectionCard>
                      </>
                    )}
                  </CardContent>
                </Card>
              </DialogContent>
            </Dialog>

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