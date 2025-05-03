"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import {
  FileText,
  Users,
  Search,
  MessageSquare,
  PlusCircle,
  Bell,
  BarChart2,
  Clock,
  CheckCircle,
  Calendar,
  Briefcase,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

// 仮のデータ
const recentApplications = [
  { id: 1, name: "田中 太郎", position: "フロントエンドエンジニア", date: "2024-04-28", status: "新規" },
  { id: 2, name: "佐藤 花子", position: "バックエンドエンジニア", date: "2024-04-27", status: "書類選考中" },
  { id: 3, name: "鈴木 一郎", position: "UIデザイナー", date: "2024-04-26", status: "面接調整中" },
  { id: 4, name: "山田 健太", position: "プロジェクトマネージャー", date: "2024-04-25", status: "内定" },
]

const activeJobs = [
  { id: 1, title: "フロントエンドエンジニア", applicants: 12, views: 245, daysLeft: 14 },
  { id: 2, title: "バックエンドエンジニア", applicants: 8, views: 189, daysLeft: 21 },
  { id: 3, title: "UIデザイナー", applicants: 5, views: 156, daysLeft: 7 },
]

const recentMessages = [
  { id: 1, name: "田中 太郎", message: "面接の日程調整について", time: "10:30", unread: true },
  { id: 2, name: "佐藤 花子", message: "提出書類について質問があります", time: "昨日", unread: true },
  { id: 3, name: "鈴木 一郎", message: "内定承諾のご連絡", time: "2日前", unread: false },
]

const upcomingEvents = [
  { id: 1, title: "書類選考会議", date: "2024-04-30 13:00", type: "internal" },
  { id: 2, title: "田中太郎 最終面接", date: "2024-05-02 15:00", type: "interview" },
  { id: 3, title: "採用説明会", date: "2024-05-05 10:00", type: "event" },
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

  // 採用活動の進捗状況データ
  const hiringProgress = {
    applicants: 25,
    screening: 12,
    interview: 8,
    offer: 3,
    hired: 2,
  }

  return (
    <main className="container mx-auto px-4 py-6">
      {/* ヘッダーセクション */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">{user?.name || "企業"}ダッシュボード</h1>
          <p className="mt-1 text-gray-600">採用活動の管理と最新情報を確認できます</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> 新規求人作成
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> 通知 <Badge className="ml-1 bg-red-500">3</Badge>
          </Button>
        </div>
      </div>

      {/* 概要カード */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">求人</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">3</p>
                <p className="text-sm text-gray-500">公開中</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-gray-600">2</p>
                <p className="text-sm text-gray-500">下書き</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Link href="/jobs/manage" className="text-sm text-red-600 hover:underline">
              求人を管理する →
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">応募者</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">25</p>
                <p className="text-sm text-gray-500">総応募者数</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-green-600">+4</p>
                <p className="text-sm text-gray-500">今週</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Link href="/applications" className="text-sm text-red-600 hover:underline">
              応募者を確認する →
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">スカウト</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">18</p>
                <p className="text-sm text-gray-500">送信済み</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-red-600">42%</p>
                <p className="text-sm text-gray-500">開封率</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Link href="/scout" className="text-sm text-red-600 hover:underline">
              スカウトを送信する →
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">メッセージ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">7</p>
                <p className="text-sm text-gray-500">未読</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-gray-600">12</p>
                <p className="text-sm text-gray-500">今週の会話</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Link href="/chat" className="text-sm text-red-600 hover:underline">
              メッセージを確認する →
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* 採用パイプライン */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-red-600" />
            採用パイプライン
          </CardTitle>
          <CardDescription>現在の採用プロセスの進捗状況</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span>応募者</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{hiringProgress.applicants}</span>
                <Progress value={100} className="h-2 w-16" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span>書類選考</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{hiringProgress.screening}</span>
                <Progress value={48} className="h-2 w-16" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span>面接</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{hiringProgress.interview}</span>
                <Progress value={32} className="h-2 w-16" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-gray-500" />
                <span>内定</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{hiringProgress.offer}</span>
                <Progress value={12} className="h-2 w-16" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                <span>内定承諾</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{hiringProgress.hired}</span>
                <Progress value={8} className="h-2 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タブコンテンツ */}
      <Tabs defaultValue="applications" className="mb-8">
        <TabsList className="mb-4 grid w-full grid-cols-4">
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> 応募者
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> 求人
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> メッセージ
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> スケジュール
          </TabsTrigger>
        </TabsList>

        {/* 応募者タブ */}
        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>最近の応募者</CardTitle>
              <CardDescription>最近応募のあった候補者の一覧</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="pb-2">応募者名</th>
                      <th className="pb-2">応募職種</th>
                      <th className="pb-2">応募日</th>
                      <th className="pb-2">ステータス</th>
                      <th className="pb-2">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApplications.map((application) => (
                      <tr key={application.id} className="border-b">
                        <td className="py-3">{application.name}</td>
                        <td className="py-3">{application.position}</td>
                        <td className="py-3">{application.date}</td>
                        <td className="py-3">
                          <Badge
                            variant={
                              application.status === "新規"
                                ? "default"
                                : application.status === "内定"
                                  ? "success"
                                  : "secondary"
                            }
                          >
                            {application.status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Button variant="outline" size="sm">
                            詳細
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                すべての応募者を表示
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 求人タブ */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>公開中の求人</CardTitle>
              <CardDescription>現在公開中の求人情報</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeJobs.map((job) => (
                  <Card key={job.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-2">
                      <CardTitle className="text-base">{job.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">応募数</p>
                          <p className="font-medium">{job.applicants}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">閲覧数</p>
                          <p className="font-medium">{job.views}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500">掲載終了まで</p>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-600" />
                            <p className="font-medium">{job.daysLeft}日</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t bg-gray-50 pt-3">
                      <Button variant="ghost" size="sm">
                        編集
                      </Button>
                      <Button variant="outline" size="sm">
                        詳細
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                すべての求人を管理
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* メッセージタブ */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>最近のメッセージ</CardTitle>
              <CardDescription>応募者とのコミュニケーション</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentMessages.map((message) => (
                  <div key={message.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-medium text-gray-600">
                          {message.name.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">{message.name}</p>
                        <p className="text-sm text-gray-600">{message.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{message.time}</p>
                      {message.unread && <Badge className="mt-1 bg-red-500">未読</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                すべてのメッセージを表示
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* スケジュールタブ */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>今後の予定</CardTitle>
              <CardDescription>面接や採用イベントのスケジュール</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full 
                        ${
                          event.type === "interview"
                            ? "bg-blue-100 text-blue-600"
                            : event.type === "event"
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {event.type === "interview" ? (
                          <Users className="h-5 w-5" />
                        ) : event.type === "event" ? (
                          <Briefcase className="h-5 w-5" />
                        ) : (
                          <Calendar className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-600">{event.date}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      詳細
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                カレンダーを表示
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* アクションカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-red-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-red-600" />
              人材検索
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">条件に合った候補者を検索し、スカウトメッセージを送信できます。</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">候補者を検索</Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              求人作成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">新しい求人情報を作成し、優秀な人材にアピールしましょう。</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">新規求人を作成</Button>
          </CardFooter>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-green-600" />
              採用分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">採用活動のパフォーマンスを分析し、効果的な戦略を立てましょう。</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-green-600 hover:bg-green-700">分析レポートを表示</Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
