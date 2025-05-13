/* ------------------------------------------------------------------
   app/email-callback/page.tsx
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
      /* 1) ?code= がある場合 (v2 方式) ----------------------------- */
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error(error);
          setStatus("error");
          return;
        }
      }

      /* 2) セッション取得 (v1 hash 方式 or v2 交換後) -------------- */
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("error");
        return;
      }

      /* 3) プロフィール有無でリダイレクト ------------------------- */
      const { data, error } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setStatus("error");
        return;
      }

      router.replace(data ? "/dashboard" : "/onboarding/profile");
    })();
  }, [router, search]);

  /* --------------- UI --------------- */
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
