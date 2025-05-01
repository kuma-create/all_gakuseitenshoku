import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(request: NextRequest) {
  try {
    // Supabaseクライアントを作成
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    // セッションを取得
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // 現在のパス
    const path = request.nextUrl.pathname

    // 認証が必要なパス
    const authRequiredPaths = [
      "/dashboard",
      "/profile",
      "/applications",
      "/messages",
      "/company/dashboard",
      "/company/profile",
      "/company/jobs",
      "/company/applications",
    ]

    // 認証済みユーザーがアクセスできないパス
    const authRedirectPaths = ["/auth/signin", "/auth/signup"]

    // ユーザーロールに基づくリダイレクト
    if (session) {
      // ユーザーロールを取得
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("id", session.user.id).single()

      const userRole = roleData?.role

      // 認証済みユーザーがログインページなどにアクセスした場合、ダッシュボードにリダイレクト
      if (authRedirectPaths.some((p) => path.startsWith(p))) {
        const redirectUrl = userRole === "company" ? "/company/dashboard" : "/dashboard"
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }

      // 企業ユーザーが学生専用ページにアクセスした場合、企業ダッシュボードにリダイレクト
      if (userRole === "company" && path.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/company/dashboard", request.url))
      }

      // 学生ユーザーが企業専用ページにアクセスした場合、学生ダッシュボードにリダイレクト
      if (userRole === "student" && path.startsWith("/company")) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    } else {
      // 未認証ユーザーが認証が必要なページにアクセスした場合、ログインページにリダイレクト
      if (authRequiredPaths.some((p) => path.startsWith(p))) {
        // リダイレクト先のURLを作成
        const redirectUrl = new URL("/auth/signin", request.url)
        // リダイレクト後の遷移先を指定
        redirectUrl.searchParams.set("redirect", path)

        // キャッシュ制御ヘッダーを追加
        const res = NextResponse.redirect(redirectUrl)
        res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
        res.headers.set("Pragma", "no-cache")
        res.headers.set("Expires", "0")

        return res
      }
    }

    // キャッシュ制御ヘッダーを追加
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    res.headers.set("Pragma", "no-cache")
    res.headers.set("Expires", "0")

    return res
  } catch (error) {
    console.error("Middleware error:", error)

    // エラーが発生した場合でも、ページ表示を妨げないようにする
    const res = NextResponse.next()
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    res.headers.set("Pragma", "no-cache")
    res.headers.set("Expires", "0")

    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
