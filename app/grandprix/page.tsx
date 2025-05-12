"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Trophy, Users, Gift } from "lucide-react"

import { GrandprixBanner } from "@/components/grandprix-banner"
import { GrandPrixLeaderboard } from "@/components/grandprix-leaderboard"  // ← 修正済み
import { Button } from "@/components/ui/button"

/**
 * /grandprix  (トップページ)
 * - 種目カード（Webテスト / ビジネス診断 / ケース診断）
 * - 月間チャレンジ導線
 * - リーダーボード
 */
export default function GrandPrixPage() {
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
      <h1 className="mb-6 text-3xl font-bold text-gray-900">就活グランプリ 2025</h1>
      <div className="mb-8">
        <GrandprixBanner />
      </div>

      {/* 種目カード */}
      <div className="grid gap-8 md:grid-cols-3">
        {/* ① ビジネス診断 */}
        <CardLink
          href="/grandprix/business"
          gradient="from-purple-50 to-indigo-50"
          iconBg="bg-purple-100"
          icon={<Trophy className="h-6 w-6 text-purple-600" />}
          title="ビジネス戦闘力診断"
          desc="あなたのビジネススキルを診断し、強みと弱みを可視化します。企業からのスカウト獲得にも有利です。"
          btnClass="bg-purple-600 hover:bg-purple-700"
        />

        {/* ② Webテスト */}
        <CardLink
          href="/grandprix/webtest"
          gradient="from-emerald-50 to-teal-50"
          iconBg="bg-emerald-100"
          icon={<Users className="h-6 w-6 text-emerald-600" />}
          title="Webテストグランプリ"
          desc="SPI・玉手箱・TG-Webなど主要Webテスト対策ができます。実践的な問題で本番に備えましょう。"
          btnClass="bg-emerald-600 hover:bg-emerald-700"
        />

        {/* ③ ケース診断 */}
        <CardLink
          href="/grandprix/case"
          gradient="from-amber-50 to-orange-50"
          iconBg="bg-amber-100"
          icon={<Gift className="h-6 w-6 text-amber-600" />}
          title="ケーススタディグランプリ"
          desc="実際の企業課題に挑戦し、あなたの問題解決力をアピール。優秀者は最終選考免除の特典も。"
          btnClass="bg-amber-600 hover:bg-amber-700"
        />
      </div>

      {/* リーダーボード */}
      <section id="leaderboard" className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">リーダーボード</h2>
        <GrandPrixLeaderboard />
      </section>

      {/* 月間チャレンジ */}
      <section id="monthly-challenge" className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">今月のチャレンジ</h2>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <Link href="/grandprix/monthly-challenge">
            <Button className="bg-red-600 hover:bg-red-700">月間チャレンジを見る</Button>
          </Link>
        </div>
      </section>
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
}
function CardLink({
  href,
  gradient,
  iconBg,
  icon,
  title,
  desc,
  btnClass,
}: CardLinkProps) {
  return (
    <div
      className={`rounded-lg border bg-gradient-to-br ${gradient} p-6 shadow-sm transition-all hover:shadow-md`}
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-900">{title}</h3>
      <p className="mb-4 text-gray-600">{desc}</p>
      <Link href={href}>
        <Button className={`w-full ${btnClass}`}>参加する</Button>
      </Link>
    </div>
  )
}
