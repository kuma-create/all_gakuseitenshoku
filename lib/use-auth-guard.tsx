/* lib/use-auth-guard.tsx */
"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "./auth-context"

export type RequiredRole = "student" | "company" | "any"

/**
 * ページコンポーネント側は
 *   const ready = useAuthGuard("student")
 * のように呼び出すだけ。
 * ready === false の間はローディング UI を表示。
 */
export function useAuthGuard(role: RequiredRole = "any") {
  const router   = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, user } = useAuth()

  /** 判定が終わったら true になる */
  const [ready, setReady] = useState(false)

  useEffect(() => {
    /* まだ Supabase がセッションを返していない */
    if (isLoggedIn === null) return

    /* ───────── 未ログイン ───────── */
    if (!isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    /* この時点で user は非 null */
    const currentRole = user?.role                    // "student" | "company"

    /* ───────── ロール不一致 ───────── */
    if (role !== "any" && currentRole !== role) {
      const dest = currentRole === "company"
        ? "/company-dashboard"
        : "/student-dashboard"
      router.replace(dest)
      return
    }

    /* ───────── OK ───────── */
    setReady(true)
  }, [isLoggedIn, user?.role, role, router, pathname])

  return ready
}
