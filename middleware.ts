/* ------------------------------------------------------------------
   middleware.ts
   - 静的アセットや LP はスルー
   - /grandprix/{business|webtest|case}(/**) などは「ログイン必須」にする想定
   - 企業招待ユーザーは初回にパスワード設定へ
------------------------------------------------------------------ */
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient }          from "@supabase/auth-helpers-nextjs";
import type { Database }                   from "@/lib/supabase/types";

/* ---------- 定数 ---------- */
/** 静的アセット拡張子 */
const STATIC_RE = /\.(png|jpe?g|webp|svg|gif|ico|css|js|json|txt|xml|webmanifest)$/i;

/** パスワード未設定ユーザーを誘導するページだよね、*/
const PASSWORD_REQUIRED_PATH = "/company/set-password";

/** 「ログイン必須」にしたいパス（例として空） */
const LOGIN_REQUIRED_PREFIXES: string[] = [];

/** 誰でもアクセスできるパス */
const PUBLIC_PREFIXES = [
  "/",                    // トップ
  "/grandprix",           // グランプリ一覧
  "/api",
  "/auth/reset",
  "/admin/login",         // 管理者ログイン
  "/company/onboarding",  // 企業招待リンク
  "/company/set-password" // 企業担当者パスワード設定
];

export async function middleware(req: NextRequest) {
  /* ★ /admin/login はスルー（判定の影響を受けない） */
  if (req.nextUrl.pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  /* ---------- Supabase Session 取得 ---------- */
  const res       = NextResponse.next({ request: req });
  const supabase  = createMiddlewareClient<Database>({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  /* ---------- ロール判定を一度だけ ---------- */
  const role = session
    ? (
        session.user.user_metadata?.role ??
        (session.user.app_metadata as any)?.role ??
        (session.user as any).role ??
        "student"
      )
    : "guest";

  const isCompanyRole = role === "company_admin" || role === "company";

  /* ---------- ① 静的アセットは即通過 ---------- */
  if (STATIC_RE.test(pathname)) return res;

  /* ---------- ② パスワード未設定なら強制リダイレクト (会社ロールのみ) ---------- */
  if (
    session &&
    isCompanyRole &&
    !(session.user as any).password_updated_at &&
    pathname !== PASSWORD_REQUIRED_PATH &&
    !pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(
      new URL(PASSWORD_REQUIRED_PATH, req.url),
      { status: 302 }
    );
  }

  /* ---------- ③ 「ログイン必須」ページ判定 ---------- */
  const needsLogin = LOGIN_REQUIRED_PREFIXES
    .some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (needsLogin && !session) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  /* ---------- ④ 公開ページかどうか ---------- */
  const isLoginPage = pathname === "/login";
  const isPublic    = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  /* ログインしていない & 非公開ページ → /login?next=... */
  if (!session && !isPublic && !isLoginPage) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  /* ---------- ⑤ /login アクセス時：ロール別にダッシュボードへ ---------- */
  if (session && isLoginPage) {
    /* 会社ロールでパスワード未設定なら設定ページへ */
    if (
      isCompanyRole &&
      !(session.user as any).password_updated_at
    ) {
      return NextResponse.redirect(
        new URL(PASSWORD_REQUIRED_PATH, req.url),
        { status: 302 }
      );
    }

    const dest =
      isCompanyRole   ? "/company-dashboard"
      : role === "admin" ? "/admin"
      : "/student-dashboard";

    return NextResponse.redirect(new URL(dest, req.url), { status: 302 });
  }

  return res;
}

/* _next 等は除外 */
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};