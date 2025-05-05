"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, ChevronRight, MessageSquare, Search, Trophy } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function LandingPage() {
  const router = useRouter()
  const { isLoggedIn, userType } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  // 認証状態の確認とリダイレクト処理
  useEffect(() => {
    // 認証状態が確定したらフラグを立てる
    if (isLoggedIn !== undefined) {
      console.log("Auth state determined:", { isLoggedIn, userType })
      setIsAuthChecked(true)
      setIsLoading(false)

      // 認証済みの場合のみリダイレクト
      if (isLoggedIn === true) {
        console.log("User is logged in, redirecting to dashboard")
        if (userType === "student") {
          router.push("/student-dashboard")
        } else if (userType === "company") {
          router.push("/company-dashboard")
        }
      }
    }
  }, [isLoggedIn, userType, router])

  // ローディング表示
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  // 認証済みの場合は何も表示しない（リダイレクト中）
  if (isLoggedIn === true) {
    return null
  }

  // 未認証またはチェック済みの場合はランディングページを表示
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-16 md:py-24 lg:py-32">
        <div className="absolute inset-0 z-0 opacity-5">
          <Image src="/abstract-geometric-flow.png" alt="Background pattern" fill className="object-cover" priority />
        </div>
        <div className="container relative z-10 px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div className="flex flex-col justify-center space-y-8">
              <div>
                <Badge className="mb-4 bg-red-100 text-red-600 hover:bg-red-200">逆求人型就活サービス</Badge>
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  職務経歴書で<span className="text-red-600">スカウト</span>される、新しい就活のカタチ
                </h1>
                <p className="mt-6 text-lg text-gray-600 md:text-xl">
                  OfferBoxのような逆求人型で、あなたらしいキャリアを切り拓こう。
                  企業からスカウトが届く、新しい就活プラットフォーム。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-red-600 px-8 hover:bg-red-700" asChild>
                  <Link href="/signup">
                    はじめてみる
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" asChild>
                  <Link href="/signup?type=company">
                    企業の方はこちら
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>登録は1分で完了</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>完全無料</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>いつでも退会可能</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 opacity-30 blur-xl"></div>
              <div className="relative overflow-hidden rounded-xl bg-white shadow-2xl">
                <Image
                  src="/placeholder.svg?key=c0m2h"
                  alt="学生転職ダッシュボード"
                  width={600}
                  height={400}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-gray-50 py-10">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600 md:text-4xl">1,200+</p>
              <p className="text-sm text-gray-600 md:text-base">登録企業</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600 md:text-4xl">25,000+</p>
              <p className="text-sm text-gray-600 md:text-base">学生ユーザー</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600 md:text-4xl">85%</p>
              <p className="text-sm text-gray-600 md:text-base">内定率</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600 md:text-4xl">3,500+</p>
              <p className="text-sm text-gray-600 md:text-base">月間スカウト数</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge className="mb-4 bg-red-100 text-red-600 hover:bg-red-200">機能・メリット</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              あなたの就活を<span className="text-red-600">もっと効率的に</span>
            </h2>
            <p className="mt-4 text-gray-600">
              学生転職は、従来の就活の常識を覆す新しいプラットフォーム。
              あなたの強みを最大限に活かし、理想の企業とマッチングします。
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-600"></div>
              <CardHeader className="pb-2">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Search className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">スカウト型で効率的なマッチング</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  あなたのプロフィールを見た企業から直接オファーが届きます。
                  自分に興味を持った企業とだけ話を進められるので、効率的に就活ができます。
                </p>
              </CardContent>
              <CardFooter>
                <Link href="#" className="inline-flex items-center text-sm font-medium text-red-600 hover:underline">
                  詳しく見る
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-600"></div>
              <CardHeader className="pb-2">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">職務経歴書で自分らしさをPR</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  あなたの経験やスキルを職務経歴書として整理。
                  自己分析をサポートし、企業に自分の強みを効果的にアピールできます。
                </p>
              </CardContent>
              <CardFooter>
                <Link href="#" className="inline-flex items-center text-sm font-medium text-red-600 hover:underline">
                  詳しく見る
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-600"></div>
              <CardHeader className="pb-2">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Trophy className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">就活グランプリでチャンス拡大</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  ビジネススキルを可視化するオンラインコンテスト。
                  自分の強みと弱みを客観的に把握でき、企業からの注目度もアップします。
                </p>
              </CardContent>
              <CardFooter>
                <Link href="#" className="inline-flex items-center text-sm font-medium text-red-600 hover:underline">
                  詳しく見る
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* 残りのセクションは省略 */}
    </div>
  )
}
