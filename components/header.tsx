/* ------------------------------------------------------------------
   components/header.tsx
   – 2025-05-16: 未ログイン時はパブリックヘッダーのみ表示
------------------------------------------------------------------*/
"use client";

import { useEffect, useState } from "react";
import Image      from "next/image";
import Link       from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, Mail, MessageSquare, LogIn,
  Menu, User, Briefcase, LogOut, ChevronDown,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase/client";

/* ---------- 型 ---------- */
type NavItem = { href: string; label: string; icon: React.ElementType };

/* ---------- student 用メインメニュー ---------- */
const studentMain: NavItem[] = [
  { href: "/student-dashboard", label: "マイページ", icon: LayoutDashboard },
  { href: "/jobs",              label: "求人",       icon: Search },
  { href: "/student/scouts",    label: "スカウト",   icon: Mail },
  { href: "/chat",              label: "チャット",   icon: MessageSquare },
];
/* ---------- マイページ配下 ---------- */
const studentSub: NavItem[] = [
  { href: "/student/profile", label: "プロフィール", icon: User },
  { href: "/resume",          label: "レジュメ",     icon: Briefcase },
];
/* ---------- company / admin ---------- */
const companyMain: NavItem[] = [
  { href: "/company-dashboard", label: "マイページ", icon: LayoutDashboard },
  { href: "/company/jobs",      label: "求人管理",   icon: Briefcase },
  { href: "/scout",             label: "スカウト",   icon: Mail },
  { href: "/chat",              label: "チャット",   icon: MessageSquare },
];
const adminMain: NavItem[] = [
  { href: "/admin-dashboard", label: "Admin", icon: LayoutDashboard },
];

/* ===================================================================== */
export default function Header() {
  const pathname = usePathname();
  const { ready, isLoggedIn, userType, user, logout } = useAuth();
  const [avatar, setAvatar] = useState<string | null>(null);

  /* Avatar 取得（student のみ・ログイン時のみ） */
  useEffect(() => {
    if (!isLoggedIn || userType !== "student" || !user) {
      setAvatar(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("student_profiles")
        .select("avatar")
        .eq("user_id", user.id)
        .maybeSingle();
      setAvatar(data?.avatar ?? null);
    })();
  }, [isLoggedIn, userType, user?.id]);

  /* メニュー切り替え（ログイン中だけ使う） */
  const main =
    userType === "company" ? companyMain
    : userType === "admin"   ? adminMain
    : studentMain; // student or null の場合

  /* ---------- Provider の判定が終わるまではプレースホルダだけ ---------- */
  if (!ready) {
    return (
      <header className="sticky top-0 z-30 h-14 border-b bg-white/70 backdrop-blur" />
    );
  }

  /* =================================================================== */
  return (
    <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* -------- 左ロゴ -------- */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="学生転職" width={120} height={32} priority />
        </Link>

        {/* -------- PC ナビ（ログイン時のみ） -------- */}
        {isLoggedIn && (
          <nav className="hidden gap-6 md:flex">
            {main.map(({ href, label, icon: Icon }) =>
              label === "マイページ" && userType === "student" ? (
                /* ▼ マイページはドロップダウン */
                <DropdownMenu key="mypage">
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-1 text-sm
                        ${pathname.startsWith("/student-dashboard")
                          ? "font-semibold"
                          : "text-gray-600 hover:text-gray-900"}`}
                    >
                      <Icon size={16} />
                      {label}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
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
                  className={`flex items-center gap-1 text-sm
                    ${pathname.startsWith(href)
                      ? "font-semibold"
                      : "text-gray-600 hover:text-gray-900"}`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            )}
          </nav>
        )}

        {/* -------- PC: Avatar / Login -------- */}
        <div className="hidden md:block">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt="avatar"
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <User size={20} />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-600 focus:bg-red-50"
                >
                  <LogOut size={16} className="mr-2" /> ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <LogIn size={16} /> ログイン
            </Link>
          )}
        </div>

        {/* -------- SP Hamburger -------- */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-64">
            <div className="mb-6 flex items-center gap-2">
              <Image src="/logo.png" alt="学生転職" width={24} height={24} />
              <span className="font-bold">学生転職</span>
            </div>

            {/* 未ログイン時はメインメニューを出さずに終了 */}
            {!isLoggedIn ? (
              <div className="space-y-4">
                <Link
                  href="/login"
                  className="block rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="block rounded-md bg-primary/90 px-3 py-2 text-sm text-white hover:bg-primary"
                >
                  新規登録
                </Link>
              </div>
            ) : (
              <>
                <nav className="space-y-2">
                  {main.map(({ href, label }) =>
                    label === "マイページ" && userType === "student" ? (
                      <div key="sp-mypage" className="space-y-1">
                        <p className="px-3 py-2 text-sm font-semibold">
                          マイページ
                        </p>
                        {studentSub.map(({ href, label }) => (
                          <Link
                            key={href}
                            href={href}
                            className="block rounded-md px-6 py-2 text-sm hover:bg-gray-100"
                          >
                            {label}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
                      >
                        {label}
                      </Link>
                    )
                  )}
                </nav>

                {/* SP ログアウト */}
                <hr className="my-3" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} /> ログアウト
                </button>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
