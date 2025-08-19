"use client"
import { supabase } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function TemplateIndex() {
  const [rows, setRows] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    supabase
      .from("scout_templates")
      .select("*, job:job_id(title)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows(data || []))
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabase.from("scout_templates").delete().eq("id", id);
    if (error) {
      toast.error("削除に失敗しました");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("削除しました");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">スカウトテンプレート</h1>
        <Button asChild>
          <a href="/company/scout/templates/new">＋ 新規作成</a>
        </Button>
      </div>
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead>タイトル</TableHead>
            <TableHead>求人</TableHead>
            <TableHead>作成日</TableHead>
            <TableHead className="text-center">種別</TableHead>
            <TableHead>ポジション</TableHead>
            <TableHead>レンジ</TableHead>
            <TableHead className="w-[80px] text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any) => (
            <TableRow
              key={r.id}
              onClick={() => router.push(`/company/scout/templates/${r.id}`)}
              className="cursor-pointer odd:bg-muted/40 hover:bg-muted transition-colors"
            >
              <TableCell className="font-medium">{r.title}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                {r.job?.title ?? "—"}
              </TableCell>
              <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-center">
                {r.is_global ? (
                  <Badge variant="secondary">共有</Badge>
                ) : (
                  <Badge>社内</Badge>
                )}
              </TableCell>
              <TableCell>{r.position ?? "—"}</TableCell>
              <TableCell>{r.offer_range ?? "—"}</TableCell>
              <TableCell
                className="text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="p-1 rounded hover:bg-destructive/10"
                  onClick={() => handleDelete(r.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}