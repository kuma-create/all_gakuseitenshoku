"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "./auth-context"

type Role = "student" | "company" | "any" | undefined

/**
 * 認証を強制する共通フック
 * @param role  必要ロール。"student" | "company" | "any" | undefined
 * @returns     判定が完了して描画してよい状態なら true
 *
 * 失敗時は自動的に
 *   - 未ログイン      → /login
 *   - ロール不一致    → ロールに応じたダッシュボード
 */
export function useAuthGuard(role: Role = "any") {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, userType } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
     // ① まだ判定中なら待つ
    if (isLoggedIn === null) return

    // ② ログイン済みでも userType が未取得(null)なら待つ
    if (isLoggedIn && role !== "any" && userType === null) return

    /* ───── 未ログイン ───── */
    if (!isLoggedIn) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`)
        return
    }

    /* ───── ロール不一致 ───── */
    if (role !== "any" && userType !== role) {
      if (userType === "student") router.replace("/student-dashboard")
      else if (userType === "company") router.replace("/company-dashboard")
      else router.replace("/") // 想定外
      return
    }

    /* ───── OK ───── */
    setReady(true)
  }, [isLoggedIn, userType, role, router, pathname])

  return ready
}
