"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import type { Database } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function StudentDashboard() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        router.push("/login")
        return
      }

      setUser(user)

      // プロフィール情報を取得
      const { data: profileData, error: profileError } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Profile fetch error:", profileError)
      }

      if (profileData) {
        setProfile(profileData)
      } else {
        // プロフィールが存在しない場合は作成
        const { error: insertError } = await supabase.from("student_profiles").insert({
          user_id: user.id,
          full_name: user.user_metadata.full_name || "",
        })

        if (insertError) {
          console.error("Profile creation error:", insertError)
        } else {
          // 作成したプロフィールを取得
          const { data: newProfile } = await supabase
            .from("student_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single()

          setProfile(newProfile)
        }
      }

      setLoading(false)
    }

    checkUser()
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">学生ダッシュボード</h1>
        <Button variant="outline" onClick={handleSignOut}>
          ログアウト
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>プロフィール</CardTitle>
            <CardDescription>あなたの基本情報</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-medium">名前:</span> {profile?.full_name || "未設定"}
              </p>
              <p>
                <span className="font-medium">大学:</span> {profile?.university || "未設定"}
              </p>
              <p>
                <span className="font-medium">学部:</span> {profile?.faculty || "未設定"}
              </p>
              <p>
                <span className="font-medium">学科:</span> {profile?.department || "未設定"}
              </p>
              <p>
                <span className="font-medium">卒業予定年:</span> {profile?.graduation_year || "未設定"}
              </p>
              <Button className="mt-4 w-full" variant="outline" onClick={() => router.push("/student/profile")}>
                プロフィールを編集
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>スキル</CardTitle>
            <CardDescription>あなたのスキルセット</CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: string) => (
                  <span key={skill} className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">スキルが登録されていません</p>
            )}
            <Button className="mt-4 w-full" variant="outline" onClick={() => router.push("/student/profile")}>
              スキルを編集
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>応募状況</CardTitle>
            <CardDescription>あなたの就職活動の進捗</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">まだ応募した求人はありません</p>
            <Button className="mt-4 w-full" variant="outline" onClick={() => router.push("/jobs")}>
              求人を探す
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>スカウト</CardTitle>
            <CardDescription>企業からのオファー</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">まだスカウトはありません</p>
            <Button className="mt-4 w-full" variant="outline" onClick={() => router.push("/student/scouts")}>
              スカウトを確認
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
