/* ------------------------------------------------------------------------
   components/header.tsx
   - 左ロゴ + 役割別ナビゲーション（レスポンシブ対応版）
   - 2025-05-16 リファクタ: Dashboard → マイページ / アイテム整理
------------------------------------------------------------------------- */
"use client";

import { useEffect, useState } from "react";
import Image      from "next/image";
import Link       from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, Mail, MessageSquare, LogIn,
  Menu, User, Briefcase, LogOut,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

/* --------------------- NavItem 型 --------------------- */
type NavItem = { href: string; label: string; icon: React.ElementType };

/* --------------------- 役割別メニュー ------------------ */
const studentMain: NavItem[] = [
  { href: "/student-dashboard",        label: "マイページ", icon: LayoutDashboard },
  { href: "/jobs",          label: "求人",       icon: Search },
  { href: "/student/scouts",label: "スカウト",   icon: Mail },
  { href: "/chat",          label: "チャット",   icon: MessageSquare },
];
const studentSub: NavItem[] = [
  { href: "/student/profile", label: "プロフィール", icon: User },
  { href: "/student/resume",  label: "レジュメ",     icon: Briefcase },
];

const companyMain: NavItem[] = [
  { href: "/company-dashboard", label: "マイページ", icon: LayoutDashboard },
  { href: "/company/jobs",      label: "求人管理",   icon: Briefcase },
  { href: "/scout",             label: "スカウト",   icon: Mail },
  { href: "/chat",              label: "チャット",   icon: MessageSquare },
];
const companySub: NavItem[] = []; // 今後追加あればここへ

const adminMain: NavItem[] = [
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
];

/* --------------------- Header ------------------------- */
export default function Header() {
  const pathname          = usePathname();
  const [session, setSes] = useState<Session | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  /* 初期化 */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSes(session);
      if (session) await fetchAvatar(session.user.id);
    };
    init();

    const { data: { subscription } } = supabase.auth
      .onAuthStateChange((_e, s) => {
        setSes(s);
        if (s) fetchAvatar(s.user.id);
      });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAvatar = async (uid: string) => {
    const { data } = await supabase
      .from("student_profiles")
      .select("avatar_url")
      .eq("user_id", uid)
      .maybeSingle();
    setAvatar(data?.avatar_url ?? null);
  };

  /* 役割解決（簡易版） */
  const role = session?.user.user_metadata.role ?? "guest";
  const main  = role === "company" ? companyMain
             : role === "admin"   ? adminMain
             : studentMain;
  const sub   = role === "company" ? companySub : studentSub;

  /* ---------------- JSX ---------------- */
  return (
    <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* ---------- 左：ロゴ ---------- */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Make Culture"
            width={24}
            height={24}
            className="rounded-md"
          />
        </Link>

        {/* ---------- PC：ナビ ---------- */}
        <nav className="hidden gap-6 md:flex">
          {main.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1 text-sm
                ${pathname.startsWith(href) ? "font-semibold" : "text-gray-600"}`
              }
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* ---------- PC：アバター or ログイン ---------- */}
        <div className="hidden md:block">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt="avatar"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <User size={20} />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sub.map(({ href, label }) => (
                  <DropdownMenuItem asChild key={href}>
                    <Link href={href}>{label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => supabase.auth.signOut()}
                  className="text-red-600 focus:bg-red-50"
                >
                  <LogOut size={16} className="mr-2" /> ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 text-sm text-gray-600"
            >
              <LogIn size={16} /> ログイン
            </Link>
          )}
        </div>

        {/* ---------- SP：ハンバーガー ---------- */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <div className="mb-6 flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="Make Culture"
                width={24}
                height={24}
                className="rounded-md"
              />
              <span className="font-bold">学生転職</span>
            </div>
            <nav className="space-y-2">
              {main.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 rounded-md px-3 py-2
                             text-sm hover:bg-gray-100"
                >
                  {label}
                </Link>
              ))}
              {session && (
                <>
                  <hr className="my-3" />
                  {sub.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="block rounded-md px-3 py-2 text-sm
                                 hover:bg-gray-100"
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2
                               text-sm text-red-600 hover:bg-red-50"
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
