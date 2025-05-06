"use client"

import { useState, useEffect } from "react"
import Link          from "next/link"
import { useRouter } from "next/navigation"
import {
  Mail, Lock, User, Building2, AlertCircle,
  Eye, EyeOff, Loader2,
} from "lucide-react"

import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { Label }   from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription }                 from "@/components/ui/alert"

import { supabase } from "@/lib/supabase/client"
import { useAuth }  from "@/lib/auth-context"

export default function LoginPage() {
  /* ------------------------ hooks / state ------------------------ */
  const router = useRouter()
  const { isLoggedIn, userType } = useAuth()   // ← setAuthState を削除

  const [email,        setEmail]        = useState("")
  const [password,     setPassword]     = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab,    setActiveTab]    = useState<"student" | "company">("student")
  const [isLoading,    setIsLoading]    = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /* ------------------------ 既ログインならリダイレクト ------------------------ */
  useEffect(() => {
    if (!isLoggedIn) return
    router.replace(
      userType === "company" ? "/company-dashboard" : "/student-dashboard",
    )
  }, [isLoggedIn, userType, router])

  /* ------------------------ login handler ------------------------ */
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)
    console.log("LOGIN CLICK")

    /* ---- Supabase Auth ---- */
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      console.error("Login error:", error)
      setErrorMessage("メールアドレスまたはパスワードが正しくありません。")
      setIsLoading(false)
      return
    }

    /* ---- 認証成功：ダッシュボードへ遷移 ---- */
    router.replace(
      activeTab === "company" ? "/company-dashboard" : "/student-dashboard",
    )
  }

  /* ------------------------ UI helpers ------------------------ */
  const togglePasswordVisibility = () => setShowPassword(prev => !prev)

  /* ------------------------ JSX ------------------------ */
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-gradient-to-b from-red-50 to-white">
      {/* 左側のビジュアルは元コードをそのまま残しています */}
      {/* ...（省略）... */}

      <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* ---- タイトル ---- */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">アカウントにログイン</h1>
            <p className="mt-2 text-sm text-gray-600">
              就活をスタートして、あなたのキャリアを切り拓こう
            </p>
          </div>

          {/* ---------------- Tabs (student / company) ---------------- */}
          <Tabs defaultValue="student" className="w-full"
                onValueChange={v => setActiveTab(v as "student" | "company")}>
            <TabsList className="grid w-full grid-cols-2 rounded-lg bg-gray-100 p-1">
              <TabsTrigger value="student" className="flex items-center gap-1.5 rounded-md
                         data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <User size={16} /><span>学生としてログイン</span>
              </TabsTrigger>
              <TabsTrigger value="company" className="flex items-center gap-1.5 rounded-md
                         data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Building2 size={16} /><span>企業としてログイン</span>
              </TabsTrigger>
            </TabsList>

            {/* ------------------------ Student Tab ------------------------ */}
            <TabsContent value="student" className="mt-6">
              <p className="mb-4 text-sm text-gray-600">
                学生アカウントでダッシュボードにアクセスし、スカウトを受け取りましょう
              </p>
              <LoginForm
                email={email}
                password={password}
                showPassword={showPassword}
                isLoading={isLoading}
                errorMessage={errorMessage}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onToggleShowPassword={togglePasswordVisibility}
                onSubmit={handleLogin}
              />
            </TabsContent>

            {/* ------------------------ Company Tab ------------------------ */}
            <TabsContent value="company" className="mt-6">
              <p className="mb-4 text-sm text-gray-600">
                企業アカウントで採用管理ダッシュボードにアクセスしましょう
              </p>
              <LoginForm
                email={email}
                password={password}
                showPassword={showPassword}
                isLoading={isLoading}
                errorMessage={errorMessage}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onToggleShowPassword={togglePasswordVisibility}
                onSubmit={handleLogin}
              />
            </TabsContent>
          </Tabs>

          {/* ---- 以下、SNS ログインやテストアカウントの UI は元コードを残して OK ---- */}
        </div>
      </div>
    </div>
  )
}

/* ------------- 共通フォーム部品 ------------- */
type LoginFormProps = {
  email: string
  password: string
  showPassword: boolean
  isLoading: boolean
  errorMessage: string | null
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onToggleShowPassword: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

function LoginForm(props: LoginFormProps) {
  const {
    email, password, showPassword, isLoading, errorMessage,
    onEmailChange, onPasswordChange, onToggleShowPassword, onSubmit,
  } = props

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive"
               className="flex items-center gap-2 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* email */}
      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-sm font-medium">メールアドレス</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input id="login-email" type="email" placeholder="example@mail.com"
                 className="pl-10 transition-all focus-visible:ring-2 focus-visible:ring-red-500"
                 value={email} onChange={e => onEmailChange(e.target.value)} required />
        </div>
      </div>

      {/* password */}
      <div className="space-y-2">
        <Label htmlFor="login-password" className="text-sm font-medium">パスワード</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input id="login-password" type={showPassword ? "text" : "password"}
                 placeholder="••••••••" className="pl-10 transition-all
                 focus-visible:ring-2 focus-visible:ring-red-500"
                 value={password} onChange={e => onPasswordChange(e.target.value)} required />
          <button type="button" onClick={onToggleShowPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* submit */}
      <Button type="submit"
              className="w-full bg-red-600 py-6 text-base font-medium hover:bg-red-700
                         focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              disabled={isLoading}>
        {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />ログイン中...</>)
                   : "ログイン"}
      </Button>
    </form>
  )
}
