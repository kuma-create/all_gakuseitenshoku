/* ------------------------------------------------------------------------
   components/header.tsx
   - 左ロゴ＋役割別ナビゲーション
------------------------------------------------------------------------- */
"use client"

import { useEffect, useState } from "react"
import Link            from "next/link"
import Image           from "next/image"
import { usePathname, useRouter } from "next/navigation"   // ← ★ useRouter 追加
import type { Session } from "@supabase/supabase-js"
import {
  Bell, LayoutDashboard, User, Briefcase, Search, Mail,
  MessageSquare, Trophy, Star, LogIn, ShieldCheck, Send,
  LucideIcon,
} from "lucide-react"

import { supabase } from "@/lib/supabase/client"
import { useAuth }  from "@/lib/auth-context"
import { cn }       from "@/lib/utils"
import NotificationBell from "@/components/notification-bell"
import { Avatar }   from "@/components/avatar"
import { Button }   from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*                             型定義                                  */
/* ------------------------------------------------------------------ */
type NavItem = { href: string; label: string; icon?: LucideIcon }

/* ------------------------ 各ロールのリンク ------------------------- */
const studentLinks: NavItem[] = [
  { href: "/student-dashboard", label: "Dashboard",     icon: LayoutDashboard },
  { href: "/student/profile",   label: "プロフィール",   icon: User },
  { href: "/student/resume",    label: "レジュメ",       icon: Briefcase },
  { href: "/student/jobs",      label: "求人検索",       icon: Search },
  { href: "/student/scouts",    label: "スカウト",       icon: Mail },
  { href: "/student/chat",      label: "チャット",       icon: MessageSquare },
]

const companyLinks: NavItem[] = [
  { href: "/company-dashboard", label: "Dashboard",  icon: LayoutDashboard },
  { href: "/company/jobs",      label: "求人管理",    icon: Briefcase },
  { href: "/company/scout",     label: "スカウト送信", icon: Send },
  { href: "/company/chat",      label: "チャット",    icon: MessageSquare },
]

const adminLinks: NavItem[] = [
  { href: "/admin",     label: "Admin",    icon: ShieldCheck },
  { href: "/grandprix", label: "GP",       icon: Trophy },
  { href: "/ranking",   label: "Ranking",  icon: Star },
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
  const pathname = usePathname()
  const router   = useRouter()
  const { isLoggedIn, userType, logout } = useAuth()

  const [session,   setSession]  = useState<Session | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  /* ---- Supabase セッション監視 ---- */
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      if (data.session) await fetchAvatar(data.session.user.id)
    }
    init()

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (_e, ses) => {
        setSession(ses)
        if (ses) await fetchAvatar(ses.user.id)
      })

    return () => subscription.unsubscribe()
  }, [])

  /* ------- avatar_url を student_profiles から取得 ------- */
  const fetchAvatar = async (uid: string) => {
    if (!uid) return;
    const { data } = await supabase
      .from("student_profiles")
      .select("avatar_url")
      .eq("user_id", uid)
      .maybeSingle<{ avatar_url: string | null }>()
    setAvatarUrl(data?.avatar_url ?? null)
  }

  /* ---- ログアウト処理 ---- */
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("signOut error:", error)
      return
    }
    logout()
    router.replace("/")
  }

  /* ---- 役割に応じてリンク切替 ---- */
  let navLinks: NavItem[] = landingLinks
  if (isLoggedIn) {
    if (userType === "admin")        navLinks = adminLinks
    else if (userType === "company") navLinks = companyLinks
    else if (userType === "student") navLinks = studentLinks
  }

  /* ---------------- render ---------------- */
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-zinc-200/70 bg-white/80 px-4 backdrop-blur dark:border-zinc-700/40 dark:bg-zinc-900/80 lg:px-6">
      {/* ----- 左 : ロゴ ----- */}
      <Link href="/" className="flex items-center space-x-2">
        <Image src="/logo.svg" alt="logo" width={24} height={24} />
      </Link>

      {/* ----- 中央 : ナビゲーション ----- */}
      <nav className="hidden lg:block">
        <ul className="flex flex-wrap gap-4 text-sm font-medium text-gray-700 dark:text-gray-200">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-1",
                  pathname.startsWith(href) && "text-red-600",
                )}
              >
                {Icon && <Icon size={14} className="shrink-0" />}
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ----- 右端 : 通知 & ユーザー ----- */}
      <div className="flex items-center gap-4">
        {isLoggedIn && <NotificationBell />}
        {isLoggedIn ? (
          <>
            {/* Avatar */}
            <div className="h-8 w-8 overflow-hidden rounded-full">
              <Avatar src={avatarUrl} size={32} />
            </div>
            {/* ログアウト */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600"
            >
              ログアウト
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm" className="text-gray-600">
              <Link href="/login">
                <LogIn className="mr-1 h-4 w-4" />
                ログイン
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-red-600 text-white hover:bg-red-700">
              <Link href="/signup">新規登録</Link>
            </Button>
          </>
        )}
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
