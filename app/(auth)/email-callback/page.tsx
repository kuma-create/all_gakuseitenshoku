/* ------------------------------------------------------------------------
   app/auth/email-callback/page.tsx
   - 確認メールのリンクから戻ってきた直後に実行
   - Session を確立し、プロフィール存在チェック
------------------------------------------------------------------------- */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";
import { Loader2 } from "lucide-react";

const supabase = createClientComponentClient<Database>();

export default function EmailCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      /* 1. セッション確立（#access_token を自動パース） */
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/signup?error=callback");
        return;
      }

      /* 2. 既存プロフィール有無を確認 */
      const { data, error } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        router.replace("/error");
        return;
      }

      /* 3. 有→ダッシュボード / 無→オンボーディングへ */
      router.replace(data ? "/dashboard" : "/onboarding/profile");
    })();
  }, [router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-gray-700">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p>ログイン処理中...</p>
    </div>
  );
}
