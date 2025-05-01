"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requiredRole?: "student" | "company" | null
}

export function AuthGuard({ children, fallback, requiredRole }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          setIsAuthenticated(true)

          // ユーザーロールを取得
          if (requiredRole) {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("id", session.user.id)
              .single()

            setUserRole(roleData?.role || null)
          }
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error("Error checking auth:", error)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session)

      if (session && requiredRole) {
        const { data: roleData } = await supabase.from("user_roles").select("role").eq("id", session.user.id).single()

        setUserRole(roleData?.role || null)
      } else {
        setUserRole(null)
      }

      setLoading(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [requiredRole])

  // ロード中は何も表示しない
  if (loading) {
    return null
  }

  // 認証されていない場合はフォールバックを表示
  if (!isAuthenticated) {
    return fallback || null
  }

  // 特定のロールが必要な場合、そのロールを持っていなければフォールバックを表示
  if (requiredRole && userRole !== requiredRole) {
    return fallback || null
  }

  // 認証されている場合は子要素を表示
  return <>{children}</>
}
