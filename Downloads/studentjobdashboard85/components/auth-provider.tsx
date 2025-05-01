"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

// 認証コンテキストの型定義
type AuthContextType = {
  user: any | null
  userRole: string | null
  profile: any | null
  loading: boolean
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

// 認証コンテキストの作成
const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  profile: null,
  loading: true,
  refreshUser: async () => {},
  signOut: async () => {},
})

// 認証コンテキストを使用するためのカスタムフック
export const useAuth = () => useContext(AuthContext)

// 認証プロバイダーコンポーネント
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ユーザー情報を取得する関数
  const refreshUser = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // セッション情報を取得
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("セッション取得エラー:", sessionError)
        setUser(null)
        setUserRole(null)
        setProfile(null)
        return
      }

      // ユーザー状態を更新
      setUser(session?.user || null)

      if (session?.user) {
        try {
          // ユーザーロールを取得
          const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("id", session.user.id)
            .single()

          if (roleError) {
            console.error("ロール取得エラー:", roleError)
          }

          setUserRole(roleData?.role || null)
          console.log("User role:", roleData?.role)

          // プロフィール情報を取得
          if (roleData?.role === "student") {
            const { data: profileData, error: profileError } = await supabase
              .from("student_profiles")
              .select("*")
              .eq("id", session.user.id)
              .single()

            if (profileError) {
              console.error("プロフィール取得エラー:", profileError)
            }

            setProfile(profileData)
          } else if (roleData?.role === "company") {
            // 企業プロフィールがあれば取得
            setProfile({
              company_name: session.user.user_metadata?.company_name || "企業名未設定",
            })
          }
        } catch (profileError) {
          console.error("プロフィール取得エラー:", profileError)
        }
      } else {
        setUserRole(null)
        setProfile(null)
      }
    } catch (error) {
      console.error("ユーザーデータ取得エラー:", error)
    } finally {
      setLoading(false)
    }
  }

  // サインアウト関数
  const signOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      setUserRole(null)
      setProfile(null)
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("サインアウトエラー:", error)
    }
  }

  useEffect(() => {
    // 初期ユーザーデータ取得
    refreshUser()

    // Supabaseクライアントを作成
    const supabase = createClient()

    // 認証状態変更リスナー
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id)

      // 認証状態が変わったら再度ユーザーデータを取得
      await refreshUser()

      // ページの強制リフレッシュ（最終手段）
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh()
      }
    })

    // クリーンアップ関数
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  // デバッグ用
  useEffect(() => {
    console.log("Auth context updated:", { user: user?.id, userRole, loading })
  }, [user, userRole, loading])

  return (
    <AuthContext.Provider value={{ user, userRole, profile, loading, refreshUser, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
