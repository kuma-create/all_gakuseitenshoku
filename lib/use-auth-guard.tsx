"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "./auth-context"

/** ページが許可するロール  
 *  - "student"  学生だけ  
 *  - "company"  企業だけ  
 *  - "any"      認証さえされていれば誰でも
 */
type Role = "student" | "company" | "any"

export function useAuthGuard(allow: Role = "any") {
  const router   = useRouter()
  const pathname = usePathname()
  const { ready, isLoggedIn, user } = useAuth()   // ← user.role を参照
  const [permitted, setPermitted] = useState(false)

  useEffect(() => {
    /* ① AuthContext が初期化されるまで待つ */
    if (!ready) return

    /* ② 未ログイン → /login にリダイレクト */
    if (!isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    /* ③ ロール不一致 → それぞれのダッシュボードに戻す */
    if (allow !== "any" && user?.role !== allow) {
      router.replace(
        user?.role === "company" ? "/company-dashboard" : "/student-dashboard",
      )
      return
    }

    /* ④ 条件を満たした */
    setPermitted(true)
  }, [ready, isLoggedIn, user?.role, allow, router, pathname])

  return permitted
}
