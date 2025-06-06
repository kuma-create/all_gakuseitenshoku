"use client"

import { useState, useEffect, ComponentType } from "react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { LazyImage } from "@/components/ui/lazy-image"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building,
  Calendar,
  ChevronDown,
  Clock,
  Code,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Star,
  User,
  Target,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


// 型: Applicant
type Applicant = {
  id: string
  name: string
  lastName: string | null
  firstName: string | null
  lastNameKana: string | null
  firstNameKana: string | null
  nameEn: string
  profileImage: string | null
  university: string | null
  faculty: string | null
  department: string | null
  grade: string | null
  graduationYear: string | null
  gpa: string | null
  admissionMonth: string | null
  graduationMonth: string | null
  researchTheme: string | null
  strength1?: string | null
  strength2?: string | null
  strength3?: string | null
  workStyle?: string | null
  employmentType?: string | null
  desiredPositions?: string[]
  workStyleOptions?: string[]
  desiredLocations?: string[]
  preferenceNote?: string | null
  qualifications?: string[]
  hometown: string | null
  contact: {
    email: string | null
    phone: string | null
  }
  postalCode: string | null
  prefecture: string | null
  city: string | null
  addressLine: string | null
  gender: string | null
  birthDate: string | null
  appliedJob: string | null
  applicationDate: string | null
  status: string
  selfIntroduction: string | null
  skills: any[]
  languages: any[]
  preferredIndustries: string[]
  workExperience: any[]
  education: any[]
  projects: any[]
  motivationLetter: string | null
  resumeUrl: string | null
  portfolioUrl: string | null
  githubUrl: string | null
  interviewAvailability: any[]
  chatId: string | null
}

/**
 * 型不定の skills / languages / interests を
 * UI が期待する配列形式へ正規化するユーティリティ
 */
const toSkillArray = (raw: any): { name: string; level: number }[] => {
  if (Array.isArray(raw)) {
    return raw.map((s) =>
      typeof s === "string" ? { name: s, level: 3 } : s,
    )
  }
  if (typeof raw === "string" && raw.trim()) {
    return [{ name: raw, level: 3 }]
  }
  return []
}

const toLanguageArray = (
  raw: any,
): { name: string; level: string }[] => {
  if (Array.isArray(raw)) {
    return raw
  }
  if (typeof raw === "string" && raw.trim()) {
    return [{ name: raw, level: "" }]
  }
  return []
}

/**
 * If the input is a string, try JSON.parse and return the result.
 * Otherwise return the input as‑is.
 */
const toObject = (raw: any) => {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw ?? {};
};

/**
 * Convert empty string or whitespace‑only string to null.
 * Leave other values unchanged.
 */
const toNullable = (val: any) => {
  if (val == null) return null;
  if (typeof val === "string" && val.trim() === "") return null;
  return val;
};

/**
 * Convert ISO datetime string to "YYYY年MM月DD日" (Japanese) format.
 * If parsing fails, return the original string.
 */
const formatDateJP = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}年${mm}月${dd}日`;
};

/**
 * Convert "YYYY-MM" or ISO date string to "YYYY年M月" (Japanese) format.
 * If parsing fails, return the original string.
 */
const formatYearMonthJP = (ym: string | null | undefined) => {
  if (!ym) return "";
  // Accept "YYYY-MM" or full ISO strings, fallback to original
  const parts = ym.split("-");
  if (parts.length >= 2 && /^\d{4}$/.test(parts[0])) {
    const yyyy = parts[0];
    // remove leading zero for month
    const m = String(Number(parts[1]));
    return `${yyyy}年${m}月`;
  }
  // Fallback: try Date
  const d = new Date(ym);
  if (Number.isNaN(d.getTime())) return ym;
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
};



/**
 * Supabase から取得した snake_case の行データを camelCase の Applicant 型に変換する
 * JSONB カラムはそのまま配列/オブジェクトで返る想定
 */
const transformApplicantRow = (row: any): Applicant => ({
  // ID — 応募単位が最優先
  id: row.application_id ?? row.id ?? row.student_id ?? row.user_id,

  // 氏名
  name:
    row.name ??
    row.full_name ??           // students テーブルの列名
    row.student_name ??        // applicants_view の別名
    "",
  lastName       : row.last_name        ?? null,
  firstName      : row.first_name       ?? null,
  lastNameKana   : row.last_name_kana   ?? null,
  firstNameKana  : row.first_name_kana  ?? null,

  // 氏名（英語）
  nameEn:
    row.name_en ??
    row.full_name_en ??
    row.name_en_us ??
    "",

  // プロフィール画像
  profileImage:
    row.profile_image ??
    row.avatar_url ??          // auth.users 由来
    row.profile_img_url ??
    null,

  // 学校・学部など
  university: row.university ?? row.school ?? null,
  faculty: row.faculty ?? row.faculty_name ?? row.department ?? null,
  department: row.department ?? null,
  grade: row.grade ?? row.academic_year ?? null,
  graduationYear: row.graduation_year ?? row.grad_year ?? null,
  gpa: row.gpa ?? null,
  admissionMonth:     row.admission_month      ?? null,
  graduationMonth:    row.graduation_month     ?? null,
  researchTheme:      row.research_theme       ?? null,
  strength1:          row.strength1            ?? null,
  strength2:          row.strength2            ?? null,
  strength3:          row.strength3            ?? null,
  workStyle:          row.work_style           ?? null,
  employmentType:     row.employment_type      ?? null,
  desiredPositions:   row.desired_positions    ?? [],
  workStyleOptions:   row.work_style_options   ?? [],
  desiredLocations:   row.desired_locations    ?? [],
  preferenceNote:     row.preference_note      ?? null,
  qualifications:     row.qualifications       ?? [],
  hometown: row.hometown ?? null,
  postalCode  : row.postal_code  ?? null,
  prefecture  : row.prefecture   ?? null,
  city        : row.city         ?? null,
  addressLine : row.address_line ?? null,
  gender      : row.gender       ?? null,
  birthDate   : row.birth_date   ?? null,
  contact: {
    email: row.email ?? row.contact_email ?? row.user_email ?? null,
    phone: row.phone ?? row.phone_number ?? row.contact_phone ?? null,
  },
  appliedJob: row.applied_job ?? null,
  applicationDate: row.application_date ?? null,
  status: row.status ?? "未対応",
  selfIntroduction: row.self_introduction ?? row.pr_text ?? row.pr ?? null,
  skills: toSkillArray(row.skills),
  languages: toLanguageArray(row.languages),
  preferredIndustries: row.preferred_industries ?? [],
  workExperience: row.work_experience ?? [],
  education: row.education ?? [],
  projects: row.projects ?? [],
  motivationLetter: row.motivation_letter ?? null,
  resumeUrl: row.resume_url ?? null,
  portfolioUrl: row.portfolio_url ?? null,
  githubUrl: row.github_url ?? null,
  interviewAvailability: row.interview_availability ?? [],
  chatId: row.chat_id ?? null,
})

// Status options
const statusOptions = [
  { value: "未対応", label: "未対応", color: "bg-gray-500" },
  { value: "書類選考中", label: "書類選考中", color: "bg-blue-500" },
  { value: "一次面接調整中", label: "一次面接調整中", color: "bg-purple-500" },
  { value: "一次面接済み", label: "一次面接済み", color: "bg-indigo-500" },
  { value: "二次面接調整中", label: "二次面接調整中", color: "bg-purple-500" },
  { value: "二次面接済み", label: "二次面接済み", color: "bg-indigo-500" },
  { value: "内定", label: "内定", color: "bg-green-500" },
  { value: "不採用", label: "不採用", color: "bg-red-500" },
]

type IconType = ComponentType<{ className?: string }>;

const InfoItem = ({
  label,
  value,
  icon: Icon,
  className = "",
}: {
  label: string;
  value: string | null | undefined;
  icon?: IconType;
  className?: string;
}) => (
  <div className={`space-y-1 ${className}`}>
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="flex items-center">
      {Icon && <Icon className="h-4 w-4 mr-1 text-gray-400" />}
      {value && value !== "" ? value : "-"}
    </p>
  </div>
);

export default function ApplicantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const applicantId = params.id as string

  // React state for applicant and loading
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>("未対応")
  const [isScoutDialogOpen, setIsScoutDialogOpen] = useState(false)
  const [scoutMessage, setScoutMessage] = useState("")

  // ── Fetch applicant from Supabase ───────────────────────────────────────────
  useEffect(() => {
    async function fetchApplicant() {
      console.log("ApplicantDetailPage param id:", applicantId)
      // 1) id (PRIMARY KEY) もしくは application_id のどちらかで取得
      let { data, error, status } = await supabase
        .from("applicants_view")
        .select("*")
        .eq("application_id", applicantId)
        .maybeSingle()
      console.log("Supabase response (id / application_id)", { status, data, error })

      // 2) もし該当行が無いか RLS で弾かれたら student_id でも試す
      if ((!data && !error) || (error && error.code === "PGRST116")) {
        const fallback = await supabase
          .from("applicants_view")
          .select("*")
          .eq("student_id", applicantId)
          .order("application_date", { ascending: false })
          .limit(1)
          .maybeSingle()
        console.log("Supabase response (student_id)", { status: fallback.status, data: fallback.data, error: fallback.error })

        data = fallback.data
        error = fallback.error
      }

      // 3) さらに user_id（auth UID）で検索
      if (!data && !error) {
        const fallback2 = await supabase
          .from("applicants_view")
          .select("*")
          .eq("user_id", applicantId)
          .order("application_date", { ascending: false })
          .limit(1)
          .maybeSingle()
        console.log("Supabase response (user_id)", { status: fallback2.status, data: fallback2.data, error: fallback2.error })

        data = fallback2.data
        error = fallback2.error
      }

      if (error) {
        // Supabase error オブジェクトを詳細に表示
        console.error("Applicant fetch error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
      } else if (data) {
        const transformed = transformApplicantRow(data)
        // ── Pull work_experiences & projects from resumes table ──────────────
        let finalApplicant = { ...transformed };

        // applicants_view に user_id が無いケースがあるため
        const userId =
          (data as any).user_id       // students.user_id (auth UID)
          ?? (data as any).student_id  // student_profiles.id = auth UID
        if (userId) {
          try {
            const { data: resumeData, error: resumeError } = await supabase
              .from("resumes")
              .select("work_experiences, form_data")
              .eq("user_id", userId)
              .maybeSingle()

            if (!resumeError && resumeData) {
              /* work experiences ------------------------------------------------ */
              const workEx = toObject(resumeData.work_experiences);
              if (Array.isArray(workEx)) {
                finalApplicant.workExperience = workEx.map((w: any) => {
                  const rawCompany =
                    w.company ??
                    w.organization ??
                    w.companyName ??
                    w.employer ??
                    null;
                  const company = toNullable(rawCompany);

                  const rawPosition =
                    w.position ??
                    w.role ??
                    w.title ??
                    null;
                  const position = toNullable(rawPosition);

                  const start = (w.startDate ?? w.start ?? "").trim();
                  const end   = w.isCurrent ? "現在" : (w.endDate ?? w.end ?? "").trim();

                  // clean description/achievements
                  const descParts = [
                    w.description,
                    w.responsibilities,
                    w.achievements,
                  ]
                    .map((p: any) =>
                      typeof p === "string" && p.trim() !== "" ? p.trim() : null,
                    )
                    .filter(Boolean);

                  return {
                    company,
                    position,
                    period: `${start}${start || end ? " 〜 " : ""}${end}`,
                    description: descParts.join("\n"),
                  };
                });
              }
              /* projects (form_data.projects) ---------------------------------- */
              const formData: any = toObject(resumeData.form_data);
              if (formData && typeof formData === "object" && formData.projects) {
                finalApplicant.projects = formData.projects as any[]
              }
            }
          } catch (e) {
            console.error("Resume fetch/transform error:", e)
          }
        }
        setApplicant(finalApplicant)
        setStatus(finalApplicant.status)
      }
      setLoading(false)
    }
    if (applicantId) fetchApplicant()
  }, [applicantId])
  // ───────────────────────────────────────────────────────────────────────────

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    // Here you would typically call an API to update the status
    console.log(`Status updated to: ${newStatus}`)
  }

  const navigateToChat = () => {
    if (applicant && applicant.chatId) {
      router.push(`/company/chat/${applicant.chatId}`)
    }
  }

  const sendScout = () => {
    if (!applicant) return
    // Here you would typically call an API to send a scout
    console.log(`Scout sent to ${displayName} with message: ${scoutMessage}`)
    setIsScoutDialogOpen(false)
    setScoutMessage("")
  }

  // Find the color for the current status
  const statusColor = statusOptions.find((option) => option.value === status)?.color || "bg-gray-500"
  // ----- 氏名の表示用ユーティリティ ----------------------------------
  const displayName =
    applicant?.name && applicant.name.trim() !== ""
      ? applicant.name
      : `${[applicant?.lastName, applicant?.firstName].filter(Boolean).join(" ")}`.trim() ||
        "氏名未登録";
  // -------------------------------------------------------------------

  if (loading || !applicant) {
    return <div className="container mx-auto py-6 px-4 text-center">Loading...</div>
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 pb-24 md:pb-6">
      {/* Back button */}
      <Link
        href="/company/applicants"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        応募者一覧に戻る
      </Link>

      {/* Header Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-sm">
              <LazyImage
                src={applicant.profileImage || "/placeholder.svg"}
                alt={applicant.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 96px, 96px"
              />
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <Badge className={`${statusColor} text-white px-3 py-1`}>{status}</Badge>
              </div>
              <div className="mt-2 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-gray-600">
                <div className="flex items-center">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  <span>
                    {applicant.university} {applicant.faculty}
                  </span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span>{applicant.grade}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>応募日: {formatDateJP(applicant.applicationDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs for different sections */}
          <Tabs defaultValue="resume" className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="resume">履歴書</TabsTrigger>
              <TabsTrigger value="work">職務経歴書</TabsTrigger>
            </TabsList>

            {/* Resume Tab */}
            <TabsContent value="resume" className="space-y-6">

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-500" />
                    基本情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem label="姓"               value={applicant.lastName} />
                    <InfoItem label="名"               value={applicant.firstName} />
                    <InfoItem label="セイ"              value={applicant.lastNameKana} />
                    <InfoItem label="メイ"              value={applicant.firstNameKana} />
                    <InfoItem label="電話番号"          value={applicant.contact.phone ?? '-'} icon={Phone} />
                    <InfoItem label="性別"             value={applicant.gender} />
                    <InfoItem label="郵便番号"          value={applicant.postalCode} />
                    <InfoItem label="都道府県"          value={applicant.prefecture} />
                    <InfoItem label="市区町村"          value={applicant.city} />
                    <InfoItem label="住所詳細"          value={applicant.addressLine} />
                    <InfoItem label="出身地"            value={applicant.hometown} />
                    <InfoItem label="生年月日"          value={applicant.birthDate} />
                    <InfoItem label="卒業予定年月"      value={formatYearMonthJP(applicant.graduationMonth)} icon={Calendar} />
                    <InfoItem label="メールアドレス"    value={applicant.contact.email ?? '-'} icon={Mail} className="md:col-span-2" />
                  </div>
                </CardContent>
              </Card>


              {/* Education section (moved from education tab) */}

              {/* Research Theme card */}
              {applicant.researchTheme && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                      研究テーマ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line text-gray-700">{applicant.researchTheme}</p>
                  </CardContent>
                </Card>
              )}

              {/* Strengths card */}
              {(applicant.strength1 || applicant.strength2 || applicant.strength3) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Star className="h-5 w-5 mr-2 text-blue-500" />
                      強み
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {[applicant.strength1, applicant.strength2, applicant.strength3]
                        .filter(Boolean)
                        .map((s, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {s}
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="h-5 w-5 mr-2 text-blue-500" />
                    スキル
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">技術スキル</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {applicant.skills.map((skill, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span>{skill.name}</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < skill.level ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">言語スキル</h3>
                      <div className="space-y-2">
                        {Array.isArray(applicant.languages) && applicant.languages.length ? (
                          applicant.languages.map((language: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <span>{typeof language === "string" ? language : language.name}</span>
                              {typeof language === "object" && language?.level ? (
                                <Badge variant="outline" className="bg-gray-50">
                                  {language.level}
                                </Badge>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">言語スキル未入力</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">資格・検定</h3>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(applicant.qualifications) && applicant.qualifications.length ? (
                          applicant.qualifications.map((q, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              {q}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">資格情報未入力</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {(applicant.workStyle ||
                applicant.employmentType ||
                (applicant.desiredPositions?.length ?? 0) ||
                (applicant.workStyleOptions?.length ?? 0) ||
                (applicant.preferredIndustries?.length ?? 0) ||
                (applicant.desiredLocations?.length ?? 0) ||
                applicant.preferenceNote) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="h-5 w-5 mr-2 text-blue-500" />
                      希望条件
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InfoItem label="勤務形態" value={applicant.workStyle} />
                    <InfoItem label="雇用形態" value={applicant.employmentType} />

                    {applicant.desiredPositions?.length ? (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">希望職種</h3>
                        <div className="flex flex-wrap gap-2">
                          {applicant.desiredPositions.map((p, idx) => (
                            <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {applicant.workStyleOptions?.length ? (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">働き方オプション</h3>
                        <div className="flex flex-wrap gap-2">
                          {applicant.workStyleOptions.map((w, idx) => (
                            <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {w}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {applicant.preferredIndustries?.length ? (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">希望業界</h3>
                        <div className="flex flex-wrap gap-2">
                          {applicant.preferredIndustries.map((i, idx) => (
                            <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {i}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {applicant.desiredLocations?.length ? (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">希望勤務地</h3>
                        <div className="flex flex-wrap gap-2">
                          {applicant.desiredLocations.map((l, idx) => (
                            <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {l}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {applicant.preferenceNote && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">備考</h3>
                        <p>{applicant.preferenceNote}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Motivation section (moved from motivation tab) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    志望動機
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-line text-gray-700">{applicant.motivationLetter}</div>
                </CardContent>
              </Card>

            </TabsContent>

            {/* Work Tab (職務経歴書) */}
            <TabsContent value="work" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-blue-500" />
                    職務経歴
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {Array.isArray(applicant.workExperience) && applicant.workExperience.length ? (
                    applicant.workExperience.map((w, i) => (
                      <div
                        key={i}
                        className="relative pl-6 pb-8 last:pb-0"
                      >
                        {/* vertical line */}
                        <span className="absolute left-0 top-0 -translate-x-1/2 h-full w-px bg-blue-300" />

                        {/* dot */}
                        <span className="absolute left-0 top-1.5 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500" />

                        <h4 className="font-semibold text-sm">
                          {w.company ?? "（社名未登録）"}
                        </h4>

                        {w.position && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {w.position}
                          </p>
                        )}

                        {w.period && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {w.period}
                          </p>
                        )}

                        {w.description && (
                          <p className="text-sm whitespace-pre-wrap mt-2">
                            {w.description}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">職務経歴情報は未登録です。</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column - 1/3 width on desktop */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle>アクション</CardTitle>
              <CardDescription>応募者のステータスを更新したり、コミュニケーションを取ったりできます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">選考ステータスを変更</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center">
                        <Badge className={`${statusColor} text-white mr-2 px-2 py-0.5`}>{status}</Badge>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    {statusOptions.map((option) => (
                      <DropdownMenuItem key={option.value} onClick={() => handleStatusChange(option.value)}>
                        <Badge className={`${option.color} text-white mr-2 px-2 py-0.5`}>{option.label}</Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button className="w-full" onClick={navigateToChat}>
                <MessageSquare className="h-4 w-4 mr-2" />
                チャットに進む
              </Button>

              <Dialog open={isScoutDialogOpen} onOpenChange={setIsScoutDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>スカウトを送信</DialogTitle>
                    <DialogDescription>
                      {displayName}
                      さんにスカウトメッセージを送信します。興味を持ってもらえるようなメッセージを書きましょう。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label htmlFor="scout-message" className="text-sm font-medium">
                        スカウトメッセージ
                      </label>
                      <textarea
                        id="scout-message"
                        className="w-full min-h-[150px] p-3 border rounded-md"
                        placeholder="例：田中さん、あなたのスキルと経験に興味を持ちました。弊社では現在、フロントエンドエンジニアを募集しており..."
                        value={scoutMessage}
                        onChange={(e) => setScoutMessage(e.target.value)}
                      />
                      <p className="text-sm text-gray-500">
                        学生の興味・関心に合わせたパーソナライズされたメッセージを送ることで、返信率が高まります。
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsScoutDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={sendScout} disabled={!scoutMessage.trim()}>
                      送信する
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Resume Card */}
        

          {/* Application Timeline Card */}
          

        </div>
      </div>

      {/* Mobile fixed action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-10">
        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1" onClick={() => setIsScoutDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            スカウト
          </Button>
          <Button className="flex-1" onClick={navigateToChat}>
            <MessageSquare className="h-4 w-4 mr-2" />
            チャット
          </Button>
        </div>
      </div>
    </div>
  )
}
