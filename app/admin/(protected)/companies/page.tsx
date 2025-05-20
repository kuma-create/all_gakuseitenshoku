"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/hooks/use-toast";

interface AddCompanyDialogProps {
  onAdded?: () => void | Promise<void>;
}

const AddCompanyDialog: React.FC<AddCompanyDialogProps> = ({ onAdded }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  /** API ルート (/api/admin/add-company) を呼び出す */
  const handleSave = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/add-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error ?? res.statusText);
      }

      toast({
        title: "企業を追加しました",
        description: `${name} (${email}) に招待メールを送信しました`,
      });

      setName("");
      setEmail("");
      setOpen(false);
      await onAdded?.();
    } catch (e: any) {
      toast({
        title: "追加に失敗しました",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">企業を追加</Button>
      </DialogTrigger>

      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>新しい企業アカウント</DialogTitle>
          <DialogDescription>
            担当者メールと企業名を入力してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="c-name">企業名</Label>
            <Input
              id="c-name"
              placeholder="テスト株式会社"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-email">担当者メール</Label>
            <Input
              id="c-email"
              type="email"
              placeholder="contact@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !email.trim()}
          >
            {saving ? "作成中…" : "追加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCompanyDialog;