import { AlertCircle, ArrowLeft, ArrowRight, Clock, Save } from "lucide-react"
import { LazyImage } from "@/components/ui/lazy-image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function WebTestPage() {
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
            <div className="flex items-center gap-3 rounded-full bg-emerald-100 px-4 py-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">残り時間: 43:12</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold">総合Webテスト</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">問題:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">12</span>
                  <span className="text-sm text-gray-500">/ 30</span>
                </div>
              </div>
              <Progress value={40} className="h-2 w-32 bg-gray-200" indicatorClassName="bg-emerald-500" />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>経過時間: 01:48</span>
              </div>
            </div>
          </div>

          <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>注意</AlertTitle>
            <AlertDescription>ブラウザを閉じたり更新したりすると、回答が失われる可能性があります。</AlertDescription>
          </Alert>

          <Card className="mb-6">
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg">問題 12: 数列の規則性</CardTitle>
              <CardDescription>以下の問いに対して、最も適切な答えを選んでください。</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-gray-700">
                    次の数列の空欄に入る数字として、最も適切なものを選びなさい。
                    <br />
                    <br />
                    2, 6, 12, 20, 30, 42, ＿
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <RadioGroup>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="56" id="option1" />
                      <Label htmlFor="option1">56</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="54" id="option2" />
                      <Label htmlFor="option2">54</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="58" id="option3" />
                      <Label htmlFor="option3">58</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="60" id="option4" />
                      <Label htmlFor="option4">60</Label>
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
              <Button className="gap-1 bg-emerald-500 hover:bg-emerald-600">
                <span>次の問題</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <div className="flex justify-between">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                <Button
                  key={num}
                  variant={num === 12 ? "default" : num < 12 ? "secondary" : "outline"}
                  size="sm"
                  className={num === 12 ? "bg-emerald-500 hover:bg-emerald-600" : ""}
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
