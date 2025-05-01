import { type NextRequest, NextResponse } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

// 認証が必要なパス
const authRequiredPaths = [
  "/dashboard",
  "/profile",
  "/applications",
  "/messages",
  "/notifications",
  "/company/dashboard",
  "/company/jobs",
  "/company/applications",
  "/company/profile",
  "/company/users",
  "/company/messages",
]

// 認証済みユーザーがアクセスするとリダイレクトされるパス
const authRedirectPaths = ["/auth/signin", "/auth/signup"]

// 企業ユーザー専用のパス
const companyOnlyPaths = [
  "/company/dashboard",
  "/company/jobs",
  "/company/applications",
  "/company/profile",
  "/company/users",
  "/company/messages",
]

// 学生ユーザー専用のパス
const studentOnlyPaths = ["/dashboard", "/profile", "/applications", "/messages"]

export async function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname

    // 公開パスの場合はそのまま表示
    if (
      path === "/" ||
      path.startsWith("/jobs") ||
      path.startsWith("/features") ||
      path.startsWith("/grandprix") ||
      path.startsWith("/_next") ||
      path.startsWith("/api") ||
      path.includes(".")
    ) {
      return NextResponse.next()
    }

    // Supabaseクライアントを作成
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })

    // セッションを取得
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // ユーザーロールを取得
    let userRole = null
    if (session?.user) {
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("id", session.user.id).single()

      userRole = roleData?.role
    }

    // 未認証ユーザーが認証が必要なページにアクセスした場合、ログインページにリダイレクト
    if (!session && authRequiredPaths.some((p) => path.startsWith(p))) {
      const redirectUrl = new URL("/auth/signin", request.url)
      redirectUrl.searchParams.set("redirect", path)

      const redirectRes = NextResponse.redirect(redirectUrl)
      // キャッシュ制御ヘッダーを追加
      redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
      redirectRes.headers.set("Pragma", "no-cache")
      redirectRes.headers.set("Expires", "0")

      return redirectRes
    }

    // 認証済みユーザーがログインページなどにアクセスした場合、ダッシュボードにリダイレクト
    if (session && authRedirectPaths.some((p) => path === p)) {
      const dashboardPath = userRole === "company" ? "/company/dashboard" : "/dashboard"

      const redirectRes = NextResponse.redirect(new URL(dashboardPath, request.url))
      // キャッシュ制御ヘッダーを追加
      redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
      redirectRes.headers.set("Pragma", "no-cache")
      redirectRes.headers.set("Expires", "0")

      return redirectRes
    }

    // 企業ユーザーが学生専用ページにアクセスした場合、企業ダッシュボードにリダイレクト
    if (session && userRole === "company" && studentOnlyPaths.some((p) => path.startsWith(p))) {
      const redirectRes = NextResponse.redirect(new URL("/company/dashboard", request.url))
      // キャッシュ制御ヘッダーを追加
      redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
      redirectRes.headers.set("Pragma", "no-cache")
      redirectRes.headers.set("Expires", "0")

      return redirectRes
    }

    // 学生ユーザーが企業専用ページにアクセスした場合、学生ダッシュボードにリダイレクト
    if (session && userRole === "student" && companyOnlyPaths.some((p) => path.startsWith(p))) {
      const redirectRes = NextResponse.redirect(new URL("/dashboard", request.url))
      // キャッシュ制御ヘッダーを追加
      redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
      redirectRes.headers.set("Pragma", "no-cache")
      redirectRes.headers.set("Expires", "0")

      return redirectRes
    }

    // レスポンスヘッダーにキャッシュ制御を追加
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    res.headers.set("Pragma", "no-cache")
    res.headers.set("Expires", "0")

    return res
  } catch (error) {
    console.error("Middleware error:", error)
    // エラーが発生した場合でも、ページ表示を妨げないようにする
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
