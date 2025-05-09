/* ───────────────────────────────────────────────
   app/company/scout/page.tsx  – 企業向けスカウト画面
   ◆ experience を型安全に扱うため Student 型を拡張
────────────────────────────────────────────── */
"use client"

import React, { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Search, Filter, Send, GraduationCap, MapPin, Clock as ClockIcon,
  User, X,
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/types"
function isExperienceArray(v: unknown): v is Experience[] {
  return (
    Array.isArray(v) &&
    v.every(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        "company" in e &&
        "title"   in e &&
        "period"  in e
    )
  )
}

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"

function isTruthy<T>(v: T | null | undefined | false | 0 | ""): v is T {
  return !!v
}

/** ISO 文字列 → 「YYYY/MM/DD」 に変換（null は "" を返す） */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year : "numeric",
    month: "2-digit",
    day  : "2-digit",
  })
}


/* ------------------------------------------------------------------ */
/*                              型定義                                 */
/* ------------------------------------------------------------------ */
type StudentProfile = Database["public"]["Tables"]["student_profiles"]["Row"]
type ScoutRow       = Database["public"]["Tables"]["scouts"]["Row"]
type ScoutTemplateRow = Database["public"]["Tables"]["scout_templates"]["Row"]

interface Experience {
  company: string
  title  : string
  period : string
}

interface Student
  extends Omit<StudentProfile, "experience"> {      // experience を差し替え
  experience : Experience[]
  match_score: number
  last_active: string
}

/* ------------------------------------------------------------------ */
/*                    デフォルトテンプレート（fallback）               */
/* ------------------------------------------------------------------ */
const defaultTemplates: Omit<
  ScoutTemplateRow,
  "id" | "company_id" | "created_at"
>[] = [
  {
    title: "一般的なスカウト",
    content:
      "こんにちは、[学生名]さん。私たちの会社では、あなたのスキルと経験に非常に興味を持っています。ぜひ一度、私たちの求人情報をご覧いただき、興味があればご応募をご検討いただけませんか？",
  },
  {
    title: "技術職向けスカウト",
    content:
      "こんにちは、[学生名]さん。あなたの[スキル]のスキルに注目しました。現在、私たちのチームでは、これらのスキルを活かせるプロジェクトが進行中です。ぜひ一度、お話しする機会をいただけませんか？",
  },
  {
    title: "デザイナー向けスカウト",
    content:
      "こんにちは、[学生名]さん。あなたのデザインスキルとポートフォリオに感銘を受けました。私たちは現在、ユーザー体験を重視した新しいプロダクトを開発中で、あなたのような才能あるデザイナーを探しています。",
  },
  {
    title: "インターン経験者向けスカウト",
    content:
      "こんにちは、[学生名]さん。あなたの[会社名]でのインターン経験に興味を持ちました。その経験を活かして、私たちの会社でさらにスキルを伸ばしませんか？ぜひカジュアル面談でお話ししましょう。",
  },
  {
    title: "志望業界マッチ",
    content:
      "こんにちは、[学生名]さん。あなたの志望業界である[業界]に私たちの会社は属しています。業界をリードする当社で、あなたのキャリアをスタートさせてみませんか？",
  },
]

/* ================================================================== */
/*                               Page                                 */
/* ================================================================== */
export default function ScoutPage() {
  const sb = useMemo(() => createClientComponentClient<Database>(), [])
  const router = useRouter()
  const { toast } = useToast()

  /* ------------------------------ state --------------------------- */
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [sentScouts, setSentScouts] = useState<ScoutRow[]>([])
  const [templates, setTemplates] = useState<ScoutTemplateRow[]>([])

  /* … 既存のフィルター/UI state は省略せずそのまま … */
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMajor, setSelectedMajor] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("all")
  const [selectedIndustry, setSelectedIndustry] = useState("all")
  const [hasInternshipFilter, setHasInternshipFilter] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [sortOption, setSortOption] = useState("default")

  const [isScoutModalOpen, setIsScoutModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [scoutMessage, setScoutMessage] = useState("")

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileStudent, setProfileStudent] = useState<Student | null>(null)

  /* ------------------------------ init ---------------------------- */
  useEffect(() => {
    const init = async () => {
      setLoading(true)

      /* セッション確認 */
      const { data: { session }, error: authErr } = await sb.auth.getSession()
      if (authErr || !session) {
        router.push("/auth/signin")
        return
      }

      /* company_id */
      const { data: comp, error: compErr } = await sb
        .from("company_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single()

      if (compErr || !comp) {
        toast({ title: "会社プロフィールが見つかりません", variant: "destructive" })
        return
      }
      setCompanyId(comp.id)

      /* 学生プロフィール */
      const { data: studentRows, error: stuErr } = await sb
        .from("student_profiles")
        .select("*")

      if (stuErr) {
        toast({ title: "学生データ取得エラー", description: stuErr.message, variant: "destructive" })
      } else if (studentRows) {
        const now = Date.now()
        setStudents(
          studentRows.map((s): Student => ({
            ...s,
            experience : isExperienceArray(s.experience) ? s.experience : [],
            match_score: 0,
            last_active: s.created_at
              ? `${Math.round((now - new Date(s.created_at).getTime()) / 1000 / 60)}分前`
              : "",
          })),
        )
      }

      /* 送信済スカウト */
      const { data: scoutRows, error: scoutErr } = await sb
        .from("scouts")
        .select("*")
        .eq("company_id", comp.id)
        .order("created_at", { ascending: false })

      if (scoutErr) {
        toast({ title: "スカウト履歴取得エラー", description: scoutErr.message, variant: "destructive" })
      } else {
        setSentScouts(scoutRows || [])
      }

      setLoading(false)
    }

    init()
  }, [sb, router, toast])

  /* --- companyId 取得後にテンプレ取得 --- */
  useEffect(() => {
    if (!companyId) return
    const fetchTemplates = async () => {
      const { data, error } = await sb
        .from("scout_templates")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at")

      if (error) {
        toast({ title: "テンプレート取得エラー", description: error.message, variant: "destructive" })
        return
      }
      setTemplates(data || [])
    }
    fetchTemplates()
  }, [companyId, sb, toast])

  /* --- companyId が取れた後にテンプレ取得 --- */
  useEffect(() => {
    if (!companyId) return
    const fetchTemplates = async () => {
      const { data, error } = await sb
        .from("scout_templates")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at")

      if (error) {
        toast({ title: "テンプレート取得エラー", description: error.message, variant: "destructive" })
        return
      }
      setTemplates(data || [])
    }
    fetchTemplates()
  }, [companyId, sb, toast])

  /* ------------------------------ derived ------------------------- */
  /* ScoutTemplates: DB > fallback */
  const scoutTemplates = templates.length ? templates : defaultTemplates

  /* --- フィルタリング --- */
  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return students.filter((s) => {
      const name   = (s.full_name   ?? "").toLowerCase()
      const uni    = (s.university  ?? "").toLowerCase()
      const skills = s.skills ?? []

      if (term) {
        const matchesText =
          name.includes(term) ||
          uni.includes(term) ||
          skills.some(sk => sk.toLowerCase().includes(term))
        if (!matchesText) return false
      }

      if (selectedMajor !== "all" && s.major !== selectedMajor) return false
      if (selectedYear  !== "all" && String(s.graduation_year ?? "") !== selectedYear) return false
      if (selectedLocation !== "all" && (s.location ?? "") !== selectedLocation) return false
      if (selectedAcademicYear !== "all" && String(s.academic_year ?? "") !== selectedAcademicYear) return false

      const industries = s.desired_industries ?? []
      if (selectedIndustry !== "all" && !industries.includes(selectedIndustry)) return false

      if (hasInternshipFilter && !s.has_internship_experience) return false

      if (selectedSkills.length && !selectedSkills.every(sk => skills.includes(sk))) return false

      return true
    })
  }, [
    students, searchTerm, selectedMajor, selectedYear, selectedLocation,
    selectedAcademicYear, selectedIndustry, hasInternshipFilter, selectedSkills,
  ])

  /* --- 並び替え --- */
  const sortedStudents = useMemo(() => {
    const arr = [...filteredStudents]
    switch (sortOption) {
      case "nameAsc":
        return arr.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""))
      case "nameDesc":
        return arr.sort((a, b) => (b.full_name ?? "").localeCompare(a.full_name ?? ""))
      case "universityAsc":
        return arr.sort((a, b) => (a.university ?? "").localeCompare(b.university ?? ""))
      case "universityDesc":
        return arr.sort((a, b) => (b.university ?? "").localeCompare(a.university ?? ""))
      case "graduationAsc":
        return arr.sort((a, b) => (a.graduation_year ?? 0) - (b.graduation_year ?? 0))
      case "graduationDesc":
        return arr.sort((a, b) => (b.graduation_year ?? 0) - (a.graduation_year ?? 0))
      default:
        return arr
    }
  }, [filteredStudents, sortOption])

  /* ------------------------------ UI handlers --------------------- */
  const openScoutModal = (student: Student) => {
    setSelectedStudent(student)
    setSelectedTemplate(null)
    setScoutMessage("")
    setIsScoutModalOpen(true)
  }

  const openProfileModal = (student: Student) => {
    setProfileStudent(student)
    setIsProfileModalOpen(true)
  }

  /* --- null セーフ置換 --- */
  const safeReplace = (str: string, token: string, value?: string | null) =>
    str.replace(token, value ?? "")

  const selectTemplate = (id: string) => {
    if (!selectedStudent) return
    const tpl = (templates.length ? templates : defaultTemplates).find(
      (t) => String((t as any).id ?? "") === id,
    )
    if (!tpl) return

    let msg = tpl.content
    msg = safeReplace(msg, "[学生名]", selectedStudent.full_name)
    msg = safeReplace(msg, "[スキル]", (selectedStudent.skills ?? []).join(", "))

    if (selectedStudent.experience.length) {
      msg = safeReplace(msg, "[会社名]", selectedStudent.experience[0].company)
    }
    if (selectedStudent.desired_industries?.length) {
      msg = safeReplace(msg, "[業界]", selectedStudent.desired_industries[0])
    }

    setScoutMessage(msg)
    setSelectedTemplate(id)
  }


  /* --- スカウト送信 --- */
  const sendScout = async () => {
    if (!companyId || !selectedStudent) return
    const { error } = await sb.from("scouts").insert({
      company_id : companyId,
      student_id : selectedStudent.id,
      message    : scoutMessage,
      status     : "sent",
    })
    if (error) {
      toast({ title: "送信エラー", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "スカウト送信完了", description: `${selectedStudent.full_name} さんに送信しました` })
    setSentScouts(prev => [
      {
        id: crypto.randomUUID(),
        company_id : companyId,
        student_id : selectedStudent.id,
        message    : scoutMessage,
        status     : "sent",
        created_at : new Date().toISOString(),
      } as ScoutRow,
      ...prev,
    ])
    setIsScoutModalOpen(false)
  }

  /* ------------------------------ render -------------------------- */
  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* header ---------------------------------------------------- */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">スカウト</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="検索..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ------------------ filters ----------------------------- */}
        <div className="lg:w-1/4 space-y-4">
          <h2 className="flex items-center text-lg font-semibold">
            <Filter className="mr-2" /> フィルター
          </h2>

          /* major */
          <Select value={selectedMajor} onValueChange={setSelectedMajor}>
            <SelectTrigger><SelectValue placeholder="専攻" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {Array.from(
                new Set(students.map((s) => s.major).filter(isTruthy))
              ).map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          /* location も同様に */
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger><SelectValue placeholder="地域" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {Array.from(
                new Set(students.map((s) => s.location).filter(isTruthy))
              ).map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* year */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger><SelectValue placeholder="卒業年度" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              {Array.from(new Set(students.map(s => String(s.graduation_year)))).map(y => (
                <SelectItem key={y} value={y}>{y}年</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* internship */}
          <Checkbox
            checked={hasInternshipFilter}
            onCheckedChange={v => setHasInternshipFilter(!!v)}
            id="intern"
          >
            <label htmlFor="intern" className="ml-2">インターン経験あり</label>
          </Checkbox>

          {/* skills */}
          <div>
            <label className="text-sm font-medium">スキル</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedSkills.map(skill => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="flex items-center"
                >
                  {skill}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setSelectedSkills(sk => sk.filter(s => s !== skill))
                    }
                  />
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Enter キーで追加"
              className="mt-2"
              onKeyDown={e => {
                if (e.key === "Enter" && e.currentTarget.value) {
                  setSelectedSkills(sk => [...sk, e.currentTarget.value])
                  e.currentTarget.value = ""
                }
              }}
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSelectedMajor("all")
              setSelectedYear("all")
              setSelectedLocation("all")
              setHasInternshipFilter(false)
              setSelectedSkills([])
            }}
          >
            リセット
          </Button>
        </div>

        {/* ------------------ student list ------------------------ */}
        <div className="lg:w-3/4 space-y-6">
          {/* sort */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger><SelectValue placeholder="並び替え" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">デフォルト</SelectItem>
                <SelectItem value="nameAsc">名前↑</SelectItem>
                <SelectItem value="nameDesc">名前↓</SelectItem>
                <SelectItem value="graduationAsc">卒業↑</SelectItem>
                <SelectItem value="graduationDesc">卒業↓</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedStudents.map(s => {
              const scout = sentScouts.find(r => r.student_id === s.id)
              return (
                <Card key={s.id} className="relative">
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="h-20 w-20 rounded-full overflow-hidden">
                      <Image
                        src={s.avatar ?? "/placeholder.svg"}
                        alt={s.full_name ?? "学生プロフィール画像"}
                        width={80}
                        height={80}
                      />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{s.full_name}</h3>
                        <p className="text-gray-500 flex items-center">
                          <GraduationCap className="mr-1" />
                          {s.university} · {s.major} · {s.academic_year}年生
                        </p>
                        <p className="text-gray-500 flex items-center">
                          <MapPin className="mr-1" />
                          {s.location} · {s.graduation_year}年卒
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(s.desired_industries || []).map(ind => (
                            <Badge key={ind} variant="outline">{ind}</Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(s.skills || []).map(sk => (
                            <Badge key={sk} variant="secondary">{sk}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 italic mt-4 line-clamp-2">
                      "{s.about}"
                    </p>

                    <div className="flex justify-between items-center mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openProfileModal(s)}
                      >
                        <User className="mr-1" /> プロフィール
                      </Button>
                      <Button size="sm" onClick={() => openScoutModal(s)}>
                        <Send className="mr-1" /> スカウト
                      </Button>
                    </div>

                    <div className="text-xs text-gray-400 mt-2 flex items-center">
                      <ClockIcon className="mr-1 h-4 w-4" />
                      {scout
                        ? scout.created_at
                            ? `スカウト済: ${formatDate(scout.created_at)}`
                            : "スカウト済 (日時不明)"
                        : "未スカウト"}
                    </div>

                  </CardContent>
                </Card>
              )
            })}
          </div>

          {sortedStudents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              条件に一致する学生がいません
            </div>
          )}
        </div>
      </div>

      {/* ------------------ Scout Modal -------------------------- */}
      <Dialog open={isScoutModalOpen} onOpenChange={setIsScoutModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>スカウトを送信</DialogTitle>
            <DialogDescription>
              {selectedStudent?.full_name} さんにメッセージを送信します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select
              value={selectedTemplate ?? ""}
              onValueChange={v => selectTemplate(v)}
            >
              <SelectTrigger><SelectValue placeholder="テンプレート選択" /></SelectTrigger>
              <SelectContent>
                {scoutTemplates.map(t => (
                  <SelectItem key={(t as any).id ?? t.title} value={String((t as any).id ?? t.title)}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Textarea
              rows={6}
              value={scoutMessage}
              onChange={e => setScoutMessage(e.target.value)}
              placeholder="メッセージ入力..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScoutModalOpen(false)}>
              キャンセル
            </Button>
            <Button disabled={!scoutMessage.trim()} onClick={sendScout}>
              <Send className="mr-1" /> 送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------ Profile Modal ------------------------ */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>学生プロフィール</DialogTitle>
          </DialogHeader>

          {profileStudent && (
            <div className="space-y-6 py-4">
              <div className="flex gap-6">
                <div className="h-32 w-32 rounded-full overflow-hidden">
                <Image
                  src={profileStudent.avatar ?? "/placeholder.svg"}
                  alt={profileStudent.full_name ?? "学生プロフィール画像"}
                  width={128}
                  height={128}
                />

                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {profileStudent.full_name}
                  </h2>
                  <p className="text-gray-500 flex items-center">
                    <GraduationCap className="mr-1" />
                    {profileStudent.university} · {profileStudent.major} · {profileStudent.academic_year}年生
                  </p>
                  <p className="text-gray-500 flex items-center">
                    <MapPin className="mr-1" />
                    {profileStudent.location} · {profileStudent.graduation_year}年卒
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(profileStudent.desired_industries || []).map(ind => (
                      <Badge key={ind} variant="outline">{ind}</Badge>
                    ))}
                    {profileStudent.has_internship_experience && (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800"
                      >
                        インターン経験あり
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">自己紹介</h3>
                <p className="text-gray-700">{profileStudent.about}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">スキル</h3>
                <div className="flex flex-wrap gap-1">
                  {(profileStudent.skills || []).map(sk => (
                    <Badge key={sk} variant="secondary">{sk}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">興味・関心</h3>
                <div className="flex flex-wrap gap-1">
                  {(profileStudent.interests || []).map(int => (
                    <Badge key={int}>{`#${int}`}</Badge>
                  ))}
                </div>
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="exp">
                  <AccordionTrigger>経験</AccordionTrigger>
                  <AccordionContent>
                    {profileStudent.experience.length ? (
                      profileStudent.experience.map((e, i) => (
                        <div key={i} className="mb-4 last:mb-0">
                          <div className="font-medium">{e.title}</div>
                          <div className="text-gray-500">{e.company}</div>
                          <div className="text-xs text-gray-400">{e.period}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">経験情報なし</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>
              閉じる
            </Button>
            <Button
              onClick={() => {
                setIsProfileModalOpen(false)
                if (profileStudent) openScoutModal(profileStudent)
              }}
            >
              <Send className="mr-1" /> スカウト
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
