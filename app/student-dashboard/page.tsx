"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export default function StudentDashboard() {
  const router = useRouter()
  const { isLoggedIn, userType, user } = useAuth()

  // 認証チェック - 学生ユーザーでない場合はリダイレクト
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== "undefined") {
      if (!isLoggedIn) {
        console.log("Not logged in, redirecting to login")
        router.push("/login")
      } else if (userType !== "student") {
        console.log("Not a student, redirecting to company dashboard")
        router.push("/company-dashboard")
      } else {
        console.log("Student authenticated successfully")
      }
    }
  }, [isLoggedIn, userType, router])

  // ローディング状態を追加
  const [isLoading, setIsLoading] = useState(true)

  // 認証状態が確定したらローディングを解除
  useEffect(() => {
    if (isLoggedIn !== null) {
      setIsLoading(false)
    }
  }, [isLoggedIn])

  // ローディング中または認証チェック中は読み込み表示
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

  // 認証されていない場合は何も表示しない
  if (!isLoggedIn || userType !== "student") {
    return null
  }

  // プロフィール完成度の計算（モックデータ）
  const profileSections = [
    { name: "基本情報", completed: true },
    { name: "学歴", completed: true },
    { name: "スキル", completed: true },
    { name: "職務経歴", completed: false },
    { name: "自己PR", completed: false },
  ]

  const completedSections = profileSections.filter((section) => section.completed).length
  const profileCompletionPercentage = Math.round((completedSections / profileSections.length) * 100)

  return (
    <main className="container mx-auto px-4 py-8">
      {/* ヘッダーセクション - ウェルカムメッセージとプロフィール完成度 */}
      <div className="mb-8 rounded-xl bg-gradient-to-r from-red-50 to-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">こんにちは、{user?.name || "学生"}さん！</h1>
            <p className="mt-1 text-gray-600">今日も就活を頑張りましょう。最新情報をチェックしてください。</p>
          </div>
          <Button asChild variant="outline" className="flex items-center gap-1 self-start">
            <Link href="/resume">
              <Edit className="mr-1 h-4 w-4" />
              プロフィールを編集
            </Link>
          </Button>
        </div>

        {/* プロフィール完成度バー */}
        <div className="mt-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">プロフィール完成度</span>
              <Badge variant={profileCompletionPercentage === 100 ? "default" : "outline"} className="bg-red-600">
                {profileCompletionPercentage}%
              </Badge>
            </div>
            <span className="text-sm text-gray-500">
              {profileCompletionPercentage === 100 ? "完璧です！" : "完成させるとスカウト率が上がります"}
            </span>
          </div>
          <Progress value={profileCompletionPercentage} className="h-2" />

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {profileSections.map((section, index) => (
              <div
                key={index}
                className={`flex items-center justify-center gap-1 rounded-lg p-2 text-center text-sm ${
                  section.completed ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"
                }`}
              >
                {section.completed ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {section.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* メインダッシュボードカード */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* スカウト状況カード */}
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
              <div className="flex flex-col items-center">
                <p className="text-3xl font-bold text-gray-900">5</p>
                <p className="text-sm text-gray-500">新着</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  <p className="text-3xl font-bold text-gray-900">2</p>
                  <Badge className="ml-2 bg-red-600">未読</Badge>
                </div>
                <p className="text-sm text-gray-500">返信待ち</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-3xl font-bold text-gray-900">12</p>
                <p className="text-sm text-gray-500">累計</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <Button asChild variant="default" className="bg-red-600 hover:bg-red-700">
              <Link href="/offers" className="flex items-center">
                確認する
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* 応募履歴カード */}
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
              <div className="flex flex-col items-center">
                <p className="text-3xl font-bold text-gray-900">3</p>
                <p className="text-sm text-gray-500">応募中</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-3xl font-bold text-gray-900">1</p>
                <p className="text-sm text-gray-500">面接予定</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-3xl font-bold text-gray-900">8</p>
                <p className="text-sm text-gray-500">累計</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <Button asChild variant="default" className="bg-red-600 hover:bg-red-700">
              <Link href="/student/applications" className="flex items-center">
                履歴を見る
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* メッセージカード */}
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
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  <p className="text-3xl font-bold text-gray-900">3</p>
                  <Badge className="ml-2 bg-red-600">未読</Badge>
                </div>
                <p className="text-sm text-gray-500">新着</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-3xl font-bold text-gray-900">8</p>
                <p className="text-sm text-gray-500">会話</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-3xl font-bold text-gray-900">2</p>
                <p className="text-sm text-gray-500">今週</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <Button asChild variant="default" className="bg-red-600 hover:bg-red-700">
              <Link href="/chat" className="flex items-center">
                チャットへ
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* 就活グランプリカード */}
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
              <div className="flex flex-col items-center">
                <p className="text-3xl font-bold text-gray-900">1</p>
                <p className="text-sm text-gray-500">参加中</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-3xl font-bold text-gray-900">2</p>
                <p className="text-sm text-gray-500">完了</p>
              </div>
              <div className="flex flex-col items-center">
                <Badge className="bg-green-600">新着イベント</Badge>
                <p className="text-sm text-gray-500">今週</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-gray-50 px-6 py-3">
            <Button asChild variant="default" className="bg-red-600 hover:bg-red-700">
              <Link href="/grandprix" className="flex items-center">
                詳細へ
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* サブセクション */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* 今後の予定 */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-red-600" />
              今後の予定
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[320px] overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <span className="text-xs font-bold">10</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">株式会社テクノロジー 一次面接</p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      面接
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">5月10日 13:00-14:00</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <span className="text-xs font-bold">15</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">グローバル商事 ES提出期限</p>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      提出
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">5月15日 23:59まで</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <span className="text-xs font-bold">20</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">未来創造株式会社 説明会</p>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      説明会
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">5月20日 15:00-16:30</p>
                </div>
              </div>
            </div>
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

        {/* 最新のお知らせ */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-red-600" />
              最新のお知らせ
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[320px] overflow-y-auto">
            <div className="space-y-3">
              <div className="rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600">新着</Badge>
                  <p className="font-medium">株式会社テクノロジーからオファーが届きました</p>
                </div>
                <p className="mt-1 text-sm text-gray-500">2時間前</p>
              </div>

              <div className="rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <p className="font-medium">グローバル商事の選考結果が更新されました</p>
                <p className="mt-1 text-sm text-gray-500">昨日</p>
              </div>

              <div className="rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <p className="font-medium">未来創造株式会社からメッセージが届いています</p>
                <p className="mt-1 text-sm text-gray-500">2日前</p>
              </div>

              <div className="rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <p className="font-medium">プロフィールを更新すると、スカウト率が上がります</p>
                <p className="mt-1 text-sm text-gray-500">3日前</p>
              </div>
            </div>
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

        {/* おすすめの求人 */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-red-600" />
              おすすめの求人
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[320px] overflow-y-auto">
            <div className="space-y-3">
              <div className="group relative rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">株式会社テクノロジー</p>
                    <p className="text-sm">ソフトウェアエンジニア（新卒）</p>
                  </div>
                  <Image
                    src="/letter-t-typography.png"
                    alt="会社ロゴ"
                    width={40}
                    height={40}
                    className="rounded-full border"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">あなたのスキルにマッチ: プログラミング</p>
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="secondary" className="bg-white shadow-sm">
                    詳細を見る
                  </Button>
                </div>
              </div>

              <div className="group relative rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">グローバル商事株式会社</p>
                    <p className="text-sm">マーケティングアシスタント（新卒）</p>
                  </div>
                  <Image
                    src="/letter-h-typography.png"
                    alt="会社ロゴ"
                    width={40}
                    height={40}
                    className="rounded-full border"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">あなたのスキルにマッチ: コミュニケーション</p>
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="secondary" className="bg-white shadow-sm">
                    詳細を見る
                  </Button>
                </div>
              </div>

              <div className="group relative rounded-lg border p-3 transition-colors hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">未来創造株式会社</p>
                    <p className="text-sm">データアナリスト（新卒）</p>
                  </div>
                  <Image
                    src="/letter-i-abstract.png"
                    alt="会社ロゴ"
                    width={40}
                    height={40}
                    className="rounded-full border"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">あなたのスキルにマッチ: 分析力</p>
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="secondary" className="bg-white shadow-sm">
                    詳細を見る
                  </Button>
                </div>
              </div>
            </div>
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
      </div>
    </main>
  )
}
