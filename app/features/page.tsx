import { Gift, Share, Users, FileText, Download, Search, BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">特集</h1>
          <p className="text-sm text-gray-500">学生転職の特別企画やキャンペーン情報</p>
        </div>

        <Tabs defaultValue="referral" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-4">
            <TabsTrigger value="referral" className="text-sm">
              友達紹介キャンペーン
            </TabsTrigger>
            <TabsTrigger value="events" className="text-sm">
              イベント情報
            </TabsTrigger>
            <TabsTrigger value="articles" className="text-sm">
              特集記事
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-sm">
              就活役立ちツール
            </TabsTrigger>
          </TabsList>

          <TabsContent value="referral" className="mt-0">
            {/* 友達紹介キャンペーン */}
            <div className="grid gap-8 md:grid-cols-2">
              <div className="order-2 md:order-1">
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-red-600 to-red-400 p-6 text-white">
                    <div className="flex items-center gap-3">
                      <Users className="h-8 w-8" />
                      <h2 className="text-2xl font-bold">友達紹介キャンペーン</h2>
                    </div>
                    <p className="mt-2">友達を紹介して、お互いに特典をゲットしよう！</p>
                  </div>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-2 text-lg font-bold">キャンペーン内容</h3>
                        <p className="text-sm text-gray-600">
                          あなたの友達が学生転職に登録し、プロフィールを完成させると、紹介した方にも紹介された方にもAmazonギフト券2,000円分をプレゼント！
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-red-50 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Gift className="h-5 w-5 text-red-600" />
                            <h4 className="font-medium">紹介する側の特典</h4>
                          </div>
                          <p className="text-sm text-gray-600">
                            友達が登録・プロフィール完成で
                            <br />
                            <span className="font-bold text-red-600">Amazonギフト券2,000円分</span>
                          </p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Gift className="h-5 w-5 text-red-600" />
                            <h4 className="font-medium">紹介される側の特典</h4>
                          </div>
                          <p className="text-sm text-gray-600">
                            登録・プロフィール完成で
                            <br />
                            <span className="font-bold text-red-600">Amazonギフト券2,000円分</span>
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-2 text-lg font-bold">あなたの紹介リンク</h3>
                        <div className="flex items-center gap-2">
                          <Input value="https://gakuten.co.jp/refer?code=ABC123XYZ" readOnly className="bg-gray-50" />
                          <Button
                            variant="outline"
                            className="flex-shrink-0 gap-1 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Share className="h-4 w-4" />
                            <span>コピー</span>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-lg font-bold">SNSでシェアする</h3>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span>Facebook</span>
                          </Button>
                          <Button variant="outline" className="gap-2 border-sky-200 text-sky-600 hover:bg-sky-50">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                            </svg>
                            <span>Twitter</span>
                          </Button>
                          <Button variant="outline" className="gap-2 border-green-200 text-green-600 hover:bg-green-50">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8c0 4.41-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                            </svg>
                            <span>LINE</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-gray-50 p-6">
                    <div className="space-y-4">
                      <h3 className="font-bold">紹介状況</h3>
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="mb-4 grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-500">紹介した友達</p>
                            <p className="text-2xl font-bold text-red-600">
                              3<span className="text-sm text-gray-500">人</span>
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-500">獲得した特典</p>
                            <p className="text-2xl font-bold text-red-600">
                              6,000<span className="text-sm text-gray-500">円分</span>
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-md bg-gray-50 p-2">
                            <span className="text-sm">鈴木 一郎</span>
                            <Badge className="bg-green-100 text-green-700">特典獲得済み</Badge>
                          </div>
                          <div className="flex items-center justify-between rounded-md bg-gray-50 p-2">
                            <span className="text-sm">佐藤 健太</span>
                            <Badge className="bg-green-100 text-green-700">特典獲得済み</Badge>
                          </div>
                          <div className="flex items-center justify-between rounded-md bg-gray-50 p-2">
                            <span className="text-sm">田中 美咲</span>
                            <Badge className="bg-green-100 text-green-700">特典獲得済み</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </div>

              <div className="order-1 md:order-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">友達紹介の手順</CardTitle>
                    <CardDescription>簡単3ステップで友達を紹介できます</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-6 p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                          1
                        </div>
                        <div>
                          <h3 className="font-medium">あなた専用の紹介リンクを取得</h3>
                          <p className="mt-1 text-sm text-gray-600">
                            このページに表示されている紹介リンクをコピーします。
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                          2
                        </div>
                        <div>
                          <h3 className="font-medium">友達に紹介リンクを送る</h3>
                          <p className="mt-1 text-sm text-gray-600">
                            SNS、メール、メッセージアプリなどで友達に紹介リンクを送ります。
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                          3
                        </div>
                        <div>
                          <h3 className="font-medium">友達が登録・プロフィール完成</h3>
                          <p className="mt-1 text-sm text-gray-600">
                            友達が学生転職に登録し、プロフィールを完成させると、お互いに特典がもらえます。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-b-lg bg-gray-50 p-6">
                      <h3 className="mb-3 font-medium">よくある質問</h3>
                      <div className="space-y-3">
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <h4 className="font-medium">特典はいつもらえますか？</h4>
                          <p className="mt-1 text-sm text-gray-600">
                            友達がプロフィールを完成させてから約1週間以内にメールでAmazonギフト券のコードをお送りします。
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <h4 className="font-medium">紹介できる人数に制限はありますか？</h4>
                          <p className="mt-1 text-sm text-gray-600">
                            紹介できる人数に制限はありません。何人でも紹介いただけます。
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <h4 className="font-medium">キャンペーンはいつまで実施されますか？</h4>
                          <p className="mt-1 text-sm text-gray-600">
                            2023年12月31日までの期間限定キャンペーンです。お早めにご参加ください。
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-600">イベント情報は準備中です</h3>
              <p className="mt-2 text-sm text-gray-500">近日公開予定のイベント情報をお楽しみに</p>
            </div>
          </TabsContent>

          <TabsContent value="articles" className="mt-0">
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-600">特集記事は準備中です</h3>
              <p className="mt-2 text-sm text-gray-500">近日公開予定の特集記事をお楽しみに</p>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="mt-0">
            <div className="space-y-6">
              {/* 検索とフィルター */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input placeholder="資料を検索..." className="pl-10" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">並び替え:</span>
                  <Select defaultValue="popular">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="並び替え" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">人気順</SelectItem>
                      <SelectItem value="newest">新着順</SelectItem>
                      <SelectItem value="downloads">ダウンロード数順</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* カテゴリタブ */}
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-4 w-full">
                  <TabsTrigger value="all" className="text-sm">
                    すべて
                  </TabsTrigger>
                  <TabsTrigger value="industry" className="text-sm">
                    業界研究
                  </TabsTrigger>
                  <TabsTrigger value="self-analysis" className="text-sm">
                    自己分析
                  </TabsTrigger>
                  <TabsTrigger value="interview" className="text-sm">
                    面接対策
                  </TabsTrigger>
                  <TabsTrigger value="resume" className="text-sm">
                    履歴書・ES
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* 業界研究資料 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">IT業界研究資料</CardTitle>
                            <CardDescription>IT・テクノロジー業界の最新動向と求められる人材像</CardDescription>
                          </div>
                          <Badge className="bg-purple-100 text-purple-700">人気</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 28ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/10/15</span>
                          <span>3.2MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>2,458回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>

                    {/* 金融業界研究資料 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">金融業界研究資料</CardTitle>
                            <CardDescription>銀行・証券・保険業界の構造と今後の展望</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 32ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/09/20</span>
                          <span>4.1MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>1,875回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>

                    {/* 自己分析ワークシート */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">自己分析ワークシート</CardTitle>
                            <CardDescription>強み・弱み・価値観を整理するためのワークシート</CardDescription>
                          </div>
                          <Badge className="bg-green-100 text-green-700">NEW</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 15ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/11/05</span>
                          <span>2.5MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>1,245回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>

                    {/* 面接対策ガイド */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">面接対策完全ガイド</CardTitle>
                            <CardDescription>よく聞かれる質問と回答例、面接マナーの解説</CardDescription>
                          </div>
                          <Badge className="bg-purple-100 text-purple-700">人気</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 42ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/08/15</span>
                          <span>5.7MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>3,127回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>

                    {/* ES作成ガイド */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">ES・履歴書作成ガイド</CardTitle>
                            <CardDescription>採用担当者の目に留まるES・履歴書の書き方</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 24ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/09/10</span>
                          <span>3.8MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>2,056回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>

                    {/* コンサル業界研究資料 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">コンサルティング業界研究</CardTitle>
                            <CardDescription>コンサルティング業界の種類と求められるスキル</CardDescription>
                          </div>
                          <Badge className="bg-green-100 text-green-700">NEW</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 30ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/11/12</span>
                          <span>4.5MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>985回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>

                  {/* もっと見るボタン */}
                  <div className="mt-8 text-center">
                    <Button variant="outline" className="gap-2">
                      <BookOpen className="h-4 w-4" />
                      もっと見る
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="industry" className="mt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* 業界研究資料のみ表示 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">IT業界研究資料</CardTitle>
                            <CardDescription>IT・テクノロジー業界の最新動向と求められる人材像</CardDescription>
                          </div>
                          <Badge className="bg-purple-100 text-purple-700">人気</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 28ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/10/15</span>
                          <span>3.2MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>2,458回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>

                    {/* 金融業界研究資料 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">金融業界研究資料</CardTitle>
                            <CardDescription>銀行・証券・保険業界の構造と今後の展望</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 32ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/09/20</span>
                          <span>4.1MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>1,875回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>

                    {/* コンサル業界研究資料 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">コンサルティング業界研究</CardTitle>
                            <CardDescription>コンサルティング業界の種類と求められるスキル</CardDescription>
                          </div>
                          <Badge className="bg-green-100 text-green-700">NEW</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 30ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/11/12</span>
                          <span>4.5MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>985回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="self-analysis" className="mt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* 自己分析関連資料のみ表示 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">自己分析ワークシート</CardTitle>
                            <CardDescription>強み・弱み・価値観を整理するためのワークシート</CardDescription>
                          </div>
                          <Badge className="bg-green-100 text-green-700">NEW</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 15ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/11/05</span>
                          <span>2.5MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>1,245回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="interview" className="mt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* 面接対策関連資料のみ表示 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">面接対策完全ガイド</CardTitle>
                            <CardDescription>よく聞かれる質問と回答例、面接マナーの解説</CardDescription>
                          </div>
                          <Badge className="bg-purple-100 text-purple-700">人気</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 42ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/08/15</span>
                          <span>5.7MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>3,127回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="resume" className="mt-0">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* 履歴書・ES関連資料のみ表示 */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">ES・履歴書作成ガイド</CardTitle>
                            <CardDescription>採用担当者の目に留まるES・履歴書の書き方</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="h-4 w-4" />
                          <span>PDF形式 • 24ページ</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                          <span>更新日: 2023/09/10</span>
                          <span>3.8MB</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Download className="h-3 w-3" />
                          <span>2,056回ダウンロード</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full gap-2">
                          <Download className="h-4 w-4" />
                          ダウンロード
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
