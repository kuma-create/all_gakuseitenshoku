// middleware.ts
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { Database } from "@/lib/supabase/types"

/* -------------------------------------------------
   Supabase クライアント（SSR / Middleware 用）
--------------------------------------------------*/
function initSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      /* ★ v0.4〜 の新インターフェース */
      cookies: {
        /** すべての Cookie を取得して配列で返す */
        getAll() {
          return request.cookies.getAll().map(({ name, value }) => ({
            name,
            value,
          }))
        },

        /**
         * Supabase から渡された Cookie 一式を
         * Next.js の Response にそのままコピー
         */
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            /* Next 14 以降は set({ name, value, ...options }) で OK */
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )
}

export async function middleware(request: NextRequest) {
  /** `request` を渡して Cookie を維持 */
  const response = NextResponse.next({ request })

  /* ---------- Supabase セッション取得 ---------- */
  const supabase = initSupabase(request, response)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  /* ---------- パス定義 ---------- */
  const publicPaths = ["/", "/grandprix", "/api", "/auth/reset"]
  const authPaths   = ["/auth/signin", "/auth/signup"]
  const studentOnlyPaths = ["/grandprix/business"]

  const isPublic       = publicPaths.some((p) => pathname.startsWith(p))
  const isAuthPage     = authPaths.some((p) => pathname.startsWith(p))
  const isStudentOnly  = studentOnlyPaths.some((p) => pathname.startsWith(p))

  /* ---------- ルーティングガード ---------- */
  if (!session && !isPublic && !isAuthPage) {
    const login = new URL("/auth/signin", request.url)
    login.searchParams.set("next", pathname)
    return NextResponse.redirect(login, { status: 302 })
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(
      new URL("/student-dashboard", request.url),
      { status: 302 }
    )
  }

  if (isStudentOnly) {
    const role = session?.user.user_metadata?.role
    if (role !== "student") {
      const login = new URL("/auth/signin", request.url)
      login.searchParams.set("next", pathname)
      return NextResponse.redirect(login, { status: 302 })
    }
  }

  /* Supabase がセットした Cookie を Response に反映して返却 */
  return response
}

/* 静的アセットは除外 */
export const config = {
  matcher:
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
}
