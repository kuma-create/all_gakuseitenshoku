"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";

type Admin = { id: string; email: string; last_sign_in_at: string | null };

export default function AdminList() {
  const [list, setList] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("admins")
      .select("id,email,last_sign_in_at")  // 文字列リテラルで指定 (generic は使わない)
      .order("created_at", { ascending: false });
    if (error) setErr(error.message);
    setList((data ?? []) as Admin[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Skeleton className="h-12 w-full" />;
  if (err)
    return (
      <Alert variant="destructive">
        <AlertTitle>読み込み失敗</AlertTitle>
        <AlertDescription>{err}</AlertDescription>
        <Button onClick={load}>再試行</Button>
      </Alert>
    );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>メール</TableHead>
          <TableHead>最終ログイン</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((a) => (
          <TableRow key={a.id}>
            <TableCell>{a.id}</TableCell>
            <TableCell>{a.email}</TableCell>
            <TableCell>{a.last_sign_in_at ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}