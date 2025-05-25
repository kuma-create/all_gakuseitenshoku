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

/* ──────────────── 型定義 ──────────────── */
type StudentRow = Database["public"]["Tables"]["student_profiles"]["Row"]
type ScoutRow   = Database["public"]["Tables"]["scouts"]["Row"]
type TemplateRow = Database["public"]["Tables"]["scout_templates"]["Row"]

interface Student extends StudentRow {
  match_score?: number        // 後で算出
  last_active?: string        // “◯分前”
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
      const { data: stuRows, error: stuErr } = await sb
        .from("student_profiles")
        .select("*")

      if (stuErr) {
        toast({ title: "学生取得エラー", description: stuErr.message, variant: "destructive" })
      } else {
        const now = Date.now()
        const list: Student[] = (stuRows ?? []).map((s) => ({
          ...s,
          match_score: 0,
          last_active: s.created_at
            ? `${Math.round((now - new Date(s.created_at).getTime()) / 60000)}分前`
            : "",
        }))
        setStudents(list)
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

  /* ── フィルタリング（検索のみ今回は実装） ───────────── */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return students

    let list = students.filter((s) =>
      [s.full_name, s.university, s.major]
        .join(" ")
        .toLowerCase()
        .includes(term)
    )

    /* 卒業年フィルタ */
    if (gradYears.length) {
      list = list.filter((s) => gradYears.includes(s.graduation_year ?? 0))
    }

    /* ステータスフィルタ */
    if (statuses.length) {
      list = list.filter((s) => statuses.includes(s.status ?? ""))
    }

    /* major */
    if (selectedMajor !== "all") {
      list = list.filter((s) => (s.major ?? "") === selectedMajor)
    }

    /* location */
    if (selectedLocation !== "all") {
      list = list.filter((s) => (s.location ?? "") === selectedLocation)
    }

    /* internship */
    if (hasInternship) {
      list = list.filter((s) => s.has_internship_experience)
    }

    /* skills */
    if (skills.length) {
      list = list.filter((s) =>
        skills.every((sk) => (s.skills ?? []).includes(sk)),
      )
    }

    return list
  }, [students, search, gradYears, statuses, selectedMajor, selectedLocation, hasInternship, skills])

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
            <aside className="w-72 shrink-0 border-r p-4 space-y-6 overflow-y-auto">
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
              <div>
                <h4 className="font-semibold mb-2">スキル</h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {skills.map((sk) => (
                    <span
                      key={sk}
                      className="text-xs flex items-center bg-gray-200 px-2 py-1 rounded"
                    >
                      {sk}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer"
                        onClick={() =>
                          setSkills((prev) => prev.filter((s) => s !== sk))
                        }
                      />
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Enterで追加"
                  className="w-full border rounded px-2 py-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      const val = e.currentTarget.value.trim()
                      setSkills((prev) =>
                        prev.includes(val) ? prev : [...prev, val],
                      )
                      e.currentTarget.value = ""
                    }
                  }}
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