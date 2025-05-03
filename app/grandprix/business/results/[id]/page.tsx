import { ArrowLeft, Download, Home, MessageSquare, Share2, User, Briefcase, Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BusinessTestResultDetailPage({ params }: { params: { id: string } }) {
  // ダミーデータ
  const result = {
    id: params.id,
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
    strengths: [
      "コミュニケーション能力が高く、チーム内での意思疎通がスムーズ",
      "リーダーシップスキルが優れており、チームをまとめる力がある",
      "新しいアイデアを生み出す創造性がある",
    ],
    weaknesses: [
      "実行力にやや課題があり、計画を最後まで遂行する粘り強さが必要",
      "複雑な問題に対する分析力をさらに高める余地がある",
    ],
    recommendations: [
      "プロジェクト管理スキルを向上させるためのトレーニングを検討する",
      "データ分析の基礎を学び、より論理的な問題解決アプローチを身につける",
      "長期的なゴール設定と進捗管理の習慣を身につける",
    ],
    suitableJobs: [
      {
        title: "マーケティングマネージャー",
        match: 92,
        description: "コミュニケーション力とリーダーシップを活かせる職種",
      },
      {
        title: "プロジェクトマネージャー",
        match: 85,
        description: "チームをまとめる力と創造性を発揮できる職種",
      },
      {
        title: "コンサルタント",
        match: 80,
        description: "問題解決力とコミュニケーション力を活かせる職種",
      },
    ],
    radarData: {
      leadership: 82,
      problemSolving: 75,
      communication: 85,
      execution: 70,
      innovation: 78,
      teamwork: 80,
      adaptability: 75,
      criticalThinking: 72,
    },
  }

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
          <Link href="/grandprix/business/results">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold sm:text-xl">{result.title}</h1>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* 左カラム - 総合スコアと基本情報 */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-2 text-center">
                <CardTitle>総合スコア</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                <div className="relative mb-4 flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#f3e8ff"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * result.score) / 100}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-purple-600 sm:text-4xl">{result.score}</span>
                    <span className="text-sm text-gray-500">/ 100点</span>
                  </div>
                </div>
                <div className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
                  {result.rank}
                </div>
                <p className="mt-4 text-center text-sm text-gray-500">受験日: {result.date}</p>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle>カテゴリー別スコア</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm">リーダーシップ</span>
                    <span className="text-sm font-medium">{result.categories.leadership}点</span>
                  </div>
                  <Progress value={result.categories.leadership} className="h-2" indicatorClassName="bg-purple-500" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm">問題解決力</span>
                    <span className="text-sm font-medium">{result.categories.problemSolving}点</span>
                  </div>
                  <Progress
                    value={result.categories.problemSolving}
                    className="h-2"
                    indicatorClassName="bg-purple-500"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm">コミュニケーション力</span>
                    <span className="text-sm font-medium">{result.categories.communication}点</span>
                  </div>
                  <Progress
                    value={result.categories.communication}
                    className="h-2"
                    indicatorClassName="bg-purple-500"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm">実行力</span>
                    <span className="text-sm font-medium">{result.categories.execution}点</span>
                  </div>
                  <Progress value={result.categories.execution} className="h-2" indicatorClassName="bg-purple-500" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm">革新性</span>
                    <span className="text-sm font-medium">{result.categories.innovation}点</span>
                  </div>
                  <Progress value={result.categories.innovation} className="h-2" indicatorClassName="bg-purple-500" />
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
                <Download className="h-4 w-4" />
                <span className="text-xs sm:text-sm">結果をダウンロード</span>
              </Button>
              <Button variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="text-xs sm:text-sm">結果を共有</span>
              </Button>
            </div>
          </div>

          {/* 右カラム - 詳細分析 */}
          <div className="mt-6 md:col-span-2 md:mt-0">
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analysis" className="text-xs sm:text-sm">
                  詳細分析
                </TabsTrigger>
                <TabsTrigger value="strengths" className="text-xs sm:text-sm">
                  強み・弱み
                </TabsTrigger>
                <TabsTrigger value="career" className="text-xs sm:text-sm">
                  キャリア適性
                </TabsTrigger>
              </TabsList>

              {/* 詳細分析タブ */}
              <TabsContent value="analysis" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">スキルレーダーチャート</CardTitle>
                    <CardDescription>8つの主要スキル領域における能力評価</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center py-4">
                    <div className="h-64 w-64 sm:h-80 sm:w-80">
                      {/* レーダーチャートの代わりに画像を表示 */}
                      <div className="relative h-full w-full">
                        <Image
                          src="/purple-radar-analysis.png"
                          alt="スキルレーダーチャート"
                          width={320}
                          height={320}
                          className="h-full w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">総合評価</CardTitle>
                    <CardDescription>あなたのビジネススキルの総合的な評価</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm sm:text-base">
                    <p>
                      あなたは特にコミュニケーション能力とリーダーシップに優れており、チーム内での調整役やリーダーとしての役割に適性があります。創造的な思考力も高く、新しいアイデアを生み出す場面で力を発揮できるでしょう。
                    </p>
                    <p>
                      一方で、実行力と問題解決のプロセスにおいては改善の余地があります。計画を最後まで遂行する粘り強さや、複雑な問題に対する分析的アプローチをさらに強化することで、より総合的なビジネス能力を高めることができるでしょう。
                    </p>
                    <p>
                      全体として、あなたは平均以上のビジネス戦闘力を持っており、特にコミュニケーションを重視する職種や、チームをまとめる役割において高いパフォーマンスを発揮できる可能性があります。
                    </p>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">他の受験者との比較</CardTitle>
                    <CardDescription>同年代の受験者との比較分析</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 sm:h-64">
                      <Image
                        src="/skills-comparison-bar-chart.png"
                        alt="他の受験者との比較グラフ"
                        width={640}
                        height={256}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="mt-4 space-y-2 text-xs sm:text-sm">
                      <p>
                        <span className="font-medium">コミュニケーション力:</span>{" "}
                        上位10%に位置しており、同年代の中でも特に優れています。
                      </p>
                      <p>
                        <span className="font-medium">リーダーシップ:</span>{" "}
                        上位15%に位置しており、平均を大きく上回っています。
                      </p>
                      <p>
                        <span className="font-medium">実行力:</span> 上位30%に位置しており、平均よりやや高い水準です。
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 強み・弱みタブ */}
              <TabsContent value="strengths" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">あなたの強み</CardTitle>
                    <CardDescription>診断結果から見えるあなたの強みポイント</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm sm:text-base">
                      {result.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="mt-1 rounded-full bg-green-100 p-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-green-600"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">改善ポイント</CardTitle>
                    <CardDescription>さらなる成長のために取り組むべき課題</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm sm:text-base">
                      {result.weaknesses.map((weakness, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="mt-1 rounded-full bg-amber-100 p-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-amber-600"
                            >
                              <path d="M12 9v4"></path>
                              <path d="M12 17h.01"></path>
                              <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                          </div>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">成長のためのアドバイス</CardTitle>
                    <CardDescription>ビジネス戦闘力を高めるための具体的な提案</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm sm:text-base">
                      {result.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="mt-1 rounded-full bg-blue-100 p-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-blue-600"
                            >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <path d="M15 3h6v6"></path>
                              <path d="m10 14 11-11"></path>
                            </svg>
                          </div>
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* キャリア適性タブ */}
              <TabsContent value="career" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">あなたに適した職種</CardTitle>
                    <CardDescription>あなたの強みを活かせる職種の提案</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {result.suitableJobs.map((job, index) => (
                      <div key={index} className="rounded-lg border p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium sm:text-lg">{job.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium sm:text-sm">適性度</span>
                            <div className="rounded-full bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700 sm:text-sm">
                              {job.match}%
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-600 sm:text-sm">{job.description}</p>
                        <div className="mt-3">
                          <div className="h-1.5 w-full rounded-full bg-gray-100">
                            <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${job.match}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">キャリアパス提案</CardTitle>
                    <CardDescription>あなたの能力を活かせるキャリアの道筋</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm sm:text-base">
                      <p>
                        あなたの強みであるコミュニケーション力とリーダーシップを活かすなら、以下のようなキャリアパスが考えられます：
                      </p>
                      <div className="relative">
                        <div className="absolute left-4 top-0 h-full w-0.5 bg-purple-200"></div>
                        <div className="space-y-8">
                          <div className="relative pl-10">
                            <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                              1
                            </div>
                            <h4 className="text-sm font-medium sm:text-base">
                              マーケティングアシスタント / プロジェクトコーディネーター
                            </h4>
                            <p className="text-xs text-gray-600 sm:text-sm">
                              コミュニケーション力を活かしながら、基礎的なビジネススキルを身につける
                            </p>
                          </div>
                          <div className="relative pl-10">
                            <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                              2
                            </div>
                            <h4 className="text-sm font-medium sm:text-base">
                              マーケティングスペシャリスト / プロジェクトマネージャー
                            </h4>
                            <p className="text-xs text-gray-600 sm:text-sm">
                              専門性を高めながら、小規模なチームやプロジェクトのリーダーシップを発揮する
                            </p>
                          </div>
                          <div className="relative pl-10">
                            <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                              3
                            </div>
                            <h4 className="text-sm font-medium sm:text-base">
                              マーケティングマネージャー / シニアプロジェクトマネージャー
                            </h4>
                            <p className="text-xs text-gray-600 sm:text-sm">
                              部門やプロジェクトの責任者として、戦略立案と実行の両面でリーダーシップを発揮する
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="mt-4 text-xs sm:text-sm">
                        実行力を高めるためには、プロジェクト管理の手法やツールを学び、小さなプロジェクトから実践することをおすすめします。また、問題解決力を向上させるためには、データ分析の基礎知識を身につけ、論理的思考を鍛えることが効果的です。
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
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
