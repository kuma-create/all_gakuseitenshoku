
"use client"
/** Supabase Storage bucket used for求人カバー画像 */
const JOB_COVER_BUCKET = "job-covers"; // ← Dashboard で作成したバケット ID に合わせる


import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types"

/** 数値入力を "1,200円" → 1200 のように変換 */
function parseNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d.]/g, "");
  return cleaned ? Number(cleaned) : null;
}
import type React from "react"

// --- selectable job categories (multi-select) ---
const JOB_CATEGORIES = [
  "エンジニア",
  "研究・開発",
  "品質管理",
  "デザイナー",
  "営業",
  "総務・人事",
  "物流",
  "生産管理",
  "コンサルタント",
  "経理・財務",
  "企画・マーケティング",
  "販売・サービス",
] as const;

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ---------- local form type ----------
type FormData = {
  /* 共通 */
  title: string
  description: string
  requirements: string
  departments: string[]
  employmentType: string
  location: string
  workingDays: string
  workingHours: string          // 追加
  salary: string
  coverImageUrl: string
  benefits: string              // 追加
  applicationDeadline: string   // 追加
  status: string
  /* 共通プレビュー */

  /* Internship */
  startDate: string
  endDate: string
  durationWeeks: string
  workDaysPerWeek: string
  allowance: string
  /* Intern‑Long */
  hourlyWage: string
  travelExpense: string
  nearestStation: string
  remunerationType: "hourly" | "commission",
  commissionRate: string,
  /* Event */
  eventDate: string
  capacity: string
  venue: string
  format: "onsite" | "online" | "hybrid"
  schedule: string 
}

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Building,
  Edit,
  Eye,
  EyeOff,
  FileText,
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
  Clock,
  CheckCircle,
  Check,
  Plus,
  Loader2,
  Save,
  Trash2,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
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
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandItem } from "@/components/ui/command"
import { useToast } from "@/lib/hooks/use-toast"

/**
 * Convert `YYYY-MM-DD` (date‑input value) to ISO string for
 * timestamp/date columns. Returns `null` for empty strings.
 */
const toIsoOrNull = (d: string | undefined | null) =>
  d && d.trim() !== "" ? new Date(d).toISOString() : null;

/**
 * Supabase から求人 1 件を取得し、フロントで使いやすい shape に整形して返す
 */
const fetchJob = async (id: string) => {
  const { data, error } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      description,
      requirements,
      location,
      salary_range,
      cover_image_url,
      published,
      views,
      company_id,
      created_at,
      selection_type,
      category,
      start_date,
      application_deadline,
      department,
      work_type,
      fulltime_details:fulltime_details!job_id (working_days, working_hours, benefits, salary_min, salary_max, is_ongoing),
      internship_details:internship_details!job_id (start_date, end_date, duration_weeks, work_days_per_week, allowance),
      event_details:event_details!job_id (event_date, capacity, venue, format),
      intern_long_details:intern_long_details!job_id (working_hours, work_days_per_week, hourly_wage, travel_expense, nearest_station, benefits, remuneration_type, commission_rate, is_paid)
    `)
    .eq("id", id)
    .single()

  if (error || !data) throw error ?? new Error("Job not found")

  const full   = (data.fulltime_details ?? {}) as any
  const intern = (data.internship_details ?? {}) as any
  const event  = (data.event_details ?? {}) as any
  const internLong = (data.intern_long_details ?? {}) as any

  return {
    id        : data.id,
    title     : data.title,
    description: data.description ?? "",
    requirements: data.requirements ?? "",
    department : data.department ?? "",
    employmentType: data.work_type ?? "",
    benefits       : full.benefits        ?? "",
    applicationDeadline: data.application_deadline ?? "",
    location   : data.location ?? "",
    workingDays: full.working_days ?? "",
    salary     : data.salary_range ?? "",
    coverImageUrl: data.cover_image_url ?? "",

    /* Internship */
    startDate       : data.start_date ?? intern.start_date ?? "",
    endDate         : intern.end_date ?? "",
    durationWeeks   : intern.duration_weeks ?? "",
    allowance       : intern.allowance ?? "",
    /* unified work‑days */
    workDaysPerWeek:
      internLong.work_days_per_week !== undefined && internLong.work_days_per_week !== null
        ? String(internLong.work_days_per_week)
        : intern.work_days_per_week ?? "",
    /* Intern‑Long */
    workingHours:
      internLong.working_hours !== undefined && internLong.working_hours !== null
        ? String(internLong.working_hours)
        : full.working_hours ?? "",
    hourlyWage:
      internLong.hourly_wage !== undefined && internLong.hourly_wage !== null
        ? String(internLong.hourly_wage)
        : "",
    travelExpense  : internLong.travel_expense  ?? "",
    nearestStation : internLong.nearest_station ?? "",
    remunerationType:
      internLong.remuneration_type === "commission" || internLong.remuneration_type === "hourly"
        ? (internLong.remuneration_type as "hourly" | "commission")
        : "hourly",
    commissionRate: internLong.commission_rate ?? "",

    /* Event */
    eventDate : event.event_date ?? "",
    capacity  : event.capacity ? String(event.capacity) : "",
    venue     : event.venue ?? "",
    format    : (event.format ?? "onsite") as "onsite" | "online" | "hybrid",
    schedule  : event.schedule ?? "", 


    /* 共通プレビュー */
    // Removed duplicate schedule property to resolve ts(1117)
    selectionType : data.selection_type ?? "fulltime",
    status        : data.published ? "公開" : "非公開",
    applicants    : 0,
    views         : data.views ?? 0,
    companyId     : data.company_id,
    createdAt     : data.created_at,
    // updatedAt     : data.updated_at, // removed, as updated_at is not selected
  }
}

export default function JobEditPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { toast } = useToast()

  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [job, setJob] = useState<any>(null)
  // --- helper flags ----------------------------
  const isFulltime   = job?.selectionType === "fulltime";
  const isInternship = job?.selectionType === "internship_short";
  const isEvent      = job?.selectionType === "event";
  const isInternLong = job?.selectionType === "intern_long";
  // ---------------------------------------------
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
        .from(JOB_COVER_BUCKET)
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw uploadErr

      const { data: pub } = supabase.storage.from(JOB_COVER_BUCKET).getPublicUrl(filePath)

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
    departments: [] as string[],
    employmentType: "正社員",      // 追加
    location: "",
    workingDays: "",
    workingHours: "",             // 追加
    salary: "",
    coverImageUrl: "",
    benefits: "",                 // 追加
    applicationDeadline: "",      // 追加
    status: "",
    /* 共通プレビュー */


    /* インターン専用 */
    startDate: "",
    endDate: "",
    durationWeeks: "",
    workDaysPerWeek: "",
    allowance: "",
    /* Intern‑Long */
    hourlyWage      : "",
    travelExpense   : "",
    nearestStation  : "",
    remunerationType   : "hourly",
    commissionRate     : "",
    /* イベント専用 */
    eventDate: "",
    capacity: "",
    venue: "",
    format: "onsite",
    schedule: "",
  })

  useEffect(() => {
    const loadJob = async () => {
      try {
        const jobData = await fetchJob(id)
        setJob(jobData)
        setFormData({
          title      : jobData.title,
          description: jobData.description,
          requirements        : jobData.requirements,
          departments: jobData.department
            ? jobData.department.split(",").map((s:string)=>s.trim())
            : [],
          location   : jobData.location,
          workingDays: jobData.workingDays,
          salary     : jobData.salary,
          coverImageUrl: jobData.coverImageUrl,
          status     : jobData.status,
          employmentType      : jobData.employmentType,
          workingHours        : jobData.workingHours,
          benefits            : jobData.benefits,
          applicationDeadline : jobData.applicationDeadline,
          /* 共通プレビュー */

          /* Internship */
          startDate       : jobData.startDate,
          endDate         : jobData.endDate,
          durationWeeks   : jobData.durationWeeks,
          workDaysPerWeek : jobData.workDaysPerWeek,
          allowance       : jobData.allowance,
          /* Intern‑Long */
          hourlyWage        : jobData.hourlyWage        ?? "",
          travelExpense     : jobData.travelExpense,
          nearestStation    : jobData.nearestStation,
          remunerationType    : jobData.remunerationType,
          commissionRate      : jobData.commissionRate,
          /* Event */
          eventDate : jobData.eventDate,
          capacity  : jobData.capacity,
          venue     : jobData.venue,
          format    : jobData.format,
          schedule  : jobData.schedule, 
        } as FormData)
      } catch (error: any) {
        // --- 詳細ログを出力 ---
        console.error("fetchJob error →", {
          message: error?.message,
          details: error?.details,
          hint   : error?.hint,
          code   : error?.code,
        });

        toast({
          title: "エラー",
          description: "求人情報の取得に失敗しました。",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadJob()
  }, [id, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  /** add / remove job category in the multi‑select list */
  const toggleDepartment = (value: string) => {
    setFormData(prev => {
      const exists = prev.departments.includes(value);
      return {
        ...prev,
        departments: exists
          ? prev.departments.filter(v => v !== value)
          : [...prev.departments, value],
      };
    });
    // clear validation error if fixed
    if (errors.departments) {
      setErrors(prev => {
        const ne = { ...prev };
        delete ne.departments;
        return ne;
      });
    }
  }

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "求人タイトルは必須です";
    }

    if (!formData.description.trim()) {
      newErrors.description = "職務内容は必須です";
    }

    if (!formData.coverImageUrl.trim()) {
      newErrors.coverImageUrl = "背景写真は必須です";
    }

    // Skip location for events
    if (job.selectionType !== "event" && !formData.location.trim()) {
      newErrors.location = "勤務地を入力してください";
    }

    // Skip departments validation for events
    if (job.selectionType !== "event" && formData.departments.length === 0) {
      newErrors.departments = "職種を選択してください";
    }

    if (job.selectionType === "fulltime" && !formData.workingDays.trim()) {
      newErrors.workingDays = "勤務日は必須です";
    }
    if (job.selectionType === "fulltime" && !formData.salary.trim())
      newErrors.salary = "給与は必須です";
    if (job.selectionType === "fulltime" && !formData.workingHours.trim()) {
      newErrors.workingHours = "勤務時間は必須です";
    }

    if (job.selectionType === "internship_short") {
      if (!formData.startDate.trim()) newErrors.startDate = "開始日は必須です";
      if (!formData.endDate.trim()) newErrors.endDate = "終了日は必須です";
    }
    if (job.selectionType === "intern_long") {
    if (job.selectionType === "intern_long") {
      // 開始日必須チェックは削除

      if (!formData.workingHours.trim()) {
        newErrors.workingHours = "勤務時間は必須です";
      }

      if (!formData.workDaysPerWeek.trim()) {
        newErrors.workDaysPerWeek = "勤務日数は必須です";
      } else if (parseNumber(formData.workDaysPerWeek) === null) {
        newErrors.workDaysPerWeek = "数字で入力してください（例: 3）";
      }

      if (formData.remunerationType === "hourly") {
        if (!formData.hourlyWage.trim()) {
          newErrors.hourlyWage = "時給は必須です";
        } else if (parseNumber(formData.hourlyWage) === null) {
          newErrors.hourlyWage = "数字で入力してください（例: 1200）";
        }
      } else {
        if (!formData.commissionRate.trim()) {
          newErrors.commissionRate = "歩合の条件を入力してください";
        }
      }
    }

      if (!formData.workingHours.trim()) {
        newErrors.workingHours = "勤務時間は必須です";
      }

      if (!formData.workDaysPerWeek.trim()) {
        newErrors.workDaysPerWeek = "勤務日数は必須です";
      } else if (parseNumber(formData.workDaysPerWeek) === null) {
        newErrors.workDaysPerWeek = "数字で入力してください（例: 3）";
      }

      if (formData.remunerationType === "hourly") {
        if (!formData.hourlyWage.trim()) {
          newErrors.hourlyWage = "時給は必須です";
        } else if (parseNumber(formData.hourlyWage) === null) {
          newErrors.hourlyWage = "数字で入力してください（例: 1200）";
        }
      } else {
        if (!formData.commissionRate.trim()) {
          newErrors.commissionRate = "歩合の条件を入力してください";
        }
      }
    }

    const hasErrors = Object.keys(newErrors).length > 0;

    // 画面への反映
    setErrors(newErrors);

    if (hasErrors) {
      // 1) 最初のエラー項目へスクロール＆フォーカス
      const firstKey = Object.keys(newErrors)[0];
      const firstEl = typeof document !== "undefined" ? document.getElementById(firstKey) : null;
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
        // @ts-ignore
        if (firstEl.focus) firstEl.focus();
      }

      // 2) アラートで不足項目を一覧表示
      const lines = Object.values(newErrors).map((m) => `・${m}`);
      if (typeof window !== "undefined") {
        window.alert(["必須項目が未入力です。次を確認してください:", "", ...lines].join("\n"));
      }
    }

    return !hasErrors;
  };

  /** ----------------------------------------------------------------
   * 保存処理 (jobs テーブルのみ)
   * --------------------------------------------------------------- */
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
      /* ---------- jobs テーブル用ペイロード ---------------------- */
      const jobPayload = {
        title            : formData.title.trim(),
        description      : formData.description.trim(),
        requirements     : formData.requirements.trim(),
        location         : formData.location.trim(),
        salary_range     : formData.salary ? formData.salary.trim() : null,
        cover_image_url  : formData.coverImageUrl.trim(),
        department       : formData.departments.length
                             ? formData.departments.join(",")
                             : null,
        work_type        : formData.employmentType,
        published        : formData.status === "公開",
        application_deadline: toIsoOrNull(formData.applicationDeadline),
        /* 追加: カテゴリと開始日 */
        category           :
          (job.selectionType === "internship_short" || job.selectionType === "intern_long")
            ? "インターン"
            : job.selectionType === "event"
            ? "イベント"
            : "本選考",
        start_date         : toIsoOrNull(formData.startDate),
      }

      /* ---------- 各詳細テーブル用ペイロード -------------------- */
      let detailTable: "fulltime_details" | "internship_details" | "event_details" | "intern_long_details"
      let detailPayload: Record<string, any> = { job_id: id }

      switch (job.selectionType) {
        case "fulltime":
          detailTable = "fulltime_details"
          detailPayload = {
            ...detailPayload,
            working_days  : formData.workingDays,
            working_hours : formData.workingHours || null,
            benefits      : formData.benefits      || null,
            salary_min    : formData.salary ? Number(formData.salary.split("〜")[0]) : null,
            salary_max    : formData.salary && formData.salary.includes("〜")
                            ? Number(formData.salary.split("〜")[1])
                            : null,
            is_ongoing    : true,
          }
          break
        case "internship_short":
          detailTable = "internship_details"
          detailPayload = {

            ...detailPayload,
            start_date        : toIsoOrNull(formData.startDate),
            end_date          : toIsoOrNull(formData.endDate),
            duration_weeks    : formData.durationWeeks || null,
            work_days_per_week: formData.workDaysPerWeek || null,
            allowance         : formData.allowance || null,
          }
          break
        case "intern_long":
          detailTable = "intern_long_details";
          detailPayload = {
            job_id              : id,
            selection_id        : id,
            start_date          : toIsoOrNull(formData.startDate),
            // 0 が入り得ないため Non‑Null Assertion（バリデーション済）
            working_hours       : formData.workingHours || null,
            work_days_per_week  : parseNumber(formData.workDaysPerWeek),
            hourly_wage         : formData.remunerationType === "hourly" ? parseNumber(formData.hourlyWage) : null,
            remuneration_type   : formData.remunerationType,
            commission_rate     : formData.remunerationType === "commission" ? (formData.commissionRate || null) : null,
            is_paid             : formData.remunerationType === "commission" ? true : !!parseNumber(formData.hourlyWage),
            travel_expense      : formData.travelExpense || null,
            nearest_station     : formData.nearestStation || null,
            benefits            : formData.benefits || null,
          };
          break;
        case "event":
          detailTable = "event_details"
          detailPayload = {
            ...detailPayload,
            selection_id: id, // NOT NULL制約を満たす
            event_date: toIsoOrNull(formData.eventDate),
            capacity: formData.capacity ? Number(formData.capacity) : null,
            venue: formData.venue || null,
            format: formData.format
            // schedule カラムは存在しないため送信しない
          }
          break
        default:
          throw new Error("Unknown selection type")
      }

      /* ---------- DB 更新 (jobs → details) ---------------------- */
      const { error: jobErr } = await supabase
        .from("jobs")
        .update(jobPayload)
        .eq("id", id)

      if (jobErr) throw jobErr

      const conflictColumn =
        detailTable === "event_details" || detailTable === "internship_details"
          ? "selection_id"
          : "job_id"

      const { error: detailErr } = await supabase
        .from(detailTable as any)                           // dynamic table name
        .upsert(detailPayload as any, { onConflict: conflictColumn } as any)

      if (detailErr) throw detailErr

      setJob((prev: any) => ({ ...prev, ...jobPayload }))
      setShowSuccessCard(true)

      toast({
        title: "保存完了",
        description: "選考情報が更新されました。",
      })
    } catch (err: any) {
      console.error(err)
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
      // In a real app, this would be an API call to delete the jobs
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
    <div className="container mx-auto py-8 px-4 max-w-3xl">
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
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Edit className="mr-1 h-3 w-3" />
            編集中
          </Badge>

          <Button
            variant="outline"
            className="gap-2 sm:ml-auto"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4" />
            プレビュー
          </Button>
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
                画像をアップロードすると自動で URL が設定されます
              </p>
            </div>

            {job.selectionType !== "event" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1">
                    職種（複数選択可）<span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`mt-3.5 w-full flex justify-between ${errors.departments ? "border-red-500" : ""}`}
                      >
                        {formData.departments.length
                          ? formData.departments.join(", ")
                          : "職種を選択"}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" side="bottom" align="start">
                      <Command loop>
                        {JOB_CATEGORIES.map((cat) => (
                          <CommandItem
                            key={cat}
                            onSelect={() => toggleDepartment(cat)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={formData.departments.includes(cat)}
                              className="mr-2"
                            />
                            {cat}
                          </CommandItem>
                        ))}
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.departments && (
                    <p className="text-sm text-red-500 mt-1">{errors.departments}</p>
                  )}
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
                内容 <span className="text-red-500 ml-1">*</span>
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

            {/* Working Conditions */}
            {!isEvent && (
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

                      {/* 長期インターンでは勤務開始日を非表示 */}
                      {!isInternLong && (
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
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

        {/* --- Full‑time specific fields ------------------------------------------------ */}
        {isFulltime && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>正社員向け詳細</CardTitle>
              </div>
              <CardDescription>正社員ポジション固有の条件を入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 勤務日・勤務時間 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workingDays" className="flex items-center gap-1">
                    勤務日<span className="text-red-500">*</span>
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
                  <Label htmlFor="workingHours" className="flex items-center gap-1">
                    勤務時間<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="workingHours"
                    name="workingHours"
                    value={formData.workingHours}
                    onChange={handleInputChange}
                    className={`mt-1 ${errors.workingHours ? "border-red-500" : ""}`}
                    placeholder="例: 9:00〜18:00（休憩1時間）"
                  />
                  {errors.workingHours && (
                    <p className="text-sm text-red-500 mt-1">{errors.workingHours}</p>
                  )}
                </div>
              </div>

              {/* 給与 */}
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

              {/* 応募締切日 ＆ 勤務開始日 */}
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
            </CardContent>
          </Card>
        )}

        {/* --- Internship specific fields ---------------------------------------------- */}
        {isInternship && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>短期インターン詳細</CardTitle>
              </div>
              <CardDescription>インターンに必要な詳細情報を入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 応募締切日 */}
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

              {/* 開始・終了日 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">開始日<span className="text-red-500 ml-1">*</span></Label>
                  <Input id="startDate" name="startDate" type="date"
                    value={formData.startDate} onChange={handleInputChange} className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="endDate">終了日<span className="text-red-500 ml-1">*</span></Label>
                  <Input id="endDate" name="endDate" type="date"
                    value={formData.endDate} onChange={handleInputChange} className="mt-1"/>
                </div>
              </div>

              {/* 期間・週あたり勤務日数 */}
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

              {/* 報酬 */}
              <div>
                <Label htmlFor="allowance">報酬・交通費</Label>
                <Input id="allowance" name="allowance"
                  value={formData.allowance} onChange={handleInputChange} className="mt-1"/>
              </div>
            </CardContent>
          </Card>
        )}

        {/* --- Long-term Internship specific fields --------------------------- */}
        {isInternLong && (
          <>
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
                {/* 勤務時間 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workingHours" className="flex items-center gap-1">
                      勤務時間<span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="workingHours"
                      name="workingHours"
                      value={formData.workingHours}
                      onChange={handleInputChange}
                      className={`mt-1 ${errors.workingHours ? "border-red-500" : ""}`}
                      placeholder="例: 9:00〜18:00（休憩1時間）"
                    />
                    {errors.workingHours && (
                      <p className="text-sm text-red-500 mt-1">{errors.workingHours}</p>
                    )}
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

                {/* 報酬形態・時給/歩合 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 報酬形態 */}
                  <div className="">
                    <Label htmlFor="remunerationType" className="flex items-center gap-1">
                      報酬形態<span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.remunerationType}
                      onValueChange={(v) =>
                        setFormData((p) => ({ ...p, remunerationType: v as "hourly" | "commission" }))
                      }
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
                    <div className="">
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
                    <div className="">
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

            {/* 備考 */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>備考</CardTitle>
                </div>
                <CardDescription>
                  交通費や最寄駅など、補足情報を入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 交通費の支給 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="travelExpense">交通費の支給</Label>
                    <Input
                      id="travelExpense"
                      name="travelExpense"
                      value={formData.travelExpense}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="例: 月上限2万円まで支給"
                    />
                  </div>

                  {/* 最寄駅 */}
                  <div>
                    <Label htmlFor="nearestStation">最寄駅</Label>
                    <Input
                      id="nearestStation"
                      name="nearestStation"
                      value={formData.nearestStation}
                      onChange={handleInputChange}
                      className="mt-1"
                      placeholder="例: 渋谷駅 徒歩5分"
                    />
                  </div>
                </div>

                {/* 福利厚生（既存 benefits を再利用） */}
                <div>
                  <Label htmlFor="benefits">福利厚生</Label>
                  <Textarea
                    id="benefits"
                    name="benefits"
                    value={formData.benefits}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="例: 社会保険完備、健康診断、社員旅行 など"
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* --- Event specific fields ---------------------------------------------------- */}
        {isEvent && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>イベント詳細</CardTitle>
              </div>
              <CardDescription>イベント開催に関する情報を入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* 開催日・定員 */}
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

              {/* 会場 / URL */}
              <div>
                <Label htmlFor="venue">会場 / URL</Label>
                <Input id="venue" name="venue"
                  value={formData.venue} onChange={handleInputChange} className="mt-1"/>
              </div>

              {/* スケジュール */}
              <div>
                <Label htmlFor="schedule">スケジュール詳細</Label>
                <Textarea
                  id="schedule"
                  name="schedule"
                  value={formData.schedule}
                  onChange={handleInputChange}
                  className="mt-1 min-h-[100px]"
                  placeholder="当日のタイムラインやアジェンダなどを記入してください。"
                />
              </div>

              {/* 開催形態 */}
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
            </CardContent>
          </Card>
        )}

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
                <p>{new Date(job.createdAt).toLocaleDateString('ja-JP')}</p>
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
                      /* ---------- Internship preview ---------- */
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
                                    <span>{r}</span>
                                  </li>
                                ))}
                            </ul>
                          </SectionCard>
                        )}
                        {/* 備考 SectionCard - removed for internship_short */}
                      </>
                    ) : isInternLong ? (
                      /* ---------- Long‑term Internship preview ---------- */
                      <>
                        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                          <SummaryItem
                            icon={<Clock size={16} />}
                            label="勤務時間"
                            value={formData.workingHours || "応相談"}
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
                            value={formData.location || ""}
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
                                    <span>{r}</span>
                                  </li>
                                ))}
                            </ul>
                          </SectionCard>
                        )}
                        {/* 備考 SectionCard */}
                        <SectionCard icon={FileText} title="備考">
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex gap-2">
                              <span>
                                交通費: {formData.travelExpense || "—"}
                              </span>
                            </li>
                            <li className="flex gap-2">
                              <span>
                                最寄駅: {formData.nearestStation || "—"}
                              </span>
                            </li>
                            <li className="flex gap-2">
                              <span>
                                福利厚生: {formData.benefits || "—"}
                              </span>
                            </li>
                          </ul>
                        </SectionCard>
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
                        {/* 備考 SectionCard - removed for event */}
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
                        {/* 備考 SectionCard - removed for fulltime */}
                      </>
                    )}
                  </CardContent>
                </Card>
              </DialogContent>
            </Dialog>
    </div>
  )
}