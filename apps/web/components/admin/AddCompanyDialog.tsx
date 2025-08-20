
"use client";

import { FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";

interface AddCompanyDialogProps {
  /** 追加完了後に呼ばれるコールバック（一覧リフレッシュ等） */
  onAdded?: () => void | Promise<void>;
}

/* ------------------------------------------------------------------
   AddCompanyDialog
   - 企業名 + ログインメールを入力して /api/admin/add-company へ POST
   - 重複時 (HTTP 409) には専用メッセージを表示
   - Enter キーでも送信できるよう <form> でラップ
------------------------------------------------------------------- */
export default function AddCompanyDialog({ onAdded }: AddCompanyDialogProps) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault(); // Enter キー送信対応
    if (!name.trim() || !email.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/add-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      });

      // 失敗時はステータスコードに応じてトースト文言を変える
      if (!res.ok) {
        const { error } = await res.json();
        let message: string;

        switch (res.status) {
          // 招待済み／既存ユーザー
          case 400:
          case 409:
            message = "このメールアドレスは既に登録または招待済みです";
            break;
          // メール送信レートリミット
          case 429:
            message =
              "メール送信の上限を超えました。1〜2 分後に再度お試しください。";
            break;
          default:
            message = error?.message ?? "server error";
        }
        throw new Error(message);
      }

      toast({
        title: "企業を追加しました",
        description: `${name}（${email}）に招待メールを送信しました`,
      });

      await onAdded?.();
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({
        title: "追加に失敗",
        description: err?.message ?? String(err),
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
          <DialogDescription>
            企業名とログインメールアドレスを入力してください。
          </DialogDescription>
        </DialogHeader>

        {/* 入力フィールド */}
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="c-name">企業名</Label>
            <Input
              id="c-name"
              value={name}
              disabled={loading}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-email">ログインメール</Label>
            <Input
              id="c-email"
              type="email"
              value={email}
              disabled={loading}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!name || !email || loading}
            >
              {loading ? "作成中…" : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}