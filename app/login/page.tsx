"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, User, Building2, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { isLoggedIn, userType, login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<"student" | "company">("student")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // すでにログインしている場合はリダイレクト
  useEffect(() => {
    if (isLoggedIn) {
      if (userType === "student") {
        router.push("/student-dashboard")
      } else if (userType === "company") {
        router.push("/company-dashboard")
      }
    }
  }, [isLoggedIn, userType, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const success = await login(email, password, activeTab)
      if (!success) {
        setError("メールアドレスまたはパスワードが正しくありません。")
      }
    } catch (err) {
      setError("ログイン中にエラーが発生しました。もう一度お試しください。")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-gradient-to-b from-red-50 to-white">
      <div className="hidden w-1/2 items-center justify-center bg-red-600 lg:flex">
        <div className="max-w-md px-8 text-white">
          <h2 className="mb-6 text-3xl font-bold">就活をもっとシンプルに</h2>
          <p className="mb-6 text-lg leading-relaxed text-red-100">
            学生転職は、あなたのキャリアをサポートする就活プラットフォームです。企業からのスカウト、グランプリイベント、充実した就活サポートであなたの可能性を広げましょう。
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-red-700/50 p-4">
              <h3 className="mb-2 font-semibold">3,500+</h3>
              <p className="text-sm text-red-200">月間スカウト数</p>
            </div>
            <div className="rounded-lg bg-red-700/50 p-4">
              <h3 className="mb-2 font-semibold">85%</h3>
              <p className="text-sm text-red-200">内定率</p>
            </div>
            <div className="rounded-lg bg-red-700/50 p-4">
              <h3 className="mb-2 font-semibold">1,200+</h3>
              <p className="text-sm text-red-200">登録企業</p>
            </div>
            <div className="rounded-lg bg-red-700/50 p-4">
              <h3 className="mb-2 font-semibold">25,000+</h3>
              <p className="text-sm text-red-200">学生ユーザー</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">アカウントにログイン</h1>
            <p className="mt-2 text-sm text-gray-600">就活をスタートして、あなたのキャリアを切り拓こう</p>
          </div>

          <Tabs
            defaultValue="student"
            className="w-full"
            onValueChange={(value) => setActiveTab(value as "student" | "company")}
          >
            <TabsList className="grid w-full grid-cols-2 rounded-lg bg-gray-100 p-1">
              <TabsTrigger
                value="student"
                className="flex items-center gap-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <User size={16} />
                <span>学生としてログイン</span>
              </TabsTrigger>
              <TabsTrigger
                value="company"
                className="flex items-center gap-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Building2 size={16} />
                <span>企業としてログイン</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="mt-6">
              <p className="mb-4 text-sm text-gray-600">
                学生アカウントでダッシュボードにアクセスし、スカウトを受け取りましょう
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="flex items-center gap-2 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="student-email" className="text-sm font-medium">
                    メールアドレス
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="student-email"
                      type="email"
                      placeholder="example@mail.com"
                      className="pl-10 transition-all focus-visible:ring-2 focus-visible:ring-red-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="student-password" className="text-sm font-medium">
                      パスワード
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                    >
                      パスワードをお忘れですか？
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="student-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 transition-all focus-visible:ring-2 focus-visible:ring-red-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-red-600 py-6 text-base font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ログイン中...
                    </>
                  ) : (
                    "ログイン"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="company" className="mt-6">
              <p className="mb-4 text-sm text-gray-600">企業アカウントで採用管理ダッシュボードにアクセスしましょう</p>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="flex items-center gap-2 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="company-email" className="text-sm font-medium">
                    メールアドレス
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="company-email"
                      type="email"
                      placeholder="company@example.com"
                      className="pl-10 transition-all focus-visible:ring-2 focus-visible:ring-red-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="company-password" className="text-sm font-medium">
                      パスワード
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                    >
                      パスワードをお忘れですか？
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="company-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 transition-all focus-visible:ring-2 focus-visible:ring-red-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-red-600 py-6 text-base font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ログイン中...
                    </>
                  ) : (
                    "ログイン"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">または</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 border-gray-300 bg-white py-5 hover:bg-gray-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                <span>Google</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 border-gray-300 bg-white py-5 hover:bg-gray-50"
              >
                <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" />
                </svg>
                <span>Facebook</span>
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない方は
              <Link href="/signup" className="ml-1 font-medium text-red-600 hover:text-red-800 hover:underline">
                新規登録
              </Link>
            </p>
          </div>

          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 font-medium text-gray-700">テスト用アカウント</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>学生:</strong> student1@example.com / password123
              </p>
              <p>
                <strong>企業:</strong> company1@example.com / password123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
