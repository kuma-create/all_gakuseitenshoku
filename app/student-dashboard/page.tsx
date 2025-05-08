/* ──────────────────────────────────────────────────────────
   app/student-dashboard/page.tsx          – Supabase 連携版
───────────────────────────────────────────────────────── */
"use client"

import { useEffect, useState } from "react"
import Link  from "next/link"
import { LazyImage } from "@/components/ui/lazy-image"

import { supabase }   from "@/lib/supabase/client"
import { useAuth }    from "@/lib/auth-context"
import { useAuthGuard } from "@/lib/use-auth-guard"

import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Badge }   from "@/components/ui/badge"
import { Button }  from "@/components/ui/button"

import {
  Briefcase,
  Mail,
  MessageSquare,
  Trophy,
  FileText,
  Calendar,
  Bell,
  ChevronRight,
  Edit,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

/* ------------------------------ 型 ------------------------------ */
type Stats = {
  scouts       : number
  applications : number
  chatRooms    : number
}

/* ---------------------------- 画面 ---------------------------- */
export default function StudentDashboard() {
  /* 認証ガード（student ロール必須） */
  const ready     = useAuthGuard("student")
  const { user }  = useAuth()

  /* ダッシュボード数値 */
  const [stats, setStats]       = useState<Stats>({ scouts: 0, applications: 0, chatRooms: 0 })
  const [loadingStats, setLoad] = useState(true)

  /* Supabase から件数取得 */
  useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      setLoad(true)
      const studentId = user.id

      const [{ count: scoutsCnt },  { count: appsCnt }, { count: roomsCnt }] = await Promise.all([
        supabase.from("scouts")
          .select("id", { count: "exact", head: true })
          .eq("student_id", studentId),

        supabase.from("applications")
          .select("id", { count: "exact", head: true })
          .eq("student_id", studentId),

        supabase.from("chat_rooms")
          .select("id", { count: "exact", head: true })
          .eq("student_id", studentId),
      ])

      setStats({
        scouts      : scoutsCnt ?? 0,
        applications: appsCnt  ?? 0,
        chatRooms   : roomsCnt ?? 0,
      })
      setLoad(false)
    })()
  }, [user])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          <p>認証確認中…</p>
        </div>
      </div>
    )
  }

  /* プロフィール完成度（暫定ダミー） */
  const profileSections = [
    { name: "基本情報", completed: true },
    { name: "学歴",     completed: true },
    { name: "スキル",   completed: true },
    { name: "職務経歴", completed: false },
    { name: "自己PR",   completed: false },
  ]
  const completed = profileSections.filter(s => s.completed).length
  const percent   = Math.round((completed / profileSections.length) * 100)

  /* ---------------------------- JSX ---------------------------- */
  return (
    <main className="container mx-auto px-4 py-8">
      {/* ───── Hero ───── */}
      <section className="mb-8 rounded-xl bg-gradient-to-r from-red-50 to-white p-6 shadow-sm">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              こんにちは、{user?.name ?? "学生"} さん！
            </h1>
            <p className="mt-1 text-gray-600">今日も就活を頑張りましょう。</p>
          </div>

          <Button asChild variant="outline" className="flex items-center gap-1 self-start">
            <Link href="/student/profile">
              <Edit className="mr-1 h-4 w-4" />
              プロフィールを編集
            </Link>
          </Button>
        </header>

        {/* プロフィール完成度バー */}
        <div className="mt-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">プロフィール完成度</span>
              <Badge
                variant={percent === 100 ? "default" : "outline"}
                className={percent === 100 ? "bg-green-600" : "bg-gray-200 text-gray-600"}
              >
                {percent}%
              </Badge>
            </div>
          </div>

          <div className="h-2 w-full overflow-hidden rounded bg-gray-100">
            <div
              className="h-full rounded bg-red-600 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </section>

      {/* ───── カード 3 枚 ───── */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* スカウト */}
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-50 to-white pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-red-600" />
              スカウト状況
            </CardTitle>
            <CardDescription>企業からのオファー</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingStats ? (
              <p>読み込み中…</p>
            ) : (
              <div className="flex items-center justify-between">
                <Stat label="累計" value={stats.scouts} badge />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <LinkButton href="/offers">確認する</LinkButton>
          </CardFooter>
        </Card>

        {/* 応募履歴 */}
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-50 to-white pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-red-600" />
              応募履歴
            </CardTitle>
            <CardDescription>エントリーした求人</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingStats ? (
              <p>読み込み中…</p>
            ) : (
              <div className="flex items-center justify-between">
                <Stat label="累計" value={stats.applications} badge />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <LinkButton href="/applications">確認する</LinkButton>
          </CardFooter>
        </Card>

        {/* チャット */}
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-50 to-white pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-red-600" />
              チャット
            </CardTitle>
            <CardDescription>企業とのやり取り</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingStats ? (
              <p>読み込み中…</p>
            ) : (
              <div className="flex items-center justify-between">
                <Stat label="トークルーム" value={stats.chatRooms} badge />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <LinkButton href="/chat">確認する</LinkButton>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

/* ---------------------- 便利な小物コンポーネント ---------------------- */
function Stat({ label, value, badge = false }: { label: string; value: number; badge?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      {badge ? (
        <Badge className="min-w-[48px] justify-center bg-red-600 text-base font-bold">
          {value}
        </Badge>
      ) : (
        <p className="text-xl font-bold">{value}</p>
      )}
    </div>
  )
}

/** 右矢印付きリンクボタン */
function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="default" className="bg-red-600 hover:bg-red-700">
      <Link href={href} className="flex items-center">
        {children}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Link>
    </Button>
  )
}
