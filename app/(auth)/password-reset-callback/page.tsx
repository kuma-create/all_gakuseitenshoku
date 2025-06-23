"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordResetCallback() {
  const router = useRouter();
  const [newPw, setNewPw] = useState("");
  const [phase, setPhase] = useState<"verifying" | "enter" | "saving" | "done" | "error">(
    "verifying"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    // URL ハッシュからトークンを抽出し、セッションに設定
    const hash = window.location.hash.substring(1); // # を除去
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type         = params.get("type");

    // access_token は必須。refresh_token は付かないケースもあるので空文字で代替
    if (type !== "recovery" || !accessToken) {
      setError("リンクが無効です");
      setPhase("error");
      return;
    }
    const finalRefreshToken = refreshToken ?? "";

    // 既存ログイン状態をクリアしてからリカバリ用トークンで再ログイン
    (async () => {
      await supabase.auth.signOut().catch(() => {/* ignore */});

      const { error: setErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: finalRefreshToken,
      });

      if (setErr) {
        setError(setErr.message);
        setPhase("error");
      } else {
        setPhase("enter");
      }
    })();
  }, []);

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

  if (phase === "verifying") {
    return <p className="p-8 text-center">リンクを検証中…</p>;
  }

  if (phase === "done")
    return (
      <div className="p-8 text-center space-y-4">
        <h1 className="text-xl font-bold">パスワードを変更しました！</h1>
        <Button onClick={() => router.push("/login")}>ログインへ</Button>
      </div>
    );

  if (phase === "error") {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive">{error || "リンクが無効です"}</p>
        <Button onClick={() => router.push("/forgot-password")}>
          再送信する
        </Button>
      </div>
    );
  }

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