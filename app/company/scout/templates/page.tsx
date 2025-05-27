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

export default function TemplateIndex() {
  const [rows, setRows] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    supabase
      .from("scout_templates")
      .select("*")
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
            <TableHead>作成日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any) => (
            <TableRow
              key={r.id}
              onClick={() => router.push(`/company/scout/templates/${r.id}`)}
              className="cursor-pointer hover:bg-muted"
            >
              <TableCell>{r.title}</TableCell>
              <TableCell>
                {new Date(r.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}