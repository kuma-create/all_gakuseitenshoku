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
     1. URL に含まれるトークンをセッションに変換
        - #access_token=...&refresh_token=...    ← implicit / invite
        - ?code=xxxx                             ← PKCE
  ------------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      /* ----- 0) すでにセッションがあれば即リダイレクト ----- */
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      if (initialSession) {
        const nextPath0 = search.get("next") || "/";
        router.replace(nextPath0);
        return;
      }
      /* ---------- 1) ハッシュフラグメント (#access_token) ---------- */
      const hash  = window.location.hash.replace(/^#/, "");
      const hp    = new URLSearchParams(hash);

      if (hp.has("access_token") && hp.has("refresh_token")) {
        const { data, error } = await supabase.auth.setSession({
          access_token:  hp.get("access_token")!,
          refresh_token: hp.get("refresh_token")!,
        });
        if (error || !data.session) {
          console.error("setSession error:", error);
          setStatus("error");
          return;
        }
      } else {
        /* ---------- 2) token パラメータ (magiclink / signup) ---------- */
        const token = search.get("token");
        if (token) {
          const tType = search.get("type");            // magiclink | signup
          const email = search.get("email") || "";     // verifyOtp に必須
          const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
            email,
            type: tType === "signup" ? "signup" : "magiclink",
            token,
          });
          if (otpErr || !otpData.session) {
            console.error("verifyOtp error:", otpErr);
            setStatus("error");
            return;
          }
        } else {
          /* ---------- PKCE フロー (?code=) ---------- */
          const code = search.get("code");
          if (!code) {
            setStatus("error");
            return;
          }
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("exchangeCodeForSession error:", error);
            setStatus("error");
            return;
          }
        }
      }

      /* ---------- Fallback: 既にセッションがあるか確認 ---------- */
      if (!hp.size && !search.get("token") && !search.get("code")) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setStatus("error");
          return;
        }
      }

      /* ---------- 3) next パラメータがあれば優先リダイレクト ---------- */
      const nextPath = search.get("next");
      if (nextPath) {
        router.replace(nextPath);
        return;
      }

      /* ---------- 4) デフォルト遷移先を onboarding/profile に固定 ---------- */
      router.replace("/onboarding/profile");
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
