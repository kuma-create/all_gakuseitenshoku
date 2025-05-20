
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CompanyOnboarding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("companies")
      .update({ full_name: name, status: "承認待ち" })
      .eq("user_id", user.id);

    router.replace("/company-dashboard");
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">企業情報の登録</h1>
      <Input placeholder="正式名称" value={name} onChange={e => setName(e.target.value)} />
      <Button onClick={save} disabled={saving || !name.trim()} className="mt-4">保存してダッシュボードへ</Button>
    </main>
  );
}