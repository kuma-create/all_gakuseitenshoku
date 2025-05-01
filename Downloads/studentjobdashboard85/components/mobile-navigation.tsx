"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { Home, User, Briefcase, MessageSquare, FileText, Award, Newspaper, LogOut, Bell } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface MobileNavigationProps {
  onClose: () => void
}

export function MobileNavigation({ onClose }: MobileNavigationProps) {
  const pathname = usePathname()
  const { user, userRole, profile, signOut } = useAuth()

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/")

  // 未ログイン時のナビゲーションリンク
  const publicNavLinks = [
    { href: "/", label: "ホーム", icon: Home },
    { href: "/jobs", label: "求人検索", icon: Briefcase },
    { href: "/grandprix", label: "就活グランプリ", icon: Award },
    { href: "/features", label: "特集", icon: Newspaper },
  ]

  // 学生ユーザー向けのナビゲーションリンク
  const studentNavLinks = [
    { href: "/dashboard", label: "マイページ", icon: User },
    { href: "/jobs", label: "求人検索", icon: Briefcase },
    { href: "/applications", label: "応募管理", icon: FileText },
    { href: "/messages", label: "メッセージ", icon: MessageSquare },
    { href: "/notifications", label: "通知", icon: Bell },
  ]

  // 企業ユーザー向けのナビゲーションリンク
  const companyNavLinks = [
    { href: "/company/dashboard", label: "ダッシュボード", icon: User },
    { href: "/company/jobs", label: "求人管理", icon: Briefcase },
    { href: "/company/applications", label: "応募者管理", icon: FileText },
    { href: "/company/messages", label: "メッセージ", icon: MessageSquare },
    { href: "/notifications", label: "通知", icon: Bell },
  ]

  // ユーザーの種類に応じたナビゲーションリンクを取得
  const getNavLinks = () => {
    if (!user) return publicNavLinks
    return userRole === "company" ? companyNavLinks : studentNavLinks
  }

  const navLinks = getNavLinks()

  // プロフィールリンクを取得
  const getProfileLink = () => {
    if (!user) return "/auth/signin"
    return userRole === "company" ? "/company/profile" : "/profile"
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="absolute right-0 top-16 h-[calc(100vh-4rem)] w-64 overflow-y-auto bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {user ? (
          // ログイン済みの場合
          <>
            <div className="mb-6 flex items-center border-b pb-4">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                <Image
                  src={profile?.avatar_url || "/mystical-forest-spirit.png"}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <div className="ml-3">
                <p className="font-medium">
                  {userRole === "company"
                    ? profile?.company_name || "企業アカウント"
                    : `${profile?.first_name || ""} ${profile?.last_name || ""}`}
                </p>
                <p className="text-sm text-gray-500">{profile?.email}</p>
              </div>
            </div>

            <nav>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center rounded-md px-3 py-2 text-sm ${
                        isActive(link.href) ? "bg-red-50 text-red-600 font-medium" : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={onClose}
                    >
                      {link.icon && <link.icon className="mr-3 h-5 w-5" />}
                      {link.label}
                      {link.label === "通知" && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
                          3
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    ログアウト
                  </button>
                </li>
              </ul>
            </nav>
          </>
        ) : (
          // 未ログインの場合
          <>
            <div className="mb-6 border-b pb-4">
              <h3 className="font-medium">メニュー</h3>
            </div>

            <nav>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center rounded-md px-3 py-2 text-sm ${
                        isActive(link.href) ? "bg-red-50 text-red-600 font-medium" : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={onClose}
                    >
                      {link.icon && <link.icon className="mr-3 h-5 w-5" />}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-6 space-y-2">
              <Link
                href="/auth/signin"
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm hover:bg-gray-50"
                onClick={onClose}
              >
                ログイン
              </Link>
              <Link
                href="/auth/signup"
                className="block w-full rounded-md bg-red-600 px-4 py-2 text-center text-sm text-white hover:bg-red-700"
                onClick={onClose}
              >
                新規登録
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MobileNavigation
