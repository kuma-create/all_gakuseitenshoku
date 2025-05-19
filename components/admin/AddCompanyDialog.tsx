"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";

interface AddCompanyDialogProps {
  /** 追加完了後に呼ばれるコールバック（一覧リフレッシュ等） */
  onAdded?: () => void | Promise<void>;
}

export default function AddCompanyDialog({ onAdded }: AddCompanyDialogProps) {
  const { toast } = useToast();
  const [open, setOpen]   = useState(false);
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    try {
      /* サーバー側 API へ POST して招待 & レコード作成 */
      const res = await fetch("/api/admin/add-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "server error");
      }

      toast({
        title: "企業を追加しました",
        description: `${name} (${email}) に招待メールを送信しました`,
      });
      await onAdded?.();

      /* モーダル＆フォームをリセット */
      setOpen(false);
      setName("");
      setEmail("");
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