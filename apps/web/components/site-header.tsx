"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

export default function SiteHeader() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        {/* ─── 左端ロゴ ───────────────────────────── */}
        <Link href="/" className="flex items-center gap-2">
          {/* /public/logo.svg をお好きな画像に置き換えてください */}
          <Image src="/logo.svg" alt="Culture" width={28} height={28} />
          <span className="text-lg font-semibold tracking-tight">
            Culture
          </span>
        </Link>

        {/* ─── 右側ナビ ─────────────────────────── */}
        <nav className="flex items-center gap-6 text-sm">
          {/* ログイン前後でメニューを変えても OK */}
          {user ? (
            <>
              {/* 共通リンク */}
              <Link
                href="/jobs"
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === "/jobs" ? "text-foreground" : "text-foreground/60"
                )}
              >
                求人
              </Link>

              {/* 役割別ダッシュボード */}
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className={cn(
                    "font-medium text-primary",
                    pathname.startsWith("/admin") && "underline"
                  )}
                >
                  管理
                </Link>
              )}
              {user.role === "company" && (
                <Link
                  href="/company-dashboard"
                  className={cn(
                    pathname.startsWith("/company-dashboard")
                      ? "text-foreground"
                      : "text-foreground/60",
                    "hover:text-foreground/80"
                  )}
                >
                  企業ダッシュボード
                </Link>
              )}
              {user.role === "student" && (
                <Link
                  href="/student-dashboard"
                  className={cn(
                    pathname.startsWith("/student-dashboard")
                      ? "text-foreground"
                      : "text-foreground/60",
                    "hover:text-foreground/80"
                  )}
                >
                  学生ダッシュボード
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-1.5 text-white hover:bg-primary/90"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
