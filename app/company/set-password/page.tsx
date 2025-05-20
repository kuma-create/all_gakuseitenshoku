"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * 企業担当者 – 初回パスワード設定ページ
 *
 * 1. 既に `password_updated_at` が存在する場合は自動でオンボーディングへ遷移
 * 2. 8 文字以上のパスワードを設定し、updateUser → refreshSession
 * 3. password_updated_at が反映されたら /company/onboarding/profile へ
 */
export default function SetPassword() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  /* ---------- 既に設定済みならスキップ ---------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if ((data.user as any)?.password_updated_at) {
        router.replace("/company/onboarding/profile");
      }
    })();
  }, [router]);

  /* ---------- 保存処理 ----------------------------------------- */
  const save = useCallback(async () => {
    if (pw !== pw2) {
      alert("パスワードが一致しません");
      return;
    }
    if (pw.length < 8) {
      alert("8文字以上にしてください");
      return;
    }

    setSaving(true);
    try {
      /* 1. updateUser でパスワード更新 */
      const { error: updErr } = await supabase.auth.updateUser({ password: pw });
      if (updErr) {
        console.error("updateUser error", updErr);
        alert(updErr.message);
        return;
      }

      /* 2. セッションをリフレッシュ（JWT を最新化） */
      const { data: ref, error: refErr } = await supabase.auth.refreshSession();
      if (refErr) {
        console.error("refreshSession error", refErr);
        alert(refErr.message);
        return;
      }

      console.log("[SetPassword] TOKEN_REFRESHED");
      console.log(ref?.session?.user);

      /* 3. password_updated_at が付与されたらオンボーディングへ */
      if ((ref?.session?.user as any)?.password_updated_at) {
        router.replace("/company/onboarding/profile");
      } else {
        // まれに同期遅延があるので 1 秒待って再チェック
        setTimeout(() => router.replace("/company/onboarding/profile"), 1000);
      }
    } finally {
      setSaving(false);
    }
  }, [pw, pw2, router]);

  /* ---------- UI ----------------------------------------------- */
  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">パスワード設定</h1>

      <Input
        type="password"
        placeholder="パスワード（8文字以上）"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      <Input
        type="password"
        placeholder="確認用パスワード"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        className="mt-2"
      />

      <Button
        onClick={save}
        disabled={saving || pw.length < 8 || pw !== pw2}
        className="mt-4"
      >
        {saving ? "保存中…" : "設定して次へ"}
      </Button>
    </main>
  );
}