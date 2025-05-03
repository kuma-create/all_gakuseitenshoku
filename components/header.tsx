"use client"

import Link from "next/link"
import { Bell, User, FileText, Mail, MessageSquare, Star, Search, LogIn, Trophy } from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

export function Header() {
  const pathname = usePathname()
  const { isLoggedIn, userType, user, logout } = useAuth()

  // 学生用のリンク
  const studentLinks = [
    { href: "/", label: "マイページ", icon: User },
    { href: "/resume", label: "職務経歴書", icon: FileText },
    { href: "/jobs", label: "求人一覧", icon: Search },
    { href: "/offers", label: "オファー一覧", icon: Mail },
    { href: "/chat", label: "チャット", icon: MessageSquare },
    { href: "/grandprix", label: "就活グランプリ", icon: Trophy },
    { href: "/features", label: "特集", icon: Star },
  ]

  // 企業用のリンク
  const companyLinks = [
    { href: "/company-dashboard", label: "ダッシュボード", icon: User },
    { href: "/company/jobs", label: "求人管理", icon: FileText },
    { href: "/company/applicants", label: "応募者", icon: Search },
    { href: "/company/scout", label: "スカウト", icon: Mail },
    { href: "/company/chat", label: "チャット", icon: MessageSquare },
    { href: "/grandprix", label: "就活グランプリ", icon: Trophy },
  ]

  // ランディングページ用のリンク
  const landingLinks = [
    { href: "/#features", label: "特徴" },
    { href: "/#how-it-works", label: "利用の流れ" },
    { href: "/#grandprix", label: "就活グランプリ" },
    { href: "/#testimonials", label: "利用者の声" },
    { href: "/#faq", label: "よくある質問" },
  ]

  // パスがルートパスかどうかを確認（ランディングページかどうか）
  const isLandingPage = pathname === "/"

  // 現在のユーザータイプに基づいてリンクを選択
  const links = userType === "company" ? companyLinks : studentLinks

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 shadow-sm backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded bg-red-600">
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">学</span>
            </div>
            <span className="text-xl font-bold text-red-600">学生転職</span>
          </Link>
        </div>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-6">
            {isLoggedIn
              ? // ログイン済みの場合はダッシュボード用のナビゲーションを表示
                links.map((link) => {
                  const isActive = pathname === link.href
                  const Icon = link.icon
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-red-600 ${
                          isActive ? "text-red-600" : "text-gray-600"
                        }`}
                      >
                        <Icon size={18} />
                        {link.label}
                      </Link>
                    </li>
                  )
                })
              : // 未ログインの場合はランディングページ用のナビゲーションを表示
                landingLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-gray-600 transition-colors hover:text-red-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            // ログイン済みの場合
            <>
              <button className="relative" aria-label="通知">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                  2
                </span>
              </button>
              <div className="flex items-center gap-2">
                <div className="hidden text-sm font-medium text-gray-700 md:block">{user?.name}</div>
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
              <Button variant="ghost" size="sm" onClick={logout} className="text-gray-600">
                ログアウト
              </Button>
            </>
          ) : (
            // 未ログインの場合
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <LogIn className="mr-2 h-4 w-4" />
                  ログイン
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-red-600 hover:bg-red-700">無料ではじめる</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
