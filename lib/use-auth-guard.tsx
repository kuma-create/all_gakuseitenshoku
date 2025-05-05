"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "./auth-context"

type Role = "student" | "company" | "any" | undefined

export function useAuthGuard(role: Role = "any") {
  const router   = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, userType } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    /* まだ Supabase から返答が来ていない */
    if (isLoggedIn === null) return

    /* ログイン済みだが userType 未取得 → 最大 2 秒だけ待つ */
    if (isLoggedIn && role !== "any" && userType === null) {
      const timer = setTimeout(() => setReady(true), 2000) // ← 2 秒で強制許可
      return () => clearTimeout(timer)
    }

    /* ── 未ログイン ── */
    if (!isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    /* ── ロール不一致 ── */
    if (role !== "any" && userType !== role) {
      if (userType === "student")   router.replace("/student-dashboard")
      else if (userType === "company") router.replace("/company-dashboard")
      else router.replace("/")
      return
    }

    /* ── OK ── */
    setReady(true)
  }, [isLoggedIn, userType, role, router, pathname])

  return ready
}
