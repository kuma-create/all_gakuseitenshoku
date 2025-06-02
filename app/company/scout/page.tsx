"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Database } from "@/lib/supabase/types"

import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/lib/hooks/use-toast"
import { supabase as sb } from "@/lib/supabase/client"

import StudentList from "./StudentList"
import ScoutDrawer from "./ScoutDrawer"

import clsx from "clsx"

import { Checkbox } from "@/components/ui/checkbox"
import SkillPicker from "@/components/SkillPicker"
import QualificationPicker from "@/components/QualificationPicker"

/* ──────────────── 型定義 ──────────────── */
type StudentRow = Database["public"]["Tables"]["student_profiles"]["Row"]
type ScoutRow   = Database["public"]["Tables"]["scouts"]["Row"]
type TemplateRow = Database["public"]["Tables"]["scout_templates"]["Row"]

/**
 * 学生データ型
 * - Supabase の `student_profiles` 行に独自の画面用プロパティを足したもの
 * - 既存列はそのまま保持するため `StudentRow & { ... }` の交差型で定義
 */
type Student = StudentRow & {
  /** レジュメ(work_experiences) のネストデータ */
  resumes?: {
    work_experiences: any[] | null
  }[]

  /** 一覧用: 絞り込みや並び替えで使う算出スコア */
  match_score?: number

  /** 一覧用: 「◯分前」など表示用の文字列 */
  last_active?: string

  /* ──────── 追加: 型ジェネレーター未更新列を補完 ──────── */
  major?: string | null
  location?: string | null
  skills?: string[] | null
  qualifications?: string[] | null
  has_internship_experience?: boolean | null
  graduation_year?: number | null
  status?: string | null
}

/* ──────────────── ページ本体 ──────────────── */
export default function ScoutPage() {
  const router = useRouter()
  const { toast } = useToast()

  /* ── state ───────────────────────────── */
  const [loading, setLoading] = useState(true)

  const [companyId, setCompanyId] = useState<string | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [sentScouts, setSentScouts] = useState<ScoutRow[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [drawerOpen, setDrawerOpen]         = useState(false)

  const [search, setSearch] = useState("")

  /* ── フィルタ state ───────────────────── */
  const [gradYears, setGradYears]         = useState<number[]>([])
  const [statuses, setStatuses]           = useState<string[]>([])
  const [selectedMajor, setSelectedMajor] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [hasInternship, setHasInternship] = useState<boolean>(false)
  const [skills, setSkills]               = useState<string[]>([])
  const [qualificationsFilter, setQualificationsFilter] = useState<string[]>([])

  /* ── 初期ロード ───────────────────────── */
  useEffect(() => {
    const init = async () => {
      setLoading(true)

      /* 認証 */
      const { data: { session }, error: authErr } = await sb.auth.getSession()
      if (authErr || !session) {
        router.push("/auth/signin")
        return
      }

      /* 会社 ID */
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

      /* 学生一覧 */
      // 🔽 page.tsx の学生取得クエリをこれに置き換え
      const { data: stuRows, error: stuErr } = await sb
        .from("student_profiles")
        // ← 外部キー名を明示しつつ !left で LEFT JOIN
        .select("*, resumes!resumes_user_id_profile_fkey!left(work_experiences)")
      console.log("stuErr =", stuErr)     // ★追加
      console.log("stuRows =", stuRows)

      if (stuErr) {
        toast({ title: "学生取得エラー", description: stuErr.message, variant: "destructive" })
      } else {
        const now = Date.now()
        // 重複する id の学生は、resumes を持っている方を優先して deduplicate
        const mergedById: Map<string, Student> = new Map()
        for (const row of (stuRows ?? []) as any as Student[]) {
          const normalized: Student = {
            ...row,
            match_score: 0,
            last_active: row.created_at
              ? `${Math.round((now - new Date(row.created_at).getTime()) / 60000)}分前`
              : "",
          }
          // grad_year という列名で来るケースを補完
          if (
            normalized.graduation_year == null &&
            (row as any).grad_year != null
          ) {
            normalized.graduation_year = (row as any).grad_year
          }
          const existed = mergedById.get(normalized.id)
          // 既に同じ id があれば、resumes を持っている方を優先（常に履歴を持つ行を優先）
          if (!existed) {
            mergedById.set(normalized.id, normalized)
          } else {
            const pick =
              Array.isArray(normalized.resumes) && normalized.resumes.length
                ? normalized
                : existed
            mergedById.set(normalized.id, pick)
          }
        }
        setStudents(Array.from(mergedById.values()))
      }

      /* スカウト履歴 */
      const { data: scoutRows } = await sb
        .from("scouts")
        .select("*")
        .eq("company_id", comp.id)
        .order("created_at", { ascending: false })
      setSentScouts(scoutRows ?? [])

      /* テンプレート */
      const { data: tplRows } = await sb
        .from("scout_templates")
        .select("*")
        .eq("company_id", comp.id)
        .order("created_at")
      setTemplates(tplRows ?? [])

      setLoading(false)
    }
    init()
  }, [router, toast])

  /* ── フィルタリング ───────────── */
  const filtered = useMemo(() => {
    let list = students

    /* 0) フリーワード */
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((s) =>
        [s.full_name, s.university, s.major]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    }

    /* 1) 卒業年 */
    if (gradYears.length) {
      list = list.filter((s) =>
        gradYears.includes(s.graduation_year ?? 0),
      )
    }

    /* 2) ステータス（送信済み vs 未スカウト） */
    if (statuses.length) {
      list = list.filter((s) => {
        const sent = sentScouts.some((sc) => sc.student_id === s.id)
        return (
          (sent && statuses.includes("送信済み")) ||
          (!sent && statuses.includes("未スカウト"))
        )
      })
    }

    /* 3) 専攻 */
    if (selectedMajor !== "all") {
      list = list.filter((s) => (s.major ?? "") === selectedMajor)
    }

    /* 4) 地域 */
    if (selectedLocation !== "all") {
      list = list.filter((s) => (s.location ?? "") === selectedLocation)
    }

    /* 5) インターン経験 */
    if (hasInternship) {
      list = list.filter((s) => s.has_internship_experience)
    }

    /* 6) スキル */
    if (skills.length) {
      list = list.filter((s) =>
        skills.every((sk) => (s.skills ?? []).includes(sk)),
      )
    }

    /* 7) 資格 */
    if (qualificationsFilter.length) {
      list = list.filter((s) =>
        qualificationsFilter.every((q) =>
          (s.qualifications ?? []).includes(q),
        ),
      )
    }

    return list
  }, [
    students,
    sentScouts,
    search,
    gradYears,
    statuses,
    selectedMajor,
    selectedLocation,
    hasInternship,
    skills,
    qualificationsFilter,
  ])

  /* ── 送信処理（Drawer 経由） ───────────── */
  const handleSent = useCallback(
    (row: ScoutRow) => setSentScouts((prev) => [row, ...prev]),
    [],
  )

  /** 学生カードクリック時 */
  const handleSelect = useCallback((stu: Student) => {
    setSelectedStudent(stu)
    setDrawerOpen(true)
  }, [])

  /* ── UI ─────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">Loading...</div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <header className="shrink-0 border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">スカウト管理</h1>
      </header>

      <Tabs defaultValue="candidates" className="flex-1 overflow-hidden">
        <TabsList>
          <TabsTrigger value="candidates">候補学生</TabsTrigger>
          <TabsTrigger value="sent">送信済みスカウト</TabsTrigger>
        </TabsList>

        {/* ───────── 候補学生タブ ───────── */}
        <TabsContent
          value="candidates"
          className="h-[calc(100%-40px)] overflow-hidden"
        >
          <div className="flex h-full overflow-hidden">
            {/* ── Sidebar ───────────────────────────── */}
            <aside className="w-80 shrink-0 border-r px-6 py-4 space-y-6 overflow-y-auto">
              {/* フリーワード検索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="学生を検索..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* 卒業年 */}
              <div>
                <h4 className="font-semibold mb-2">卒業年</h4>
                {[2025, 2026, 2027, 2028].map((yr) => (
                  <div key={yr} className="flex items-center space-x-2 mb-1">
                    <Checkbox
                      id={`yr-${yr}`}
                      checked={gradYears.includes(yr)}
                      onCheckedChange={(v) =>
                        setGradYears((prev) =>
                          v ? [...prev, yr] : prev.filter((y) => y !== yr),
                        )
                      }
                    />
                    <label htmlFor={`yr-${yr}`} className="text-sm">
                      {yr}卒
                    </label>
                  </div>
                ))}
              </div>

              {/* 専攻 */}
              <div>
                <h4 className="font-semibold mb-2">専攻</h4>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={selectedMajor}
                  onChange={(e) => setSelectedMajor(e.target.value)}
                >
                  <option value="all">全て</option>
                  {[...new Set(
                    students
                      .map((s) => s.major)
                      .filter((m): m is string => m != null),
                  )].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* 地域 */}
              <div>
                <h4 className="font-semibold mb-2">地域</h4>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="all">全て</option>
                  {[...new Set(
                    students
                      .map((s) => s.location)
                      .filter((l): l is string => l != null),
                  )].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* インターン経験 */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="intern"
                  checked={hasInternship}
                  onCheckedChange={(v) => setHasInternship(!!v)}
                />
                <label htmlFor="intern" className="text-sm">
                  インターン経験あり
                </label>
              </div>

              {/* ステータス */}
              <div>
                <h4 className="font-semibold mb-2">ステータス</h4>
                {["未スカウト", "送信済み"].map((st) => (
                  <div key={st} className="flex items-center space-x-2 mb-1">
                    <Checkbox
                      id={`st-${st}`}
                      checked={statuses.includes(st)}
                      onCheckedChange={(v) =>
                        setStatuses((prev) =>
                          v ? [...prev, st] : prev.filter((s) => s !== st),
                        )
                      }
                    />
                    <label htmlFor={`st-${st}`} className="text-sm">{st}</label>
                  </div>
                ))}
              </div>

              {/* スキル */}
              <h4 className="font-semibold mb-2">スキル</h4>
              <SkillPicker
                value={skills}
                onChange={setSkills}
              />

              {/* 資格 */}
              <div>
                <h4 className="font-semibold mb-2">資格</h4>
                <QualificationPicker
                  values={qualificationsFilter}
                  onChange={setQualificationsFilter}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearch("")
                  setGradYears([])
                  setStatuses([])
                  setSelectedMajor("all")
                  setSelectedLocation("all")
                  setHasInternship(false)
                  setSkills([])
                  setQualificationsFilter([])
                }}
              >
                リセット
              </Button>
            </aside>

            {/* ── 学生リスト ─────────────────── */}
            <div className="flex-1 overflow-hidden">
              <StudentList
                students={filtered}
                selectedId={selectedStudent?.id ?? null}
                onSelect={handleSelect}
              />
            </div>
          </div>
        </TabsContent>

        {/* ───────── 送信済みタブ ───────── */}
        <TabsContent value="sent" className="p-6 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>送信済みスカウト</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">学生</th>
                    <th className="py-2">メッセージ</th>
                    <th className="py-2">送信日時</th>
                    <th className="py-2">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {sentScouts.map((row) => {
                    const stu = students.find((s) => s.id === row.student_id)
                    return (
                      <tr key={row.id} className="border-b">
                        <td className="py-2">{stu?.full_name ?? "―"}</td>
                        <td className="py-2 line-clamp-1">{row.message}</td>
                        <td className="py-2">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString("ja-JP")
                            : ""}
                        </td>
                        <td className="py-2">
                          <Badge variant="outline">{row.status}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                  {sentScouts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        まだスカウトを送信していません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ───────── Drawer : スカウト送信 ───────── */}
      <ScoutDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        student={selectedStudent}
        templates={templates}
        companyId={companyId ?? ""}
        /* 送信完了後 callback */
        onSent={handleSent}
      />
    </div>
  )
}