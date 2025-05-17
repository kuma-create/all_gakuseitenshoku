/* ------------------------------------------------------------------
   middleware.ts  – 画像等はスルーしつつ
   /grandprix/{business|webtest|case}(/**) は「ログイン必須」に変更
   ※ ロール判定は当面外す
------------------------------------------------------------------ */
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient }        from "@supabase/auth-helpers-nextjs";
import type { Database }                 from "@/lib/supabase/types";

/* ---------- 設定 ---------- */
const STATIC_RE = /\.(png|jpe?g|webp|svg|gif|ico|css|js|json|txt|xml|webmanifest)$/i;

/** 現状 “ログイン必須” にするサブパスはなし */
const LOGIN_REQUIRED_PREFIXES: string[] = []; // グランプリ系ページも公開扱いにする

/** 誰でも見られるパス（静的 LP など）*/
const PUBLIC_PREFIXES = [
  "/",                 // トップ
  "/grandprix",        // グランプリ一覧ページ
  "/api",
  "/auth/reset",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = createMiddlewareClient<Database>({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  const hasAccessCookie = req.cookies.has('sb-access-token');
  const { pathname } = req.nextUrl;

  /* ---------- ① 静的アセットは即通過 ---------- */
  if (STATIC_RE.test(pathname)) return res;

  /* ---------- ② 「ログイン必須」ページ判定 ---------- */
  const needsLogin = LOGIN_REQUIRED_PREFIXES
    .some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (needsLogin && (!session || !hasAccessCookie)) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  /* ---------- ③ 公開ページかどうか ---------- */
  const isLoginPage = pathname === "/login";
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  /* 未ログインで非公開ページ → /login?next=... */
  if (!session && !isPublic && !isLoginPage) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  /* ログイン済み & Cookie もある状態で /login に来たらロール別ダッシュボードへ */
  if (session && hasAccessCookie && isLoginPage) {
    const role =
      session.user.user_metadata?.role ??
      (session.user.app_metadata as any)?.role;
    const dest =
      role === "company" ? "/company-dashboard" :
      role === "admin"   ? "/admin"              :
                           "/student-dashboard";
    return NextResponse.redirect(new URL(dest, req.url), { status: 302 });
  }

  return res;
}

/* _next 等は除外 */
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};