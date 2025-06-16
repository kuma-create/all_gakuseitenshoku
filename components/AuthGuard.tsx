"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

export default function AuthGuard() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // ゲスト閲覧を許可するパス（接頭辞マッチ）
        const publicPrefixes = [
          "/",                         // トップ
          "/login",                    // 共通ログイン
          "/signup",                   // 新規登録
          "/admin/login",              // 管理者ログイン
          "/auth/student/register",    // 学生登録
          "/auth/reset",          // パスワードリセット
          "/terms",                  // 利用規約
          "/privacy-policy",         // プライバシーポリシー
          "/grandprix",                // グランプリ一覧
          /* --- 以下はクライアント側ガードで制御 --- */
          "/offers",                   // 学生スカウト
          "/applications",             // 学生応募履歴
          "/chat",                     // 学生チャット
          "/company",                  // 企業配下
          "/student",   
          "/jobs", 
          "/resume",               // 学生配下
        ];
        if (
          publicPrefixes.some(
            (p) =>
              location.pathname === p ||
              location.pathname.startsWith(p + "/")
          )
        ) {
          return;
        }

        await supabase.auth.signOut({ scope: "local" }); // Cookie も削除
        const next = encodeURIComponent(location.pathname + location.search);
        router.replace(`/login?next=${next}`);
      }
    }
    check()
  }, [router])

  return null            // 画面に何も描画しない
}