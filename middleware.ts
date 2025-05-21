/* ------------------------------------------------------------------
   middleware.ts
   - 静的アセットや LP はスルー
   - /grandprix/{business|webtest|case}(/**) などは「ログイン必須」にする想定
   - 企業招待フローを撤廃し、一時 PW → 通常ログインのみに統一
------------------------------------------------------------------ */
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient }          from "@supabase/auth-helpers-nextjs";
import type { Database }                   from "@/lib/supabase/types";

/* ---------- 定数 ---------- */
/** 静的アセット拡張子 */
const STATIC_RE = /\.(png|jpe?g|webp|svg|gif|ico|css|js|json|txt|xml|webmanifest)$/i;

/** 「ログイン必須」にしたいパス（必要に応じて後で拡張） */
const LOGIN_REQUIRED_PREFIXES: string[] = [];

/** 誰でもアクセスできるパス */
const PUBLIC_PREFIXES = [
  "/",              // トップ
  "/grandprix",     // グランプリ一覧
  "/api",           // API ルート
  "/auth/reset",    // パスワードリセット
  "/admin/login",   // 管理者ログイン
];

/* ------------------------------------------------------------------ */
export async function middleware(req: NextRequest) {
  /* ---------- Supabase Session 取得 ---------- */
  const res      = NextResponse.next({ request: req });
  const supabase = createMiddlewareClient<Database>({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  const isAdminArea   = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isLoginPage   = pathname === "/login" || pathname === "/admin/login";

  /* ---------- ロール判定 ---------- */
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

  /* ---------- ② 「ログイン必須」ページ判定 ---------- */
  const needsLogin = LOGIN_REQUIRED_PREFIXES
    .some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (needsLogin && !session) {
    const loginPath = isAdminArea ? "/admin/login" : "/login";
    const login = new URL(loginPath, req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  /* ---------- ③ 公開ページかどうか ---------- */
  // [removed]
  const isPublic    = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  /* ログインしていない & 非公開ページ → /login?next=... */
  if (!session && !isPublic && !isLoginPage) {
    const loginPath = isAdminArea ? "/admin/login" : "/login";
    const login = new URL(loginPath, req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  /* ---------- ④ /login or /admin/login アクセス時：ロール別ダッシュボードへ ---------- */
  if (session && isLoginPage) {
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