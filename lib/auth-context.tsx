"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

// ダミーユーザーデータ
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
type User = { email: string; name: string } | null

interface AuthContextType {
  isLoggedIn: boolean
  userType: UserType
  user: User
  login: (email: string, password: string, type: UserType) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState<UserType>(null)
  const [user, setUser] = useState<User>(null)

  // ローカルストレージからユーザー情報を復元
  useEffect(() => {
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
  }, [router])

  // ログイン処理
  const login = async (email: string, password: string, type: UserType): Promise<boolean> => {
    // ダミーデータを使用した認証
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

    return false
  }

  // ログアウト処理
  const logout = () => {
    setIsLoggedIn(false)
    setUserType(null)
    setUser(null)
    try {
      localStorage.removeItem("auth")
    } catch (error) {
      console.error("Failed to remove auth state:", error)
    }
    router.push("/")
  }

  return <AuthContext.Provider value={{ isLoggedIn, userType, user, login, logout }}>{children}</AuthContext.Provider>
}

// カスタムフック
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
