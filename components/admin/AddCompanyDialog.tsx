"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";

export default function AddCompanyDialog() {
  const { toast } = useToast();
  const [open, setOpen]   = useState(false);
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email) return;
    setLoading(true);
    try {
      /* ① 認証ユーザーを管理者権限で作成 */
      const pw = crypto.randomUUID().slice(0, 10) + "Aa?";
      const { data: userRes, error: err1 } =
        await supabase.auth.admin.createUser({
          email,
          password: pw,
          email_confirm: false,
          user_metadata: { full_name: name },
        });
      if (err1 || !userRes.user) throw err1 || new Error("user create failed");

      const uid = userRes.user.id;

      /* ② user_roles に company 登録（RLS で使う）*/
      const { error: err2 } = await supabase.from("user_roles").insert({
        user_id: uid,
        role: "company",
      });
      if (err2) throw err2;

      /* ③ companies テーブルへレコード挿入 */
      const { error: err3 } = await supabase.from("companies").insert({
        user_id: uid,
        name,
        full_name: name,
        status: "承認待ち",
      });
      if (err3) throw err3;

      toast({
        title: "企業を追加しました",
        description: `${name} (${email})`,
      });
      setOpen(false);
      setName(""); setEmail("");
    } catch (e: any) {
      toast({
        title: "追加に失敗",
        description: e.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>企業を追加</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しい企業アカウント</DialogTitle>
          <DialogDescription>メールと企業名を入力してください。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="c-name">企業名</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">ログインメール</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={!name || !email || loading} onClick={handleSubmit}>
            {loading ? "作成中…" : "追加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}