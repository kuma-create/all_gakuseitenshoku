"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    setLoading(false);

    if (res.ok) setSent(true);
    else setError(json.error ?? "エラーが発生しました");
  };

  if (sent)
    return (
      <div className="mx-auto max-w-sm text-center py-16">
        <h1 className="text-xl font-bold mb-4">メールを送信しました</h1>
        <p className="text-muted-foreground">
          受信トレイに届くリンクからパスワードを再設定してください。
        </p>
      </div>
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-sm space-y-6 py-16 px-4"
    >
      <h1 className="text-2xl font-bold text-center">パスワードをお忘れですか？</h1>

      <div className="space-y-2">
        <label className="font-medium">メールアドレス</label>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        送信する
      </Button>
    </form>
  );
}