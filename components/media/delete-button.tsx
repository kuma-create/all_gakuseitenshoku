"use client";
import { useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";

export default function DeletePostButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleDelete() {
    if (!confirm("本当に削除しますか？（元に戻せません）")) return;

    const { error } = await supabase
      .from("media_posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("削除に失敗しました");
    } else {
      toast.success("削除しました");
      // 一覧を再取得
      startTransition(() => router.refresh());
    }
  }

  return (
    <Button
      size="sm"
      variant="destructive"
      onClick={handleDelete}
      disabled={pending}
    >
      <Trash className="w-4 h-4 mr-1" />
      {pending ? "削除中…" : "削除"}
    </Button>
  );
}