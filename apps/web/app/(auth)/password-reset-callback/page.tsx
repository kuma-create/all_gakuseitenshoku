"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordResetCallback() {
  const router = useRouter();
  const [newPw, setNewPw] = useState("");
  const [phase, setPhase] = useState<
    "verifying" | "enter" | "saving" | "done" | "error"
  >("verifying");
  const [error, setError] = useState("");

/* ------------------------------------------------------------------ */
/* 手動でハッシュを解析 → setSession() でセッションに設定               */
/* ------------------------------------------------------------------ */
useEffect(() => {
  // #access_token=… を取り出し
  const hash   = window.location.hash.substring(1);      // 先頭の # を除去
  const params = new URLSearchParams(hash);

  const accessToken  = params.get("access_token");
  const refreshToken = params.get("refresh_token") ?? ""; // 無い場合は空文字
  const type         = params.get("type");                // recovery か確認

  // fallback: fragment が無くても既にログイン済みならそのままパスワード変更へ
  if (!accessToken) {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setPhase("enter");
      } else {
        setError("リンクが無効か、期限切れです");
        setPhase("error");
      }
    })();
    return;
  }

  if (type !== "recovery") {
    setError("リンクが無効です");
    setPhase("error");
    return;
  }

  // Supabase の verifyOtp (recovery) でトークンを検証しセッションを保存
  (async () => {
    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      type: "recovery",
      token: accessToken,
      email: params.get("email") ?? "", // ハッシュに email パラメータが含まれる場合のみ
    });

    console.log("verifyOtp:", { verifyData, verifyErr });

    if (verifyErr) {
      setError(verifyErr.message ?? "リンクが無効か、期限切れです");
      setPhase("error");
    } else {
      setPhase("enter");           // 新パスワード入力フォームへ
    }
  })();
}, []);
/* ------------------------------------------------------------------ */

  /* パスワード保存処理 */
  const handleSave = async () => {
    setPhase("saving");
    const { error } = await supabase.auth.updateUser({ password: newPw });

    if (error) {
      setError(error.message);
      setPhase("enter");
    } else {
      setPhase("done");
    }
  };

  /* ---------- UI ---------- */

  if (phase === "verifying")
    return <p className="p-8 text-center">リンクを検証中…</p>;

  if (phase === "done")
    return (
      <div className="p-8 text-center space-y-4">
        <h1 className="text-xl font-bold">パスワードを変更しました！</h1>
        <Button onClick={() => router.push("/login")}>ログインへ</Button>
      </div>
    );

  if (phase === "error")
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive">{error || "リンクが無効です"}</p>
        <Button onClick={() => router.push("/forgot-password")}>
          再送信する
        </Button>
      </div>
    );

  /* phase === "enter" or "saving" */
  return (
    <div className="mx-auto max-w-sm p-8 space-y-4">
      <h1 className="text-lg font-bold">新しいパスワードを設定</h1>

      <Input
        type="password"
        placeholder="新しいパスワード"
        value={newPw}
        onChange={(e) => setNewPw(e.target.value)}
      />

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        className="w-full"
        onClick={handleSave}
        disabled={newPw.length < 6 || phase === "saving"}
      >
        保存する
      </Button>
    </div>
  );
}