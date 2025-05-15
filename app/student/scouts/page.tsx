/* ------------------------------------------------------------------
   app/student/scouts/page.tsx
------------------------------------------------------------------ */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { ScoutNotification } from "@/components/scout-notification";

/* ===== UI 用の型（画面で使うぶんだけ） ===== */
type UIScout = {
  id: string;
  companyName: string;
  companyLogo: string;
  position: string;
  message: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined";
};

export default function StudentScoutsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [scouts, setScouts] = useState<UIScout[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* ================================================================
     1. 認証ユーザー取得 → いなければ /login へ
  ================================================================= */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error(error);
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      fetchScouts(user.id);
    })();
  }, [router]);

  /* ================================================================
     2. スカウト一覧取得（JOIN はテーブル名そのまま）
  ================================================================= */
  const fetchScouts = async (studentId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("scouts")
      .select(
        `
          id,
          status,
          message,
          created_at,
          companies ( name, logo ),
          jobs      ( title )
        `
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    /* data の型付けが面倒なので一旦 any で受ける */
    const ui: UIScout[] = (data as any[]).map((row) => ({
      id: row.id,
      companyName: row.companies?.name ?? "Unknown",
      companyLogo:
        row.companies?.logo ?? "/images/placeholder-avatar.png",
      position: row.jobs?.title ?? "職種未確定",
      message: row.message ?? "",
      createdAt: row.created_at
        ? new Date(row.created_at).toLocaleDateString()
        : "—",
      status: row.status,
    }));

    setScouts(ui);
    setLoading(false);
  };

  /* ================================================================
     3. 承諾 / 辞退
  ================================================================= */
  const updateStatus = useCallback(
    async (id: string, status: "accepted" | "declined") => {
      setBusyId(id);

      const { error } = await supabase
        .from("scouts")
        .update({ status })
        .eq("id", id);

      if (error) console.error(error);

      /* ローカル状態だけ先に更新して即時反映 */
      setScouts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );

      setBusyId(null);
    },
    []
  );

  /* ================================================================
     4. UI
  ================================================================= */
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ロード中…
      </div>
    );
  }

  if (!scouts.length) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">
          まだスカウトはありません
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      {scouts.map((s) => (
        <ScoutNotification
          key={s.id}
          scout={s}
          onAccept={() => updateStatus(s.id, "accepted")}
          onDecline={() => updateStatus(s.id, "declined")}
          isLoading={busyId === s.id}
        />
      ))}
    </div>
  );
}
