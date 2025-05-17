/* ────────────────────────────────────────────────
   app/student/scouts/page.tsx  ― スカウト一覧 (Client)
──────────────────────────────────────────────── */
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  Badge,
  Button,
  Card,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Search, Mail, Check, X, Clock } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

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

  const [statusTab, setStatusTab] = useState<"all" | "pending" | "accepted" | "declined">("all");
  const [query, setQuery] = useState("");

  /* -------------------- Supabase → UIScout 変換 -------------------- */
  const fetchScouts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("scouts")
      .select(
        `
          *,
          companies:companies!scouts_company_id_fkey(name, logo),
          jobs:jobs!scouts_job_id_fkey(title)
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

  const displayedScouts = useMemo(() => {
    const q = query.toLowerCase();
    return scouts.filter((s) => {
      const matchesTab = statusTab === "all" || s.status === statusTab;
      const matchesQ =
        q === "" ||
        s.companyName.toLowerCase().includes(q) ||
        s.position.toLowerCase().includes(q) ||
        s.message.toLowerCase().includes(q);
      return matchesTab && matchesQ;
    });
  }, [scouts, statusTab, query]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-gradient-to-r from-red-500 to-red-700 py-6 sm:py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">スカウト一覧</h1>
          <p className="text-white/90 sm:text-lg">企業から届いたスカウトを確認しましょう</p>

          <div className="mt-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-lg sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="企業名やポジションで検索"
                className="border-2 pl-10 focus:border-red-500 focus:ring-red-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Tabs value={statusTab} onValueChange={(v)=>setStatusTab(v as any)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-4 rounded-xl bg-gray-100 p-1 sm:w-72">
                <TabsTrigger value="all"       className="rounded-lg text-xs sm:text-sm">すべて</TabsTrigger>
                <TabsTrigger value="pending"   className="rounded-lg text-xs sm:text-sm">未対応</TabsTrigger>
                <TabsTrigger value="accepted"  className="rounded-lg text-xs sm:text-sm">承諾</TabsTrigger>
                <TabsTrigger value="declined"  className="rounded-lg text-xs sm:text-sm">辞退</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {loading && (
          <p className="text-center text-muted-foreground">読み込み中...</p>
        )}

        {!loading && displayedScouts.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <Mail className="mx-auto mb-4 h-10 w-10 text-gray-400" />
            <p className="text-gray-600">現在表示できるスカウトはありません</p>
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayedScouts.map((s) => (
            <Card key={s.id} className="group overflow-hidden rounded-xl shadow hover:shadow-lg transition">
              <div className="flex items-center gap-3 p-4">
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white border">
                  <Image
                    src={s.companyLogo || "/placeholder.svg"}
                    alt={`${s.companyName} logo`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold line-clamp-1">{s.companyName}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{s.position}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    s.status === "pending"
                      ? "border-yellow-400 text-yellow-600"
                      : s.status === "accepted"
                      ? "border-green-400 text-green-600"
                      : "border-gray-400 text-gray-500"
                  }
                >
                  {s.status === "pending" ? "未対応" : s.status === "accepted" ? "承諾" : "辞退"}
                </Badge>
              </div>

              <div className="px-4 pb-4 text-sm text-gray-600 line-clamp-3">{s.message}</div>

              <div className="mt-auto border-t px-4 py-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} /> {new Date(s.createdAt).toLocaleDateString()}
                </span>
                {s.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleDecline(s.id)}>
                      <X size={16} className="text-gray-400" />
                    </Button>
                    <Button size="icon" onClick={() => handleAccept(s.id)}>
                      <Check size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
