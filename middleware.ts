/* ------------------------------------------------------------------
   middleware.ts  – 画像等はスルーしつつ
   /grandprix/{business|webtest|case}(/**) は「ログイン必須」に変更
------------------------------------------------------------------ */
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient }        from "@supabase/auth-helpers-nextjs";
import type { Database }                 from "@/lib/supabase/types";

/* ---------- 設定 ---------- */
/** 静的アセット拡張子の正規表現 */
const STATIC_RE = /\.(png|jpe?g|webp|svg|gif|ico|css|js|json|txt|xml|webmanifest)$/i;

/** パスワード未設定ユーザーが最初に飛ばされるページ */
const PASSWORD_REQUIRED_PATH = "/company/set-password";

/** 現状 “ログイン必須” にするサブパスはなし */
const LOGIN_REQUIRED_PREFIXES: string[] = []; // グランプリ系ページも公開扱いにする

/** 誰でも見られるパス（静的 LP など）*/
const PUBLIC_PREFIXES = [
  "/",                      // トップ
  "/grandprix",             // グランプリ一覧ページ
  "/api",
  "/auth/reset",
  "/admin/login",           // 管理者ログインページ
  "/company/onboarding",    // 企業オンボーディング (招待リンク先)
  "/company/set-password",  // 企業担当者が初回に設定するパスワードページ
];

export async function middleware(req: NextRequest) {
  /* ★ /admin/login は完全スルー（リダイレクト対象外） */
  if (req.nextUrl.pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const res = NextResponse.next({ request: req });
  const supabase = createMiddlewareClient<Database>({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  /* ---------- パスワード未設定なら強制リダイレクト ---------- */
  if (session) {
    // ロール判定 (user_metadata → app_metadata → JWT)
    const role =
      (session.user.user_metadata as any)?.role ??
      (session.user.app_metadata as any)?.role ??
      (session.user as any).role ??
      "student";

    // company_admin / company だけパスワード必須
    const needsPassword =
      (role === "company_admin" || role === "company") &&
      !(session.user as any).password_updated_at;

    if (
      needsPassword &&
      pathname !== PASSWORD_REQUIRED_PATH &&
      !pathname.startsWith("/api")
    ) {
      return NextResponse.redirect(
        new URL(PASSWORD_REQUIRED_PATH, req.url),
        { status: 302 },
      );
    }
  }

  /* ---------- ① 静的アセットは即通過 ---------- */
  if (STATIC_RE.test(pathname)) return res;

  /* ---------- ② 「ログイン必須」ページ判定 ---------- */
  const needsLogin = LOGIN_REQUIRED_PREFIXES
    .some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (needsLogin && !session) {
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

  /* ログイン済みで /login に来たらロール別に振り分け */
  if (session && isLoginPage) {
    const role =
      session.user.user_metadata?.role ??
      (session.user.app_metadata as any)?.role ??
      (session.user as any).role;

    // company ロールのみパスワードを要求
    if (
      (role === "company" || role === "company_admin") &&
      !(session.user as any).password_updated_at
    ) {
      return NextResponse.redirect(
        new URL(PASSWORD_REQUIRED_PATH, req.url),
        { status: 302 },
      );
    }

    const dest =
      role === "company" || role === "company_admin"
        ? "/company-dashboard"
        : role === "admin"
        ? "/admin"
        : "/student-dashboard";

    return NextResponse.redirect(new URL(dest, req.url), { status: 302 });
  }

  return res;
}

/* _next 等は除外 */
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};