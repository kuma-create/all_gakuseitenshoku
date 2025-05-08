import { ArrowLeft, Clock, Info } from "lucide-react"
import { LazyImage } from "@/components/ui/lazy-image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function BusinessConfirmPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2">
              <LazyImage
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
                <LazyImage
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
            href="/grandprix/business"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>ビジネス戦闘力診断に戻る</span>
          </Link>
        </div>

        <div className="mx-auto max-w-3xl">
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <CardTitle className="text-xl font-bold">総合ビジネス戦闘力診断</CardTitle>
                  <CardDescription>学生転職オリジナル</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-gray-100">
                    <Clock className="mr-1 h-3 w-3" />
                    30分
                  </Badge>
                  <Badge variant="outline" className="bg-purple-100 text-purple-700">
                    標準
                  </Badge>
                  <Badge variant="outline" className="bg-gray-100">
                    問題数: 25問
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 text-purple-600" />
                    <div>
                      <h3 className="font-medium text-purple-800">開始前の注意事項</h3>
                      <p className="mt-1 text-sm text-purple-700">
                        この診断は一度開始すると途中で中断することができません。時間に余裕がある時に挑戦してください。
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-medium">診断概要</h3>
                  <p className="text-gray-600">
                    この診断はあなたのビジネススキルと適性を総合的に評価します。コミュニケーション力、論理思考力、リーダーシップなど、ビジネスシーンで必要とされる様々な能力を測定し、あなたの強みと弱みを明らかにします。診断結果は就職活動やキャリア形成に役立てることができます。
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 text-lg font-medium">診断内容</h3>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <h4 className="font-medium">コミュニケーション力（5問）</h4>
                      <p className="mt-1 text-sm text-gray-600">
                        情報を効果的に伝える能力や、他者との関係構築能力を測定します。様々なビジネスシーンでのコミュニケーション方法に関する質問に回答していただきます。
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <h4 className="font-medium">論理思考力（5問）</h4>
                      <p className="mt-1 text-sm text-gray-600">
                        問題を構造化し、論理的に解決する能力を測定します。ビジネス上の課題に対する分析力や解決策の立案力を評価します。
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <h4 className="font-medium">リーダーシップ（5問）</h4>
                      <p className="mt-1 text-sm text-gray-600">
                        チームをまとめ、目標に向かって導く能力を測定します。リーダーとしての意思決定や、メンバーの動機付けに関する質問に回答していただきます。
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <h4 className="font-medium">ストレス耐性（5問）</h4>
                      <p className="mt-1 text-sm text-gray-600">
                        プレッシャーのある状況でも冷静に対応できる能力を測定します。様々なストレス状況での対処法に関する質問に回答していただきます。
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <h4 className="font-medium">ビジネスセンス（5問）</h4>
                      <p className="mt-1 text-sm text-gray-600">
                        ビジネス全般に対する理解や感覚を測定します。市場動向の把握や、ビジネスチャンスの発見に関する質問に回答していただきます。
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 text-lg font-medium">準備するもの</h3>
                  <ul className="ml-5 list-disc space-y-1 text-sm text-gray-600">
                    <li>静かな環境（集中して取り組める場所）</li>
                    <li>安定したインターネット接続</li>
                    <li>自己分析のための客観的な視点</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 border-t bg-gray-50 p-6">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
                <input type="checkbox" id="agreement" className="h-4 w-4 rounded border-gray-300" />
                <label htmlFor="agreement" className="text-sm text-gray-700">
                  上記の注意事項を読み、理解しました。途中で中断できないことに同意します。
                </label>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Link href="/grandprix/business" className="flex-1">
                  <Button variant="outline" className="w-full">
                    キャンセル
                  </Button>
                </Link>
                <Link href="/grandprix/business/1/test" className="flex-1">
                  <Button className="w-full bg-purple-500 hover:bg-purple-600">診断を開始する</Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
