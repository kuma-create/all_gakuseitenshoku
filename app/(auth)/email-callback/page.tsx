"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

export default function EmailCallbackPage() {
  const router  = useRouter();
  const search  = useSearchParams();
  const [status, setStatus] =
    useState<"loading" | "success" | "error">("loading");

  /* -------------------------------------------------------------
     1. URL に含まれる code をセッションに交換（必須！！）
  ------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      /* 1) Supabase が URL 片 (#access_token または ?type=invite など)
            を読み取りセッションを確立するユーティリティ */
      const { data, error } = await supabase.auth.getSessionFromUrl();
      if (error || !data.session) {
        console.error("getSessionFromUrl error:", error);
        setStatus("error");
        return;
      }

      /* 2) ?next=/path で指定されていれば優先リダイレクト */
      const nextPath = search.get("next");
      if (nextPath) {
        router.replace(nextPath);
        return;
      }

      /* 3) 学生プロフィール有無でダッシュボード or オンボーディング */
      const { user } = data.session;

      const { data: profile } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      router.replace(
        profile ? "/student-dashboard" : "/onboarding/profile"
      );
    })();
  }, [router, search]);

  /* ---------------- UI ---------------- */
  if (status === "loading") {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-red-600" />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          ログイン処理中です…
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-8 w-8 text-red-600" />
        <p className="text-center text-sm text-gray-700 dark:text-gray-300">
          メール認証に失敗しました。<br />
          リンクが無効になっているか、すでに使用済みの可能性があります。
        </p>
        <button
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          onClick={() => router.push("/login")}
        >
          ログイン画面へ戻る
        </button>
      </div>
    );
  }

  return null; // success 時は即 redirect されるので到達しない
}
