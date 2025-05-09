/* ───────────────────────────────────────────────
   lib/auth-context.tsx
   - 認証コンテキスト（admin ロール対応版）
────────────────────────────────────────────── */
"use client"
console.log("👉 login() called")

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { AuthChangeEvent, Session } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

/* ------------------------------------------------------------------ */
/*                             型定義                                  */
/* ------------------------------------------------------------------ */
/** ★ admin を追加 */
export type UserRole = "student" | "company" | "admin" | null
/** ログイン／サインアップ時に必ず指定する役割（admin は通常サインアップしない想定） */
export type RoleOption = Exclude<UserRole, null>

export type User = {
  id: string
  email: string
  name: string
  role: UserRole
} | null

/** Supabase のテーブル row 型をそのまま利用 */
export type StudentProfile =
  Database["public"]["Tables"]["student_profiles"]["Row"]
export type CompanyProfile =
  Database["public"]["Tables"]["company_profiles"]["Row"]
export type UserProfile = StudentProfile | CompanyProfile | null

export interface AuthContextValue {
  /* state */
  ready: boolean
  isLoggedIn: boolean
  userType: UserRole
  session: Session | null
  user: User
  profile: UserProfile
  error: string | null
  /* actions */
  login: (
    email: string,
    password: string,
    role: RoleOption
  ) => Promise<boolean>
  signup: (
    email: string,
    password: string,
    role: RoleOption,
    fullName: string
  ) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

/* ------------------------------------------------------------------ */
/*                             Context                                 */
/* ------------------------------------------------------------------ */
const AuthContext = createContext<AuthContextValue | null>(null)
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}

/* ------------------------------------------------------------------ */
/*                         Provider Component                          */
/* ------------------------------------------------------------------ */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()

  /* ----------  state  ---------- */
  const [ready, setReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState<UserRole>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User>(null)
  const [profile, setProfile] = useState<UserProfile>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  /* ----------------------------------------------------------------
     共通：セッション＋プロフィール取得
  ---------------------------------------------------------------- */
  const applySession = async (sess: Session | null) => {
    setSession(sess)

    if (!sess) {
      setIsLoggedIn(false)
      setUser(null)
      setProfile(null)
      setUserType(null)
      return
    }

    setIsLoggedIn(true)

    /* ---------- role 取得 ---------- */
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sess.user.id)
      .maybeSingle()
    /* ★ 既定値は student → admin ログインで role 未設定の場合もあるので null 回避 */
    const role = (roleRow?.role ?? "student") as UserRole
    setUserType(role)

    /* ---------- user オブジェクト ---------- */
    setUser({
      id: sess.user.id,
      email: sess.user.email ?? "",
      name:
        sess.user.user_metadata?.full_name ??
        sess.user.email?.split("@")[0] ??
        "ユーザー",
      role,
    })

    /* ---------- profile 取得 ---------- */
    if (role === "company") {
      const { data: comp } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", sess.user.id)
        .maybeSingle()
      setProfile(comp ?? null)
    } else if (role === "student") {
      const { data: stu } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", sess.user.id)
        .maybeSingle()
      setProfile(stu ?? null)
    } else {
      /* admin は profile なし */
      setProfile(null)
    }
  }

  /* ----------------------------------------------------------------
     初回セッション取得 ＆ イベント購読
  ---------------------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      await applySession(session)
      setReady(true)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, sess) => {
        applySession(sess)
      }
    )
    return () => listener.subscription.unsubscribe()
  }, [])

  /* ----------------------------------------------------------------
     signup
  ---------------------------------------------------------------- */
  const signup = async (
    email: string,
    password: string,
    role: RoleOption,
    fullName: string
  ): Promise<boolean> => {
    clearError()
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
      if (!data.user) return true // メール確認フローのみ

      /* user_roles に登録 */
      await supabase
        .from("user_roles")
        .upsert(
          [{ user_id: data.user.id, role }],
          { onConflict: "user_id" }
        )
      setUserType(role)

      /* profile 初期化（admin は作らない）*/
      if (role === "company") {
        await supabase.from("company_profiles").insert({
          user_id: data.user.id,
          company_name: fullName,
        })
      } else if (role === "student") {
        await supabase.from("student_profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
        })
      }
      return true
    } catch (e: any) {
      setError(e.message ?? "サインアップに失敗しました")
      return false
    }
  }

  /* ----------------------------------------------------------------
     login
  ---------------------------------------------------------------- */
  const login = async (
    email: string,
    password: string,
    roleInput: RoleOption
  ): Promise<boolean> => {
    clearError()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error || !data.session) throw error ?? new Error("login failed")

      const uid = data.user.id

      /* user_roles を upsert（admin ログイン時は roleInput="admin" を渡す）*/
      await supabase
        .from("user_roles")
        .upsert(
          [{ user_id: uid, role: roleInput }],
          { onConflict: "user_id" }
        )

      /* role 最終決定 */
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle()
      const roleFinal = (roleRow?.role ?? roleInput) as UserRole
      setUserType(roleFinal)

      /* Context state 更新 */
      setSession(data.session)
      setIsLoggedIn(true)
      setUser({
        id: uid,
        email: data.user.email ?? "",
        name: data.user.user_metadata?.full_name ?? "ユーザー",
        role: roleFinal,
      })

      /* ---------- ダッシュボードへ遷移 ---------- */
      const redirectByRole = (role: UserRole) => {
        switch (role) {
          case "company":
            return "/company-dashboard"
          case "admin":          // ★ admin ダッシュボード
            return "/admin"
          case "student":
          default:
            return "/student-dashboard"
        }
      }
      router.replace(redirectByRole(roleFinal))
      return true
    } catch (e: any) {
      console.error("Login error:", e)
      setError(e.message ?? "ログインに失敗しました")
      return false
    }
  }

  /* ----------------------------------------------------------------
     logout
  ---------------------------------------------------------------- */
  const logout = async () => {
    clearError()
    try {
      await supabase.auth.signOut()
      router.replace("/login")
    } catch (e: any) {
      setError(e.message ?? "ログアウトに失敗しました")
    }
  }

  /* ----------------------------------------------------------------
     Provider
  ---------------------------------------------------------------- */
  const value: AuthContextValue = {
    ready,
    isLoggedIn,
    userType,
    session,
    user,
    profile,
    error,
    login,
    signup,
    logout,
    clearError,
  }

  if (typeof window !== "undefined") {
    // @ts-ignore
    window.__dbg = { session, user, profile, userType }
    console.log("🟢 session :", session)
    console.log("🟢 user    :", user)
    console.log("🟢 profile :", profile)
    console.log("🟢 userType:", userType)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
