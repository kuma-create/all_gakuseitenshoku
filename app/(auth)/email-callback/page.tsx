/* ------------------------------------------------------------------
   app/email-callback/page.tsx
   - メール確認 / OAuth / magic-link すべてをここで吸収
------------------------------------------------------------------*/
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";
import { Loader2 } from "lucide-react";

const supabase = createClientComponentClient<Database>();

export default function EmailCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    (async () => {
      /* ---------------- 1) メール OTP 方式 ---------------- */
      const token = search.get("token");      // 6 桁コード付き URL
      const type  = search.get("type");       // signup / recovery など
      if (token && type === "signup") {
        const email =
          sessionStorage.getItem("pending_sign_up_email") ?? undefined;
        if (!email) {
          // フォームを経由せず直接アクセスされた場合
          setStatus("error");
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "signup",
        });
        if (error) {
          console.error(error);
          setStatus("error");
          return;
        }
        // 使い終わったら削除
        sessionStorage.removeItem("pending_sign_up_email");
      }

      /* ---------------- 2) OAuth / hash 方式 -------------- */
      // （#access_token=... が付いている場合は supabase-js が自動でパース）
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.error(error);
        setStatus("error");
        return;
      }

      /* ---------------- 3) プロフ有無で分岐 --------------- */
      const { data: profile, error: profileErr } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileErr) {
        console.error(profileErr);
        setStatus("error");
        return;
      }

      router.replace(profile ? "/dashboard" : "/onboarding/profile");
    })();
  }, [router, search]);

  /* ---------------- UI ---------------- */
  if (status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-red-600">
        <p className="text-lg font-semibold">リンクが無効か期限切れです</p>
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
