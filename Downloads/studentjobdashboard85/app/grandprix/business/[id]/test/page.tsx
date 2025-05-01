import { AlertCircle, ArrowLeft, ArrowRight, Clock, Save } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function BusinessTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー - シンプル化 */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/placeholder.svg?height=32&width=32"
              alt="学生転職ロゴ"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-red-600">学生転職</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full bg-purple-100 px-4 py-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">残り時間: 28:45</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold">総合ビジネス戦闘力診断</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">問題:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">8</span>
                  <span className="text-sm text-gray-500">/ 25</span>
                </div>
              </div>
              <Progress value={32} className="h-2 w-32 bg-gray-200" indicatorClassName="bg-purple-500" />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>経過時間: 01:15</span>
              </div>
            </div>
          </div>

          <Alert className="mb-6 border-purple-200 bg-purple-50 text-purple-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>注意</AlertTitle>
            <AlertDescription>ブラウザを閉じたり更新したりすると、回答が失われる可能性があります。</AlertDescription>
          </Alert>

          <Card className="mb-6">
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg">問題 8: リーダーシップ</CardTitle>
              <CardDescription>以下の状況に対して、あなたが最も取りそうな行動を選んでください。</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-700">
                    あなたはプロジェクトリーダーとして、重要なプレゼンテーションの準備を任されています。しかし、チームメンバーの一人が期限までに担当部分を完成させられないと報告してきました。この状況でのあなたの対応として、最も適切なものを選んでください。
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <RadioGroup>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="option1" id="option1" className="mt-1" />
                      <Label htmlFor="option1" className="flex-1">
                        そのメンバーを叱責し、何としても期限までに完成させるよう厳しく指示する
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="option2" id="option2" className="mt-1" />
                      <Label htmlFor="option2" className="flex-1">
                        他のチームメンバーに追加の作業を割り当て、負担を分散させる
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="option3" id="option3" className="mt-1" />
                      <Label htmlFor="option3" className="flex-1">
                        メンバーと一対一で話し合い、問題の原因を特定し、一緒に解決策を考える
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <RadioGroupItem value="option4" id="option4" className="mt-1" />
                      <Label htmlFor="option4" className="flex-1">
                        上司に状況を報告し、期限の延長を交渉する
                      </Label>
                    </div>
                  </RadioGroup>
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
              <Button className="gap-1 bg-purple-500 hover:bg-purple-600">
                <span>次の問題</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <div className="flex justify-between">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => (
                <Button
                  key={num}
                  variant={num === 8 ? "default" : num < 8 ? "secondary" : "outline"}
                  size="sm"
                  className={num === 8 ? "bg-purple-500 hover:bg-purple-600" : ""}
                >
                  {num}
                </Button>
              ))}
            </div>
            <Button className="bg-red-600 hover:bg-red-700">診断終了・提出</Button>
          </div>
        </div>
      </main>
    </div>
  )
}
