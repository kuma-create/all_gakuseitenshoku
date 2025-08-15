"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
// Props expected by the radar chart
type RadarChartProps = { data: CareerScoreBreakdown };

const CareerRadarChartLazy = React.lazy(() =>
  import("../../../components/ipo/charts/CareerRadarChart").then((m: any) => ({
    default: (m.default ?? m.CareerRadarChart) as React.ComponentType<RadarChartProps>,
  }))
);
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// If you already have a shared supabase client for mobile, prefer that import.
// Fallback: dynamic import inside effect as done on web.
let supabaseClient: any = null;

// Simple progress bar for RN
const ProgressBar = ({ progress }: { progress: number }) => {
  const pct = Math.max(0, Math.min(100, progress || 0));
  return (
    <View style={{ width: "100%", height: 10, backgroundColor: "#E5E7EB", borderRadius: 999 }}>
      <View style={{ width: `${pct}%`, height: 10, backgroundColor: "#3B82F6", borderRadius: 999 }} />
    </View>
  );
};

// Small metric card
const MetricCard = ({
  label,
  value,
  subtitle,
  icon,
  progress,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  progress?: number;
}) => (
  <View
    style={{
      flex: 1,
      padding: 16,
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      borderColor: "#E5E7EB",
      borderWidth: 1,
    }}
  >
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <View style={{ flexShrink: 1, paddingRight: 8 }}>
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "600" }}>{label}</Text>
        <Text style={{ fontSize: 24, color: "#111827", fontWeight: "800", marginTop: 2 }}>{value}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{subtitle}</Text>
        ) : null}
      </View>
      {icon}
    </View>
    {typeof progress === "number" && (
      <View style={{ marginTop: 10 }}>
        <ProgressBar progress={progress} />
      </View>
    )}
  </View>
);

const Pill = ({ text }: { text: string }) => (
  <View style={{ backgroundColor: "#111827", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
    <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700", letterSpacing: 0.5 }}>{text}</Text>
  </View>
);

interface PeerReview {
  id: string;
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
}

interface CareerScoreBreakdown {
  Communication: number;
  Logic: number;
  Leadership: number;
  Fit: number;
  Vitality: number;
}

export default function IPOMobileDashboard() {
  const router = useRouter();

  const [peerReviews, setPeerReviews] = useState<PeerReview[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ reviewer: "", rating: 5, comment: "" });
  const [careerScore, setCareerScore] = useState<{
    overall: number;
    breakdown: CareerScoreBreakdown;
    trend?: "up" | "down" | "flat";
    insights?: { strengths: string[]; improvements: string[]; recommendations: string[] };
    lastUpdated?: string;
  } | null>(null);
  const [scoreHistory, setScoreHistory] = useState<Array<{ date: string; overall: number }>>([]);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [completedOnboardingSteps, setCompletedOnboardingSteps] = useState<number[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [analysisCompletion, setAnalysisCompletion] = useState(0);
  const [loading, setLoading] = useState(true);

  const navigateFn = useCallback(
    (route: string) => {
      router.push(route as any);
    },
    [router]
  );

  useEffect(() => {
    (async () => {
      try {
        // First-visit flag
        const hasVisited = await AsyncStorage.getItem("ipo-has-visited");
        if (!hasVisited) {
          setIsFirstTime(true);
          await AsyncStorage.setItem("ipo-has-visited", "true");
        }

        const savedProgress = await AsyncStorage.getItem("ipo-onboarding-progress");
        if (savedProgress) {
          setCompletedOnboardingSteps(JSON.parse(savedProgress));
        }

        // Initialize Supabase (mobile uses env; do not depend on web alias)
        try {
          const mod = await import("@supabase/supabase-js");
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (supabaseUrl && supabaseKey) {
            supabaseClient = mod.createClient(supabaseUrl, supabaseKey);
          }
        } catch {}

        if (!supabaseClient) {
          setLoading(false);
          return;
        }

        const { data: auth } = await supabaseClient.auth.getUser();
        const user = auth?.user;
        if (!user) {
          setLoading(false);
          return;
        }

        // Peer Reviews
        const { data: reviewRows, error: reviewErr } = await supabaseClient
          .from("ipo_peer_reviews")
          .select("id, reviewer, rating, comment, reviewed_at")
          .eq("user_id", user.id)
          .order("reviewed_at", { ascending: false });
        if (!reviewErr && reviewRows) {
          setPeerReviews(
            reviewRows.map((r: any) => ({
              id: String(r.id),
              reviewer: r.reviewer ?? "匿名",
              rating: Number(r.rating ?? 0),
              comment: r.comment ?? "",
              date: (r.reviewed_at ?? "").slice(0, 10),
            }))
          );
        }

        // Score history
        const { data: historyRows } = await supabaseClient
          .from("ipo_career_score")
          .select("scored_at, overall")
          .eq("user_id", user.id)
          .order("scored_at", { ascending: true });
        setScoreHistory(
          (historyRows ?? []).map((r: any) => ({ date: (r.scored_at ?? "").slice(0, 10), overall: r.overall ?? 0 }))
        );

        // Analysis progress
        const { data: progRow } = await supabaseClient
          .from("ipo_analysis_progress")
          .select("ai_chat, life_chart, future_vision, strength_analysis, experience_reflection")
          .eq("user_id", user.id)
          .maybeSingle();
        if (progRow) {
          const a = progRow.ai_chat ?? 0;
          const b = progRow.life_chart ?? 0;
          const c = progRow.future_vision ?? 0;
          const d = progRow.strength_analysis ?? 0;
          const e = progRow.experience_reflection ?? 0;
          const avg = Math.round((a + b + c + d + e) / 5);
          setAnalysisCompletion(avg);
        }

        // Latest score
        const { data: scoreRow } = await supabaseClient
          .from("ipo_career_score")
          .select("*")
          .eq("user_id", user.id)
          .order("scored_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scoreRow) {
          setCareerScore({
            overall: scoreRow.overall ?? 0,
            breakdown: (scoreRow.breakdown ?? {
              Communication: 0,
              Logic: 0,
              Leadership: 0,
              Fit: 0,
              Vitality: 0,
            }) as CareerScoreBreakdown,
            trend: (scoreRow.trend ?? "flat") as "up" | "down" | "flat",
            insights: scoreRow.insights ?? { strengths: [], improvements: [], recommendations: [] },
            lastUpdated: scoreRow.scored_at ?? new Date().toISOString(),
          });
        } else {
          setCareerScore({
            overall: 0,
            breakdown: { Communication: 0, Logic: 0, Leadership: 0, Fit: 0, Vitality: 0 },
            trend: "flat",
            insights: { strengths: [], improvements: [], recommendations: [] },
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const scoreChange = React.useMemo(() => {
    if (!careerScore || scoreHistory.length < 2) return null as number | null;
    const current = careerScore.overall;
    const previous = scoreHistory[scoreHistory.length - 2]?.overall || current;
    return current - previous;
  }, [careerScore, scoreHistory]);

  const handleOnboardingStepComplete = async (stepId: number) => {
    const updated = [...completedOnboardingSteps, stepId];
    setCompletedOnboardingSteps(updated);
    await AsyncStorage.setItem("ipo-onboarding-progress", JSON.stringify(updated));
  };

  const handleAddReview = useCallback(() => {
    if (!newReview.reviewer.trim() || !newReview.comment.trim()) return;
    const review: PeerReview = {
      id: Date.now().toString(),
      reviewer: newReview.reviewer,
      rating: newReview.rating,
      comment: newReview.comment,
      date: new Date().toISOString().split("T")[0],
    };
    setPeerReviews((prev) => [review, ...prev]);
    setNewReview({ reviewer: "", rating: 5, comment: "" });
    setShowReviewModal(false);
  }, [newReview]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const breakdown: CareerScoreBreakdown = careerScore?.breakdown ?? {
    Communication: 0,
    Logic: 0,
    Leadership: 0,
    Fit: 0,
    Vitality: 0,
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827" }}></Text>
          <Text style={{ marginTop: 4, color: "#6B7280" }}>あなたのキャリア開発の進捗を確認しましょう</Text>
        </View>

        {/* First-time Welcome */}
        {isFirstTime && (
          <View
            style={{
              marginBottom: 16,
              backgroundColor: "#EFF6FF",
              borderColor: "#BFDBFE",
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#1F2937", marginBottom: 8 }}>
              🎉 IPO Universityへようこそ！
            </Text>
            <Text style={{ color: "#374151", marginBottom: 12 }}>
              就活成功への6ステップガイドで、効率的にキャリア開発を進めましょう。
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowOnboardingGuide(true);
                  setIsFirstTime(false);
                }}
                style={{
                  backgroundColor: "#3B82F6",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>ガイドを開始する</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsFirstTime(false)}
                style={{
                  borderColor: "#D1D5DB",
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: "#374151" }}>後で確認する</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Header Metrics */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <MetricCard
            label="キャリアスコア"
            value={careerScore?.overall ?? 0}
            subtitle={
              scoreChange === null
                ? undefined
                : `${scoreChange > 0 ? "+" : ""}${scoreChange}（前回比）`
            }
            icon={<Text style={{ fontSize: 28 }}>📈</Text>}
            progress={careerScore?.overall ?? 0}
          />
          <MetricCard
            label="自己分析完了度"
            value={`${analysisCompletion}%`}
            icon={<Text style={{ fontSize: 28 }}>📊</Text>}
            progress={analysisCompletion}
          />
        </View>

        {/* Career Score Detail */}
        <View style={{ marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 12, borderColor: "#E5E7EB", borderWidth: 1 }}>
          <View style={{ padding: 16, borderBottomColor: "#E5E7EB", borderBottomWidth: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>キャリアスコア詳細</Text>
                <Text style={{ color: "#6B7280", marginTop: 4 }}>5つの軸であなたの強みを可視化</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowScoreInfo(true)}
                style={{ borderColor: "#D1D5DB", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text>詳細を見る</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ padding: 16 }}>
            {/* Radar Chart */}
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Suspense fallback={<Text style={{ color: "#6B7280" }}>Loading chart...</Text>}>
                <CareerRadarChartLazy data={breakdown} />
              </Suspense>
            </View>
            {/* Simple numeric list for breakdown on mobile */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              {Object.entries(breakdown).map(([key, value]) => (
                <View key={key} style={{ width: "48%", marginBottom: 10, alignItems: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: "#1D4ED8" }}>{value}</Text>
                  <Text style={{ color: "#374151", marginTop: 4 }}>{key}</Text>
                </View>
              ))}
            </View>

            {/* Insights */}
            {careerScore?.insights && (
              <View style={{ gap: 12, marginTop: 8 }}>
                {careerScore.insights.strengths?.length > 0 && (
                  <View style={{ backgroundColor: "#ECFDF5", padding: 12, borderRadius: 10 }}>
                    <Text style={{ color: "#065F46", fontWeight: "700", marginBottom: 6 }}>💪 あなたの強み</Text>
                    {careerScore.insights.strengths.map((t, idx) => (
                      <Text key={`s-${idx}`} style={{ color: "#047857", marginTop: 2 }}>• {t}</Text>
                    ))}
                  </View>
                )}
                {careerScore.insights.improvements?.length > 0 && (
                  <View style={{ backgroundColor: "#FFF7ED", padding: 12, borderRadius: 10 }}>
                    <Text style={{ color: "#9A3412", fontWeight: "700", marginBottom: 6 }}>🎯 改善ポイント</Text>
                    {careerScore.insights.improvements.map((t, idx) => (
                      <Text key={`i-${idx}`} style={{ color: "#B45309", marginTop: 2 }}>• {t}</Text>
                    ))}
                  </View>
                )}
                {careerScore.insights.recommendations?.length > 0 && (
                  <View style={{ backgroundColor: "#EFF6FF", padding: 12, borderRadius: 10 }}>
                    <Text style={{ color: "#1D4ED8", fontWeight: "700", marginBottom: 6 }}>💡 おすすめアクション</Text>
                    {careerScore.insights.recommendations.map((t, idx) => (
                      <Text key={`r-${idx}`} style={{ color: "#1D4ED8", marginTop: 2 }}>• {t}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Peer Reviews (Coming soon) */}
        <View style={{ marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 12, borderColor: "#E5E7EB", borderWidth: 1, opacity: 0.6 }}>
          <View style={{ padding: 16, borderBottomColor: "#E5E7EB", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>Peerレビュー</Text>
              <Pill text="COMING SOON" />
            </View>
            <TouchableOpacity onPress={() => setShowReviewModal(true)} style={{ backgroundColor: "#111827", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>レビューを書く</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            {peerReviews.length === 0 ? (
              <Text style={{ color: "#6B7280" }}>まだレビューはありません。</Text>
            ) : (
              peerReviews.map((r) => (
                <View key={r.id} style={{ borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontWeight: "700", color: "#111827", marginRight: 8 }}>{r.reviewer}</Text>
                      <Text style={{ color: "#F59E0B" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</Text>
                    </View>
                    <Text style={{ color: "#6B7280" }}>{r.date}</Text>
                  </View>
                  <Text style={{ color: "#374151" }}>{r.comment}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 12, borderColor: "#E5E7EB", borderWidth: 1 }}>
          <View style={{ padding: 16, borderBottomColor: "#E5E7EB", borderBottomWidth: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>クイックアクション</Text>
          </View>
          <View style={{ padding: 12 }}>
            <TouchableOpacity
              onPress={() => navigateFn("/ipo/analysis")}
              style={{ borderColor: "#D1D5DB", borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 8 }}
            >
              <Text>AI自己分析を続ける</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigateFn("/ipo/case")}
              style={{ borderColor: "#D1D5DB", borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 8 }}
            >
              <Text>ケース問題を解く</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigateFn("/ipo/calendar")}
              style={{ borderColor: "#D1D5DB", borderWidth: 1, padding: 12, borderRadius: 10 }}
            >
              <Text>今週の予定を確認</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="fade" transparent>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowReviewModal(false)}
          style={{ position: "absolute", inset: 0 as any, backgroundColor: "rgba(0,0,0,0.5)" }}
        />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View style={{ width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 12, borderColor: "#E5E7EB", borderWidth: 1 }}>
            <View style={{ padding: 16, borderBottomColor: "#E5E7EB", borderBottomWidth: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800" }}>レビューを書く</Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View>
                <Text style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>レビュアー名</Text>
                <TextInput
                  value={newReview.reviewer}
                  onChangeText={(t) => setNewReview((p) => ({ ...p, reviewer: t }))}
                  placeholder="あなたの名前"
                  style={{ borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 10, padding: 10 }}
                />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>評価</Text>
                <View style={{ flexDirection: "row" }}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity key={rating} onPress={() => setNewReview((p) => ({ ...p, rating }))} style={{ paddingHorizontal: 4 }}>
                      <Text style={{ fontSize: 24, color: rating <= newReview.rating ? "#F59E0B" : "#D1D5DB" }}>★</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>コメント</Text>
                <TextInput
                  value={newReview.comment}
                  onChangeText={(t) => setNewReview((p) => ({ ...p, comment: t }))}
                  placeholder="フィードバックを書いてください..."
                  multiline
                  numberOfLines={4}
                  style={{ borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 10, padding: 10, textAlignVertical: "top" }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity onPress={() => setShowReviewModal(false)} style={{ flex: 1, borderColor: "#D1D5DB", borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                  <Text>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddReview} style={{ flex: 1, backgroundColor: "#111827", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>投稿する</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Score Info Modal */}
      <Modal visible={showScoreInfo} animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}>
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{ padding: 16, borderBottomColor: "#E5E7EB", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>キャリアスコアとは？</Text>
            <TouchableOpacity onPress={() => setShowScoreInfo(false)}>
              <Text style={{ color: "#3B82F6" }}>閉じる</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ color: "#374151", lineHeight: 22 }}>
              総合スコアは各軸（コミュニケーション/ロジック/リーダーシップ/カルチャーフィット/バイタリティ）の加重平均です。改善ガイドに従って行動するとスコアが上がりやすくなります。
            </Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Onboarding Guide Modal (simple) */}
      <Modal visible={showOnboardingGuide} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{ padding: 16, borderBottomColor: "#E5E7EB", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>就活 6 ステップガイド</Text>
            <TouchableOpacity onPress={() => setShowOnboardingGuide(false)}>
              <Text style={{ color: "#3B82F6" }}>閉じる</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {[
              "アカウント設定",
              "AI自己分析を開始",
              "自己分析の深掘り",
              "ケース・面接対策",
              "スケジュール管理",
              "応募・振り返り",
            ].map((t, idx) => (
              <TouchableOpacity
                key={t}
                onPress={async () => {
                  await handleOnboardingStepComplete(idx + 1);
                  if (idx === 1) navigateFn("/ipo/analysis");
                  if (idx === 3) navigateFn("/ipo/case");
                }}
                style={{ borderColor: "#D1D5DB", borderWidth: 1, padding: 14, borderRadius: 10 }}
              >
                <Text style={{ fontWeight: "700" }}>{idx + 1}. {t}</Text>
                {completedOnboardingSteps.includes(idx + 1) && (
                  <Text style={{ color: "#10B981", marginTop: 4 }}>✓ 完了</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}