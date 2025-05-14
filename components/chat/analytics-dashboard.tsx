"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";

type AvgRes  =
  Database["public"]["Functions"]["avg_response_time_sec"]["Returns"];
type Metrics = {
  totalChats: number;
  unreadMessages: number;
  avgResponseSec: number;
};

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    totalChats: 0,
    unreadMessages: 0,
    avgResponseSec: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);

      /* ① 総チャット数 */
      const { count: totalChats } = await supabase
        .from("chat_rooms")
        .select("id", { count: "exact", head: true });

      /* ② 未読メッセージ数 */
      const { count: unreadMessages } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);

      /* ③ 平均応答時間 (RPC) */
      const { data: rpcData, error: rpcError } =
        await supabase.rpc("avg_response_time_sec");
      if (rpcError) console.error("RPC error:", rpcError);

      const avg =
        (rpcData as AvgRes | null)?.[0]?.avg_response_sec ?? 0;

      setMetrics({
        totalChats: totalChats ?? 0,
        unreadMessages: unreadMessages ?? 0,
        avgResponseSec: avg,
      });
      setLoading(false);
    };

    fetchMetrics();
  }, []); // supabase is singleton

  /* ローディング表示 */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading metrics…</p>
      </div>
    );
  }

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}時間${m.toString().padStart(2, "0")}分`;
  };

  /* ------------------------------ UI ------------------------------- */
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">チャット分析ダッシュボード</h2>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="response">応答時間</TabsTrigger>
          <TabsTrigger value="conversion">コンバージョン</TabsTrigger>
        </TabsList>

        {/* ─── 概要タブ ─────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 総チャット数 */}
            <Card>
              <CardHeader>
                <CardTitle>総チャット数</CardTitle>
                <CardDescription>現在のチャットルーム数</CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-bold">
                {metrics.totalChats}
              </CardContent>
            </Card>

            {/* 未読メッセージ */}
            <Card>
              <CardHeader>
                <CardTitle>未読メッセージ数</CardTitle>
                <CardDescription>未確認のメッセージ件数</CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-bold">
                {metrics.unreadMessages}
              </CardContent>
            </Card>

            {/* 平均応答時間 */}
            <Card>
              <CardHeader>
                <CardTitle>平均応答時間</CardTitle>
                <CardDescription>過去30日の平均</CardDescription>
              </CardHeader>
              <CardContent className="text-3xl font-bold">
                {formatTime(metrics.avgResponseSec)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── 応答時間タブ ───────────────────────── */}
        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>応答時間の推移</CardTitle>
              <CardDescription>実装時に折れ線グラフを描画</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-md">
                <span className="text-muted-foreground">
                  折れ線グラフ placeholder
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── コンバージョンタブ ──────────────────── */}
        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>コンバージョンファネル</CardTitle>
              <CardDescription>各ステージの通過率</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-md">
                <span className="text-muted-foreground">
                  ファネルチャート placeholder
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
