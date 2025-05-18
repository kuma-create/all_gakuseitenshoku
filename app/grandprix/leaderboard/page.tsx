/* ------------------------------------------------------------------
   app/grandprix/leaderboard/page.tsx
   – ランキング表示ページ
------------------------------------------------------------------*/
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

/* ---------- 型 ---------- */
type LeaderboardRow = {
  student_id: string;
  total_score: number;
  rank: number;
  full_name: string | null;
  avatar: string | null;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_limit: 100,              // ← 上限は必要に応じて変更
      });

      if (error) {
        console.error("get_leaderboard error:", error.message);
      } else {
        setRows((data as unknown as LeaderboardRow[]) ?? []);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-10">
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
              {rows.map((r) => (
                <tr key={r.rank} className="border-t">
                  <td className="py-2 pr-4">{r.rank}</td>
                  <td className="py-2 pr-4 flex items-center gap-2">
                    {r.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar} alt="" className="h-6 w-6 rounded-full" />
                    )}
                    {r.full_name ?? "Anonymous"}
                  </td>
                  <td className="py-2">{r.total_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}