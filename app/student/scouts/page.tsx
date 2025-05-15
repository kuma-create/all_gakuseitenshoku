/* ------------------------------------------------------------------
   app/student/scouts/page.tsx
   – 学生向けスカウト一覧（認証ガード付き）
------------------------------------------------------------------ */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { Loader2 } from "lucide-react";
import { ScoutNotification } from "@/components/scout-notification";

/* ---------- 型 ---------- */
type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"];
type ScoutWithRelations = ScoutRow & {
  companies: { name: string; logo: string | null } | null;
  jobs: { title: string | null } | null;
};

export type UIScout = {
  id: string;
  companyName: string;
  companyLogo: string;
  position: string;
  message: string;
  /** YYYY/MM/DD など、表示用に整形済みの文字列 */
  createdAt: string;
  status: "pending" | "accepted" | "declined";
};

/* ------------------------------------------------------------------
   コンポーネント
------------------------------------------------------------------ */
export default function StudentScoutsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [scouts, setScouts] = useState<UIScout[]>([]);

  /** 応答（承諾 / 辞退）時のローディング対象 ID */
  const [respondingId, setRespondingId] = useState<string | null>(null);

  /* ========= ① 認証チェック ========= */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error(error);
        return;
      }

      if (!data.user) {
        router.replace("/login");
        return;
      }

      fetchScouts(data.user.id);
    })();
  }, [router]);

  /* ========= ② スカウト取得 ========= */
  const fetchScouts = async (userId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("scouts")
      .select(
        `
          id,
          status,
          created_at,
          message,
          companies:company_id ( name, logo ),
          jobs:job_id ( title )
        `
      )
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const ui = (data as ScoutWithRelations[]).map((s) => ({
      id: s.id,
      companyName: s.companies?.name ?? "Unknown",
      companyLogo: s.companies?.logo ?? "/images/placeholder-avatar.png",
      position: s.jobs?.title ?? "職種未確定",
      message: s.message ?? "",
      createdAt: s.created_at
        ? new Date(s.created_at).toLocaleDateString()
        : "—",
      status: s.status as UIScout["status"],
    }));

    setScouts(ui);
    setLoading(false);
  };

  /* ========= ③ 承諾 / 辞退 ========= */
  const handleRespond = useCallback(
    async (scoutId: string, status: "accepted" | "declined") => {
      setRespondingId(scoutId);

      const { error } = await supabase
        .from("scouts")
        .update<Partial<ScoutRow>>({ status })
        .eq("id", scoutId);

      if (error) console.error(error);

      // ローカル状態を即時更新
      setScouts((prev) =>
        prev.map((s) => (s.id === scoutId ? { ...s, status } : s))
      );
      setRespondingId(null);
    },
    []
  );

  /* ========= ④ UI ========= */
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
        <p className="text-muted-foreground">まだスカウトはありません</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      {scouts.map((s) => (
        <ScoutNotification
          key={s.id}
          scout={s}
          /** ScoutNotificationProps に必須なので渡す */
          onAccept={() => handleRespond(s.id, "accepted")}
          onDecline={() => handleRespond(s.id, "declined")}
          isLoading={respondingId === s.id}
        />
      ))}
    </div>
  );
}
