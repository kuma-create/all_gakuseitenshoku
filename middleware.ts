/* ------------------------------------------------------------------
   middleware.ts  – 画像等はスルーしつつ
   /grandprix/{business|webtest|case}(/**) は学生ログイン必須
------------------------------------------------------------------ */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient }            from "@supabase/ssr";
import type { Database }                 from "@/lib/supabase/types";

/* ---------- Supabase init (SSR/MW 用) ---------- */
function initSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll().map(({ name, value }) => ({ name, value })),
        setAll: (cs) => cs.forEach(({ name, value, options }) =>
          res.cookies.set({ name, value, ...options })),
      },
    },
  );
}

/* ---------- 設定 ---------- */
const STATIC_RE = /\.(png|jpe?g|webp|svg|gif|ico|css|js|json|txt|xml|webmanifest)$/i;

/** “学生だけ” にしたい Grandprix サブパス */
const STUDENT_ONLY_PREFIXES = [
  "/grandprix/business",
  "/grandprix/webtest",
  "/grandprix/case",
];

/** 誰でも見られるパス（静的 LP など）*/
const PUBLIC_PREFIXES = [
  "/",                 // トップ
  "/grandprix",        // グランプリ一覧・通常詳細
  "/api",
  "/auth/reset",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const supabase = initSupabase(req, res);
  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  /* ---------- ① 静的アセットは即通過 ---------- */
  if (STATIC_RE.test(pathname)) return res;

  /* ---------- ② 学生専用ページ判定 ---------- */
  const isStudentOnly = STUDENT_ONLY_PREFIXES
    .some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isStudentOnly) {
    const isStudent = session?.user.user_metadata?.role === "student";
    if (!session || !isStudent) {
      const login = new URL("/login", req.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login, { status: 302 });
    }
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

  /* ログイン済みで /login へ来たらロール別ダッシュボードへ */
  if (session && isLoginPage) {
    const role = session.user.user_metadata?.role;
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