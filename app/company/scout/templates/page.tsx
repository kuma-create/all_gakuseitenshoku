// app/company/scout/templates/page.tsx
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

export default function TemplateIndex() {
  const [rows, setRows] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    supabase
      .from("scout_templates")
      .select("*, creator:profiles(full_name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows(data || []))
  }, [])

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
            <TableHead>作成者</TableHead>
            <TableHead>作成日</TableHead>
            <TableHead className="text-center">種別</TableHead>
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
              <TableCell>{r.creator?.full_name ?? "—"}</TableCell>
              <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-center">
                {r.is_global ? (
                  <Badge variant="secondary">共有</Badge>
                ) : (
                  <Badge>社内</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}