/* ------------------------------------------------------------------
   components/header.tsx
   – 決定版：未ログインでも常にロゴ＋ログインが表示される
------------------------------------------------------------------*/
"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import NotificationsList from "@/app/notifications/NotificationsList"
import Image from "next/image";
import Link  from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Search, Mail, MessageSquare, Bell,
  LogIn, Menu, User, Briefcase, LogOut, ChevronDown, BookOpen, Key,
  GraduationCap, Newspaper, Sparkles
} from "lucide-react";
import {
  Sheet, SheetContent, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button }   from "@/components/ui/button";
import { useAuth }  from "@/lib/auth-context";
import { supabase } from "@/lib/supabase/client";

/* ---------- 型 ---------- */
type NavItem = { href: string; label: string; icon: React.ElementType };

/* ---------- student 用メインメニュー ---------- */
const studentMain: NavItem[] = [
  { href: "/student-dashboard", label: "マイページ", icon: LayoutDashboard },
  { href: "/jobs",              label: "探す",       icon: Search },
  { href: "/offers",            label: "スカウト",   icon: Mail },
  { href: "/chat",              label: "チャット",   icon: MessageSquare },
  { href: "/ipo/dashboard",     label: "IPO大学",    icon: GraduationCap },
  { href: "/media",             label: "学転メディア", icon: Newspaper },
  { href: "/features",          label: "特集",       icon: Sparkles },
];
/* ---------- マイページ配下 ---------- */
const studentSub: NavItem[] = [
  { href: "/student-dashboard",          label: "マイページ",     icon: LayoutDashboard },
  { href: "/student/profile", label: "プロフィール", icon: User },
  { href: "/resume",          label: "職務経歴書",     icon: Briefcase },
];
/* ---------- company / admin ---------- */
const companyMain: NavItem[] = [
  { href: "/company-dashboard", label: "マイページ", icon: LayoutDashboard },
  { href: "/company/my-company", label: "自社管理", icon: LayoutDashboard },
  { href: "/company/jobs",      label: "求人・選考管理",   icon: Briefcase },
  { href: "/company/scout",             label: "スカウト",   icon: Mail },
  { href: "/company/chat",              label: "チャット",   icon: MessageSquare },
 /* { href: "/company/analytics",              label: "アナリティクス",   icon: MessageSquare },*/
  { href: "/company/applicants",              label: "応募者一覧",   icon: MessageSquare },
];
const adminMain: NavItem[] = [
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
  { href: "/admin/media", label: "記事", icon: LayoutDashboard },
];

/* ---------- Notification Bell ---------- */
function NotificationBell({ userId }: { userId: string }) {
  const [unread, setUnread] = useState<number>(0)

  /* 初期未読数 */
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error custom RPC not in generated Supabase types
    supabase.rpc<number>("count_unread", { _uid: userId }).then(({ data }) => {
      setUnread(Number(data) || 0)
    })
  }, [userId])

  /* Realtime 追加 & 既読更新 */
  useEffect(() => {
    const ch = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          if (payload.eventType === "INSERT") {
            setUnread(c => c + 1)
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.is_read && !payload.old.is_read) {
              setUnread(c => Math.max(0, c - 1))
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [userId])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted focus:outline-none"
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 max-h-[70vh] overflow-y-auto p-0">
        <Suspense fallback={<p className="p-4 text-sm text-gray-400">読み込み中…</p>}>
          <NotificationsList userId={userId} />
        </Suspense>
      </PopoverContent>
    </Popover>
  )
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    ready, isLoggedIn, session, userType, user, logout,
  } = useAuth();

  // --- Hooks must not be conditional. Always declare before any early return. ---
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !isLoggedIn || userType !== "student" || !user) {
      setAvatar(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("student_profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setAvatar(data?.avatar_url ?? null);
    })();
  }, [ready, isLoggedIn, userType, user?.id]);

  // Helper for logout that redirects to "/"
  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  /* ロール判定 */
  const isCompanySide = userType === "company" || userType === "company_admin";

  /* ---------- メインメニュー ---------- */
  const main: NavItem[] =
    isCompanySide ? companyMain
    : userType === "admin" ? adminMain
    : studentMain;

  // --- IPO専用分岐（/ipo または /lp/students/27 ページではヘッダーを描画しない） ---
  const isIpoOrLpStudents27 = pathname.startsWith("/ipo") || pathname.startsWith("/lp/students/27");
  if (isIpoOrLpStudents27) {
    return null;
  }

  /* ---------- UI ---------- */
  return (
    <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* ===== 左ロゴ ===== */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="学生転職" width={120} height={32} priority />
        </Link>
        {/* 未ログイン時に表示するトップナビ（PC） */}
        {ready && !isLoggedIn && (
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/jobs"
              className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
            >
              <Search size={16} />
              探す
            </Link>
            <Link
              href="/ipo"
              className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
            >
              <GraduationCap size={16} />
              IPO大学
            </Link>
            <Link
              href="/lp/students/gakuten"
              className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
            >
              <Briefcase size={16} />
              学転インターン
            </Link>                        
            <Link
              href="/media"
              className="flex items-center gap-1 text-sm text-gray-700 font-semibold hover:text-gray-900"
            >
              <BookOpen size={16} />
              学転メディア
            </Link>
          </nav>
        )}

        {/* ===== PC ナビ ===== */}
        {ready && isLoggedIn && (
          <nav className="hidden gap-6 md:flex">
            {main.map(({ href, label, icon: Icon }) =>
              label === "マイページ" && userType === "student" ? (
                /* ▼ student 用ドロップダウン */
                <DropdownMenu key="mypage">
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-1 text-sm ${
                        pathname.startsWith("/student-dashboard")
                          ? "font-semibold"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent forceMount sideOffset={4} align="start">
                    {studentSub.map(({ href, label }) => (
                      <DropdownMenuItem asChild key={href}>
                        <Link href={href}>{label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                /* ▼ 通常リンク */
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1 text-sm ${
                    pathname.startsWith(href)
                      ? "font-semibold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            )}
          </nav>
        )}

        {/* ===== PC: Notifications + Avatar / Login ===== */}
        <div className="hidden md:flex items-center gap-4">
          {ready && isLoggedIn && session?.user && (
            <NotificationBell userId={session.user.id} />
          )}

          {ready && isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt="avatar"
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User size={20} />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/forgot-password" className="flex items-center">
                    <Key size={16} className="mr-2" /> パスワード変更
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:bg-red-50"
                >
                  <LogOut size={16} className="mr-2" /> ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="flex items-center gap-1 text-sm text-gray-600 transition hover:text-primary-700 hover:underline"
              >
                <LogIn size={16} /> ログイン
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-primary/80 to-primary px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                新規登録
              </Link>
            </div>
          )}
        </div>

          {/* -- SP: Notification + Hamburger (mobile) -- */}
          <div className="flex items-center gap-2 ml-auto md:hidden">
            {/* Bell → ログイン中のみ */}
            {ready && isLoggedIn && session?.user && (
              <NotificationBell userId={session.user.id} />
            )}

            {/* ログインしていない場合のリンク */}
            {ready && !isLoggedIn && (
              <Link
                href="/login"
                className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                ログインはこちら
              </Link>
            )}

            {/* Hamburger Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-64">
                <div className="mb-6 flex items-center gap-2">
                  <Image src="/logo.png" alt="学生転職" width={24} height={24} />
                  <span className="font-bold">学生転職</span>
                </div>

                {/* ---- 未ログイン ---- */}

                {/* ---- 未ログイン ---- */}
                {!ready || !isLoggedIn ? (
                  <div className="space-y-4">
                    <SheetClose asChild>
                      <Link
                        href="/jobs"
                        className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        探す
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/media"
                        className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        学転メディア
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/login"
                        className="block rounded-md px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 hover:text-primary-700 hover:underline"
                      >
                        ログイン
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/signup"
                        className="block rounded-full bg-gradient-to-r from-primary/80 to-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        新規登録
                      </Link>
                    </SheetClose>
                  </div>
                ) : (
                  /* ---- ログイン済み ---- */
                  <>
                    <nav className="space-y-2">
                      {main.map(({ href, label }) =>
                        label === "マイページ" && userType === "student" ? (
                          <div key="sp-mypage" className="space-y-1">
                            <p className="px-3 py-2 text-sm font-semibold">マイページ</p>
                            {studentSub.map(({ href, label }) => (
                              <SheetClose asChild key={href}>
                                <Link
                                  href={href}
                                  className="block rounded-md px-6 py-2 text-sm hover:bg-gray-100"
                                >
                                  {label}
                                </Link>
                              </SheetClose>
                            ))}
                          </div>
                        ) : (
                          <SheetClose asChild key={href}>
                            <Link
                              href={href}
                              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                            >
                              {label}
                            </Link>
                          </SheetClose>
                        )
                      )}
                    </nav>
                    <hr className="my-3" />
                    <SheetClose asChild>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={16} /> ログアウト
                      </button>
                    </SheetClose>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </div>
      </div>
    </header>
  );
}
