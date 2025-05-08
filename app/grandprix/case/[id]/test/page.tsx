import { AlertCircle, ArrowLeft, ArrowRight, Clock, Save } from "lucide-react"
import { LazyImage } from "@/components/ui/lazy-image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function CaseTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー - シンプル化 */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <LazyImage
              src="/placeholder.svg?height=32&width=32"
              alt="学生転職ロゴ"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-red-600">学生転職</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full bg-yellow-100 px-4 py-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">残り時間: 58:24</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold">新規事業立案チャレンジ</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">問題:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">2</span>
                  <span className="text-sm text-gray-500">/ 5</span>
                </div>
              </div>
              <Progress value={40} className="h-2 w-32 bg-gray-200" indicatorClassName="bg-yellow-500" />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>経過時間: 01:36</span>
              </div>
            </div>
          </div>

          <Alert className="mb-6 border-yellow-200 bg-yellow-50 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>注意</AlertTitle>
            <AlertDescription>ブラウザを閉じたり更新したりすると、回答が失われる可能性があります。</AlertDescription>
          </Alert>

          <Card className="mb-6">
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg">問題 2: 市場分析と顧客ターゲティング</CardTitle>
              <CardDescription>以下の問いに対して、300〜500文字程度で回答してください。</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-700">
                    あなたが開発する新しい健康飲料の主要なターゲット顧客は誰ですか？その顧客層を選んだ理由と、彼らのニーズや行動特性について詳しく説明してください。また、このターゲット顧客に対して、どのような価値提案（バリュープロポジション）を行いますか？
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="answer" className="text-sm font-medium">
                      回答
                    </label>
                    <span className="text-xs text-gray-500">0/500文字</span>
                  </div>
                  <Textarea id="answer" placeholder="ここに回答を入力してください..." className="min-h-[200px]" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t bg-gray-50 p-4">
              <Button variant="outline" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                <span>前の問題</span>
              </Button>
              <Button variant="outline" className="gap-1">
                <Save className="h-4 w-4" />
                <span>一時保存</span>
              </Button>
              <Button className="gap-1 bg-yellow-500 hover:bg-yellow-600">
                <span>次の問題</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <div className="flex justify-between">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <Button
                  key={num}
                  variant={num === 2 ? "default" : "outline"}
                  size="sm"
                  className={num === 2 ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                >
                  {num}
                </Button>
              ))}
            </div>
            <Button className="bg-red-600 hover:bg-red-700">テスト終了・提出</Button>
          </div>
        </div>
      </main>
    </div>
  )
}
