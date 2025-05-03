"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, AtSign, Eye, EyeOff, Lock, User, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [userType, setUserType] = useState("student")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      if (step < 3) {
        setStep(step + 1)
      } else {
        // Redirect based on user type
        if (userType === "student") {
          router.push("/student-dashboard")
        } else {
          router.push("/company-dashboard")
        }
      }
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="container max-w-screen-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>トップページに戻る</span>
          </Link>
        </div>

        <div className="grid md:grid-cols-5 gap-8 items-start">
          {/* Left column - Form */}
          <div className="md:col-span-3">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardTitle className="text-2xl">新規アカウント登録</CardTitle>
                <CardDescription className="text-red-100">学生転職で理想のキャリアを見つけましょう</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue={userType} onValueChange={setUserType} className="mb-6">
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="student">学生の方</TabsTrigger>
                    <TabsTrigger value="company">企業の方</TabsTrigger>
                  </TabsList>
                </Tabs>

                {step === 1 && (
                  <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">メールアドレス</Label>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="example@university.ac.jp"
                            className="pl-10"
                            required
                          />
                        </div>
                        {userType === "student" && (
                          <p className="text-xs text-gray-500">
                            ※大学のメールアドレスを使用すると、在学証明が不要になります
                          </p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="password">パスワード</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="8文字以上の英数字"
                            className="pl-10 pr-10"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>パスワードは以下の条件を満たす必要があります：</p>
                          <ul className="space-y-1">
                            <li className="flex items-center gap-1">
                              <CheckCircle size={12} className="text-green-500" />
                              <span>8文字以上</span>
                            </li>
                            <li className="flex items-center gap-1">
                              <CheckCircle size={12} className="text-green-500" />
                              <span>英字と数字を含む</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox id="terms" required />
                      <Label htmlFor="terms" className="text-sm">
                        <span>利用規約</span>と<span>プライバシーポリシー</span>に同意します
                      </Label>
                    </div>

                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <span className="animate-spin mr-2">◌</span>
                          処理中...
                        </>
                      ) : (
                        "次へ進む"
                      )}
                    </Button>
                  </form>
                )}

                {step === 2 && userType === "student" && (
                  <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">氏名</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input id="name" placeholder="山田 太郎" className="pl-10" required />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="university">大学名</Label>
                        <Input id="university" placeholder="〇〇大学" required />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="graduation">卒業予定年</Label>
                        <select
                          id="graduation"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="">選択してください</option>
                          <option value="2024">2024年</option>
                          <option value="2025">2025年</option>
                          <option value="2026">2026年</option>
                          <option value="2027">2027年</option>
                        </select>
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <span className="animate-spin mr-2">◌</span>
                          処理中...
                        </>
                      ) : (
                        "次へ進む"
                      )}
                    </Button>
                  </form>
                )}

                {step === 2 && userType === "company" && (
                  <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="company_name">会社名</Label>
                        <Input id="company_name" placeholder="株式会社〇〇" required />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="representative">担当者名</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input id="representative" placeholder="山田 太郎" className="pl-10" required />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="company_size">企業規模</Label>
                        <select
                          id="company_size"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="">選択してください</option>
                          <option value="small">10名以下</option>
                          <option value="medium">11〜100名</option>
                          <option value="large">101〜500名</option>
                          <option value="enterprise">501名以上</option>
                        </select>
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <span className="animate-spin mr-2">◌</span>
                          処理中...
                        </>
                      ) : (
                        "次へ進む"
                      )}
                    </Button>
                  </form>
                )}

                {step === 3 && userType === "student" && (
                  <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">興味のある職種を選択してください</h3>
                      <p className="text-sm text-gray-500">複数選択可能です</p>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          "エンジニア",
                          "営業",
                          "マーケティング",
                          "企画",
                          "デザイン",
                          "コンサルタント",
                          "人事",
                          "経理・財務",
                        ].map((job) => (
                          <div key={job} className="flex items-center space-x-2">
                            <Checkbox id={`job-${job}`} />
                            <Label htmlFor={`job-${job}`}>{job}</Label>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4">
                        <h3 className="text-lg font-medium mb-3">希望する働き方</h3>
                        <RadioGroup defaultValue="hybrid">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="office" id="office" />
                            <Label htmlFor="office">オフィス勤務</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="remote" id="remote" />
                            <Label htmlFor="remote">リモートワーク</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="hybrid" id="hybrid" />
                            <Label htmlFor="hybrid">ハイブリッド</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <span className="animate-spin mr-2">◌</span>
                          処理中...
                        </>
                      ) : (
                        "登録を完了する"
                      )}
                    </Button>
                  </form>
                )}

                {step === 3 && userType === "company" && (
                  <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">募集したい人材について</h3>

                      <div className="grid gap-2">
                        <Label htmlFor="recruitment_type">募集タイプ</Label>
                        <select
                          id="recruitment_type"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        >
                          <option value="">選択してください</option>
                          <option value="new_grad">新卒採用</option>
                          <option value="internship">インターンシップ</option>
                          <option value="both">両方</option>
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <Label>募集職種</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {["エンジニア", "営業", "マーケティング", "企画", "デザイン", "コンサルタント"].map((job) => (
                            <div key={job} className="flex items-center space-x-2">
                              <Checkbox id={`recruit-${job}`} />
                              <Label htmlFor={`recruit-${job}`}>{job}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <span className="animate-spin mr-2">◌</span>
                          処理中...
                        </>
                      ) : (
                        "登録を完了する"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-center border-t px-6 py-4 text-center">
                <p className="text-sm text-gray-600">
                  すでにアカウントをお持ちの方は
                  <Link href="/login" className="ml-1 font-medium text-red-600 hover:underline">
                    ログイン
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>

          {/* Right column - Benefits */}
          <div className="md:col-span-2">
            <div className="sticky top-4 space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-lg border border-gray-100">
                <h3 className="mb-4 text-lg font-bold text-gray-900">登録するメリット</h3>
                <ul className="space-y-4">
                  {userType === "student" ? (
                    <>
                      <li className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                          <CheckCircle size={14} />
                        </div>
                        <div>
                          <p className="font-medium">企業からのスカウト</p>
                          <p className="text-sm text-gray-600">
                            あなたのプロフィールを見た企業から直接オファーが届きます
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                          <CheckCircle size={14} />
                        </div>
                        <div>
                          <p className="font-medium">職務経歴書の自動作成</p>
                          <p className="text-sm text-gray-600">
                            経験やスキルを入力するだけで、魅力的な職務経歴書が完成します
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                          <CheckCircle size={14} />
                        </div>
                        <div>
                          <p className="font-medium">就活グランプリへの参加</p>
                          <p className="text-sm text-gray-600">
                            ビジネススキルを可視化し、企業からの注目度をアップできます
                          </p>
                        </div>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                          <CheckCircle size={14} />
                        </div>
                        <div>
                          <p className="font-medium">優秀な学生へのアプローチ</p>
                          <p className="text-sm text-gray-600">
                            スキルや経験で絞り込み、理想の人材にスカウトを送れます
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                          <CheckCircle size={14} />
                        </div>
                        <div>
                          <p className="font-medium">採用活動の効率化</p>
                          <p className="text-sm text-gray-600">興味を持った学生とのみコミュニケーションを取れます</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                          <CheckCircle size={14} />
                        </div>
                        <div>
                          <p className="font-medium">企業ブランディング</p>
                          <p className="text-sm text-gray-600">会社紹介ページで自社の魅力を効果的にアピールできます</p>
                        </div>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image
                  src={userType === "student" ? "/student-dashboard-preview.png" : "/company-dashboard-preview.png"}
                  alt={userType === "student" ? "学生ダッシュボードのプレビュー" : "企業ダッシュボードのプレビュー"}
                  width={400}
                  height={300}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
