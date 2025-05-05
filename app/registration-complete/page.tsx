"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function RegistrationCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const userId = searchParams.get("userId")
  const email = searchParams.get("email")

  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [profileCreated, setProfileCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(5)

  // プロフィール作成を試みる
  useEffect(() => {
    const createProfile = async () => {
      if (!userId || profileCreated) return

      setIsCreatingProfile(true)
      setError(null)

      try {
        // セッションを確認
        const { data: sessionData } = await supabase.auth.getSession()

        // プロフィールデータを作成
        const { error: profileError } = await supabase.from("student_profiles").insert({
          user_id: userId,
          full_name: "", // 基本情報は後で更新
          email: email || "",
        })

        if (profileError) {
          throw profileError
        }

        setProfileCreated(true)

        // カウントダウン開始
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              router.push("/student-dashboard")
              return 0
            }
            return prev - 1
          })
        }, 1000)

        return () => clearInterval(timer)
      } catch (error: any) {
        console.error("Profile creation error:", error)
        setError(error.message || "プロフィールの作成に失敗しました。")
      } finally {
        setIsCreatingProfile(false)
      }
    }

    createProfile()
  }, [userId, email, profileCreated, router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">登録完了</CardTitle>
          <CardDescription>アカウントが正常に作成されました</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isCreatingProfile ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-4" />
              <p className="text-gray-600">プロフィールを作成中...</p>
            </div>
          ) : profileCreated ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium">登録が完了しました！</h3>
                <p className="text-gray-600 mt-1">{countdown}秒後にダッシュボードに移動します...</p>
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>

        <CardFooter className="flex justify-center">
          {profileCreated ? (
            <Button onClick={() => router.push("/student-dashboard")} className="bg-red-600 hover:bg-red-700">
              今すぐダッシュボードへ
            </Button>
          ) : error ? (
            <Button onClick={() => router.push("/signup")} variant="outline">
              登録画面に戻る
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  )
}
