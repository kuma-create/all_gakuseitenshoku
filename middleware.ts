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

  const isLoginPage = pathname === "/login" || pathname === "/admin/login";

  /* ---------- 0. トップページはゲスト公開 (早期リターン) ---------- */
  if (pathname === "/") {
    return res;            // "/" だけは必ず通過させる
  }

  /* ---------- ① 静的アセットは即通過 ---------- */
  if (STATIC_RE.test(pathname)) return res;

  /* ---------- ② 「ログイン必須」ページ判定 ---------- */
  const needsLogin = LOGIN_REQUIRED_PREFIXES
    .some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (needsLogin && !session) {
    const loginPath = "/login";
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
    const loginPath = "/login";
    const login = new URL(loginPath, req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, { status: 302 });
  }

  return res;
}

/* _next 等は除外。さらに "/" (トップ) はミドルウェア対象外 */
export const config = {
  matcher: [
    /*
      - 静的アセット (_next/static 等) は除外
      - ルート "/" は除外
      - /admin 配下は除外（クライアント側ガードに任せる）
      - /company 配下も除外（クライアント側ガードに任せる）
      - /student 配下も除外（クライアント側ガードに任せる）
    */
    "/((?!_next/static|_next/image|favicon.ico|$|admin|company|student).*)",
  ],
};