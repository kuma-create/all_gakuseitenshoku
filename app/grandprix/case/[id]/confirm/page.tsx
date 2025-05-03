import { ArrowLeft, Clock, Info } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function CaseConfirmPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/grandprix/case" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            <span>ケースグランプリに戻る</span>
          </Link>
        </div>

        <div className="mx-auto max-w-3xl">
          <Card className="border-yellow-200">
            <CardHeader className="bg-yellow-50">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <CardTitle className="text-xl font-bold">新規事業立案チャレンジ</CardTitle>
                  <CardDescription>株式会社イノベーション</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-gray-100">
                    <Clock className="mr-1 h-3 w-3" />
                    60分
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                    中級
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 text-yellow-600" />
                    <div>
                      <h3 className="font-medium text-yellow-800">開始前の注意事項</h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        このケースは一度開始すると途中で中断することができません。時間に余裕がある時に挑戦してください。
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-medium">ケース概要</h3>
                  <p className="text-gray-600">
                    あなたは大手飲料メーカーの新規事業開発チームのメンバーです。近年の健康志向の高まりを受け、新しい健康飲料の開発と市場投入を任されました。限られた予算と時間の中で、最も効果的な戦略を立案してください。
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 text-lg font-medium">出題形式</h3>
                  <ul className="ml-5 list-disc space-y-1 text-sm text-gray-600">
                    <li>全5問の記述式問題</li>
                    <li>各問題に対して300〜500文字程度で回答</li>
                    <li>制限時間は60分</li>
                    <li>一度開始すると途中保存はできません</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 text-lg font-medium">評価基準</h3>
                  <ul className="ml-5 list-disc space-y-1 text-sm text-gray-600">
                    <li>論理的思考力：問題の構造化と分析力</li>
                    <li>創造性：独自のアイデアと革新性</li>
                    <li>実現可能性：現実的な実行計画</li>
                    <li>市場理解：顧客ニーズと市場動向の把握</li>
                    <li>表現力：簡潔かつ明確な文章表現</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 text-lg font-medium">準備するもの</h3>
                  <ul className="ml-5 list-disc space-y-1 text-sm text-gray-600">
                    <li>メモ用紙とペン（計算やメモが必要な場合に使用）</li>
                    <li>静かな環境（集中して取り組める場所）</li>
                    <li>安定したインターネット接続</li>
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
                <Link href="/grandprix/case" className="flex-1">
                  <Button variant="outline" className="w-full">
                    キャンセル
                  </Button>
                </Link>
                <Link href="/grandprix/case/1/test" className="flex-1">
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-600">テストを開始する</Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
