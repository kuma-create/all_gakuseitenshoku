"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import {
  Users,
  Search,
  MessageSquare,
  PlusCircle,
  Briefcase,
  ChevronRight,
  ArrowRight,
  LineChart,
  Building,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

// 仮のデータ
const recentApplicants = [
  {
    id: 1,
    name: "田中 太郎",
    avatar: "/letter-t-typography.png",
    position: "フロントエンドエンジニア",
    date: "2025-04-28",
    status: "新規",
    university: "東京大学",
    faculty: "工学部",
  },
  {
    id: 2,
    name: "佐藤 花子",
    avatar: "/letter-h-typography.png",
    position: "バックエンドエンジニア",
    date: "2025-04-27",
    status: "対応中",
    university: "慶應義塾大学",
    faculty: "理工学部",
  },
  {
    id: 3,
    name: "鈴木 一郎",
    avatar: "/letter-i-abstract.png",
    position: "UIデザイナー",
    date: "2025-04-26",
    status: "対応中",
    university: "早稲田大学",
    faculty: "創造理工学部",
  },
]

const activeJobs = [
  { id: 1, title: "フロントエンドエンジニア", applicants: 12, views: 245, daysLeft: 14, status: "公開中" },
  { id: 2, title: "バックエンドエンジニア", applicants: 8, views: 189, daysLeft: 21, status: "公開中" },
  { id: 3, title: "UIデザイナー", applicants: 5, views: 156, daysLeft: 7, status: "公開中" },
  { id: 4, title: "マーケティングスペシャリスト", applicants: 0, views: 78, daysLeft: 30, status: "下書き" },
]

export default function CompanyDashboard() {
  const router = useRouter()
  const { isLoggedIn, userType, user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  // 認証チェック - 企業ユーザーでない場合はリダイレクト
  useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      router.push("/login")
    } else if (userType !== "company" && !isLoading) {
      router.push("/")
    }

    // ローディング状態を解除
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [isLoggedIn, userType, router, isLoading])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-32 w-32 animate-pulse rounded-full bg-gray-200"></div>
      </div>
    )
  }

  if (!isLoggedIn || userType !== "company") {
    return null
  }

  // 日付をフォーマットする関数
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
  

  // ステータスに応じたバッジの色を返す関数
  const getStatusBadgeVariant = (status: string): string => {
    switch (status) {
      case "新規":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case "対応中":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100"
      case "面接調整中":
        return "bg-amber-100 text-amber-800 hover:bg-amber-100"
      case "内定":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "不採用":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      case "公開中":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "下書き":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }
  

  // 求人が存在するかどうか
  const hasJobs = activeJobs.length > 0

  // 応募者が存在するかどうか
  const hasApplicants = recentApplicants.length > 0

  return (
    <main className="container mx-auto px-4 py-6">
      {/* ヘッダーセクション */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">企業ダッシュボード</h1>
        <p className="mt-1 text-gray-600">こんにちは、{user?.name || "企業"}様。採用活動の最新情報です。</p>
      </div>

      {/* アクションプロンプトカード */}
      <Card className="mb-8 overflow-hidden border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white">
        <CardHeader>
          <CardTitle className="text-xl">
            {!hasJobs
              ? "求人を作成してスカウトを始めましょう"
              : !hasApplicants
                ? "スカウトを送って応募を増やしましょう"
                : "新しい応募者が3名います。確認しましょう"}
          </CardTitle>
          <CardDescription>
            {!hasJobs
              ? "求人を公開して優秀な学生からの応募を受け付けましょう"
              : !hasApplicants
                ? "条件に合った学生を検索し、スカウトを送信しましょう"
                : "応募者の書類を確認し、選考プロセスを進めましょう"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="flex items-center gap-2" asChild>
            <Link href={!hasJobs ? "/company/jobs/new" : !hasApplicants ? "/company/scout" : "/company/applicants"}>
              今すぐ始める <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* ダッシュボードセクション */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 求人管理 */}
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-100 p-2">
                <Briefcase className="h-5 w-5 text-red-600" />
              </div>
              <CardTitle className="text-xl">求人管理</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{activeJobs.filter((job) => job.status === "公開中").length}</p>
                <p className="text-sm text-gray-500">公開中の求人</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-gray-600">
                  {activeJobs.filter((job) => job.status === "下書き").length}
                </p>
                <p className="text-sm text-gray-500">下書き</p>
              </div>
            </div>

            {hasJobs && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  {activeJobs.slice(0, 2).map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-md bg-gray-50 p-2">
                      <p className="text-sm font-medium">{job.title}</p>
                      <Badge className={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-2">
            <Button variant="outline" className="flex items-center gap-1" asChild>
              <Link href="/company/jobs">
                求人一覧へ <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/company/jobs/new">
                <PlusCircle className="h-5 w-5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* 応募状況 */}
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-xl">応募状況</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{recentApplicants.length}</p>
                <p className="text-sm text-gray-500">総応募者数</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-blue-600">
                  {recentApplicants.filter((app) => app.status === "新規").length}
                </p>
                <p className="text-sm text-gray-500">新規応募</p>
              </div>
            </div>

            {hasApplicants && (
              <>
                <Separator className="my-4" />
                <div className="space-y-3">
                  {recentApplicants.slice(0, 3).map((applicant) => (
                    <div key={applicant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={applicant.avatar || "/placeholder.svg"} alt={applicant.name} />
                          <AvatarFallback>{applicant.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{applicant.name}</p>
                          <p className="text-xs text-gray-500">{applicant.university}</p>
                        </div>
                      </div>
                      <Badge className={getStatusBadgeVariant(applicant.status)}>{applicant.status}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-2">
            <Button variant="outline" className="flex items-center gap-1" asChild>
              <Link href="/company/applicants">
                すべての応募者を見る <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* スカウト・分析 */}
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 p-2">
                <Search className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-xl">スカウト・分析</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="mb-4 text-sm text-gray-600">
              条件に合った学生を検索し、スカウトを送信できます。また、採用活動の分析レポートも確認できます。
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold">18</p>
                <p className="text-xs text-gray-500">送信済みスカウト</p>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold">42%</p>
                <p className="text-xs text-gray-500">開封率</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2 pt-2">
            <Button variant="outline" className="flex flex-1 items-center justify-center gap-1" asChild>
              <Link href="/company/scout">
                <Search className="h-4 w-4" /> スカウトを送る
              </Link>
            </Button>
            <Button variant="outline" className="flex flex-1 items-center justify-center gap-1" asChild>
              <Link href="/company/analytics">
                <LineChart className="h-4 w-4" /> 分析を見る
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 追加のアクションカード */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-red-50 to-white transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlusCircle className="h-5 w-5 text-red-600" />
              新規求人作成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">新しい求人情報を作成し、優秀な人材にアピールしましょう。</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/company/jobs/new">求人を作成する</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              メッセージ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              応募者とのメッセージをチェックし、コミュニケーションを取りましょう。
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/company/chat">メッセージを確認</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white transition-all duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5 text-green-600" />
              企業情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">企業プロフィールを更新し、学生に魅力をアピールしましょう。</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
              <Link href="/company/profile">プロフィール編集</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
