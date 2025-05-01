"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"

interface AuthFormProps {
  type?: "signin" | "signup"
  redirectUrl?: string
  error?: string | null
}

export function AuthForm({ type = "signin", redirectUrl, error: initialError }: AuthFormProps) {
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient<Database>()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [message, setMessage] = useState<string | null>(null)

  // リダイレクト先の決定
  const redirect = redirectUrl || searchParams.get("redirect")
  const redirectPath =
    redirect && redirect.includes("/auth/signin")
      ? "/dashboard"
      : redirect
        ? decodeURIComponent(redirect)
        : "/dashboard"

  useEffect(() => {
    setError(null)
    setMessage(null)
  }, [type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (type === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // ✅ フルリロードでセッションCookieを反映
        window.location.href = redirectPath
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        setMessage("アカウント登録メールを送信しました。メールを確認してください。")
      }
    } catch (error: any) {
      console.error("Authentication error:", error)
      setError(error.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 w-full">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 w-full">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md"
            placeholder="your@email.com"
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="password" className="block text-sm font-medium">
              パスワード
            </label>
            {type === "signin" && (
              <Link href="/auth/reset-password" className="text-sm text-red-600 hover:underline">
                パスワードをお忘れですか？
              </Link>
            )}
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-md"
            placeholder="********"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition duration-200"
        >
          {loading ? "処理中..." : type === "signin" ? "ログイン" : "新規登録"}
        </button>
      </form>

      <div className="mt-6 text-center">
        {type === "signin" ? (
          <p>
            アカウントをお持ちでない方は{" "}
            <Link href="/auth/signup" className="text-red-600 hover:underline">
              新規登録
            </Link>
          </p>
        ) : (
          <p>
            すでにアカウントをお持ちの方は{" "}
            <Link href="/auth/signin" className="text-red-600 hover:underline">
              ログイン
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default AuthForm
