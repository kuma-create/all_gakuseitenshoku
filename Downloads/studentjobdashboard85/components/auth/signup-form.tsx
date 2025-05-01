"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

export function SignUpForm() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [userType, setUserType] = useState("student")
  const [companyName, setCompanyName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      // ユーザーメタデータを設定
      const metadata =
        userType === "student" ? { full_name: fullName } : { full_name: fullName, company_name: companyName }

      // サインアップ処理
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        console.log("ユーザー作成成功:", data.user.id)

        // ユーザーロールを設定
        const { error: roleError } = await supabase.from("user_roles").insert([{ id: data.user.id, role: userType }])

        if (roleError) {
          console.error("ロール設定エラー:", roleError)
          throw roleError
        }

        // 学生プロフィールを作成（学生の場合）
        if (userType === "student") {
          const { error: profileError } = await supabase
            .from("student_profiles")
            .insert([{ id: data.user.id, first_name: fullName }])

          if (profileError) {
            console.error("プロフィール作成エラー:", profileError)
            throw profileError
          }
        }

        // 登録成功状態を設定
        setSuccess(true)

        // 3秒後にログインページにリダイレクト
        setTimeout(() => {
          router.push("/auth/signin")
        }, 3000)
      }
    } catch (error: any) {
      console.error("サインアップエラー:", error)
      setError(error.message || "アカウント作成中にエラーが発生しました。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">新規アカウント登録</CardTitle>
        <CardDescription className="text-center">必要情報を入力して、アカウントを作成してください</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900">登録が完了しました</h3>
            <p className="text-sm text-gray-500">
              メールを確認してアカウントを有効化してください。
              <br />
              まもなくログインページに移動します...
            </p>
            <div className="mt-4">
              <Button onClick={() => router.push("/auth/signin")} className="w-full bg-red-600 hover:bg-red-700">
                ログインページへ
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userType">アカウントタイプ</Label>
              <RadioGroup id="userType" value={userType} onValueChange={setUserType} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="student" id="student" />
                  <Label htmlFor="student">学生</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="company" />
                  <Label htmlFor="company">企業</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">氏名</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="山田 太郎"
              />
            </div>

            {userType === "company" && (
              <div className="space-y-2">
                <Label htmlFor="companyName">会社名</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required={userType === "company"}
                  placeholder="株式会社サンプル"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                minLength={8}
              />
              <p className="text-xs text-gray-500">8文字以上の英数字を入力してください</p>
            </div>

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登録中...
                </>
              ) : (
                "アカウント作成"
              )}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <p className="text-sm text-center text-gray-500">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/auth/signin" className="text-red-600 hover:underline">
            ログイン
          </Link>
        </p>
        <Link href="/" className="text-sm text-center text-gray-500 hover:underline">
          ホームに戻る
        </Link>
      </CardFooter>
    </Card>
  )
}

export default SignUpForm
