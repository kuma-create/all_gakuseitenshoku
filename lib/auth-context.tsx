/* ───────────────────────────────────────────────
   lib/auth-context.tsx
   ─────────────────────────────────────────────── */
   "use client"


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
   type UserRole = "student" | "company" | null
   
   type User = {
     id: string
     email: string
     name: string
     role: UserRole
   } | null
   
   interface StudentProfile {
     id: string
     user_id: string
     full_name: string
     [k: string]: any
   }
   interface CompanyProfile {
     id: string
     user_id: string
     company_name: string
     [k: string]: any
   }
   type UserProfile = StudentProfile | CompanyProfile | null
   
   interface AuthContextValue {
     /* state */
     ready: boolean
     isLoggedIn: boolean
     session: Session | null
     user: User
     profile: UserProfile
     error: string | null
     /* actions */
     login:  (e: string, p: string, r: UserRole) => Promise<boolean>
     signup: (e: string, p: string, r: UserRole, n: string) => Promise<boolean>
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
     const [ready,       setReady]       = useState(false)
     const [isLoggedIn,  setIsLoggedIn]  = useState(false)
     const [session,     setSession]     = useState<Session | null>(null)
     const [user,        setUser]        = useState<User>(null)
     const [profile,     setProfile]     = useState<UserProfile>(null)
     const [error,       setError]       = useState<string | null>(null)
   
     const clearError = () => setError(null)
   
     /* ----------------------------------------------------------------
        セッションを注入する共通ハンドラ
     ---------------------------------------------------------------- */
     const applySession = async (sess: Session | null) => {
       setSession(sess)
   
       if (!sess) {
         setIsLoggedIn(false)
         setUser(null)
         setProfile(null)
         return
       }
   
       setIsLoggedIn(true)
   
       /* ----- role 取得 ----- */
       const { data: roleRow } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", sess.user.id)
         .single()
   
       const role = (roleRow?.role ?? "student") as UserRole
   
       /* ----- user オブジェクト ----- */
       setUser({
         id: sess.user.id,
         email: sess.user.email ?? "",
         name: sess.user.user_metadata?.full_name ?? sess.user.email?.split("@")[0] ?? "ユーザー",
         role,
       })
   
       /* ----- profile 取得 ----- */
       const table = role === "company" ? "company_profiles" : "student_profiles"
       const { data: prof } = await supabase
         .from(table)
         .select("*")
         .eq("user_id", sess.user.id)
         .maybeSingle()
   
       setProfile(prof ?? null)
     }
   
     /* ----------------------------------------------------------------
        1 回だけセッション取得 & イベント購読
     ---------------------------------------------------------------- */
/* ─── 1 回だけセッション取得 ＋ イベント購読 ─── */
      useEffect(() => {
        /* 初回 */
        const init = async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession()        // 型付きで取得
          await applySession(session)
          setReady(true)
        }
        init()

        /* 購読 */
        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event: AuthChangeEvent, sess: Session | null) => {
            applySession(sess)
          },
        )

        return () => listener.subscription.unsubscribe()
      }, [])

   
     /* ----------------------------------------------------------------
        signup
     ---------------------------------------------------------------- */
     const signup = async (
       email: string,
       password: string,
       role: UserRole,
       fullName: string,
     ) => {
       clearError()
       try {
         const { data, error } = await supabase.auth.signUp({
           email,
           password,
           options: { data: { full_name: fullName } },
         })
         if (error) throw error
   
         /* メール確認フローならここで終了 */
         if (!data.user) return true
   
         /* user_roles 登録 */
         await supabase.from("user_roles").upsert(
           [{ user_id: data.user.id, role: (role ?? "student") as "student" | "company" }],
           { onConflict: "user_id" },
         )
   
         /* profile 初期化 */
         if (role === "company") {
           await supabase.from("company_profiles").insert({
             user_id: data.user.id,
             company_name: fullName,
           })
         } else {
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
     const login = async (email: string, password: string, role: UserRole) => {
       clearError()
       try {
         const { data, error } = await supabase.auth.signInWithPassword({ email, password })
         if (error || !data.session) throw error ?? new Error("login failed")
   
         /* user_roles upsert（無ければ作成） */
         await supabase.from("user_roles").upsert(
           [{ user_id: data.user.id, role: (role ?? "student") as "student" | "company" }],
           { onConflict: "user_id" },
         )
   
         router.replace(role === "company" ? "/company-dashboard" : "/student-dashboard")
         return true
       } catch (e: any) {
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
       session,
       user,
       profile,
       error,
       login,
       signup,
       logout,
       clearError,
     }
   
     return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
   }
   