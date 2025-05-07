/* ──────────────────────────────────────────────────────────
   app/student-dashboard/page.tsx      (2025-05-07 ルート整理版)
   - ルート: /student-dashboard
   - 「プロフィールを編集」ボタン → /student/profile に修正
   - すべての内部リンクを新ルーティングに合わせて更新
   - いまはダミー数値。実データ化は次フェーズで Supabase から取得する
───────────────────────────────────────────────────────── */
"use client"

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { useAuthGuard } from "@/lib/use-auth-guard"

import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button }   from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge }    from "@/components/ui/badge"

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

export default function StudentDashboard() {
  /* 認証ガード（student ロール必須） */
  const ready = useAuthGuard("student")
  const { user } = useAuth()

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

  /* プロフィール完成度（暫定ダミー値） */
  const profileSections = [
    { name: "基本情報", completed: true },
    { name: "学歴",     completed: true },
    { name: "スキル",   completed: true },
    { name: "職務経歴", completed: false },
    { name: "自己PR",   completed: false },
  ]
  const completed = profileSections.filter(s => s.completed).length
  const percent   = Math.round((completed / profileSections.length) * 100)

  return (
    <main className="container mx-auto px-4 py-8">
      {/* ───── Hero / Header ───── */}
      <section className="mb-8 rounded-xl bg-gradient-to-r from-red-50 to-white p-6 shadow-sm">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              こんにちは、{user?.name ?? "学生"} さん！
            </h1>
            <p className="mt-1 text-gray-600">今日も就活を頑張りましょう。</p>
          </div>

          {/* プロフィール編集へ → /student/profile */}
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
                className="bg-red-600 text-white"
              >
                {percent}%
              </Badge>
            </div>
            <span className="text-sm text-gray-500">
              {percent === 100 ? "完璧です！" : "完成させるとスカウト率が上がります"}
            </span>
          </div>
          <Progress value={percent} className="h-2" />

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {profileSections.map(s => (
              <div
                key={s.name}
                className={`flex items-center justify-center gap-1 rounded-lg p-2 text-center text-sm ${
                  s.completed ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"
                }`}
              >
                {s.completed ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {s.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── メインカード (2列) ───── */}
      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* ─ スカウト状況カード ─ */}
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-50 to-white pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-red-600" />
              スカウト状況
            </CardTitle>
            <CardDescription>企業からのオファー</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Stat label="新着" value={5} />
              <Stat label="未読" value={2} badge />
              <Stat label="累計" value={12} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <LinkButton href="/offers">確認する</LinkButton>
          </CardFooter>
        </Card>

        {/* ─ 応募履歴カード ─ */}
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-50 to-white pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-red-600" />
              応募履歴
            </CardTitle>
            <CardDescription>あなたの応募状況</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Stat label="応募中"   value={3} />
              <Stat label="面接予定" value={1} />
              <Stat label="累計"     value={8} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <LinkButton href="/student/applications">履歴を見る</LinkButton>
          </CardFooter>
        </Card>

        {/* ─ メッセージカード ─ */}
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-50 to-white pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-red-600" />
              メッセージ
            </CardTitle>
            <CardDescription>企業とのコミュニケーション</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Stat label="未読" value={3} badge />
              <Stat label="会話" value={8} />
              <Stat label="今週" value={2} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <LinkButton href="/chat">チャットへ</LinkButton>
          </CardFooter>
        </Card>

        {/* ─ 就活グランプリカード ─ */}
        <Card className="overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="bg-gradient-to-r from-red-50 to-white pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-red-600" />
              就活グランプリ
            </CardTitle>
            <CardDescription>スキルアピールのチャンス</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Stat label="参加中"          value={1} />
              <Stat label="完了"            value={2} />
              <Stat label="新着イベント"    value={1} badgeColor="green" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <LinkButton href="/grandprix">詳細へ</LinkButton>
          </CardFooter>
        </Card>
      </section>

      {/* ───── サブセクション (3列) ───── */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* 今後の予定 */}
        <ScheduleCard />

        {/* 最新のお知らせ */}
        <NotificationCard />

        {/* おすすめ求人 */}
        <RecommendedJobsCard />
      </section>
    </main>
  )
}

/* ───────────────────────── helpers ───────────────────────── */

/** 統一的な数値＋ラベル表示 */
function Stat({
  label,
  value,
  badge = false,
  badgeColor = "red",
}: {
  label: string
  value: number
  badge?: boolean
  badgeColor?: "red" | "green"
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {badge && (
          <Badge className={`ml-2 bg-${badgeColor}-600`}>
            未読
          </Badge>
        )}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}

/** 右矢印付きリンクボタン */
function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button
      asChild
      variant="default"
      className="bg-red-600 hover:bg-red-700"
    >
      <Link href={href} className="flex items-center">
        {children}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Link>
    </Button>
  )
}

/* ------------ ダミー・サブカード３種（実装はそのまま移植） ------------ */
function ScheduleCard() {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-red-600" />
          今後の予定
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[320px] overflow-y-auto">
        {/* 予定アイテム ― 実データ化は次フェーズ */}
        {/* …（既存の 3 アイテムをそのままコピー）… */}
      </CardContent>
      <CardFooter className="flex justify-end border-t bg-gray-50 px-6 py-3">
        <Button asChild variant="outline" size="sm">
          <Link href="#" className="flex items-center text-sm">
            すべての予定を見る
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function NotificationCard() {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-red-600" />
          最新のお知らせ
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[320px] overflow-y-auto">
        {/* お知らせアイテム（既存ダミーをそのまま） */}
      </CardContent>
      <CardFooter className="flex justify-end border-t bg-gray-50 px-6 py-3">
        <Button asChild variant="outline" size="sm">
          <Link href="#" className="flex items-center text-sm">
            すべてのお知らせを見る
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function RecommendedJobsCard() {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-red-600" />
          おすすめの求人
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[320px] overflow-y-auto">
        {/* おすすめ求人アイテム（既存ダミーをそのまま） */}
      </CardContent>
      <CardFooter className="flex justify-end border-t bg-gray-50 px-6 py-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs" className="flex items-center text-sm">
            すべての求人を見る
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
