import { ArrowLeft, Calendar, Clock, ExternalLink, Trophy } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function GrandPrixPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" />
            <span>マイページに戻る</span>
          </Link>
        </div>

        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold">グランプリ管理</h1>
            <p className="text-sm text-gray-500">あなたのスキルを測定し、企業にアピールしましょう</p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
              <Trophy className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">総合ランク: 上位15%</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* ケースグランプリ */}
          <Card className="border-yellow-200">
            <CardHeader className="bg-yellow-50">
              <CardTitle className="text-lg font-bold">ケースグランプリ</CardTitle>
              <CardDescription>ビジネスケースを解いて問題解決力をアピール</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-700">最高スコア: 85点</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-700">上位10%</Badge>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div className="h-2.5 rounded-full bg-yellow-400" style={{ width: "85%" }}></div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>最終挑戦: 2023年5月15日</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>平均所要時間: 59分</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t bg-gray-50 p-4">
              <Link href="/grandprix/case" className="w-full">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600">ケースに挑戦する</Button>
              </Link>
              <Link href="/grandprix/case?tab=results" className="w-full">
                <Button variant="outline" className="w-full">
                  過去の結果を見る
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Webテスト */}
          <Card className="border-emerald-200">
            <CardHeader className="bg-emerald-50">
              <CardTitle className="text-lg font-bold">Webテスト</CardTitle>
              <CardDescription>言語・非言語・性格適性テスト</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700">最高スコア: 92点</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700">上位5%</Badge>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div className="h-2.5 rounded-full bg-emerald-500" style={{ width: "92%" }}></div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>最終挑戦: 2023年5月10日</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>平均所要時間: 45分</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t bg-gray-50 p-4">
              <Link href="/grandprix/webtest" className="w-full">
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600">テストに挑戦する</Button>
              </Link>
              <Link href="/grandprix/webtest?tab=results" className="w-full">
                <Button variant="outline" className="w-full">
                  過去の結果を見る
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* ビジネス戦闘力診断 */}
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-lg font-bold">ビジネス戦闘力診断</CardTitle>
              <CardDescription>ビジネススキルと適性を総合的に診断</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-purple-700">最高スコア: 78点</span>
                </div>
                <Badge className="bg-purple-100 text-purple-700">上位15%</Badge>
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-100">
                <div className="h-2.5 rounded-full bg-purple-500" style={{ width: "78%" }}></div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>最終挑戦: 2023年5月5日</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>平均所要時間: 30分</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t bg-gray-50 p-4">
              <Link href="/grandprix/business" className="w-full">
                <Button className="w-full bg-purple-500 hover:bg-purple-600">診断に挑戦する</Button>
              </Link>
              <Link href="/grandprix/business?tab=results" className="w-full">
                <Button variant="outline" className="w-full">
                  過去の結果を見る
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* 総合ランキング */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold">総合ランキング</CardTitle>
            <CardDescription>あなたの総合的な成績と順位</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium text-gray-500">グランプリ種別</th>
                    <th className="pb-2 text-center font-medium text-gray-500">最高スコア</th>
                    <th className="pb-2 text-center font-medium text-gray-500">平均スコア</th>
                    <th className="pb-2 text-center font-medium text-gray-500">挑戦回数</th>
                    <th className="pb-2 text-center font-medium text-gray-500">順位</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-yellow-100 p-1">
                          <Trophy className="h-4 w-4 text-yellow-600" />
                        </div>
                        <span>ケースグランプリ</span>
                      </div>
                    </td>
                    <td className="py-3 text-center font-medium text-yellow-600">85点</td>
                    <td className="py-3 text-center text-gray-600">78点</td>
                    <td className="py-3 text-center text-gray-600">3回</td>
                    <td className="py-3 text-center">
                      <Badge className="bg-yellow-100 text-yellow-700">上位10%</Badge>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-emerald-100 p-1">
                          <Trophy className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span>Webテスト</span>
                      </div>
                    </td>
                    <td className="py-3 text-center font-medium text-emerald-600">92点</td>
                    <td className="py-3 text-center text-gray-600">88点</td>
                    <td className="py-3 text-center text-gray-600">5回</td>
                    <td className="py-3 text-center">
                      <Badge className="bg-emerald-100 text-emerald-700">上位5%</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-purple-100 p-1">
                          <Trophy className="h-4 w-4 text-purple-600" />
                        </div>
                        <span>ビジネス戦闘力診断</span>
                      </div>
                    </td>
                    <td className="py-3 text-center font-medium text-purple-600">78点</td>
                    <td className="py-3 text-center text-gray-600">75点</td>
                    <td className="py-3 text-center text-gray-600">2回</td>
                    <td className="py-3 text-center">
                      <Badge className="bg-purple-100 text-purple-700">上位15%</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-gray-50 p-4">
            <div className="flex w-full items-center justify-between">
              <div className="text-sm text-gray-500">総合評価は各グランプリの成績を総合的に判断して算出されます</div>
              <Button variant="outline" className="gap-1">
                <ExternalLink className="h-4 w-4" />
                <span>詳細を見る</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
