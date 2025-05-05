/* ─────────────────────────────────────────────── */
/* auth-context.tsx                                */
/* ─────────────────────────────────────────────── */
"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import type { Session } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/supabase/types"

/* ========================================
   型定義
======================================== */
type UserType = "student" | "company" | null
type User     = { id: string; email: string; name: string } | null

interface StudentProfile {
  id: string
  user_id: string
  full_name: string
  university?: string
  department?: string
  graduation_year?: number
  skills?: string[]
  [k: string]: any
}
interface CompanyProfile {
  id: string
  user_id: string
  company_name: string
  industry?: string
  description?: string
  [k: string]: any
}
type UserProfile = StudentProfile | CompanyProfile | null

interface AuthContextType {
  isLoggedIn: boolean | null
  userType:   UserType
  user:       User
  session:    Session | null
  userProfile: UserProfile
  error:      string | null
  /* actions */
  login:   (e: string, p: string, t: UserType) => Promise<boolean>
  signup:  (e: string, p: string, t: UserType, n: string) => Promise<boolean>
  logout:  () => Promise<void>
  fetchUserProfile: () => Promise<void>
  clearError: () => void
}

/* ========================================
   Context
======================================== */
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()

  /* ---------- state ---------- */
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [userType,   setUserType]   = useState<UserType>(null)
  const [user,       setUser]       = useState<User>(null)
  const [session,    setSession]    = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const clearError = () => setError(null)

  /* ========================================
     1. 最初に現在のセッションを取得
  ======================================== */
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      if (!data.session) {
        setIsLoggedIn(false)
        setInitialized(true)
        return
      }

      setIsLoggedIn(true)
      await resolveUserRole(data.session.user.id)
      setUser({
        id: data.session.user.id,
        email: data.session.user.email ?? "",
        name: data.session.user.user_metadata?.full_name ?? "ユーザー",
      })
      setInitialized(true)
    }

    init()

    /* auth state change 監視 */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess)
      if (!sess) {
        setIsLoggedIn(false)
        setUserType(null)
        setUser(null)
        setUserProfile(null)
        return
      }
      setIsLoggedIn(true)
      await resolveUserRole(sess.user.id)
      setUser({
        id: sess.user.id,
        email: sess.user.email ?? "",
        name: sess.user.user_metadata?.full_name ?? "ユーザー",
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  /* ========================================
     2. userType が取れたら profile 取得
  ======================================== */
  useEffect(() => {
    if (session && userType) fetchUserProfile()
  }, [session, userType])

  /* ========================================
     ユーザータイプを user_roles から解決
  ======================================== */
  const resolveUserRole = async (uid: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .single()

    if (error || !data) {
      console.error("Error fetching user role:", error)
      setUserType("student")          // フォールバック
    } else {
      setUserType(data.role as UserType)
    }
  }

  /* ========================================
     プロフィール取得
  ======================================== */
  const fetchUserProfile = async () => {
    if (!session?.user?.id || !userType) return
    try {
      const table = userType === "student" ? "student_profiles" : "company_profiles"
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", session.user.id)
        .single()

      if (error) throw error
      setUserProfile(data as any)
    } catch (e) {
      console.error("Error fetching profile:", e)
      setError("プロフィール情報の取得に失敗しました")
    }
  }

  /* =========================================================
     signup
  ========================================================= */
  const signup = async (
    email: string,
    password: string,
    type: UserType,
    fullName: string,
  ): Promise<boolean> => {
    clearError()
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error

      /* メール確認フローの場合 data.user === null */
      if (!data.user) return true

      /* user_roles upsert */
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          [{ user_id: data.user.id, role: (type ?? "student") as "student" | "company" }],
          { onConflict: "user_id" },
        )
      if (roleError) console.error(roleError)

      /* profile 初期化 */
      if (type === "student") {
        await supabase.from("student_profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
        })
      } else {
        await supabase.from("company_profiles").insert({
          user_id: data.user.id,
          company_name: fullName,
        })
      }
      return true
    } catch (e: any) {
      console.error("Signup error:", e)
      setError(`サインアップに失敗しました: ${e.message ?? "不明なエラー"}`)
      return false
    }
  }

  /* =========================================================
     login
  ========================================================= */
  const login = async (
    email: string,
    password: string,
    type: UserType,
  ): Promise<boolean> => {
    clearError()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(`ログインに失敗しました: ${error.message}`)
        return false
      }
      if (!data.user) {
        setError("ログインに失敗しました")
        return false
      }

      /* state 更新 */
      setIsLoggedIn(true)
      setUserType(type)
      setUser({
        id: data.user.id,
        email: data.user.email ?? "",
        name: data.user.user_metadata?.full_name ?? email.split("@")[0],
      })
      setSession(data.session)

      /* user_roles upsert */
      await supabase.from("user_roles").upsert(
        [{ user_id: data.user.id, role: (type ?? "student") as "student" | "company" }],
        { onConflict: "user_id" },
      )

      router.replace(type === "student" ? "/student-dashboard" : "/company-dashboard")
      return true
    } catch (e: any) {
      console.error("Login error:", e)
      setError(`ログインに失敗しました: ${e.message ?? "不明なエラー"}`)
      return false
    }
  }

  /* =========================================================
     logout
  ========================================================= */
  const logout = async () => {
    clearError()
    try {
      await supabase.auth.signOut({ scope: "global" })

      setIsLoggedIn(false)
      setUserType(null)
      setUser(null)
      setSession(null)
      setUserProfile(null)
      localStorage.removeItem("auth")

      router.replace("/login")
    } catch (e: any) {
      console.error("Logout error:", e)
      setError(`ログアウトに失敗しました: ${e.message ?? "不明なエラー"}`)
    }
  }

  /* ========================================
     provider
  ======================================== */
  const value: AuthContextType = {
    isLoggedIn,
    userType,
    user,
    session,
    userProfile,
    error,
    login,
    logout,
    signup,
    fetchUserProfile,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ========================================
   useAuth フック
======================================== */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
