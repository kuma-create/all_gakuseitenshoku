/* ------------------------------------------------------------------
   app/email-callback/page.tsx
------------------------------------------------------------------*/
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function EmailCallbackPage() {
  const router  = useRouter();
  const search  = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    /* ▼ 1) v2 `?code=` 方式を先に処理 ------------------------------ */
    (async () => {
      const url = window.location.href;   
      if (url.includes("code=")) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.error(error);
          setStatus("error");
          return;
        }

       /* ② プロフィール有無でリダイレクト */
       const { data: { user } } = await supabase.auth.getUser();
       if (!user?.id) {                           // ← ① ID が無ければエラー扱いで抜ける
         setStatus("error");
         return;
       }
       
       const { data: profile } = await supabase    // ← ② user.id は必ず string
         .from("student_profiles")
         .select("id")
         .eq("user_id", user.id)                   // ★ user.id （non-nullable）
         .maybeSingle();
       
    
       router.replace(profile ? "/student-dashboard" : "/onboarding/profile");
     }
     })();
  }, [router, search]);

  /* -------------------- UI -------------------- */
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
