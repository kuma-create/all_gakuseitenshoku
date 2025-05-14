/* ------------------------------------------------------------------
   app/email-callback/page.tsx
------------------------------------------------------------------*/
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";   // ← 共有インスタンス
import { Loader2 } from "lucide-react";

export default function EmailCallbackPage() {
  const router  = useRouter();
  const search  = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  /** 成功時: プロフ有無でダッシュボード or オンボーディング */
  const handleSignedIn = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;                        // まだクッキーが来ていない

    const referral = search.get("ref");
    if (referral) {
      // すでに行がある場合は無視したいので upsert を推奨
      await supabase
        .from("user_signups")
        .upsert(
          { user_id: session.user.id, referral_source: referral },
          { onConflict: "user_id" }        // 1人1レコード想定
        );
    }

    const { data, error } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      setError("プロフィール取得に失敗しました");
      return;
    }

    router.replace(data ? "/dashboard" : "/onboarding/profile");
  };

  useEffect(() => {
    /* 1) URL にエラーが付いていれば即表示 */
    if (search.get("error_code")) {
      setError(decodeURIComponent(search.get("error_description") ?? "認証エラー"));
      return;
    }

    /* 2) 既にセッションがあるかチェック（ハッシュ解析後に入っている可能性） */
    handleSignedIn();

    /* 3) 無い場合は onAuthStateChange で待つ */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") handleSignedIn();
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- UI ---------------- */
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-red-600">
        <p className="text-lg font-semibold">{error}</p>
        <p className="text-sm text-gray-600">
          もう一度登録をやり直すか、再度メールを送信してください。
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-gray-700">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p>ログイン処理中...</p>
    </div>
  );
}
