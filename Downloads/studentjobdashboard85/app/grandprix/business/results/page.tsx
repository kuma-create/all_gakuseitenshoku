import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Filter,
  Home,
  MessageSquare,
  Search,
  SortAsc,
  User,
  Briefcase,
  Trophy,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BusinessTestResultsPage() {
  // ダミーデータ
  const results = [
    {
      id: 1,
      title: "ビジネス戦闘力診断 2023年春",
      date: "2023年4月15日",
      score: 78,
      rank: "上位15%",
      categories: {
        leadership: 82,
        problemSolving: 75,
        communication: 85,
        execution: 70,
        innovation: 78,
      },
    },
    {
      id: 2,
      title: "ビジネス戦闘力診断 2022年冬",
      date: "2022年12月10日",
      score: 72,
      rank: "上位20%",
      categories: {
        leadership: 75,
        problemSolving: 70,
        communication: 80,
        execution: 65,
        innovation: 70,
      },
    },
    {
      id: 3,
      title: "ビジネス戦闘力診断 2022年夏",
      date: "2022年7月22日",
      score: 68,
      rank: "上位25%",
      categories: {
        leadership: 70,
        problemSolving: 65,
        communication: 75,
        execution: 60,
        innovation: 70,
      },
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-16 md:pb-12">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/placeholder.svg?height=32&width=32"
                alt="学生転職ロゴ"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-red-600">学生転職</span>
            </Link>
            <nav className="hidden md:block">
              <ul className="flex items-center gap-6">
                <li>
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                  >
                    マイページ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/resume"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                  >
                    職務経歴書
                  </Link>
                </li>
                <li>
                  <Link
                    href="/offers"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                  >
                    オファー一覧
                  </Link>
                </li>
                <li>
                  <Link
                    href="/chat"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                  >
                    チャット
                  </Link>
                </li>
                <li>
                  <Link
                    href="/features"
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                  >
                    特集
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="hidden text-sm font-medium text-gray-700 md:block">山田 太郎</div>
              <div className="relative h-8 w-8 overflow-hidden rounded-full">
                <Image
                  src="/placeholder.svg?height=32&width=32"
                  alt="プロフィール画像"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/grandprix">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">ビジネス戦闘力診断 結果一覧</h1>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all">すべての結果</TabsTrigger>
              <TabsTrigger value="recent">最近の結果</TabsTrigger>
              <TabsTrigger value="best">ベストスコア</TabsTrigger>
            </TabsList>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input type="search" placeholder="検索..." className="w-full pl-8 sm:w-[200px]" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <SortAsc className="h-4 w-4" />
                </Button>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="期間" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての期間</SelectItem>
                    <SelectItem value="month">過去1ヶ月</SelectItem>
                    <SelectItem value="quarter">過去3ヶ月</SelectItem>
                    <SelectItem value="year">過去1年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((result) => (
                <Link href={`/grandprix/business/results/${result.id}`} key={result.id}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base sm:text-lg">{result.title}</CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 sm:h-10 sm:w-10">
                          <span className="text-xs font-bold text-purple-600 sm:text-sm">{result.score}</span>
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{result.date}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                            <span>リーダーシップ</span>
                            <span className="font-medium">{result.categories.leadership}点</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full bg-purple-500"
                              style={{ width: `${result.categories.leadership}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                            <span>問題解決力</span>
                            <span className="font-medium">{result.categories.problemSolving}点</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full bg-purple-500"
                              style={{ width: `${result.categories.problemSolving}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                            <span>コミュニケーション力</span>
                            <span className="font-medium">{result.categories.communication}点</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100">
                            <div
                              className="h-1.5 rounded-full bg-purple-500"
                              style={{ width: `${result.categories.communication}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between">
                      <div className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                        {result.rank}
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 text-purple-600">
                        詳細を見る
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link href={`/grandprix/business/results/1`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg">{results[0].title}</CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 sm:h-10 sm:w-10">
                        <span className="text-xs font-bold text-purple-600 sm:text-sm">{results[0].score}</span>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{results[0].date}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                          <span>リーダーシップ</span>
                          <span className="font-medium">{results[0].categories.leadership}点</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-purple-500"
                            style={{ width: `${results[0].categories.leadership}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                          <span>問題解決力</span>
                          <span className="font-medium">{results[0].categories.problemSolving}点</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-purple-500"
                            style={{ width: `${results[0].categories.problemSolving}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                          <span>コミュニケーション力</span>
                          <span className="font-medium">{results[0].categories.communication}点</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-purple-500"
                            style={{ width: `${results[0].categories.communication}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <div className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                      {results[0].rank}
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-purple-600">
                      詳細を見る
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="best" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link href={`/grandprix/business/results/1`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg">{results[0].title}</CardTitle>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 sm:h-10 sm:w-10">
                        <span className="text-xs font-bold text-purple-600 sm:text-sm">{results[0].score}</span>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{results[0].date}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                          <span>リーダーシップ</span>
                          <span className="font-medium">{results[0].categories.leadership}点</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-purple-500"
                            style={{ width: `${results[0].categories.leadership}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                          <span>問題解決力</span>
                          <span className="font-medium">{results[0].categories.problemSolving}点</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-purple-500"
                            style={{ width: `${results[0].categories.problemSolving}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                          <span>コミュニケーション力</span>
                          <span className="font-medium">{results[0].categories.communication}点</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-purple-500"
                            style={{ width: `${results[0].categories.communication}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <div className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                      {results[0].rank}
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-purple-600">
                      詳細を見る
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* モバイルナビゲーション */}
      <div className="fixed bottom-0 left-0 z-10 w-full border-t border-gray-200 bg-white md:hidden">
        <div className="flex h-16 items-center justify-around">
          <Link href="/" className="flex flex-1 flex-col items-center justify-center py-2">
            <Home className="h-5 w-5 text-gray-600" />
            <span className="mt-1 text-xs text-gray-600">ホーム</span>
          </Link>
          <Link href="/resume" className="flex flex-1 flex-col items-center justify-center py-2">
            <User className="h-5 w-5 text-gray-600" />
            <span className="mt-1 text-xs text-gray-600">経歴書</span>
          </Link>
          <Link href="/offers" className="flex flex-1 flex-col items-center justify-center py-2">
            <Briefcase className="h-5 w-5 text-gray-600" />
            <span className="mt-1 text-xs text-gray-600">オファー</span>
          </Link>
          <Link href="/chat" className="flex flex-1 flex-col items-center justify-center py-2">
            <MessageSquare className="h-5 w-5 text-gray-600" />
            <span className="mt-1 text-xs text-gray-600">チャット</span>
          </Link>
          <Link href="/grandprix" className="flex flex-1 flex-col items-center justify-center py-2">
            <Trophy className="h-5 w-5 text-purple-600" />
            <span className="mt-1 text-xs text-purple-600">グランプリ</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
