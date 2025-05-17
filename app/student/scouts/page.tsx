/* ────────────────────────────────────────────────
   app/student/scouts/page.tsx  ― スカウト一覧 (Client)
──────────────────────────────────────────────── */
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ScoutNotification } from "@/components/scout-notification";

/* ------------------------------------------------------------------ */
/*                               型定義                                */
/* ------------------------------------------------------------------ */

/** 生の Row 型 */
type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"];

/** JOIN したい列だけ明示した中間型 */
type ScoutWithRelations = ScoutRow & {
  companies: { name: string; logo: string | null } | null;
  jobs: { title: string | null } | null;
};

/** UI 用フラット型 */
export type UIScout = {
  id: string;
  companyName: string;
  position: string;
  message: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined";
  companyLogo: string;
};

/* ------------------------------------------------------------------ */
/*                               画面                                  */
/* ------------------------------------------------------------------ */
export default function ScoutsPage() {
  const [scouts, setScouts] = useState<UIScout[]>([]);
  const [loading, setLoading] = useState(false);

  /* -------------------- Supabase → UIScout 変換 -------------------- */
  const fetchScouts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("scouts")
      .select(
        `
          *,
          companies:companies(name, logo),
          jobs:jobs(title)
        `,
      )
      .order("created_at", { ascending: false })
      .returns<ScoutWithRelations[]>(); // ★ 型を明示

    if (error) {
      console.error("Failed to fetch scouts:", error);
      setScouts([]);
      setLoading(false);
      return;
    }

    const uiScouts: UIScout[] = (data ?? []).map((row) => ({
      id: row.id,
      companyName: row.companies?.name ?? "Unknown Company",
      position: row.jobs?.title ?? "Unknown Position",
      message: row.message,
      createdAt: row.created_at ?? "",
      status: (row.status as UIScout["status"]) ?? "pending",
      companyLogo: row.companies?.logo ?? "/placeholder.svg",
    }));

    setScouts(uiScouts);
    setLoading(false);
  };

  useEffect(() => {
    fetchScouts();
  }, []);

  /* ------------------------- アクション ---------------------------- */
  const patchStatus = async (id: string, next: UIScout["status"]) => {
    setLoading(true);
    const { error } = await supabase
      .from("scouts")
      .update({ status: next })
      .eq("id", id);

    if (error) {
      console.error(`Error updating scout status to ${next}:`, error);
    } else {
      setScouts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: next } : s)),
      );
    }
    setLoading(false);
  };

  const handleAccept = (id: string) => patchStatus(id, "accepted");
  const handleDecline = (id: string) => patchStatus(id, "declined");

  /* ------------------------- レンダリング ------------------------- */
  return (
    <div className="container mx-auto space-y-6 py-8">
      <h1 className="text-3xl font-bold">スカウト一覧</h1>

      {loading && <p>読み込み中...</p>}

      {!loading && scouts.length === 0 && (
        <p className="text-center text-muted-foreground">
          現在、スカウトはありません。
        </p>
      )}

      <div className="space-y-4">
        {scouts.map((scout) => (
          <ScoutNotification
            key={scout.id}
            scout={scout}
            onAccept={handleAccept}
            onDecline={handleDecline}
            isLoading={loading}
          />
        ))}
      </div>
    </div>
  );
}
