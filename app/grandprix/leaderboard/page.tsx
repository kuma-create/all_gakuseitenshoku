/* ------------------------------------------------------------------
   app/grandprix/leaderboard/page.tsx
   – ランキング表示ページ
------------------------------------------------------------------*/
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { Loader2, ChevronDown } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

/* ---------- 型 ---------- */
type LeaderboardRow = {
  rank: number;
  total_score: number;
  student_profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1‑12

  const ymKey = `${year}-${String(month).padStart(2, "0")}-01`;

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      const { data, error } = await supabase
        .from("gp_rank")
        .select(
          `
          rank,
          total_score,
          student_profiles:student_id (
            full_name,
            avatar_url
          )
        `
        )
        .eq("month", ymKey)
        .order("rank")
        .limit(100);

      if (error) {
        console.error("gp_rank fetch error:", error.message);
      } else {
        setRows((data as LeaderboardRow[]) ?? []);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, [ymKey]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">リーダーボード</h1>
        <select
          className="rounded-md border px-3 py-1 text-sm"
          value={ymKey}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            setYear(y);
            setMonth(m);
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            const key = `${y}-${String(m).padStart(2, "0")}-01`;
            return (
              <option key={key} value={key}>
                {y}年{m}月
              </option>
            );
          })}
        </select>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>🏆 ランキング</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 text-left">順位</th>
                <th className="py-2 pr-4 text-left">学生</th>
                <th className="py-2 text-left">スコア</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-sm text-muted-foreground">
                    データがありません
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.rank} className="border-t">
                    <td className="py-2 pr-4">{r.rank}</td>
                    <td className="flex items-center gap-2 py-2 pr-4">
                      {r.student_profiles?.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.student_profiles.avatar_url}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      )}
                      {r.student_profiles?.full_name ?? "Anonymous"}
                    </td>
                    <td className="py-2">{r.total_score}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}