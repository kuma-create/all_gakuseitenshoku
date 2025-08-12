"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Trophy, Users, Gift, CheckCircle, BarChart3, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

function slugifyId(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9faf\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * /ipo/case  (トップページ)
 * - 学習カード（ケース対策 / Webテスト / 面談対策集 / 月間チャレンジ）
 * - 旧 grandprix から case に名称変更
 */
export default function CaseHomePage() {
  /* ― スクロールで #leaderboard などに飛ぶユーティリティ ― */
  useEffect(() => {
    const hash = window.location.hash.substring(1)
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* タイトル & バナー */}
      <header className="mb-6 md:mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-sky-600">IPO</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">ケース対策ハブ</h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">ケース・Webテスト・面談対策をひとつの場所で。今の目的に合うメニューから始めましょう。</p>
      </header>

      {/* 概要タブ：進捗・統計（ダミー値） */}
      {/* サマリーカード群 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">—</div>
            <div className="text-sm text-gray-600">解答済み問題</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">—</div>
            <div className="text-sm text-gray-600">平均スコア</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">—%</div>
            <div className="text-sm text-gray-600">完了率</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">—</div>
            <div className="text-sm text-gray-600">総学習時間</div>
          </CardContent>
        </Card>
      </div>

      {/* 進捗バー（カテゴリ別／ダミー値） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <h3 className="font-bold text-gray-900">Webテスト進捗</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>言語理解</span>
              <span>—</span>
            </div>
            <Progress value={0} className="h-2" />
            <div className="flex justify-between text-sm">
              <span>数的処理</span>
              <span>—</span>
            </div>
            <Progress value={0} className="h-2" />
            <div className="flex justify-between text-sm">
              <span>論理推理</span>
              <span>—</span>
            </div>
            <Progress value={0} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-bold text-gray-900">ケース問題進捗</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>戦略系</span>
              <span>—</span>
            </div>
            <Progress value={0} className="h-2" />
            <div className="flex justify-between text-sm">
              <span>市場分析</span>
              <span>—</span>
            </div>
            <Progress value={0} className="h-2" />
            <div className="flex justify-between text-sm">
              <span>ビジネスモデル</span>
              <span>—</span>
            </div>
            <Progress value={0} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Users className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-2">Webテストを解く</h3>
            <p className="text-sm text-gray-600 mb-4">言語・数的・論理問題に挑戦</p>
            <Button asChild className="w-full">
              <Link href="/ipo/case/webtest">開始</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Trophy className="w-12 h-12 text-sky-600 mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-2">ケース問題を解く</h3>
            <p className="text-sm text-gray-600 mb-4">論理的思考力を鍛える</p>
            <Button asChild className="w-full">
              <Link href="/ipo/case/case">挑戦</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardContent className="p-6 text-center">
            <Gift className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-2">先行対策</h3>
            <p className="text-sm text-gray-600 mb-4">近日公開予定（Coming Soon）</p>
            <Button disabled className="w-full">準備中</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ───────── 小コンポーネント ───────── */
interface CardLinkProps {
  href: string
  gradient: string
  iconBg: string
  icon: React.ReactNode
  title: string
  desc: string
  btnClass: string
  disabled?: boolean
}

function CardLink({ href, gradient, iconBg, icon, title, desc, btnClass, disabled = false }: CardLinkProps) {
  const safeId = slugifyId(title)
  const titleId = `${safeId}-title`
  const descId = `${safeId}-desc`

  const baseClasses =
    `group relative block rounded-xl border bg-gradient-to-br ${gradient} p-6 shadow-sm outline-none transition-transform duration-200 ease-out focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2`
  const interactiveClasses = disabled
    ? "opacity-75 pointer-events-none"
    : "hover:-translate-y-0.5 hover:shadow-lg"

  return (
    <Link
      href={href}
      prefetch={false}
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={`${baseClasses} ${interactiveClasses}`}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
      role="link"
    >
      {/* 内容ラッパー */}
      <div className="flex h-full min-h-[220px] flex-col">
        {/* 右上バッジ（Coming Soonなど） */}
        {disabled && (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-gray-900/80 px-2.5 py-0.5 text-xs font-medium text-white">
            Coming Soon
          </span>
        )}
        {/* アイコン */}
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>
          <span className="transition-transform duration-200 motion-safe:group-hover:scale-105">{icon}</span>
        </div>
        {/* タイトル/説明 */}
        <h3 id={titleId} className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
        <p id={descId} className="mb-4 text-gray-600">{desc}</p>
        {/* ボタン風の表示（リンクの一部として実装） */}
        <span
          className={`mt-auto inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white ${btnClass} ${disabled ? "bg-gray-400" : ""}`}
        >
          {disabled ? "準備中" : "参加する"}
        </span>
      </div>
    </Link>
  )
}
