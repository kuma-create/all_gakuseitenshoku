import { ArrowLeft, Calendar, Clock, Download, Share2, Trophy } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

export default function WebTestResultPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/grandprix/webtest?tab=results"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>結果一覧に戻る</span>
          </Link>
        </div>

        <div className="mx-auto max-w-4xl">
          <Card className="mb-8 border-emerald-200">
            <CardHeader className="bg-emerald-50">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <CardTitle className="text-xl font-bold">総合Webテスト</CardTitle>
                  <CardDescription>学生転職オリジナル</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-gray-100">
                    <Calendar className="mr-1 h-3 w-3" />
                    2023年5月10日
                  </Badge>
                  <Badge variant="outline" className="bg-gray-100">
                    <Clock className="mr-1 h-3 w-3" />
                    所要時間: 42分
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-8 flex flex-col items-center justify-center">
                <div className="relative mb-4 flex h-36 w-36 items-center justify-center rounded-full border-8 border-emerald-100">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-600">92</div>
                    <div className="text-sm text-gray-500">点</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700">上位5%の成績</span>
                </div>
              </div>

              <div className="mb-8 space-y-6">
                <div>
                  <h3 className="mb-2 text-lg font-medium">セクション別スコア</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">言語能力</span>
                        <span className="text-sm font-medium text-emerald-600">90点</span>
                      </div>
                      <Progress value={90} className="h-2 bg-gray-100" indicatorClassName="bg-emerald-500" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">非言語能力</span>
                        <span className="text-sm font-medium text-emerald-600">95点</span>
                      </div>
                      <Progress value={95} className="h-2 bg-gray-100" indicatorClassName="bg-emerald-500" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">性格適性</span>
                        <span className="text-sm font-medium text-emerald-600">適合</span>
                      </div>
                      <Progress value={100} className="h-2 bg-gray-100" indicatorClassName="bg-blue-500" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-4 text-lg font-medium">詳細フィードバック</h3>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <h4 className="mb-2 font-medium text-emerald-700">言語能力</h4>
                      <p className="text-sm text-gray-600">
                        語彙力、読解力ともに非常に高いレベルにあります。特に長文読解と文章構成の問題で高得点を獲得しています。ビジネス文書の理解や作成において優れた能力を発揮できるでしょう。
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700">語彙力: 優れている</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700">読解力: 非常に優れている</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700">文章構成力: 優れている</Badge>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <h4 className="mb-2 font-medium text-emerald-700">非言語能力</h4>
                      <p className="text-sm text-gray-600">
                        数的処理能力、論理的思考力が特に優れています。複雑な問題を素早く分析し、効率的に解決する能力があります。データ分析やプロジェクト管理などの業務に適性があるでしょう。
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700">数的処理: 非常に優れている</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700">論理思考: 非常に優れている</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700">図形認識: 優れている</Badge>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <h4 className="mb-2 font-medium text-blue-700">性格適性</h4>
                      <p className="text-sm text-gray-600">
                        協調性とリーダーシップのバランスが取れています。チームでの作業に適しており、状況に応じて主導的な役割も担えるでしょう。また、ストレス耐性も高く、プレッシャーのある環境でも安定したパフォーマンスを発揮できます。
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="bg-blue-100 text-blue-700">協調性: 高い</Badge>
                        <Badge className="bg-blue-100 text-blue-700">リーダーシップ: 高い</Badge>
                        <Badge className="bg-blue-100 text-blue-700">ストレス耐性: 非常に高い</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-4 text-lg font-medium">おすすめの職種</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                      <h4 className="font-medium">コンサルタント</h4>
                      <p className="mt-1 text-xs text-gray-500">適性度: 非常に高い</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                      <h4 className="font-medium">プロジェクトマネージャー</h4>
                      <p className="mt-1 text-xs text-gray-500">適性度: 高い</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                      <h4 className="font-medium">データアナリスト</h4>
                      <p className="mt-1 text-xs text-gray-500">適性度: 高い</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-gray-50 p-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-4 w-4" />
                  <span>結果をダウンロード</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <Share2 className="h-4 w-4" />
                  <span>企業に共有</span>
                </Button>
              </div>
              <Link href="/grandprix/webtest/1/confirm">
                <Button className="bg-emerald-500 hover:bg-emerald-600">再挑戦する</Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">あなたの強み</CardTitle>
              <CardDescription>このテスト結果から分析されたあなたの強み</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 font-medium">論理的思考力</h3>
                  <p className="text-sm text-gray-600">
                    複雑な問題を構造化し、効率的に解決する能力に優れています。情報を整理し、論理的な結論を導き出すことができます。この能力は、問題解決が求められる多くの職種で高く評価されます。
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 font-medium">言語処理能力</h3>
                  <p className="text-sm text-gray-600">
                    文章の理解と表現において高い能力を持っています。情報を正確に理解し、効果的に伝えることができます。この能力は、コミュニケーションが重要な役割を果たすあらゆる職種で価値があります。
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 font-medium">バランスの取れた性格特性</h3>
                  <p className="text-sm text-gray-600">
                    協調性とリーダーシップのバランスが取れており、チーム内での役割に柔軟に対応できます。また、ストレス耐性が高く、プレッシャーのある状況でも安定したパフォーマンスを発揮できます。
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                これらの強みを活かせる職種や企業を探すことで、あなたのキャリアをより充実させることができるでしょう。
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
