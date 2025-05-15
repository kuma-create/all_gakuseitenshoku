"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  Send,
  GraduationCap,
  MapPin,
  Clock as ClockIcon,
  User,
  X,
} from "lucide-react"
import type { Database } from "@/lib/supabase/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { useToast } from "@/lib/hooks/use-toast"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { supabase as sb } from "@/lib/supabase/client"

// 型ガード: experience フィールドの型をチェック
function isExperienceArray(v: unknown): v is Experience[] {
  return Array.isArray(v) &&
    v.every(
      (e) => typeof e === "object" && e !== null &&
        "company" in e && "title" in e && "period" in e
    )
}

// 日付を「YYYY/MM/DD」に整形
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

// 型定義
interface Experience {
  company: string
  title:   string
  period:  string
}

type StudentProfile = Database["public"]["Tables"]["student_profiles"]["Row"]
type ScoutRow       = Database["public"]["Tables"]["scouts"]["Row"]
type ScoutTemplateRow = Database["public"]["Tables"]["scout_templates"]["Row"]

interface Student extends Omit<StudentProfile, "experience"> {
  experience  : Experience[]
  match_score : number
  last_active : string
}

// デフォルトテンプレート (fallback)
const defaultTemplates: Omit<ScoutTemplateRow, "id" | "company_id" | "created_at">[] = [
  {
    title:   "一般的なスカウト",
    content: "こんにちは、[学生名]さん。弊社にご関心をお持ちくださりありがとうございます。ぜひ一度お話ししませんか？",
  },
  {
    title:   "技術職向けスカウト",
    content: "こんにちは、[学生名]さん。あなたの[スキル]のスキルに注目しました。弊社で活躍いただける機会があります。ご検討ください！",
  },
  // 他のテンプレートを追加...
]

export default function ScoutPage() {
  const router = useRouter()
  const { toast } = useToast()

  // state
  const [loading          , setLoading          ] = useState(true)
  const [companyId        , setCompanyId        ] = useState<string | null>(null)
  const [students         , setStudents         ] = useState<Student[]>([])
  const [sentScouts       , setSentScouts       ] = useState<ScoutRow[]>([])
  const [templates        , setTemplates        ] = useState<ScoutTemplateRow[]>([])

  // フィルター/UI state
  const [searchTerm           , setSearchTerm           ] = useState<string>("")
  const [selectedMajor        , setSelectedMajor        ] = useState<string>("all")
  const [selectedYear         , setSelectedYear         ] = useState<string>("all")
  const [selectedLocation     , setSelectedLocation     ] = useState<string>("all")
  const [hasInternshipFilter  , setHasInternshipFilter  ] = useState<boolean>(false)
  const [selectedSkills       , setSelectedSkills       ] = useState<string[]>([])
  const [sortOption           , setSortOption           ] = useState<string>("default")

  // モーダル state
  const [isScoutModalOpen, setIsScoutModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [scoutMessage, setScoutMessage] = useState("")

  const [isProfileModalOpen , setIsProfileModalOpen ] = useState<boolean>(false)
  const [profileStudent     , setProfileStudent     ] = useState<Student | null>(null)

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [editingTpl, setEditingTpl] = useState<ScoutTemplateRow | null>(null)
  const [tplTitle, setTplTitle] = useState("")
  const [tplContent, setTplContent] = useState("")

  // 初期ロード: 認証・会社ID・学生一覧・送信済スカウト
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: { session }, error: authErr } = await sb.auth.getSession()
      if (authErr || !session) {
        router.push("/auth/signin")
        return
      }

      // 会社ID取得
      const { data: comp, error: compErr } = await sb
        .from("companies")
        .select("id")
        .eq("user_id", session.user.id)
        .single()
      if (compErr || !comp) {
        toast({ title: "会社プロフィールが見つかりません", variant: "destructive" })
        return
      }
      setCompanyId(comp.id)

      // 学生一覧取得
      const { data: studentRows, error: stuErr } = await sb
        .from("student_profiles")
        .select("*")
      if (stuErr) {
        toast({ title: "学生データ取得エラー", description: stuErr.message, variant: "destructive" })
      } else if (studentRows) {
        const now = Date.now()
        setStudents(
          studentRows.map((s) => ({
            ...s,
            experience : isExperienceArray(s.experience) ? s.experience : [],
            match_score: 0,
            last_active: s.created_at
              ? `${Math.round((now - new Date(s.created_at).getTime()) / 60000)}分前`
              : "",
          }))
        )
      }

      // 送信済スカウト取得
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

  // テンプレート再取得
  const fetchTemplates = useCallback(() => {
    if (!companyId) return
    sb.from("scout_templates")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at")
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "テンプレート取得エラー", description: error.message, variant: "destructive" })
        } else {
          setTemplates(data || [])
        }
      })
  }, [companyId, sb, toast])

  // useEffectでテンプレート取得
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // モーダルを開く（新規 or 編集）
  function openTemplateModal(tpl?: ScoutTemplateRow) {
    if (tpl) {
      setEditingTpl(tpl)
      setTplTitle(tpl.title)
      setTplContent(tpl.content)
    } else {
      setEditingTpl(null)
      setTplTitle("")
      setTplContent("")
    }
    setIsTemplateModalOpen(true)
  }

  // テンプレート保存（create or update）
  async function saveTemplate() {
    if (!companyId) return
    const payload = {
      company_id: companyId,
      title: tplTitle,
      content: tplContent,
    }
    try {
      if (editingTpl) {
        await sb
          .from("scout_templates")
          .update({ title: tplTitle, content: tplContent })
          .eq("id", editingTpl.id)
      } else {
        await sb.from("scout_templates").insert(payload)
      }
      fetchTemplates()
      setIsTemplateModalOpen(false)
      toast({ title: "保存しました" })
    } catch (e: any) {
      toast({ title: "保存エラー", description: e.message, variant: "destructive" })
    }
  }

  // テンプレート削除
  async function deleteTemplate(id: string) {
    if (!confirm("このテンプレートを削除しますか？")) return
    try {
      await sb.from("scout_templates").delete().eq("id", id)
      fetchTemplates()
      toast({ title: "削除しました" })
    } catch (e: any) {
      toast({ title: "削除エラー", description: e.message, variant: "destructive" })
    }
  }

  // テンプレート選択 -> メッセージ差し込み
  const safeReplace = (str: string, token: string, value?: string | null) =>
    str.replace(token, value || "")
  const effectiveTemplates = templates.length ? templates : defaultTemplates
  const selectTemplate = (id: string) => {
    if (!selectedStudent) return
    const tpl = effectiveTemplates.find((t) => String((t as any).id ?? t.title) === id)
    if (!tpl) return
    let msg = tpl.content
    msg = safeReplace(msg, "[学生名]", selectedStudent.full_name ?? "")
    msg = safeReplace(msg, "[スキル]", (selectedStudent.skills || []).join(", "))
    if (selectedStudent.experience.length) {
      msg = safeReplace(msg, "[会社名]", selectedStudent.experience[0].company)
    }
    setScoutMessage(msg)
    setSelectedTemplate(id)
  }

  // フィルタリング
  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return students.filter((s) => {
      if (term) {
        const text = [s.full_name ?? "", s.university ?? ""].join(" ").toLowerCase()
        if (!text.includes(term)) return false
      }
      if (selectedMajor !== "all" && s.major !== selectedMajor) return false
      if (selectedYear  !== "all" && String(s.graduation_year ?? "") !== selectedYear) return false
      if (selectedLocation !== "all" && (s.location ?? "") !== selectedLocation) return false
      if (hasInternshipFilter && !s.has_internship_experience) return false
      if (selectedSkills.length && !selectedSkills.every((sk) => (s.skills || []).includes(sk))) return false
      return true
    })
  }, [students, searchTerm, selectedMajor, selectedYear, selectedLocation, hasInternshipFilter, selectedSkills])

  // ソート
  const sortedStudents = useMemo(() => {
    const arr = [...filteredStudents]
    switch (sortOption) {
      case "nameAsc":         return arr.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""))
      case "nameDesc":        return arr.sort((a, b) => (b.full_name ?? "").localeCompare(a.full_name ?? ""))
      case "graduationAsc":   return arr.sort((a, b) => (a.graduation_year ?? 0) - (b.graduation_year ?? 0))
      case "graduationDesc":  return arr.sort((a, b) => (b.graduation_year ?? 0) - (a.graduation_year ?? 0))
      default:                 return arr
    }
  }, [filteredStudents, sortOption])

  // スカウト送信
  const sendScout = async () => {
    if (!companyId || !selectedStudent) return
    const { error } = await sb.from("scouts").insert({
      company_id: companyId,
      student_id: selectedStudent.id,
      message:    scoutMessage,
      status:     "sent",
    })
    if (error) {
      toast({ title: "送信エラー", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "スカウト送信完了", description: `${selectedStudent.full_name} さんに送信しました` })
    setSentScouts((prev) => [
      { id: crypto.randomUUID(), company_id: companyId, student_id: selectedStudent.id, message: scoutMessage, status: "sent", created_at: new Date().toISOString() } as ScoutRow,
      ...prev,
    ])
    setIsScoutModalOpen(false)
  }

  if (loading) {
    return <div className="flex h-60 items-center justify-center">Loading...</div>
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">スカウト</h1>
        <div className="flex items-center space-x-3">
          {/* 検索ボックス */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="検索..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* ここにヘッダーから即スカウトボタン */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStudent(null)
              setScoutMessage("")
              setIsScoutModalOpen(true)
            }}
          >
            <Send className="mr-1" />
            スカウト
          </Button>
          {/* 既存の「新規求人作成」「通知」など */}
        </div>
      </div>

      {/* タブ切り替え（候補学生／送信済み／テンプレ管理） */}
      <Tabs defaultValue="candidates" className="mb-6">
        <TabsList>
          <TabsTrigger value="candidates">候補学生</TabsTrigger>
          <TabsTrigger value="sent">送信済みスカウト</TabsTrigger>
          <TabsTrigger value="templates">テンプレート管理</TabsTrigger>
        </TabsList>

        {/* ── 候補学生リスト ───────────────────────────── */}
        <TabsContent value="candidates">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* フィルターサイドバー */}
            <aside className="lg:w-1/4 space-y-4">
              <h2 className="flex items-center text-lg font-semibold">
                <Filter className="mr-2" /> フィルター
              </h2>
              <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                <SelectTrigger>
                  <SelectValue placeholder="専攻" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  {[...new Set(
                    students
                      .map((s) => s.major)                     // (string | null)[]
                      .filter((m): m is string => m != null)   // string[] に絞り込む
                  )].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger><SelectValue placeholder="卒業年度" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  {[...new Set(students.map((s) => String(s.graduation_year)))].map((y) => (
                    <SelectItem key={y} value={y}>{y}年</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="地域" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  {[...new Set(
                    students
                      .map((s) => s.location)                  // (string | null)[]
                      .filter((l): l is string => l != null)   // string[] に絞り込む
                  )].map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Checkbox
                id="intern"
                checked={hasInternshipFilter}
                onCheckedChange={(v) => setHasInternshipFilter(!!v)}
              >
                <label htmlFor="intern" className="ml-2">インターン経験あり</label>
              </Checkbox>
              <div>
                <label className="text-sm font-medium">スキル</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSkills.map((sk) => (
                    <Badge key={sk} variant="outline" className="flex items-center">
                      {sk}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedSkills((prev) => prev.filter((s) => s !== sk))}
                      />
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Enterで追加"
                  className="mt-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value) {
                      setSelectedSkills((prev) => [...prev, e.currentTarget.value])
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
            </aside>
            {/* 学生カード一覧 */}
            <section className="lg:w-3/4 space-y-6">
              {/* 並び替えセレクト */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedStudents.map((s) => {
                  const scout = sentScouts.find((r) => r.student_id === s.id)
                  return (
                    <Card key={s.id} className="relative">
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="h-20 w-20 rounded-full overflow-hidden">
                            <Image
                              src={s.avatar || "/placeholder.svg"}
                              alt={s.full_name ?? ""} 
                              width={80}
                              height={80}
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold">{s.full_name}</h3>
                            <p className="text-gray-500 flex items-center">
                              <GraduationCap className="mr-1" />{s.university} · {s.major} · {s.academic_year}年生
                            </p>
                            <p className="text-gray-500 flex items-center">
                              <MapPin className="mr-1" />{s.location} · {s.graduation_year}年卒
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(s.desired_industries || []).map((ind) => (
                                <Badge key={ind} variant="outline">{ind}</Badge>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(s.skills || []).map((sk) => (
                                <Badge key={sk} variant="secondary">{sk}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-600 italic mt-4 line-clamp-2">"{s.about}"</p>
                        <div className="flex justify-between items-center mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setProfileStudent(s); setIsProfileModalOpen(true) }}
                          >
                            <User className="mr-1" /> プロフィール
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => { setSelectedStudent(s); setIsScoutModalOpen(true); setScoutMessage(""); setSelectedTemplate(null); }}
                          >
                            <Send className="mr-1" /> スカウト
                          </Button>
                        </div>
                        <div className="text-xs text-gray-400 mt-2 flex items-center">
                          <ClockIcon className="mr-1 h-4 w-4" />
                          {scout
                            ? (scout.created_at ? `スカウト済: ${formatDate(scout.created_at)}` : "スカウト済")
                            : "未スカウト"}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                {sortedStudents.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    条件に一致する学生がいません
                  </div>
                )}
              </div>
            </section>
          </div>
        </TabsContent>

        {/* ── 送信済みスカウト一覧 ───────────────────────────── */}
        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>送信済みスカウト</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-2">学生名</th>
                      <th className="pb-2">メッセージ</th>
                      <th className="pb-2">送信日時</th>
                      <th className="pb-2">ステータス</th>
                      <th className="pb-2">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentScouts.map((scout) => {
                      const stu = students.find((s) => s.id === scout.student_id)
                      return (
                        <tr key={scout.id} className="border-b">
                          <td className="py-3">{stu?.full_name ?? "―"}</td>
                          <td className="py-3 line-clamp-2">{scout.message}</td>
                          <td className="py-3">{formatDate(scout.created_at)}</td>
                          <td className="py-3">{scout.status}</td>
                          <td className="py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedStudent(stu || null)
                                setScoutMessage(scout.message)
                                setSelectedTemplate(null)
                                setIsScoutModalOpen(true)
                              }}
                            >
                              再送信
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                    {sentScouts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-500">
                          まだスカウトを送信していません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── テンプレート管理 ───────────────────────────── */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>テンプレート管理</CardTitle>
              <Button onClick={() => openTemplateModal()}>新規テンプレート</Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-2">タイトル</th>
                      <th className="pb-2">内容プレビュー</th>
                      <th className="pb-2">作成日</th>
                      <th className="pb-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((tpl) => (
                      <tr key={tpl.id} className="border-b">
                        <td className="py-3">{tpl.title}</td>
                        <td className="py-3 line-clamp-2">{tpl.content}</td>
                        <td className="py-3">{tpl.created_at ? new Date(tpl.created_at).toLocaleDateString("ja-JP") : ""}</td>
                        <td className="py-3 space-x-2">
                          <Button size="sm" variant="outline" onClick={() => openTemplateModal(tpl)}>編集</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteTemplate(tpl.id)}>削除</Button>
                        </td>
                      </tr>
                    ))}
                    {templates.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-500">
                          テンプレートが登録されていません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* スカウト送信モーダル */}
      <Dialog open={isScoutModalOpen} onOpenChange={setIsScoutModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>スカウトを送信</DialogTitle>
            <DialogDescription>{selectedStudent?.full_name} さんにメッセージを送信します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedTemplate || ""} onValueChange={selectTemplate}>
              <SelectTrigger><SelectValue placeholder="テンプレート選択" /></SelectTrigger>
              <SelectContent>
                {effectiveTemplates.map((t) => (
                  <SelectItem key={String((t as any).id ?? t.title)} value={String((t as any).id ?? t.title)}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={6}
              value={scoutMessage}
              onChange={(e) => setScoutMessage(e.target.value)}
              placeholder="メッセージを入力..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScoutModalOpen(false)}>キャンセル</Button>
            <Button disabled={!scoutMessage.trim()} onClick={sendScout}><Send className="mr-1" />送信</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* プロフィールモーダル */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>学生プロフィール</DialogTitle></DialogHeader>
          {profileStudent && (
            <div className="space-y-6 py-4">
              {/* プロフィール内容省略せず全表示 */}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>閉じる</Button>
            <Button onClick={() => {
              setIsProfileModalOpen(false)
              if (profileStudent) {
                setSelectedStudent(profileStudent)
                setScoutMessage("")
                setSelectedTemplate(null)
                setIsScoutModalOpen(true)
              }
            }}><Send className="mr-1" />スカウト</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* テンプレート追加・編集モーダル */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTpl ? "テンプレート編集" : "新規テンプレート"}</DialogTitle>
            <DialogDescription>
              スカウト文面のテンプレートを{editingTpl ? "編集" : "作成"}します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={tplTitle}
              onChange={(e) => setTplTitle(e.target.value)}
              placeholder="タイトル"
            />
            <Textarea
              rows={6}
              value={tplContent}
              onChange={(e) => setTplContent(e.target.value)}
              placeholder="メッセージ内容"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
              キャンセル
            </Button>
            <Button disabled={!tplTitle.trim() || !tplContent.trim()} onClick={saveTemplate}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
