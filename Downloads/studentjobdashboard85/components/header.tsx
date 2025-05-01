"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, X, User, LogOut, Briefcase, MessageSquare, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { useMobile } from "@/hooks/use-mobile"

export function Header() {
  const { user, userRole, profile, signOut } = useAuth()
  const pathname = usePathname()
  const isMobile = useMobile()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isCompanyUser = userRole === "company"
  const isStudentUser = userRole === "student"
  const isAuthenticated = !!user

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const getInitials = () => {
    if (isCompanyUser && profile?.company_name) {
      return profile.company_name.charAt(0)
    }

    if (isStudentUser) {
      if (profile?.first_name && profile?.last_name) {
        return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
      }
      if (profile?.first_name) {
        return profile.first_name.charAt(0)
      }
    }

    return user?.email?.charAt(0).toUpperCase() || "U"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-red-600">GAKUTEN</span>
          </Link>

          {!isMobile && (
            <nav className="ml-6 hidden md:flex items-center gap-6">
              <Link
                href="/jobs"
                className={`text-sm font-medium transition-colors hover:text-red-600 ${
                  pathname === "/jobs" ? "text-red-600" : "text-foreground"
                }`}
              >
                求人を探す
              </Link>
              <Link
                href="/features"
                className={`text-sm font-medium transition-colors hover:text-red-600 ${
                  pathname === "/features" ? "text-red-600" : "text-foreground"
                }`}
              >
                サービス紹介
              </Link>
              <Link
                href="/grandprix"
                className={`text-sm font-medium transition-colors hover:text-red-600 ${
                  pathname === "/grandprix" ? "text-red-600" : "text-foreground"
                }`}
              >
                就活グランプリ
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {!isMobile && (
                <nav className="flex items-center gap-4">
                  {isStudentUser && (
                    <>
                      <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Briefcase className="h-4 w-4" />
                          <span className="hidden sm:inline">ダッシュボード</span>
                        </Button>
                      </Link>
                      <Link href="/messages">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span className="hidden sm:inline">メッセージ</span>
                        </Button>
                      </Link>
                    </>
                  )}

                  {isCompanyUser && (
                    <>
                      <Link href="/company/dashboard">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Briefcase className="h-4 w-4" />
                          <span className="hidden sm:inline">ダッシュボード</span>
                        </Button>
                      </Link>
                      <Link href="/company/jobs">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Briefcase className="h-4 w-4" />
                          <span className="hidden sm:inline">求人管理</span>
                        </Button>
                      </Link>
                    </>
                  )}
                </nav>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ""} alt={getInitials()} />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                    {!isMobile && (
                      <>
                        <span className="ml-2">
                          {isCompanyUser
                            ? profile?.company_name
                            : profile?.first_name
                              ? `${profile.first_name} ${profile.last_name || ""}`
                              : user?.email}
                        </span>
                        <ChevronDown className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{isCompanyUser ? "企業アカウント" : "学生アカウント"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isStudentUser && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="cursor-pointer">
                          <Briefcase className="mr-2 h-4 w-4" />
                          ダッシュボード
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          プロフィール
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/applications" className="cursor-pointer">
                          <Briefcase className="mr-2 h-4 w-4" />
                          応募履歴
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/messages" className="cursor-pointer">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          メッセージ
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {isCompanyUser && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/company/dashboard" className="cursor-pointer">
                          <Briefcase className="mr-2 h-4 w-4" />
                          ダッシュボード
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/company/jobs" className="cursor-pointer">
                          <Briefcase className="mr-2 h-4 w-4" />
                          求人管理
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/company/applications" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          応募者管理
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/company/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          企業情報
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {!isMobile && (
                <>
                  <Link href="/auth/signin">
                    <Button variant="ghost" size="sm">
                      ログイン
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      新規登録
                    </Button>
                  </Link>
                </>
              )}
            </>
          )}

          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>

      {/* モバイルメニュー */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-background p-4">
          <nav className="flex flex-col space-y-4">
            <Link href="/jobs" className="flex items-center py-2 text-lg font-medium" onClick={closeMobileMenu}>
              求人を探す
            </Link>
            <Link href="/features" className="flex items-center py-2 text-lg font-medium" onClick={closeMobileMenu}>
              サービス紹介
            </Link>
            <Link href="/grandprix" className="flex items-center py-2 text-lg font-medium" onClick={closeMobileMenu}>
              就活グランプリ
            </Link>

            {isAuthenticated ? (
              <>
                <div className="my-2 h-px bg-border" />
                {isStudentUser && (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex items-center py-2 text-lg font-medium"
                      onClick={closeMobileMenu}
                    >
                      <Briefcase className="mr-2 h-5 w-5" />
                      ダッシュボード
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center py-2 text-lg font-medium"
                      onClick={closeMobileMenu}
                    >
                      <User className="mr-2 h-5 w-5" />
                      プロフィール
                    </Link>
                    <Link
                      href="/applications"
                      className="flex items-center py-2 text-lg font-medium"
                      onClick={closeMobileMenu}
                    >
                      <Briefcase className="mr-2 h-5 w-5" />
                      応募履歴
                    </Link>
                    <Link
                      href="/messages"
                      className="flex items-center py-2 text-lg font-medium"
                      onClick={closeMobileMenu}
                    >
                      <MessageSquare className="mr-2 h-5 w-5" />
                      メッセージ
                    </Link>
                  </>
                )}
                {isCompanyUser && (
                  <>
                    <Link
                      href="/company/dashboard"
                      className="flex items-center py-2 text-lg font-medium"
                      onClick={closeMobileMenu}
                    >
                      <Briefcase className="mr-2 h-5 w-5" />
                      ダッシュボード
                    </Link>
                    <Link
                      href="/company/jobs"
                      className="flex items-center py-2 text-lg font-medium"
                      onClick={closeMobileMenu}
                    >
                      <Briefcase className="mr-2 h-5 w-5" />
                      求人管理
                    </Link>
                    <Link
                      href="/company/applications"
                      className="flex items-center py-2 text-lg font-medium"
                      onClick={closeMobileMenu}
                    >
                      <User className="mr-2 h-5 w-5" />
                      応募者管理
                    </Link>
                  </>
                )}
                <div className="my-2 h-px bg-border" />
                <button
                  className="flex items-center py-2 text-lg font-medium text-red-600"
                  onClick={() => {
                    signOut()
                    closeMobileMenu()
                  }}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <div className="my-2 h-px bg-border" />
                <Link
                  href="/auth/signin"
                  className="flex items-center py-2 text-lg font-medium"
                  onClick={closeMobileMenu}
                >
                  ログイン
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex items-center justify-center rounded-md bg-red-600 py-2 text-lg font-medium text-white hover:bg-red-700"
                  onClick={closeMobileMenu}
                >
                  新規登録
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
