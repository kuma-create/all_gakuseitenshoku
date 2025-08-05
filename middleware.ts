/* ------------------------------------------------------------------
   middleware.ts
   - 静的アセットや LP はスルー
   - /grandprix/{business|webtest|case}(/**) などは「ログイン必須」にする想定
   - 企業招待フローを撤廃し、一時 PW → 通常ログインのみに統一
------------------------------------------------------------------ */
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient }          from "@supabase/auth-helpers-nextjs";
import type { Database }                   from "@/lib/supabase/types";

/* ---------- Supabase cookie name (v2) ---------- */
// Supabase v2 stores auth in a single cookie: sb-<projectRef>-auth-token
const projectRef =
  process.env.NEXT_PUBLIC_SUPABASE_URL!.match(/^https?:\/\/([^.]+)\./)?.[1] ??
  "local";
const AUTH_COOKIE_NAME = `sb-${projectRef}-auth-token`;

/* ---------- 定数 ---------- */
/** 静的アセット拡張子 */
const STATIC_RE = /\.(png|jpe?g|webp|svg|gif|ico|css|js|json|txt|xml|webmanifest)$/i;

/** 「ログイン必須」にしたいパス（必要に応じて後で拡張） */
const LOGIN_REQUIRED_PREFIXES: string[] = [];

/** 誰でもアクセスできるパス */
const PUBLIC_PREFIXES = [
  "/",                       // トップページ
  "/app",                    // ← 追加: アプリのトップも公開扱い
  "/login",                  // 共通ログイン
  "/signup",                 // 新規登録
  "/auth/student/register",  // 学生登録フロー
  "/auth/reset",             // パスワードリセット
  "/auth",                  // Supabase auth-helper routes (/auth/set, /auth/logout)
  "/terms",
  "/refer",                  // 利用規約
  "/privacy-policy",         // プライバシーポリシー
  "/grandprix", 
  "/whitepapers",            // グランプリ一覧
  "/api",                    // API ルート
  "/jobs", 
  "/lp",
  "/admin/login",            // 管理者ログイン
  "/media",
  "/search",
  "/support",
  "/internships",
  "/legal",
  "/features",
  "/onboarding/profile",
  "/forgot-password",            // 管理者ログイン
  "/password-reset-callback",    // パスワード再設定用コールバック
  "/email-callback",        // メールリンク用コールバック
  "/impersonated",            // 管理者がユーザーになり切った直後の着地点
  /* -------- 学生サイトの入口ページ (クライアント側ガード) -------- */
  "/offers",                 // スカウト /offers(/...)
  "/applications",           // 応募履歴 /applications(/...)
  "/chat",
  "/ipo",
  "/resume",
  "/companies",
];

/* ------------------------------------------------------------------ */
export async function middleware(req: NextRequest) {
  // ----- PUBLIC: /lp marketing pages -----
  if (req.nextUrl.pathname.startsWith("/lp")) {
    return NextResponse.next(); // Skip auth & redirects for anything under /lp
  }
  // ---------------------------------------

  /* ---------- ① ルート・静的アセット・公開ページは早期リターン ---------- */
  const { pathname } = req.nextUrl;

  // a) 静的アセット
  if (STATIC_RE.test(pathname)) {
    return NextResponse.next();
  }

  // b) ルート (LP)
  if (pathname === "/" || pathname === "/app") {
    return NextResponse.next();
  }

  // c) ログイン / 管理ログイン判定
  const isLoginPage = pathname === "/login" || pathname === "/admin/login";
  const isAdminArea = pathname.startsWith("/admin") && pathname !== "/admin/login";

  // d) 公開ページ判定
  const isPublic = PUBLIC_PREFIXES.some((p) =>
    p === "/" ? pathname === "/" : pathname.startsWith(p)
  );

  // 公開ページかつログインページでなければ Supabase を触らず通過
  if (isPublic && !isLoginPage) {
    return NextResponse.next();
  }


/* ---------- Cookie が無い場合の早期リターン ---------- */
const hasAuthCookie =
  !!req.cookies.get("sb-access-token") ||           // Supabase <v2
  !!req.cookies.get("sb-refresh-token") ||          // Supabase <v2
  !!req.cookies.get(AUTH_COOKIE_NAME);              // Supabase v2 (sb-<ref>-auth-token)

  if (!hasAuthCookie) {
    // 未ログインでログインページはそのまま表示
    if (isLoginPage) {
      return NextResponse.next();
    }

    // 未ログインで非公開ページ → /login へ転送
    const loginPath = isAdminArea ? "/admin/login" : "/login";
    const login = new URL(loginPath, req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  /* ---------- ② ここで初めて Supabase Session を取得 ---------- */
  const res      = NextResponse.next({ request: req });
  const supabase = createMiddlewareClient<Database>({ req, res });

  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (_) {
    // 失効トークンで 400/401 が返る場合は握り潰す
  }

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

  /* ログインしていない & 非公開ページ → /login?next=... */
  if (!session && !isPublic && !isLoginPage) {
    const loginPath = isAdminArea ? "/admin/login" : "/login";
    const login = new URL(loginPath, req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  /* ---------- ④ /login または /admin/login へのアクセス時 ---------- */
  if (session && isLoginPage) {
    // ?next=/some/path が付いていれば最優先でそこへ
    const nextParam = req.nextUrl.searchParams.get("next");
    if (nextParam && nextParam.startsWith("/")) {
      return NextResponse.redirect(new URL(nextParam, req.url), { status: 302 });
    }
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
      // ロールごとに遷移先を振り分ける
      let dest = "/student-dashboard";
      if (role === "admin") {
        dest = "/admin";
      } else if (isCompanyRole) {
        dest = "/company-dashboard";
      }
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
      - /admin, /company, /student, /offers, /applications, /chat を除外
        （これらはクライアント側 AuthGuard で判定）
    */
    "/((?!_next/static|_next/image|favicon.ico|$|refer||admin|company|lp|student|offers|applications|chat|jobs|resume|companies|jobs|terms|onboarding/profile|privacy-policy|media|whitepapers|impersonated).*)",

  ],
};