"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function ViewStudent({ id, open, onOpenChange }: {
  id: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [stu, setStu] = useState<any>(null);

  useEffect(() => {
    if (!open || !id) return;
    supabase
      .from("student_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setStu(data));
  }, [open, id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>学生詳細</DialogTitle>
        </DialogHeader>
        {stu ? (
          <ul className="space-y-1 text-sm">
            <li>ID: {stu.id}</li>
            <li>氏名: {stu.full_name}</li>
            <li>大学: {stu.university}</li>
            <li>自己紹介: {stu.bio}</li>
            {/* …etc */}
          </ul>
        ) : (
          <p className="text-sm text-muted">Loading…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}