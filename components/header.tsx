"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  Bell, LayoutDashboard, User, Briefcase, Search, Mail,
  MessageSquare, Trophy, Star, LogIn,
} from "lucide-react"

import { Button }      from "@/components/ui/button"
import { supabase }    from "@/lib/supabase/client"
import { useAuth }     from "@/lib/auth-context"
import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"

export function Header() {
  const pathname = usePathname()
  const { isLoggedIn, userType, user, logout } = useAuth()
  const [session, setSession] = useState<Session | null>(null)

  /* ---- Supabase セッション監視 ---- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, ses) => setSession(ses),
    )
    return () => subscription.unsubscribe()
  }, [])

  /* ---- リンク定義 ---- */
  const studentLinks = [
    { href: "/student-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/profile",    label: "プロフィール", icon: User },
    { href: "/student/resume",     label: "職務経歴",   icon: Briefcase },
    { href: "/jobs",               label: "求人一覧",   icon: Search },
    { href: "/offers",             label: "オファー一覧", icon: Mail },
    { href: "/chat",               label: "チャット",   icon: MessageSquare },
    { href: "/grandprix",          label: "就活グランプリ", icon: Trophy },
    { href: "/features",           label: "特集",       icon: Star },
  ] as const

  const landingLinks = [
    { href: "/#features",    label: "特徴" },
    { href: "/#how-it-works",label: "利用の流れ" },
    { href: "/#grandprix",   label: "就活グランプリ" },
    { href: "/#testimonials",label: "利用者の声" },
    { href: "/#faq",         label: "よくある質問" },
  ] as const

  const navLinks = isLoggedIn || session ? studentLinks : landingLinks

  /* ---------------- render ---------------- */
  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 md:px-6">
        {/* ロゴ -------------------------------------------------- */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden rounded bg-red-600">
            <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
              学
            </span>
          </div>
          <span className="text-xl font-bold text-red-600">学生転職</span>
        </Link>

        {/* グローバルナビ（PC） ---------------------------------- */}
        <nav className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {navLinks.map(({ href, label, icon: Icon }: any) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors
                      hover:text-red-600 ${active ? "text-red-600" : "text-gray-600"}`}
                  >
                    {Icon && <Icon size={18} />}
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* 右側ユーティリティ ----------------------------------- */}
        <div className="flex items-center gap-4">
          {(isLoggedIn || session) ? (
            <>
              {/* 通知ベル */}
              <button aria-label="通知" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                  2
                </span>
              </button>

              {/* アバター */}
              <div className="flex items-center gap-2">
                <span className="hidden text-sm font-medium text-gray-700 md:block">
                  {user?.name || session?.user?.user_metadata?.full_name || "ユーザー"}
                </span>
                <div className="relative h-8 w-8 overflow-hidden rounded-full">
                  <Image
                    src="/placeholder.svg?width=32&height=32"
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
                  if (session) await supabase.auth.signOut()
                  logout()
                }}
                className="text-gray-600"
              >
                ログアウト
              </Button>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm" className="text-gray-600">
              <Link href="/login">
                <LogIn className="mr-1 h-4 w-4" />
                ログイン
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ---------- 横スクロール可能にする小さな工夫 ---------- */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          header nav ul { flex-wrap: nowrap; }
        }
      `}</style>
    </header>
  )
}
