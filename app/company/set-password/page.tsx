"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SetPassword() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (pw !== pw2) return alert("パスワードが一致しません");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      alert(error.message);
    } else {
      router.replace("/company/onboarding/profile");
    }
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">パスワード設定</h1>
      <Input
        type="password"
        placeholder="パスワード"
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
        設定して次へ
      </Button>
    </main>
  );
}