"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Session } from "@supabase/auth-helpers-nextjs"

// ダミーユーザーデータ（開発環境用）
export const DUMMY_USERS = {
  students: [
    { email: "student1@example.com", password: "password123", name: "山田 太郎" },
    { email: "student2@example.com", password: "password123", name: "佐藤 花子" },
    { email: "student3@example.com", password: "password123", name: "鈴木 一郎" },
  ],
  companies: [
    { email: "company1@example.com", password: "password123", name: "株式会社テクノロジー" },
    { email: "company2@example.com", password: "password123", name: "グローバル商事株式会社" },
    { email: "company3@example.com", password: "password123", name: "未来創造株式会社" },
  ],
}

type UserType = "student" | "company" | null
type User = { id?: string; email: string; name: string } | null

// プロフィール型定義
interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  university?: string;
  department?: string;
  graduation_year?: number;
  skills?: string[];
  [key: string]: any;
}

interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry?: string;
  description?: string;
  [key: string]: any;
}

type UserProfile = StudentProfile | CompanyProfile | null;

interface AuthContextType {
  isLoggedIn: boolean;
  userType: UserType;
  user: User;
  session: Session | null;
  userProfile: UserProfile;
  error: string | null;
  login: (email: string, password: string, type: UserType) => Promise<boolean>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, type: UserType, fullName: string) => Promise<boolean>;
  fetchUserProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState<UserType>(null)
  const [user, setUser] = useState<User>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  // エラーをクリア
  const clearError = () => setError(null)

  // ユーザープロフィールを取得
  const fetchUserProfile = async () => {
    if (!session?.user?.id || !userType) return
    
    try {
      if (userType === 'student') {
        const { data, error } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
        
        if (error) {
          console.error("Error fetching student profile:", error)
          setError("プロフィール情報の取得に失敗しました")
        } else {
          setUserProfile(data as StudentProfile)
        }
      } else if (userType === 'company') {
        const { data, error } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
        
        if (error) {
          console.error("Error fetching company profile:", error)
          setError("プロフィール情報の取得に失敗しました")
        } else {
          setUserProfile(data as CompanyProfile)
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      setError("プロフィール情報の取得に失敗しました")
    }
  }

  // Supabaseのセッション状態を監視
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)
        
        if (data.session) {
          setIsLoggedIn(true)
          
          // ユーザータイプをデータベースから取得
          const userId = data.session.user.id
          const { data: userData, error: userError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single()
          
          if (userError || !userData) {
            console.error("Error fetching user role:", userError)
            // デフォルトでstudentとして扱う
            setUserType("student")
          } else {
            // データベースから取得したロールを設定
            setUserType(userData.role as UserType)
          }
          
          // ユーザー情報を設定
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || "",
            name: data.session.user.user_metadata?.full_name || "ユーザー",
          })
        }
      } catch (error) {
        console.error("Error getting session:", error)
        setError("セッション情報の取得に失敗しました")
      }
    }
    
    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      
      if (session) {
        setIsLoggedIn(true)
        
        try {
          // ユーザータイプをデータベースから取得
          const userId = session.user.id
          const { data: userData, error: userError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .single()
          
          if (userError || !userData) {
            console.error("Error fetching user role:", userError)
            setUserType("student")
          } else {
            setUserType(userData.role as UserType)
          }
          
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.full_name || "ユーザー",
          })
        } catch (error) {
          console.error("Error in auth state change:", error)
          setError("認証状態の更新に失敗しました")
        }
      } else {
        setIsLoggedIn(false)
        setUserType(null)
        setUser(null)
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  // ユーザータイプが設定されたらプロフィールを取得
  useEffect(() => {
    if (session && userType) {
      fetchUserProfile()
    }
  }, [session, userType])

  // ローカルストレージからユーザー情報を復元（Supabaseがない場合のフォールバック）
  useEffect(() => {
    if (!session) {
      try {
        const storedAuth = localStorage.getItem("auth")
        if (storedAuth) {
          const { isLoggedIn, userType, user } = JSON.parse(storedAuth)
          setIsLoggedIn(isLoggedIn)
          setUserType(userType)
          setUser(user)

          // 現在のパスをチェック
          const currentPath = window.location.pathname

          // ログイン済みで、トップページにいる場合は適切なダッシュボードにリダイレクト
          if (isLoggedIn && currentPath === "/") {
            if (userType === "student") {
              router.push("/student-dashboard")
            } else if (userType === "company") {
              router.push("/company-dashboard")
            }
          }
        }
      } catch (error) {
        console.error("Failed to restore auth state:", error)
      }
    }
  }, [router, session])

  // サインアップ処理
  const signup = async (email: string, password: string, type: UserType, fullName: string): Promise<boolean> => {
    clearError()
    try {
      // Supabaseで新規ユーザー登録
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      if (error) {
        console.error("Signup error:", error)
        setError(`サインアップに失敗しました: ${error.message}`)
        return false
      }

      if (data.user) {
        // ユーザーロールをデータベースに保存
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: type
          })

        if (roleError) {
          console.error("Error setting user role:", roleError)
          setError("ユーザーロールの設定に失敗しました")
        }

        // プロフィールテーブルに初期データを作成
        if (type === 'student') {
          const { error: profileError } = await supabase
            .from('student_profiles')
            .insert({
              user_id: data.user.id,
              full_name: fullName
            })
          
          if (profileError) {
            console.error("Error creating student profile:", profileError)
            setError("学生プロフィールの作成に失敗しました")
          }
        } else if (type === 'company') {
          const { error: profileError } = await supabase
            .from('company_profiles')
            .insert({
              user_id: data.user.id,
              company_name: fullName
            })
          
          if (profileError) {
            console.error("Error creating company profile:", profileError)
            setError("企業プロフィールの作成に失敗しました")
          }
        }

        // 登録成功
        return true
      }

      setError("サインアップに失敗しました")
      return false
    } catch (error: any) {
      console.error("Signup error:", error)
      setError(`サインアップに失敗しました: ${error.message || "不明なエラー"}`)
      return false
    }
  }

  // ログイン処理
  const login = async (email: string, password: string, type: UserType): Promise<boolean> => {
    clearError()
    try {
      // Supabaseでログイン試行
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Supabase login error:", error)
        setError(`ログインに失敗しました: ${error.message}`)
        
        // 開発環境でのみダミーデータを使用
        if (process.env.NODE_ENV === 'development') {
          const users = type === "student" ? DUMMY_USERS.students : DUMMY_USERS.companies
          const foundUser = users.find((u) => u.email === email && u.password === password)

          if (foundUser) {
            // ユーザーが見つかった場合、ログイン成功
            const userData = { email: foundUser.email, name: foundUser.name }
            setIsLoggedIn(true)
            setUserType(type)
            setUser(userData)

            // ローカルストレージに保存
            try {
              localStorage.setItem(
                "auth",
                JSON.stringify({
                  isLoggedIn: true,
                  userType: type,
                  user: userData,
                }),
              )
            } catch (error) {
              console.error("Failed to save auth state:", error)
            }

            // 状態が更新されるのを少し待ってからリダイレクト
            setTimeout(() => {
              // ユーザータイプに応じてリダイレクト
              if (type === "student") {
                router.push("/student-dashboard")
              } else if (type === "company") {
                router.push("/company-dashboard")
              }
            }, 100)

            return true
          }
        }
        
        return false
      }

      // Supabaseログイン成功
      if (data.user) {
        const userData = { 
          id: data.user.id,
          email: data.user.email || "", 
          name: data.user.user_metadata?.full_name || email.split('@')[0]
        }
        setIsLoggedIn(true)
        setUserType(type)
        setUser(userData)
        setSession(data.session)

        // ユーザータイプをデータベースに保存/更新
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user.id,
            role: type,
            updated_at: new Date().toISOString()
          })

        if (roleError) {
          console.error("Error updating user role:", roleError)
        }

        // ユーザータイプに応じてリダイレクト
        setTimeout(() => {
          if (type === "student") {
            router.push("/student-dashboard")
          } else if (type === "company") {
            router.push("/company-dashboard")
          }
        }, 100)

        return true
      }

      setError("ログインに失敗しました")
      return false
    } catch (error: any) {
      console.error("Login error:", error)
      setError(`ログインに失敗しました: ${error.message || "不明なエラー"}`)
      return false
    }
  }

  // ログアウト処理
  const logout = async () => {
    clearError()
    try {
      // Supabaseからログアウト
      await supabase.auth.signOut()
      
      setIsLoggedIn(false)
      setUserType(null)
      setUser(null)
      setSession(null)
      setUserProfile(null)
      
      try {
        localStorage.removeItem("auth")
      } catch (error) {
        console.error("Failed to remove auth state:", error)
      }
      
      router.push("/")
    } catch (error: any) {
      console.error("Logout error:", error)
      setError(`ログアウトに失敗しました: ${error.message || "不明なエラー"}`)
    }
  }

  return (
    <AuthContext.Provider 
      value={{ 
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
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// カスタムフック
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}