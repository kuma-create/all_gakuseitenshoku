/* ------------------------------------------------------------------
   app/ipo/diagnosis/result/page.tsx
   - 過去の診断結果一覧ページ
------------------------------------------------------------------- */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import { ArrowLeft, Clock, Brain, Heart, Target, Award } from "lucide-react";

type DiagnosisType = "personality" | "values" | "career" | "skills";

interface DiagnosisResultRow {
  id: string;
  session_id: string;
  type: DiagnosisType;
  scores: Record<string, number>;
  strengths: string[];
  growth_areas: string[];
  recommendations: any[];
  insights: string[];
  created_at: string;
}

const TYPE_LABELS: Record<DiagnosisType, { title: string; icon: any; color: string }> = {
  personality: { title: "性格診断", icon: Brain, color: "from-purple-400 to-purple-600" },
  values: { title: "価値観診断", icon: Heart, color: "from-pink-400 to-pink-600" },
  career: { title: "キャリア適性診断", icon: Target, color: "from-blue-400 to-blue-600" },
  skills: { title: "スキル診断", icon: Award, color: "from-green-400 to-green-600" },
};

const PAGE_SIZE = 20;

function toJSTString(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

export default function DiagnosisResultsListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DiagnosisResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeType, setActiveType] = useState<"all" | DiagnosisType>("all");

  const load = useCallback(
    async (opts?: { reset?: boolean; type?: "all" | DiagnosisType }) => {
      const reset = !!opts?.reset;
      const type = opts?.type ?? activeType;

      setLoading(true);
      setError(null);

      try {
        const from = (reset ? 0 : page * PAGE_SIZE);
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("diagnosis_results")
          .select("id, session_id, type, scores, strengths, growth_areas, recommendations, insights, created_at")
          .order("created_at", { ascending: false })
          .range(from, to);

        // Type filter
        if (type !== "all") {
          query = query.eq("type", type);
        }

        const { data, error } = await query.returns<DiagnosisResultRow[]>();
        if (error) throw error;

        const newRows = data ?? [];
        setRows(prev => (reset ? newRows : [...prev, ...newRows]));
        setHasMore(newRows.length === PAGE_SIZE);
        setPage(prev => (reset ? 1 : prev + 1));
      } catch (e: any) {
        setError("一覧の取得に失敗しました。権限・接続をご確認ください。");
      } finally {
        setLoading(false);
      }
    },
    [page, activeType]
  );

  // 初回ロード
  useEffect(() => {
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // タブ切替時
  const onChangeType = (next: "all" | DiagnosisType) => {
    setActiveType(next);
    setPage(0);
    setHasMore(true);
    load({ reset: true, type: next });
  };

  const grouped = useMemo(() => rows, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.push("/ipo/diagnosis")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            診断トップへ戻る
          </Button>
          <div className="text-sm text-muted-foreground">最新順</div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeType}
          onValueChange={(v) => onChangeType(v as any)}
          className="space-y-4"
        >
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="personality">性格</TabsTrigger>
            <TabsTrigger value="values">価値観</TabsTrigger>
            <TabsTrigger value="career">キャリア適性</TabsTrigger>
            <TabsTrigger value="skills">スキル</TabsTrigger>
          </TabsList>

          <TabsContent value={activeType}>
            {error && (
              <Card className="mb-4">
                <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
              </Card>
            )}

            {grouped.length === 0 && !loading && !error && (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  過去の診断結果はまだありません。
                </CardContent>
              </Card>
            )}

            {/* List */}
            <div className="space-y-3">
              {grouped.map((row) => {
                const label = TYPE_LABELS[row.type];
                const topScores = Object.entries(row.scores || {})
                  .map(([k, v]) => [k, Number(v)] as [string, number])
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);

              return (
                <Card key={row.id} className="hover:border-blue-300 transition">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          <Clock className="inline-block w-4 h-4 mr-1 align-[-2px]" />
                          {toJSTString(row.created_at)}
                        </div>
                        <div className="mt-1 text-base font-semibold flex items-center gap-2">
                          <span className={`p-2 rounded-full bg-gradient-to-r ${label.color}`}>
                            <label.icon className="w-5 h-5 text-white" />
                          </span>
                          {label.title}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {topScores.map(([k, v]) => (
                            <Badge key={k} variant="secondary">
                              {k}: {Math.round(v)}%
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/ipo/diagnosis/result/${row.id}`}>
                          <Button variant="default">詳細を見る</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>

            {/* Load more */}
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                onClick={() => load()}
                disabled={loading || !hasMore}
              >
                {loading ? "読み込み中…" : hasMore ? "もっと見る" : "これ以上はありません"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}