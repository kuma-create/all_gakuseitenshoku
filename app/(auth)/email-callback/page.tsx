/* ------------------------------------------------------------------
   app/email-callback/page.tsx (全量差し替えでも OK)
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
      /* -------- 1) verifyOtp (token + email + type) -------- */
      const token = search.get("token");
      const type  = search.get("type");            // signup / recovery など
      const email = search.get("email");           // ← ここが今回のポイント！

      if (token && type === "signup" && email) {
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
      }

      /* -------- 2) セッション取得 (hash を supabase-js がパース) -------- */
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session) {
        console.error(sessErr ?? "session null");
        setStatus("error");
        return;
      }

      /* -------- 3) プロフィール有無でリダイレクト -------- */
      const { data: profile, error: profErr } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profErr) {
        console.error(profErr);
        setStatus("error");
        return;
      }

      router.replace(profile ? "/dashboard" : "/onboarding/profile");
    })();
  }, [router, search]);

  /* ---------- UI ---------- */
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
