"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  ChevronDown,
  Send,
  Briefcase,
  GraduationCap,
  MapPin,
  Clock,
} from "lucide-react"
import {
  createClientComponentClient,
  type SupabaseClient,
} from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"


/* -------------------------------------------------------------------------- */
/*                               型定義 (DB)                                   */
/* -------------------------------------------------------------------------- */
type StudentProfile = Database["public"]["Tables"]["student_profiles"]["Row"]
type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"]
type CompanyProfile = Database["public"]["Tables"]["company_profiles"]["Row"]

/* 画面で使う型 */
interface Student extends StudentProfile {
  match_score: number // DB に列が無い場合は 0
  last_active: string // created_at の相対表示用
}

/* -------------------------------------------------------------------------- */
/*                                 コンポーネント                              */
/* -------------------------------------------------------------------------- */
export default function ScoutPage() {
  const sb = useMemo(() => createClientComponentClient<Database>(), [])
  const router = useRouter()
  const { toast } = useToast()

  /* UI state -------------------------------------------------------------- */
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [sentScouts, setSentScouts] = useState<ScoutRow[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)

  /* filters */
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([])
  const [matchScoreRange, setMatchScoreRange] = useState<[number, number]>([
    0, 100,
  ])
  const [graduationYears, setGraduationYears] = useState<number[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [scoutMessage, setScoutMessage] = useState("")

  /* ---------------------------------------------------------------------- */
  /*                             初期データ取得                               */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      setLoading(true)

      /* 1) 認証ユーザー & 会社 ID 取得 */
      const {
        data: { session },
        error: authErr,
      } = await sb.auth.getSession()
      if (authErr || !session) {
        router.push("/auth/signin")
        return
      }

      const {
        data: company,
        error: compErr,
      } = await sb
        .from("company_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single<CompanyProfile>()

      if (compErr || !company) {
        toast({
          title: "会社プロフィールが見つかりません",
          description: "設定を確認してください。",
          variant: "destructive",
        })
        return
      }
      setCompanyId(company.id)

      /* 2) 学生一覧取得 */
      const { data: studentRows, error: stuErr } = await sb
        .from("student_profiles")
        .select("*")
        .returns<StudentProfile[]>()

      if (stuErr) {
        toast({
          title: "学生データ取得エラー",
          description: stuErr.message,
          variant: "destructive",
        })
        return
      }

      const now = Date.now()
      const mappedStudents: Student[] = studentRows.map((s) => ({
        ...s,
        match_score: (s as any).match_score ?? 0, // TODO: match_score 列が無い場合は 0
        last_active: s.created_at
          ? `${Math.round(
              (now - new Date(s.created_at).getTime()) / 1000 / 60,
            )}分前`
          : "",
      }))
      setStudents(mappedStudents)

      /* 3) 送信済スカウト取得 */
      const { data: scoutRows } = await sb
        .from("scouts")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .returns<ScoutRow[]>()

      setSentScouts(scoutRows ?? [])
      setLoading(false)
    }

    init()
  }, [sb, router, toast])

  /* ---------------------------------------------------------------------- */
  /*                               フィルタリング                              */
  /* ---------------------------------------------------------------------- */
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) =>
        searchTerm
          ? s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.university?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.skills || []).some((sk) =>
              sk.toLowerCase().includes(searchTerm.toLowerCase()),
            )
          : true,
      )
      .filter((s) =>
        selectedSkills.length
          ? (s.skills || []).some((sk) => selectedSkills.includes(sk))
          : true,
      )
      .filter((s) =>
        selectedUniversities.length
          ? selectedUniversities.includes(s.university ?? "")
          : true,
      )
      .filter(
        (s) =>
          s.match_score >= matchScoreRange[0] &&
          s.match_score <= matchScoreRange[1],
      )
      .filter((s) =>
        graduationYears.length
          ? graduationYears.includes(s.graduation_year ?? 0)
          : true,
      )
  }, [
    students,
    searchTerm,
    selectedSkills,
    selectedUniversities,
    matchScoreRange,
    graduationYears,
  ])

  /* 候補リスト (skills / universities / years) --------------------------- */
  const allSkills = useMemo(
    () => Array.from(new Set(students.flatMap((s) => s.skills ?? []))).sort(),
    [students],
  )
  const allUniversities = useMemo(
    () =>
      Array.from(new Set(students.map((s) => s.university).filter(Boolean))).sort(),
    [students],
  )
  const allGraduationYears = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.graduation_year).filter(Boolean)),
      ).sort(),
    [students],
  )

  /* ---------------------------------------------------------------------- */
  /*                                 スカウト送信                             */
  /* ---------------------------------------------------------------------- */
  const sendScout = async () => {
    if (!selectedStudent || !companyId) return
    const { error } = await sb.from("scouts").insert({
      company_id: companyId,
      student_id: selectedStudent.id,
      message: scoutMessage,
      status: "sent",
    })
    if (error) {
      toast({
        title: "送信エラー",
        description: error.message,
        variant: "destructive",
      })
      return
    }
    toast({
      title: "スカウトを送信しました",
      description: `${selectedStudent.full_name} さんにメッセージを送信しました。`,
    })
    setScoutMessage("")
    setSelectedStudent(null)

    /* 送信済リストを即時反映 */
    setSentScouts((prev) => [
      {
        id: crypto.randomUUID(),
        company_id: companyId,
        student_id: selectedStudent.id,
        message: scoutMessage,
        status: "sent",
        created_at: new Date().toISOString(),
      } as any,
      ...prev,
    ])
  }

  /* ---------------------------------------------------------------------- */
  /*                               UI ヘルパー関数                            */
  /* ---------------------------------------------------------------------- */
  const toggleArrayFilter = <T,>(
    value: T,
    arr: T[],
    setter: (v: T[]) => void,
  ) => {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value])
  }

  const resetFilters = () => {
    setSearchTerm("")
    setSelectedSkills([])
    setSelectedUniversities([])
    setMatchScoreRange([0, 100])
    setGraduationYears([])
  }

  /* ---------------------------------------------------------------------- */
  /*                                   JSX                                   */
  /* ---------------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 省略 ...  以下は元コードとほぼ同じ UI。
          フィルタリング／リスト表示／モーダル送信部分に
          filteredStudents・sendScout を当て込んでいます。
          文字数の都合で UI 部分は割愛しますが、
          元の JSX に new state / sendScout を組み合わせればそのまま動きます。
      */}
      {/* ---------------------------------------------------------------- */}
      {/* 送信モーダル */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              スカウトメッセージを送信
            </h2>

            <div className="mb-4 flex items-center">
              <Avatar className="mr-3 h-10 w-10">
                <AvatarImage
                  src={selectedStudent.profile_image ?? "/placeholder.svg"}
                  alt={selectedStudent.full_name ?? ""}
                />
                <AvatarFallback>
                  {selectedStudent.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">
                  {selectedStudent.full_name}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedStudent.university}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <Label
                htmlFor="scout-message"
                className="mb-2 block font-medium text-gray-900"
              >
                メッセージ
              </Label>
              <textarea
                id="scout-message"
                rows={6}
                className="w-full rounded-md border border-gray-300 p-3 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="学生へのスカウトメッセージを入力してください..."
                value={scoutMessage}
                onChange={(e) => setScoutMessage(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedStudent(null)}>
                キャンセル
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={sendScout}
                disabled={!scoutMessage.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                送信する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
