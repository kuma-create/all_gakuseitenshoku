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
        // ログイン不要で表示したいパス
        const publicRoutes = [
          "/",                        // トップページ
          "/login",                   // 共通ログイン
          "/signup",                  // 新規登録
          "/admin/login",             // 管理者ログイン
          "/auth/student/register",   // 学生登録フロー
          "/auth/reset",              // パスワードリセット
          "/grandprix",               // 公開一覧
        ];
        if (publicRoutes.includes(location.pathname)) return;

        await supabase.auth.signOut({ scope: "local" }); // Cookie も削除
        const next = encodeURIComponent(location.pathname + location.search);
        router.replace(`/login?next=${next}`);
      }
    }
    check()
  }, [router])

  return null            // 画面に何も描画しない
}