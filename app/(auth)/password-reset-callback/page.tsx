"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PasswordResetCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const [newPw, setNewPw] = useState("");
  const [phase, setPhase] = useState<"verifying" | "enter" | "saving" | "done">(
    "verifying"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    // リンクに含まれる access_token と type=recovery をセッションに反映
    const hash = window.location.hash.substring(1);
    const query = new URLSearchParams(hash);
    const accessToken = query.get("access_token");
    const refreshToken = query.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("リンクが無効です");
      return;
    }

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) setError(error.message);
        else setPhase("enter");
      });
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

  if (phase === "verifying")
    return <p className="p-8 text-center">リンクを検証中…</p>;

  if (phase === "done")
    return (
      <div className="p-8 text-center space-y-4">
        <h1 className="text-xl font-bold">パスワードを変更しました！</h1>
        <Button onClick={() => router.push("/login")}>ログインへ</Button>
      </div>
    );

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