"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, AtSign, Eye, EyeOff, Lock, User, CheckCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Form data state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    university: "",
    faculty: "",
    department: "",
    graduation_year: "",
    skills: [] as string[],
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleCheckboxChange = (skill: string, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        return { ...prev, skills: [...prev.skills, skill] }
      } else {
        return { ...prev, skills: prev.skills.filter((s) => s !== skill) }
      }
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (step < 3) {
      // Move to next step
      setStep(step + 1)
      setIsLoading(false)
      return
    }

    try {
      // 1. まずユーザーを登録する（メール確認は後で）
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("ユーザー登録に失敗しました")
      }

      // 2. 少し待機してユーザーがデータベースに確実に反映されるようにする
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 3. サーバーサイドでプロフィールを作成する代わりに、
      // 登録完了ページにリダイレクトして、そこでプロフィール作成を促す
      router.push(`/registration-complete?userId=${authData.user.id}&email=${encodeURIComponent(formData.email)}`)

      // 注: 以下のコードは使用しません。代わりに登録完了ページでプロフィール作成を行います
      /*
      // プロフィールデータを挿入
      const { error: profileError } = await supabase.from("student_profiles").insert({
        user_id: authData.user.id,
        full_name: formData.full_name,
        university: formData.university || null,
        faculty: formData.faculty || null,
        department: formData.department || null,
        graduation_year: formData.graduation_year ? Number.parseInt(formData.graduation_year) : null,
        skills: formData.skills.length > 0 ? formData.skills : null,
      })

      if (profileError) {
        console.error("Profile error:", profileError)
        throw new Error("プロフィールの作成に失敗しました: " + profileError.message)
      }

      // 成功したらリダイレクト
      router.push("/student-dashboard")
      */
    } catch (error: any) {
      console.error("Registration error:", error)
      setError(error.message || "登録中に問題が発生しました。もう一度お試しください。")
    } finally {
      setIsLoading(false)
    }
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
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          ※大学のメールアドレスを使用すると、在学証明が不要になります
                        </p>
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
                            value={formData.password}
                            onChange={handleInputChange}
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

                {step === 2 && (
                  <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="full_name">氏名</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="full_name"
                            placeholder="山田 太郎"
                            className="pl-10"
                            required
                            value={formData.full_name}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="university">大学名</Label>
                        <Input
                          id="university"
                          placeholder="〇〇大学"
                          required
                          value={formData.university}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="faculty">学部</Label>
                        <Input
                          id="faculty"
                          placeholder="〇〇学部"
                          value={formData.faculty}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="department">学科</Label>
                        <Input
                          id="department"
                          placeholder="〇〇学科"
                          value={formData.department}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="graduation_year">卒業予定年</Label>
                        <select
                          id="graduation_year"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                          value={formData.graduation_year}
                          onChange={handleInputChange}
                        >
                          <option value="">選択してください</option>
                          <option value="2026">2026年</option>
                          <option value="2027">2027年</option>
                          <option value="2028">2028年</option>
                          <option value="2029">2029年</option>
                          <option value="2030">2030年</option>
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

                {step === 3 && (
                  <form onSubmit={handleSignup} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold">スキル情報</h3>
                      <p className="text-gray-600">あなたのスキルを教えてください</p>

                      <div className="pt-2">
                        <h4 className="font-medium mb-2">スキル（複数選択可）</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: "programming", label: "プログラミング" },
                            { id: "design", label: "デザイン" },
                            { id: "marketing", label: "マーケティング" },
                            { id: "business", label: "ビジネス" },
                            { id: "communication", label: "コミュニケーション" },
                            { id: "english", label: "英語" },
                            { id: "presentation", label: "プレゼンテーション" },
                            { id: "leadership", label: "リーダーシップ" },
                          ].map((skill) => (
                            <div key={skill.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={skill.id}
                                checked={formData.skills.includes(skill.id)}
                                onCheckedChange={(checked) => handleCheckboxChange(skill.id, checked === true)}
                              />
                              <Label htmlFor={skill.id}>{skill.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={isLoading}>
                        戻る
                      </Button>
                      <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <span className="animate-spin mr-2">◌</span>
                            処理中...
                          </>
                        ) : (
                          "登録する"
                        )}
                      </Button>
                    </div>
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
                  <li className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                      <CheckCircle size={14} />
                    </div>
                    <div>
                      <p className="font-medium">企業からのスカウト</p>
                      <p className="text-sm text-gray-600">あなたのプロフィールを見た企業から直接オファーが届きます</p>
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
                </ul>
              </div>

              <div className="rounded-xl overflow-hidden shadow-lg">
                <Image
                  src="/student-dashboard-preview.png"
                  alt="学生ダッシュボードのプレビュー"
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
