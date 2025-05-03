import { ArrowLeft, Calendar, Clock, ExternalLink, Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function CaseGrandPrixPage() {
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
            <h1 className="text-2xl font-bold">ケースグランプリ</h1>
            <p className="text-sm text-gray-500">ビジネスケースを解いて、あなたの問題解決能力をアピールしましょう</p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <div className="flex items-center gap-2 rounded-full bg-yellow-50 px-4 py-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">あなたの最高スコア: 85点</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="available" className="text-sm">
              挑戦可能なケース
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
                  title: "新規事業立案チャレンジ",
                  company: "株式会社イノベーション",
                  image: "/placeholder.svg?height=200&width=400",
                  difficulty: "中級",
                  time: "60分",
                  description:
                    "既存市場に革新をもたらす新規事業のアイデアを考え、その実現可能性と市場性を分析するケース",
                  featured: true,
                  new: true,
                },
                {
                  id: 2,
                  title: "マーケティング戦略ケース",
                  company: "グローバルマーケティング",
                  image: "/placeholder.svg?height=200&width=400",
                  difficulty: "初級",
                  time: "45分",
                  description: "新商品のマーケティング戦略を立案し、ターゲット顧客へのアプローチ方法を考えるケース",
                  featured: false,
                  new: true,
                },
                {
                  id: 3,
                  title: "コスト削減プロジェクト",
                  company: "コンサルティングファーム",
                  image: "/placeholder.svg?height=200&width=400",
                  difficulty: "上級",
                  time: "90分",
                  description:
                    "企業の経費削減プロジェクトを担当し、効率化と品質維持のバランスを考慮した提案を行うケース",
                  featured: false,
                  new: false,
                },
              ].map((challenge) => (
                <Card key={challenge.id} className={challenge.featured ? "border-yellow-200 bg-yellow-50" : ""}>
                  <div className="relative">
                    <Image
                      src={challenge.image || "/placeholder.svg"}
                      alt={challenge.title}
                      width={400}
                      height={200}
                      className="h-48 w-full object-cover"
                    />
                    {challenge.new && <Badge className="absolute right-2 top-2 bg-red-500">新着</Badge>}
                    {challenge.featured && (
                      <div className="absolute left-0 top-2 bg-yellow-500 px-2 py-1 text-xs font-medium text-white">
                        おすすめ
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <CardDescription>{challenge.company}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-gray-100">
                        <Clock className="mr-1 h-3 w-3" />
                        {challenge.time}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          challenge.difficulty === "初級"
                            ? "bg-green-100 text-green-700"
                            : challenge.difficulty === "中級"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }
                      >
                        {challenge.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3">{challenge.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/grandprix/case/${challenge.id}/confirm`} className="w-full">
                      <Button className="w-full bg-yellow-500 hover:bg-yellow-600">挑戦する</Button>
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
                    <p className="text-sm text-gray-500">これまでに挑戦したケースの結果</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">平均スコア: 78点</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      id: 1,
                      title: "新規事業立案チャレンジ",
                      company: "株式会社イノベーション",
                      date: "2023年5月15日",
                      score: 85,
                      rank: "上位10%",
                      time: "52分",
                    },
                    {
                      id: 2,
                      title: "マーケティング戦略ケース",
                      company: "グローバルマーケティング",
                      date: "2023年5月10日",
                      score: 78,
                      rank: "上位25%",
                      time: "40分",
                    },
                    {
                      id: 3,
                      title: "コスト削減プロジェクト",
                      company: "コンサルティングファーム",
                      date: "2023年5月5日",
                      score: 72,
                      rank: "上位35%",
                      time: "85分",
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
                          <div className="text-lg font-bold text-yellow-600">{result.score}点</div>
                          <div className="text-xs text-gray-500">{result.rank}</div>
                        </div>
                        <Link href={`/grandprix/case/results/${result.id}`}>
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
                    <div className="text-2xl font-bold text-gray-800">3</div>
                    <div className="text-sm text-gray-500">挑戦したケース</div>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">78点</div>
                    <div className="text-sm text-gray-500">平均スコア</div>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">85点</div>
                    <div className="text-sm text-gray-500">最高スコア</div>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">59分</div>
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
