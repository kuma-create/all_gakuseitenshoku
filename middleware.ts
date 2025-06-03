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
  "/",                     // トップページ
  "/login",                // 共通ログイン
  "/signup",               // 新規登録
  "/auth/student/register",// 学生登録フロー
  "/auth/reset",           // パスワードリセット
  "/grandprix",            // グランプリ一覧
  "/api",                  // API ルート
  "/admin/login",          // 管理者ログイン
];

/* ------------------------------------------------------------------ */
export async function middleware(req: NextRequest) {
  /* ---------- Supabase Session 取得 ---------- */
  const res      = NextResponse.next({ request: req });
  const supabase = createMiddlewareClient<Database>({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  /* ---------- 0. トップページはゲスト公開 (早期リターン) ---------- */
  if (pathname === "/") {
    return res;            // "/" だけは必ず通過させる
  }

  const isAdminArea   = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isLoginPage   = pathname === "/login" || pathname === "/admin/login";

  /* ---------- ロール判定 ---------- */
  let role: string | null = null;

  if (session) {
    // ① metadata の role（無ければ null）
    role =
      (session.user.user_metadata as any)?.user_role ??
      (session.user.user_metadata as any)?.role ??
      (session.user.app_metadata  as any)?.user_role ??
      (session.user.app_metadata  as any)?.role ??
      (session.user as any).role ??
      null;

    // ② user_roles テーブルを常に参照し、値があればメタデータより優先
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (!error && data?.role) {
      role = data.role;   // テーブルの値を最優先
    }

    // ③ フォールバック
    if (!role) role = "student";
  } else {
    role = "guest";
  }

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
  // "/" は完全一致判定、それ以外は prefix 判定
  const isPublic = PUBLIC_PREFIXES.some((p) =>
    p === "/" ? pathname === "/" : pathname.startsWith(p)
  );

  /* ログインしていない & 非公開ページ → /login?next=... */
  if (!session && !isPublic && !isLoginPage) {
    const loginPath = isAdminArea ? "/admin/login" : "/login";
    const login = new URL(loginPath, req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  /* ---------- ④ /login または /admin/login へのアクセス時 ---------- */
  if (session && isLoginPage) {
    // /admin/login にアクセスした場合
    if (pathname === "/admin/login") {
      // Admin ロールはそのまま管理ダッシュボードへリダイレクト
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin", req.url), { status: 302 });
      }
      // それ以外のロールは /admin/login を表示させる（リダイレクトしない）
    }
    // /login にアクセスした場合
    else if (pathname === "/login") {
      const dest = isCompanyRole ? "/company-dashboard" : "/student-dashboard";
      return NextResponse.redirect(new URL(dest, req.url), { status: 302 });
    }
  }

  return res;
}

/* _next 等は除外。さらに "/" (トップ) はミドルウェア対象外 */
export const config = {
  matcher: [
    /*
      - 静的アセット (_next/static 等) は除外
      - ルート "/" は除外
    */
    "/((?!_next/static|_next/image|favicon.ico|$|admin).*)",
  ],
};