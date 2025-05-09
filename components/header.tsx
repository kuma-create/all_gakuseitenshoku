/* ------------------------------------------------------------------------
   components/header.tsx
   - 左ロゴ＋役割別ナビゲーション
------------------------------------------------------------------------- */
"use client"

import { useEffect, useState } from "react"
import Link         from "next/link"
import Image        from "next/image"
import { usePathname } from "next/navigation"
import type { Session } from "@supabase/supabase-js"
import {
  Bell, LayoutDashboard, User, Briefcase, Search, Mail,
  MessageSquare, Trophy, Star, LogIn, Building2, ShieldCheck,
  LucideIcon,
} from "lucide-react"

import { Button }   from "@/components/ui/button"
import { LazyImage } from "@/components/ui/lazy-image"
import { supabase } from "@/lib/supabase/client"
import { useAuth }  from "@/lib/auth-context"
import { cn }       from "@/lib/utils"
import NotificationBell from "@/components/notification-bell"

/* ------------------------------------------------------------------ */
/*                             型定義                                  */
/* ------------------------------------------------------------------ */
type NavItem = { href: string; label: string; icon?: LucideIcon }

/* ------------------------ 各ロールのリンク ------------------------- */
const studentLinks: NavItem[] = [
  { href: "/student-dashboard", label: "Dashboard",     icon: LayoutDashboard },
  { href: "/student/profile",   label: "プロフィール",   icon: User },
  { href: "/student/resume",    label: "職務経歴",       icon: Briefcase },
  { href: "/jobs",              label: "求人一覧",       icon: Search },
  { href: "/offers",            label: "オファー一覧",   icon: Mail },
  { href: "/chat",              label: "チャット",       icon: MessageSquare },
  { href: "/grandprix",         label: "就活グランプリ", icon: Trophy },
  { href: "/features",          label: "特集",           icon: Star },
]

const companyLinks: NavItem[] = [
  { href: "/company-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/company/jobs",      label: "求人管理",   icon: Briefcase },
  { href: "/chat",              label: "チャット",   icon: MessageSquare },
]

const adminLinks: NavItem[] = [
  { href: "/admin",             label: "管理画面",         icon: ShieldCheck },
  { href: "/company-dashboard", label: "企業ダッシュボード", icon: Building2 },
]

const landingLinks: NavItem[] = [
  { href: "/#features",     label: "特徴" },
  { href: "/#how-it-works", label: "利用の流れ" },
  { href: "/grandprix",     label: "就活グランプリ" },
  { href: "/#testimonials", label: "利用者の声" },
  { href: "/#faq",          label: "よくある質問" },
]

/* ------------------------------------------------------------------ */
/*                               Header                                */
/* ------------------------------------------------------------------ */
export function Header() {
  const pathname  = usePathname()
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

  /* ---- 役割に応じてリンク切替 ---- */
  let navLinks: NavItem[] = landingLinks
  if (isLoggedIn || session) {
    if      (userType === "admin")   navLinks = adminLinks
    else if (userType === "company") navLinks = companyLinks
    else                             navLinks = studentLinks
  }

  /* ---------------- render ---------------- */
  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 md:px-6">
        {/* ------ ロゴ ------ */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Culture ロゴ"
            width={80}
            height={80}
            priority
            className="h-32 w-32 object-contain"
          />
        </Link>

        {/* ------ グローバルナビ (PC) ------ */}
        <nav className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-red-600",
                      active ? "text-red-600" : "text-gray-600",
                    )}
                  >
                    {Icon && <Icon size={18} />}
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* ------ 右ユーティリティ ------ */}
        <div className="flex items-center gap-4">
          {(isLoggedIn || session) ? (
            <>
              {/* 通知ベル */}
              <NotificationBell />

              {/* アバター */}
              <div className="flex items-center gap-2">
                <span className="hidden text-sm font-medium text-gray-700 md:block">
                  {user?.name ||
                    session?.user?.user_metadata?.full_name ||
                    "ユーザー"}
                </span>
                <div className="relative h-8 w-8 overflow-hidden rounded-full">
                  <LazyImage
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
            /* ----- 未ログイン時：ログイン＋新規登録 ----- */
            <>
              <Button asChild variant="ghost" size="sm" className="text-gray-600">
                <Link href="/login">
                  <LogIn className="mr-1 h-4 w-4" />
                  ログイン
                </Link>
              </Button>

              <Button asChild size="sm" className="bg-red-600 text-white hover:bg-red-700">
                <Link href="/signup">
                  新規登録
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ナビ折返し防止 */}
      <style jsx global>{`
        @media (min-width: 1024px) {
          header nav ul { flex-wrap: nowrap; }
        }
      `}</style>
    </header>
  )
}
