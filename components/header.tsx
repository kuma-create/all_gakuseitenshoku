/* ------------------------------------------------------------------------
   components/header.tsx – 完全版
   - 「Dashboard」→「マイページ」
   - プロフィール／レジュメはドロップダウンへ
   - モバイルはハンバーガー＋ドロワー
------------------------------------------------------------------------- */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link              from "next/link";
import Image             from "next/image";
import { usePathname }   from "next/navigation";
import type { Session }  from "@supabase/supabase-js";
import {
  LayoutDashboard, Briefcase, Search, Mail, MessageSquare,
  LogIn, ShieldCheck, Send, Menu, X, User, FileText,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { useAuth }  from "@/lib/auth-context";
import { cn }       from "@/lib/utils";
import NotificationBell from "@/components/notification-bell";
import { Avatar }   from "@/components/avatar";
import { Button }   from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetTrigger, SheetContent, SheetClose,
} from "@/components/ui/sheet";

/* -------------------------------------------------- */
type IconType = React.ComponentType<{ size?: number }>;
interface NavItem { href: string; label: string; icon?: IconType }

/* ----- ナビ定義 ----- */
const studentLinks: NavItem[] = [
  { href: "/mypage",         label: "マイページ", icon: LayoutDashboard },
  { href: "/student/jobs",   label: "求人検索",   icon: Search          },
  { href: "/student/scouts", label: "スカウト",   icon: Mail            },
  { href: "/student/chat",   label: "チャット",   icon: MessageSquare   },
];

const mypageSub: NavItem[] = [
  { href: "/student/profile", label: "プロフィール", icon: User     },
  { href: "/student/resume",  label: "レジュメ",     icon: FileText },
];

const companyLinks: NavItem[] = [
  { href: "/company-dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/company/jobs",      label: "求人管理",       icon: Briefcase       },
  { href: "/company/scout",     label: "スカウト送信",   icon: Send            },
  { href: "/company/chat",      label: "チャット",       icon: MessageSquare   },
];

const adminLinks: NavItem[] = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

const landingLinks: NavItem[] = [
  { href: "/#features",     label: "特徴"       },
  { href: "/#how-it-works", label: "利用の流れ" },
  { href: "/grandprix",     label: "就活GP"    },
  { href: "/#faq",          label: "FAQ"       },
];

/* ================================================== */
export function Header() {
  const pathname = usePathname();
  const { isLoggedIn, userType, logout } = useAuth();

  const [session,   setSession]   = useState<Session | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  /* ---- session / avatar ---- */
  const fetchAvatar = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("student_profiles")
      .select("avatar_url")
      .eq("user_id", uid)
      .maybeSingle<{ avatar_url: string | null }>();
    setAvatarUrl(data?.avatar_url ?? null);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) fetchAvatar(data.session.user.id);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, ses) => {
      setSession(ses);
      if (ses) fetchAvatar(ses.user.id);
    });
    return () => subscription.unsubscribe();
  }, [fetchAvatar]);

  /* ---- nav pick ---- */
  let navLinks: NavItem[] = landingLinks;
  if (isLoggedIn) {
    if (userType === "admin")        navLinks = adminLinks;
    else if (userType === "company") navLinks = companyLinks;
    else if (userType === "student") navLinks = studentLinks;
  }

  /* -------------- render -------------- */
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-zinc-200/70 bg-white/80 px-4 backdrop-blur dark:border-zinc-700/40 dark:bg-zinc-900/80 lg:px-6">
      {/* logo */}
      <Link href="/" className="flex items-center space-x-2">
        <Image src="/logo.png" alt="学生転職ロゴ" width={120} height={120} />
      </Link>

      {/* ----------- desktop nav ----------- */}
      <nav className="hidden lg:block">
        <ul className="flex gap-6 text-sm font-medium text-gray-700 dark:text-gray-200">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              {label === "マイページ" && userType === "student" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Link
                      href={href}
                      className={cn("flex items-center gap-1", pathname.startsWith(href) && "text-red-600")}
                    >
                      {Icon && <Icon size={14} />} {label}
                    </Link>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    {mypageSub.map(({ href: sub, label: lab, icon: SubIcon }) => (
                      <DropdownMenuItem key={sub} asChild>
                        <Link href={sub} className="flex items-center gap-2">
                          {SubIcon && <SubIcon size={14} />}
                          {lab}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href={href}
                  className={cn("flex items-center gap-1", pathname.startsWith(href) && "text-red-600")}
                >
                  {Icon && <Icon size={14} />} {label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* ----------- desktop right ----------- */}
      <div className="hidden items-center gap-4 lg:flex">
        {isLoggedIn && <NotificationBell />}
        {isLoggedIn ? (
          <>
            <div className="h-8 w-8 overflow-hidden rounded-full">
              <Avatar src={avatarUrl} size={32} />
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-gray-600">
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

      {/* ----------- mobile ----------- */}
      <Sheet>
        <SheetTrigger asChild>
          <button className="lg:hidden" aria-label="open menu">
            <Menu />
          </button>
        </SheetTrigger>

        <SheetContent side="right" className="w-72 pt-10">
          <div className="flex items-center justify-between mb-6">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Avatar src={avatarUrl} size={40} />
                <span className="text-sm font-medium">{session?.user.email}</span>
              </div>
            ) : (
              <span className="text-sm font-medium">メニュー</span>
            )}
            <SheetClose asChild>
              <button aria-label="close menu"><X /></button>
            </SheetClose>
          </div>

          <ul className="space-y-4 text-sm">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                {label === "マイページ" && userType === "student" ? (
                  <>
                    <Link
                      href={href}
                      className="flex items-center gap-2 font-medium"
                      onClick={() => document.body.click()} /* close */
                    >
                      {Icon && <Icon size={16} />} {label}
                    </Link>
                    <ul className="ml-6 mt-2 space-y-3">
                      {mypageSub.map(({ href: sub, label: lab, icon: SubIcon }) => (
                        <li key={sub}>
                          <Link
                            href={sub}
                            className="flex items-center gap-2 text-gray-600"
                            onClick={() => document.body.click()}
                          >
                            {SubIcon && <SubIcon size={14} />}
                            {lab}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link
                    href={href}
                    className="flex items-center gap-2 font-medium"
                    onClick={() => document.body.click()}
                  >
                    {Icon && <Icon size={16} />} {label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {isLoggedIn ? (
              <Button variant="outline" className="w-full" onClick={logout}>
                ログアウト
              </Button>
            ) : (
              <Button asChild className="w-full bg-red-600 hover:bg-red-700">
                <Link href="/login">ログイン / 新規登録</Link>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
