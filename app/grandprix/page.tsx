"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { GrandprixBanner } from "@/components/grandprix-banner"
import { GrandPrixLeaderboard } from "@/components/GrandPrixLeaderboard"   // ← 修正ここ
import { Button } from "@/components/ui/button"
import { Trophy, Users, Gift } from "lucide-react"
import Link from "next/link"

export default function GrandPrixPage() {
  const router = useRouter()

  useEffect(() => {
    // URLのハッシュフラグメントを取得
    const hash = window.location.hash.substring(1)

    // ハッシュが存在し、特定のセクションへのスクロールが必要な場合
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">就活グランプリ 2025</h1>

      <div className="mb-8">
        <GrandprixBanner />
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <Trophy className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">ビジネス戦闘力診断</h3>
          <p className="mb-4 text-gray-600">
            あなたのビジネススキルを診断し、強みと弱みを可視化します。企業からのスカウト獲得にも有利です。
          </p>
          <Link href="/grandprix/business">
            <Button className="w-full bg-purple-600 hover:bg-purple-700">参加する</Button>
          </Link>
        </div>

        <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">Webテストグランプリ</h3>
          <p className="mb-4 text-gray-600">
            SPI・玉手箱・TG-Webなど主要Webテスト対策ができます。実践的な問題で本番に備えましょう。
          </p>
          <Link href="/grandprix/webtest">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">参加する</Button>
          </Link>
        </div>

        <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm transition-all hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Gift className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">ケーススタディグランプリ</h3>
          <p className="mb-4 text-gray-600">
            実際の企業課題に挑戦し、あなたの問題解決力をアピール。優秀者は最終選考免除の特典も。
          </p>
          <Link href="/grandprix/case">
            <Button className="w-full bg-amber-600 hover:bg-amber-700">参加する</Button>
          </Link>
        </div>
      </div>

      <div id="leaderboard" className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">リーダーボード</h2>
        <GrandPrixLeaderboard />
      </div>

      <div id="monthly-challenge" className="mt-12">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">今月のチャレンジ</h2>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <Link href="/grandprix/monthly-challenge">
            <Button className="bg-red-600 hover:bg-red-700">月間チャレンジを見る</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
