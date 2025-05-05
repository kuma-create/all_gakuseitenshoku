// middleware.ts
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { Database } from "@/lib/supabase/types"

/**
 * Supabase クライアントを RSC / ミドルウェア用に生成
 */
function initSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key: string) => request.cookies.get(key)?.value,
        set: (key: string, value: string, options: CookieOptions) => {
          response.cookies.set({ name: key, value, ...options })
        },
        remove: (key: string, options: CookieOptions) => {
          response.cookies.set({ name: key, value: "", ...options, maxAge: 0 })
        },
      },
    }
  )
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = initSupabase(request, response)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  /* ────────── ルート定義 ────────── */
  const publicPaths = [
    "/",
    "/grandprix",
    "/api",        // API Routes (任意で調整)
    "/auth/reset", // パスワードリセットなど
  ]
  const authPaths = ["/auth/signin", "/auth/signup"]
  const dashboardPath = "/student-dashboard" // 会社用なら判定して /company-dashboard へ

  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  const isAuth   = authPaths.some((p) => pathname.startsWith(p))

  /* ────────── 判定ロジック ────────── */
  // 未ログインで保護ページ → /auth/signin
  if (!session && !isPublic && !isAuth) {
    return NextResponse.redirect(
      new URL("/auth/signin", request.url),
      { status: 302 }
    )
  }

  // ログイン済みで /auth/* にアクセス → ダッシュボード
  if (session && isAuth) {
    return NextResponse.redirect(
      new URL(dashboardPath, request.url),
      { status: 302 }
    )
  }

  return response
}

/**
 * 静的ファイル類は除外し、それ以外をミドルウェア対象に
 */
export const config = {
  matcher:
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
}
