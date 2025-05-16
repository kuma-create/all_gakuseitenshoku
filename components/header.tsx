/* ------------------------------------------------------------------------
   components/header.tsx
   - 2025-05-16: マイページをドロップダウン化（プロフィール／レジュメ）
------------------------------------------------------------------------- */
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

/* ---------------- 型 ---------------- */
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
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
];

/* ===================================================================== */
export default function Header() {
  const pathname = usePathname();
  const { isLoggedIn, userType, user, logout } = useAuth();
  const [avatar, setAvatar] = useState<string | null>(null);

  /* Avatar 取得（student のみ） */
  useEffect(() => {
    if (!user || userType !== "student") {
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
  }, [user?.id, userType]);

  /* メニュー切り替え */
  const main = userType === "company" ? companyMain
             : userType === "admin"   ? adminMain
             : studentMain;

  /* ==================================================== JSX */
  return (
    <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* -------- 左ロゴ -------- */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="学生転職" width={120} height={32} />
        </Link>

        {/* -------- PC ナビ -------- */}
        <nav className="hidden gap-6 md:flex">
          {main.map(({ href, label, icon: Icon }) =>
            label === "マイページ" && userType === "student" ? (
              /* ▼ マイページはドロップダウン */
              <DropdownMenu key="mypage">
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-1 text-sm hover:text-gray-900
                      ${pathname.startsWith("/student-dashboard") ? "font-semibold" : "text-gray-600"}`}
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
                  ${pathname.startsWith(href) ? "font-semibold" : "text-gray-600"}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          )}
        </nav>

        {/* -------- PC: Avatar / Login -------- */}
        <div className="hidden md:block">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  {avatar ? (
                    <Image src={avatar} alt="avatar" width={32} height={32} className="rounded-full" />
                  ) : (
                    <User size={20} />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:bg-red-50">
                  <LogOut size={16} className="mr-2" /> ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="flex items-center gap-1 text-sm text-gray-600">
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

            <nav className="space-y-2">
              {main.map(({ href, label }) =>
                label === "マイページ" && userType === "student" ? (
                  <div key="sp-mypage" className="space-y-1">
                    <p className="px-3 py-2 text-sm font-semibold">マイページ</p>
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

              {isLoggedIn && (
                <>
                  <hr className="my-3" />
                  <button
                    onClick={logout}
                    className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    ログアウト
                  </button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
