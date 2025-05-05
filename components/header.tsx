"use client"

import Link from "next/link"
import {
  Bell,
  User,
  FileText,
  Mail,
  MessageSquare,
  Star,
  Search,
  LogIn,
  Trophy,
} from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"

export function Header() {
  const pathname = usePathname()
  const { isLoggedIn, userType, user, logout } = useAuth()

  /* ── Supabase セッション ─────────────────────────────── */
  const supabase = createClientComponentClient()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }
    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  /* ── リンク定義 ─────────────────────────────────────── */
  const studentLinks = [
    { href: "/student-dashboard", label: "マイページ", icon: User },
    { href: "/resume", label: "職務経歴書", icon: FileText },
    { href: "/jobs", label: "求人一覧", icon: Search },
    { href: "/offers", label: "オファー一覧", icon: Mail },
    { href: "/chat", label: "チャット", icon: MessageSquare },
    { href: "/grandprix", label: "就活グランプリ", icon: Trophy },
    { href: "/features", label: "特集", icon: Star },
  ] as const

  const companyLinks = [
    { href: "/company-dashboard", label: "ダッシュボード", icon: User },
    { href: "/company/jobs", label: "求人管理", icon: FileText },
    { href: "/company/applicants", label: "応募者", icon: Search },
    { href: "/company/scout", label: "スカウト", icon: Mail },
    { href: "/company/chat", label: "チャット", icon: MessageSquare },
    { href: "/grandprix", label: "就活グランプリ", icon: Trophy },
  ] as const

  const landingLinks = [
    { href: "/#features", label: "特徴" },
    { href: "/#how-it-works", label: "利用の流れ" },
    { href: "/#grandprix", label: "就活グランプリ" },
    { href: "/#testimonials", label: "利用者の声" },
    { href: "/#faq", label: "よくある質問" },
  ] as const

  const isLoggedInWithSupabase = !!session
  const showAuthLinks = isLoggedIn || isLoggedInWithSupabase
  const navLinks = userType === "company" ? companyLinks : studentLinks

  /* ── JSX ───────────────────────────────────────────── */
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 shadow-sm backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden rounded bg-red-600">
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
              学
            </span>
          </div>
          <span className="text-xl font-bold text-red-600">学生転職</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:block">
          <ul className="flex items-center gap-6">
            {showAuthLinks
              ? navLinks.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-red-600 ${
                          isActive ? "text-red-600" : "text-gray-600"
                        }`}
                      >
                        <Icon size={18} />
                        {label}
                      </Link>
                    </li>
                  )
                })
              : landingLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
          </ul>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {showAuthLinks ? (
            <>
              {/* 通知アイコン */}
              <button className="relative" aria-label="通知">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                  2
                </span>
              </button>

              {/* プロフィール */}
              <div className="flex items-center gap-2">
                <div className="hidden text-sm font-medium text-gray-700 md:block">
                  {user?.name ||
                    session?.user?.user_metadata?.full_name ||
                    "ユーザー"}
                </div>
                <div className="relative h-8 w-8 overflow-hidden rounded-full">
                  <Image
                    src="/placeholder.svg?height=32&width=32"
                    alt="プロフィール画像"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* ログアウト */}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (isLoggedInWithSupabase) {
                    await supabase.auth.signOut()
                  }
                  logout()
                }}
                className="text-gray-600"
              >
                ログアウト
              </Button>
            </>
          ) : (
            <>
              {/* ログイン */}
              <Button variant="ghost" size="sm" className="text-gray-600" asChild>
                <Link href="/auth/signin">
                  <LogIn className="mr-2 h-4 w-4" />
                  ログイン
                </Link>
              </Button>

              {/* 新規登録 */}
              <Button className="bg-red-600 hover:bg-red-700" asChild>
                <Link href="/auth/signup">無料ではじめる</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
