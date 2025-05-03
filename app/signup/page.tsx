"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/types"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    university: "",
    faculty: "",
    department: "",
    graduation_year: "",
    skills: [] as string[],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      skills: checked ? [...prev.skills, value] : prev.skills.filter((skill) => skill !== value),
    }))
  }

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("すべての項目を入力してください")
      return false
    }

    if (!formData.email.includes("@")) {
      setError("有効なメールアドレスを入力してください")
      return false
    }

    if (formData.password.length < 6) {
      setError("パスワードは6文字以上である必要があります")
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません")
      return false
    }

    setError(null)
    return true
  }

  const validateStep2 = () => {
    if (!formData.full_name) {
      setError("名前を入力してください")
      return false
    }

    setError(null)
    return true
  }

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Supabaseでユーザー登録
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

      if (authData.user) {
        // student_profilesテーブルにデータを挿入
        const { error: profileError } = await supabase.from("student_profiles").insert({
          user_id: authData.user.id,
          full_name: formData.full_name,
          university: formData.university || null,
          faculty: formData.faculty || null,
          department: formData.department || null,
          graduation_year: formData.graduation_year ? Number.parseInt(formData.graduation_year) : null,
          skills: formData.skills.length > 0 ? formData.skills : null,
        })

        if (profileError) throw profileError

        setSuccess("登録が完了しました！メールを確認してアカウントを有効化してください。")
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      setError(error.message || "登録中にエラーが発生しました。もう一度お試しください。")
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <>
      <CardHeader>
        <CardTitle className="text-2xl">アカウント作成</CardTitle>
        <CardDescription>学生アカウントを作成して、就職活動を始めましょう</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="your.email@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">パスワード（確認）</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
      </CardContent>
    </>
  )

  const renderStep2 = () => (
    <>
      <CardHeader>
        <CardTitle className="text-2xl">基本情報</CardTitle>
        <CardDescription>あなたの基本情報を入力してください</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">氏名</Label>
          <Input
            id="full_name"
            name="full_name"
            placeholder="山田 太郎"
            value={formData.full_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="university">大学名</Label>
          <Input
            id="university"
            name="university"
            placeholder="○○大学"
            value={formData.university}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="faculty">学部</Label>
          <Input id="faculty" name="faculty" placeholder="○○学部" value={formData.faculty} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">学科</Label>
          <Input
            id="department"
            name="department"
            placeholder="○○学科"
            value={formData.department}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="graduation_year">卒業予定年</Label>
          <Select
            value={formData.graduation_year}
            onValueChange={(value) => handleSelectChange("graduation_year", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="卒業予定年を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025年</SelectItem>
              <SelectItem value="2026">2026年</SelectItem>
              <SelectItem value="2027">2027年</SelectItem>
              <SelectItem value="2028">2028年</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </>
  )

  const renderStep3 = () => (
    <>
      <CardHeader>
        <CardTitle className="text-2xl">スキル情報</CardTitle>
        <CardDescription>あなたのスキルを教えてください</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>スキル（複数選択可）</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { id: "programming", label: "プログラミング" },
              { id: "design", label: "デザイン" },
              { id: "marketing", label: "マーケティング" },
              { id: "business", label: "ビジネス" },
              { id: "communication", label: "コミュニケーション" },
              { id: "english", label: "英語" },
              { id: "presentation", label: "プレゼンテーション" },
              { id: "leadership", label: "リーダーシップ" },
            ].map((item) => (
              <div className="flex items-center space-x-2" key={item.id}>
                <Checkbox
                  id={item.id}
                  checked={formData.skills.includes(item.id)}
                  onCheckedChange={(checked) => handleCheckboxChange(item.id, checked as boolean)}
                />
                <Label htmlFor={item.id}>{item.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </>
  )

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

        <Card className="w-full max-w-md mx-auto">
          <form onSubmit={handleSubmit}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {error && (
              <div className="px-6 pb-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {success && (
              <div className="px-6 pb-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">{success}</AlertDescription>
                </Alert>
              </div>
            )}

            <CardFooter className="flex justify-between">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  戻る
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => router.push("/")}>
                  キャンセル
                </Button>
              )}

              {step < 3 ? (
                <Button type="button" onClick={nextStep}>
                  次へ
                </Button>
              ) : (
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    "登録する"
                  )}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
