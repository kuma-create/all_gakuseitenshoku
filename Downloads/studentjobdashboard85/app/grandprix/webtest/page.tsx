import { ArrowLeft, Calendar, Clock, ExternalLink, Trophy } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function WebTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/grandprix" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            <span>グランプリ管理に戻る</span>
          </Link>
        </div>

        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold">Webテスト</h1>
            <p className="text-sm text-gray-500">言語・非言語・性格適性テストで、あなたの能力を測定しましょう</p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
              <Trophy className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">あなたの最高スコア: 92点</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="available" className="text-sm">
              挑戦可能なテスト
            </TabsTrigger>
            <TabsTrigger value="results" className="text-sm">
              過去の結果
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  id: 1,
                  title: "総合Webテスト",
                  company: "学生転職オリジナル",
                  image: "/placeholder.svg?height=200&width=400",
                  difficulty: "標準",
                  time: "45分",
                  description: "言語・非言語・性格適性を総合的に測定する標準テスト",
                  featured: true,
                  new: false,
                  questions: 30,
                },
                {
                  id: 2,
                  title: "言語能力テスト",
                  company: "学生転職オリジナル",
                  image: "/placeholder.svg?height=200&width=400",
                  difficulty: "標準",
                  time: "30分",
                  description: "語彙力・読解力・文章構成力を測定するテスト",
                  featured: false,
                  new: true,
                  questions: 25,
                },
                {
                  id: 3,
                  title: "非言語能力テスト",
                  company: "学生転職オリジナル",
                  image: "/placeholder.svg?height=200&width=400",
                  difficulty: "標準",
                  time: "30分",
                  description: "数的処理・論理的思考・図形認識能力を測定するテスト",
                  featured: false,
                  new: false,
                  questions: 25,
                },
                {
                  id: 4,
                  title: "IT適性テスト",
                  company: "テクノロジー企業協賛",
                  image: "/placeholder.svg?height=200&width=400",
                  difficulty: "やや難",
                  time: "40分",
                  description: "IT・プログラミング関連の知識と適性を測定するテスト",
                  featured: false,
                  new: true,
                  questions: 35,
                },
                {
                  id: 5,
                  title: "ビジネス英語テスト",
                  company: "グローバル企業協賛",
                  image: "/placeholder.svg?height=200&width=400",
                  difficulty: "やや難",
                  time: "35分",
                  description: "ビジネスシーンで必要な英語力を測定するテスト",
                  featured: false,
                  new: false,
                  questions: 30,
                },
                {
                  id: 6,
                  title: "性格適性診断",
                  company: "学生転職オリジナル",
                  image: "/placeholder.svg?height=200&width=400",
                  difficulty: "標準",
                  time: "20分",
                  description: "職業適性や働き方の傾向を診断するテスト",
                  featured: false,
                  new: false,
                  questions: 40,
                },
              ].map((test) => (
                <Card key={test.id} className={test.featured ? "border-emerald-200 bg-emerald-50" : ""}>
                  <div className="relative">
                    <img src={test.image || "/placeholder.svg"} alt={test.title} className="h-48 w-full object-cover" />
                    {test.new && <Badge className="absolute right-2 top-2 bg-red-500">新着</Badge>}
                    {test.featured && (
                      <div className="absolute left-0 top-2 bg-emerald-500 px-2 py-1 text-xs font-medium text-white">
                        おすすめ
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{test.title}</CardTitle>
                        <CardDescription>{test.company}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-gray-100">
                        <Clock className="mr-1 h-3 w-3" />
                        {test.time}
                      </Badge>
                      <Badge variant="outline" className="bg-gray-100">
                        問題数: {test.questions}問
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          test.difficulty === "標準"
                            ? "bg-emerald-100 text-emerald-700"
                            : test.difficulty === "やや難"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }
                      >
                        {test.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3">{test.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/grandprix/webtest/${test.id}/confirm`} className="w-full">
                      <Button className="w-full bg-emerald-500 hover:bg-emerald-600">挑戦する</Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-0">
            <div className="space-y-6">
              <div className="rounded-lg border bg-white p-6">
                <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-xl font-bold">あなたの成績</h2>
                    <p className="text-sm text-gray-500">これまでに挑戦したテストの結果</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2">
                    <Trophy className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">平均スコア: 88点</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      id: 1,
                      title: "総合Webテスト",
                      company: "学生転職オリジナル",
                      date: "2023年5月10日",
                      score: 92,
                      rank: "上位5%",
                      time: "42分",
                    },
                    {
                      id: 2,
                      title: "言語能力テスト",
                      company: "学生転職オリジナル",
                      date: "2023年5月5日",
                      score: 88,
                      rank: "上位10%",
                      time: "28分",
                    },
                    {
                      id: 3,
                      title: "非言語能力テスト",
                      company: "学生転職オリジナル",
                      date: "2023年5月1日",
                      score: 85,
                      rank: "上位15%",
                      time: "29分",
                    },
                    {
                      id: 4,
                      title: "IT適性テスト",
                      company: "テクノロジー企業協賛",
                      date: "2023年4月25日",
                      score: 90,
                      rank: "上位8%",
                      time: "38分",
                    },
                    {
                      id: 5,
                      title: "性格適性診断",
                      company: "学生転職オリジナル",
                      date: "2023年4月20日",
                      score: "-",
                      rank: "-",
                      time: "18分",
                    },
                  ].map((result) => (
                    <div
                      key={result.id}
                      className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center"
                    >
                      <div className="flex-1 space-y-1 md:space-y-0.5">
                        <h3 className="font-medium">{result.title}</h3>
                        <div className="flex flex-col gap-1 text-sm text-gray-500 md:flex-row md:gap-3">
                          <span>{result.company}</span>
                          <span className="hidden md:inline">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {result.date}
                          </span>
                          <span className="hidden md:inline">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {result.time}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-4 md:mt-0">
                        <div className="flex flex-col items-center">
                          <div className="text-lg font-bold text-emerald-600">
                            {result.score === "-" ? "-" : `${result.score}点`}
                          </div>
                          <div className="text-xs text-gray-500">{result.rank}</div>
                        </div>
                        <Link href={`/grandprix/webtest/results/${result.id}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>詳細</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-white p-6">
                <h2 className="mb-4 text-xl font-bold">統計情報</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <div className="text-2xl font-bold text-gray-800">5</div>
                    <div className="text-sm text-gray-500">挑戦したテスト</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-600">88点</div>
                    <div className="text-sm text-gray-500">平均スコア</div>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">92点</div>
                    <div className="text-sm text-gray-500">最高スコア</div>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">31分</div>
                    <div className="text-sm text-gray-500">平均所要時間</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
