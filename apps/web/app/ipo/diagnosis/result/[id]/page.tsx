/* ------------------------------------------------------------------
   app/ipo/diagnosis/result/[id]/page.tsx
   - 過去の診断結果・詳細ページ（1件表示）
------------------------------------------------------------------- */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// UI components（shadcn）
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  ArrowLeft,
  Clock,
  Brain,
  Heart,
  Target,
  Award,
  User as UserIcon,
  Star,
  TrendingUp,
  Lightbulb,
  BookOpen,
  Download,
  RotateCcw,
  CheckCircle,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { CareerRadarChart } from "@/components/charts/CareerRadarChart";
import { motion } from "framer-motion";

// ---- Types ----
type DiagnosisType = "personality" | "values" | "career" | "skills";

interface JobRecommendation {
  title: string;
  match: number; // 0-100
  description?: string;
  reasons?: string[];
  averageSalary?: string;
  growthRate?: string;
  requiredSkills?: string[];
}

interface DiagnosisResultRow {
  id: string;
  session_id: string;
  type: DiagnosisType;
  scores: Record<string, number>;
  strengths: string[];
  growth_areas: string[];
  recommendations: JobRecommendation[]; // jsonb
  insights: string[];
  created_at: string;
}

const TYPE_LABELS: Record<
  DiagnosisType,
  { title: string; icon: any; color: string }
> = {
  personality: {
    title: "性格診断",
    icon: Brain,
    color: "from-purple-400 to-purple-600",
  },
  values: {
    title: "価値観診断",
    icon: Heart,
    color: "from-pink-400 to-pink-600",
  },
  career: {
    title: "キャリア適性診断",
    icon: Target,
    color: "from-blue-400 to-blue-600",
  },
  skills: {
    title: "スキル診断",
    icon: Award,
    color: "from-green-400 to-green-600",
  },
};

// ---- Helpers ----
function toJSTString(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return String(iso);
  }
}

function pct(n: number | undefined | null) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

// シンプルなプログレスバー（shadcn未使用）

function Bar({ value }: { value: number }) {
  return (
    <div className="w-full h-2 rounded bg-muted">
      <div
        className="h-2 rounded bg-primary"
        style={{ width: `${pct(value)}%` }}
      />
    </div>
  );
}

// ---- Helpers for radar data & labels (match /ipo/diagnosis/page.tsx) ----
function toRadarData(scores: Record<string, number>) {
  const pick = (candidates: string[], fallback = 50) => {
    for (const key of candidates) {
      if (key in scores) return scores[key];
      const found = Object.keys(scores).find((k) => k.toLowerCase() === key.toLowerCase());
      if (found) return scores[found] as number;
    }
    return fallback;
  };
  return {
    Communication: pick(["communication", "interpersonal", "extraversion"]),
    Logic: pick(["logic", "analytical", "logical", "conscientiousness"]),
    Leadership: pick(["leadership"]),
    Fit: pick(["fit", "agreeableness", "customer_focus", "adaptability"]),
    Vitality: pick(["vitality", "openness", "technical", "creativity", "innovation"]),
  };
}

function jpLabel(key: string) {
  const map: Record<string, string> = {
    communication: "コミュニケーション",
    logic: "ロジック",
    leadership: "リーダーシップ",
    fit: "フィット（適応）",
    vitality: "バイタリティ",
  };
  const k = key.toLowerCase();
  return map[k] ?? key;
}

export default function DiagnosisResultPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<DiagnosisResultRow | null>(null);

  const fetchOne = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("diagnosis_results")
        .select(
          "id, session_id, type, scores, strengths, growth_areas, recommendations, insights, created_at"
        )
        .eq("id", id)
        .single<DiagnosisResultRow>();
      if (error) throw error;
      setRow(data);
    } catch (e: any) {
      setError("結果の取得に失敗しました。権限またはIDをご確認ください。");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchOne();
  }, [id, fetchOne]);

  const scoresSorted = useMemo(() => {
    const s = row?.scores ?? {};
    return Object.entries(s)
      .map(([k, v]) => [k, Number(v)] as [string, number])
      .sort((a, b) => b[1] - a[1]);
  }, [row]);

  // --- Utilities for strengths/growth sorting (parity with main page) ---
  const scoreOf = (cat: string) => {
    if (!row?.scores) return 0;
    const direct = (row.scores as any)[cat];
    if (typeof direct === "number") return direct;
    const foundKey = Object.keys(row.scores).find((k) => k.toLowerCase() === cat.toLowerCase());
    return foundKey ? (row.scores as any)[foundKey] as number : 0;
  };
  const strengthsSorted = (row?.strengths ?? []).slice().sort((a, b) => scoreOf(b) - scoreOf(a));
  const growthSorted = (row?.growth_areas ?? []).slice().sort((a, b) => scoreOf(a) - scoreOf(b));

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/ipo/diagnosis")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
            <span className="text-sm text-muted-foreground">読み込み中…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => router.push("/ipo/diagnosis")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600 text-sm">{error ?? "該当する結果が見つかりませんでした。"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const meta = TYPE_LABELS[row.type];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/ipo/diagnosis")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              診断トップへ
            </Button>
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-full bg-gradient-to-r ${meta.color}`}>
                <meta.icon className="w-6 h-6 text-white" />
              </span>
              <h1 className="text-2xl font-semibold">{meta.title}（結果）</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{toJSTString(row.created_at)}</span>
            <Separator orientation="vertical" className="mx-2 h-4" />
            <span className="font-mono text-xs">ID: {row.id.slice(0, 8)}…</span>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="analysis">詳細分析</TabsTrigger>
            <TabsTrigger value="careers">適職</TabsTrigger>
            <TabsTrigger value="actions">行動計画</TabsTrigger>
          </TabsList>

          {/* 概要 */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-2xl font-bold text-gray-900">あなたの特性スコア</h3>
                  </CardHeader>
                  <CardContent>
                    <CareerRadarChart data={toRadarData(row.scores || {})} />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <Star className="w-5 h-5 text-yellow-500 mr-2" />
                      あなたの強み
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {strengthsSorted.length === 0 && (
                        <p className="text-sm text-gray-500">データが足りません</p>
                      )}
                      {strengthsSorted.map((strength, index) => {
                        const s = scoreOf(strength);
                        return (
                          <div key={index} className="rounded-lg border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold text-gray-900">{jpLabel(strength)}</div>
                              <div className="text-sm text-gray-600">{s}</div>
                            </div>
                            <Progress value={s} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
                      成長できる分野
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {growthSorted.length === 0 && (
                        <p className="text-sm text-gray-500">データが足りません</p>
                      )}
                      {growthSorted.map((area, index) => {
                        const s = scoreOf(area);
                        return (
                          <div key={index} className="rounded-lg border p-3 bg-orange-50/30">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold text-gray-900">{jpLabel(area)}</div>
                              <div className="text-sm text-gray-600">{s}</div>
                            </div>
                            <Progress value={s} className="h-2" />
                          </div>
                        );
                      })}
                      <p className="text-xs text-gray-500 mt-2">※ スコアが低いほど優先的に伸ばすべき領域です</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* 詳細分析 */}
          <TabsContent value="analysis" className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-6">
              {Object.entries(row.scores || {}).map(([key, score], index) => (
                <motion.div
                  key={key}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900 mb-2">{Number(score)}</div>
                        <div className="text-gray-600 mb-4">{jpLabel(key)}</div>
                        <Progress value={Number(score)} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-2xl font-bold text-gray-900">詳細な分析結果</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(row.insights ?? []).map((insight, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.2 }}
                      className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg"
                    >
                      <p className="text-gray-700">{insight}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 適職 */}
          <TabsContent value="careers" className="space-y-8">
            <div className="space-y-6">
              {(row.recommendations ?? []).map((job, index) => (
                <motion.div
                  key={index}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-8">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <h3 className="text-2xl font-bold text-gray-900">{job.title}</h3>
                            <div className="flex items-center space-x-2">
                              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">#{index + 1}</span>
                              </div>
                              <div>
                                <div className="font-bold text-green-600 text-lg">{Number(job.match)}%</div>
                                <div className="text-xs text-gray-500">マッチ度</div>
                              </div>
                            </div>
                          </div>
                          
                          {job.description && (
                            <p className="text-gray-600 mb-6 text-lg">{job.description}</p>
                          )}
                          
                          <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div>
                              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                マッチする理由
                              </h4>
                              <div className="space-y-2">
                                {(job.reasons ?? []).map((reason, reasonIndex) => (
                                  <Badge key={reasonIndex} variant="secondary" className="mr-2">
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                <Lightbulb className="w-4 h-4 text-yellow-500 mr-2" />
                                必要なスキル
                              </h4>
                              <div className="space-y-2">
                                {(job.requiredSkills ?? []).map((skill, skillIndex) => (
                                  <Badge key={skillIndex} variant="outline" className="mr-2">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                            {job.averageSalary && (
                              <div className="flex items-center">
                                <Target className="w-4 h-4 mr-1" />
                                平均年収: {job.averageSalary}
                              </div>
                            )}
                            {job.growthRate && (
                              <div className="flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                成長率: {job.growthRate}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* 行動計画 */}
          <TabsContent value="actions" className="space-y-8">
            <Card>
              <CardHeader>
                <h3 className="text-2xl font-bold text-gray-900">次のステップ</h3>
                <p className="text-gray-600">診断結果を活かして、キャリアを前進させましょう</p>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 mb-4">すぐに始められること</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">1</div>
                        <div>
                          <h5 className="font-medium text-gray-900">業界研究を深める</h5>
                          <p className="text-sm text-gray-600">推奨された職種の業界動向を調べましょう</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">2</div>
                        <div>
                          <h5 className="font-medium text-gray-900">スキルマップを作成</h5>
                          <p className="text-sm text-gray-600">現在のスキルと必要なスキルのギャップを把握</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">3</div>
                        <div>
                          <h5 className="font-medium text-gray-900">ネットワーキング開始</h5>
                          <p className="text-sm text-gray-600">業界の先輩や専門家との接点を作りましょう</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-900 mb-4">中長期的な取り組み</h4>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">1</div>
                        <div>
                          <h5 className="font-medium text-gray-900">資格・認定取得</h5>
                          <p className="text-sm text-gray-600">職種に必要な専門資格の取得を検討</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">2</div>
                        <div>
                          <h5 className="font-medium text-gray-900">実務経験を積む</h5>
                          <p className="text-sm text-gray-600">インターンシップやプロジェクトに参加</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5">3</div>
                        <div>
                          <h5 className="font-medium text-gray-900">ポートフォリオ構築</h5>
                          <p className="text-sm text-gray-600">成果物をまとめて実力をアピール</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 mt-8"
        >
          <Button 
            onClick={() => router.push('/ipo/library')} 
            className="flex-1 flex items-center justify-center space-x-2 h-12"
          >
            <BookOpen className="w-4 h-4" />
            <span>業界・職種を詳しく調べる</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/ipo/diagnosis')} 
            className="flex-1 flex items-center justify-center space-x-2 h-12"
          >
            <RotateCcw className="w-4 h-4" />
            <span>別の診断を受ける</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/ipo/dashboard')}
            className="flex-1 flex items-center justify-center space-x-2 h-12"
          >
            <Download className="w-4 h-4" />
            <span>結果を保存</span>
          </Button>
        </motion.div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.push("/ipo/diagnosis")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            診断トップへ戻る
          </Button>
          <div className="text-sm text-muted-foreground">
            セッションID: <span className="font-mono">{row.session_id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}