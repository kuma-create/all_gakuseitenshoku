"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export default function AuthGuard() {
  const router = useRouter()

  useEffect(() => {
    const publicPrefixes = [
      "/",                         // トップ
      "/app",                      // アプリのトップも公開扱い
      "/login",                    // 共通ログイン
      "/signup",                   // 新規登録
      "/admin/login",              // 管理者ログイン
      "/auth/student/register",    // 学生登録
      "/auth/reset",          // パスワードリセット
      "/terms",                  // 利用規約
      "/privacy-policy",         // プライバシーポリシー
      "/grandprix", 
      "/lp",
      "/lp/students/fee", 
      "/features", 
      "/onboarding/profile",
      "/media",
      "/companies",
      "/whitepapers", 
      "/auth",                  // Supabase auth-helper routes (/auth/set, /auth/logout)
      "/forgot-password",              // グランプリ一覧
      "/password-reset-callback",    // パスワード再設定コールバック
      /* --- 以下はクライアント側ガードで制御 --- */
      "/offers",                   // 学生スカウト
      "/applications",             // 学生応募履歴
      "/chat",                     // 学生チャット
      "/company", 
      "/ipo",                 // 企業配下
      "/student",   
      "/jobs", 
      "/resume",               // 学生配下
    ];

    // 公開パスは認証チェックをスキップ
    const isPublic = publicPrefixes.some(
      (p) =>
        location.pathname === p ||
        location.pathname.startsWith(p + "/")
    );
    if (isPublic) return;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await supabase.auth.signOut({ scope: "local" }); // Cookie も削除
        const next = encodeURIComponent(location.pathname + location.search);
        router.replace(`/login?next=${next}`);
      }
    }
    check()
  }, [router])

  return null            // 画面に何も描画しない
}