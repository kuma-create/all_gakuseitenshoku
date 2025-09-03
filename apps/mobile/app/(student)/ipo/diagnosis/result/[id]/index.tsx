"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "src/lib/supabase";
import type { PostgrestError } from "@supabase/supabase-js";

import { ArrowLeft, Clock, Brain, Heart, Target, Award, Star, TrendingUp, CheckCircle, Lightbulb, Download, RotateCcw, BookOpen } from "lucide-react-native";

// Radar chart component
import ChartDefault, { CareerRadarChart as ChartNamed } from "../../../../../../components/ipo/charts/CareerRadarChart";


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

// ---- Helpers ----
function toJSTString(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return String(iso);
  }
}
function pct(n?: number | null) {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}


const TYPE_META: Record<
  DiagnosisType,
  { title: string; colorFrom: string; colorTo: string; Icon: any }
> = {
  personality: { title: "性格診断", colorFrom: "#C084FC", colorTo: "#7C3AED", Icon: Brain },
  values: { title: "価値観診断", colorFrom: "#F472B6", colorTo: "#DB2777", Icon: Heart },
  career: { title: "キャリア適性診断", colorFrom: "#60A5FA", colorTo: "#2563EB", Icon: Target },
  skills: { title: "スキル診断", colorFrom: "#34D399", colorTo: "#059669", Icon: Award },
};

// ---- Charts resolver (accept named or default export) ----
const CareerRadarChart: any = (ChartNamed as any) ?? (ChartDefault as any) ?? ((props: any) => null);

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

// Simple progress bar
function Bar({ value }: { value: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct(value)}%` }]} />
    </View>
  );
}

export default function DiagnosisResultMobile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<DiagnosisResultRow | null>(null);
  const [tab, setTab] = useState<"overview" | "analysis" | "careers" | "actions">("overview");

  const fetchOne = useCallback(async () => {
    if (!id) return;
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
      if (error) throw error as PostgrestError;
      setRow(data);
    } catch (e: any) {
      setError("結果の取得に失敗しました。権限またはIDをご確認ください。");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  const scoresSorted = useMemo(() => {
    const s = row?.scores ?? {};
    return Object.entries(s)
      .map(([k, v]) => [k, Number(v)] as [string, number])
      .sort((a, b) => b[1] - a[1]);
  }, [row]);

  // Object-shaped dataset expected by CareerRadarChart (Record<label, score>)
  const radarDataObj = useMemo(() => {
    const obj: Record<string, number> = {};
    for (const [k, v] of scoresSorted) {
      obj[jpLabel(k)] = pct(v);
    }
    return obj;
  }, [scoresSorted]);

  const scoreOf = (cat: string) => {
    if (!row?.scores) return 0;
    const direct = (row.scores as any)[cat];
    if (typeof direct === "number") return direct;
    const foundKey = Object.keys(row.scores).find((k) => k.toLowerCase() === cat.toLowerCase());
    return foundKey ? (row.scores as any)[foundKey] as number : 0;
  };
  const strengthsSorted = (row?.strengths ?? []).slice().sort((a, b) => scoreOf(b) - scoreOf(a));
  const growthSorted = (row?.growth_areas ?? []).slice().sort((a, b) => scoreOf(a) - scoreOf(b));

  // ---- Render states ----
  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.push("/(student)/ipo/diagnosis")} />
          <Text style={styles.muted}>読み込み中…</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  if (error || !row) {
    return (
      <View style={styles.screen}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.push("/(student)/ipo/diagnosis")} />
        </View>
        <Card>
          <Text style={styles.errorText}>{error ?? "該当する結果が見つかりませんでした。"}</Text>
        </Card>
      </View>
    );
  }

  const meta = TYPE_META[row.type];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <BackButton onPress={() => router.push("/(student)/ipo/diagnosis")} />
          <View style={styles.headerTitleRow}>
            <View style={[styles.iconBadge, { backgroundColor: meta.colorTo }]}>
              <meta.Icon size={18} color="#FFF" />
            </View>
            <Text style={styles.headerTitle}>{meta.title}（結果）</Text>
          </View>
        </View>

        <View style={styles.subHeaderRow}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.subHeaderText}>{toJSTString(row.created_at)}</Text>
          <Text style={styles.subHeaderText}> / ID: {row.id.slice(0, 8)}…</Text>
        </View>

        {/* Tabs */}
        <SegmentedTabs value={tab} onChange={setTab} />

        {/* Content */}
        {tab === "overview" && (
          <View style={{ gap: 12 }}>
            {/* Scores list (mobile: simple stacked cards) */}
            <Card>
              <Text style={styles.cardTitle}>レーダーチャート</Text>
              <View style={styles.chartWrap}>
                {CareerRadarChart && Object.keys(radarDataObj).length > 0 ? (
                  <CareerRadarChart
                    width={260}
                    height={260}
                    size={260}
                    max={100}
                    data={radarDataObj}
                  />
                ) : (
                  <Text style={styles.mutedSmall}>チャートコンポーネントが見つかりません</Text>
                )}
              </View>
            </Card>
            <Card>
              <Text style={styles.cardTitle}>あなたの特性スコア</Text>
              <View style={{ gap: 10 }}>
                {scoresSorted.map(([key, val]) => (
                  <View key={key} style={styles.rowBetween}>
                    <Text style={styles.label}>{jpLabel(key)}</Text>
                    <Text style={styles.value}>{val}</Text>
                    <View style={{ width: "100%", marginTop: 6 }}>
                      <Bar value={val} />
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            <Card>
              <View style={styles.cardTitleRow}>
                <Star size={18} color="#EAB308" />
                <Text style={styles.cardTitle}>あなたの強み</Text>
              </View>
              {strengthsSorted.length === 0 ? (
                <Text style={styles.mutedSmall}>データが足りません</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {strengthsSorted.map((s, i) => {
                    const v = scoreOf(s);
                    return (
                      <View key={`${s}-${i}`} style={styles.pillCard}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.pillTitle}>{jpLabel(s)}</Text>
                          <Text style={styles.value}>{v}</Text>
                        </View>
                        <Bar value={v} />
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>

            <Card>
              <View style={styles.cardTitleRow}>
                <TrendingUp size={18} color="#3B82F6" />
                <Text style={styles.cardTitle}>成長できる分野</Text>
              </View>
              {growthSorted.length === 0 ? (
                <Text style={styles.mutedSmall}>データが足りません</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {growthSorted.map((g, i) => {
                    const v = scoreOf(g);
                    return (
                      <View key={`${g}-${i}`} style={[styles.pillCard, { backgroundColor: "#FFF7ED" }]}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.pillTitle}>{jpLabel(g)}</Text>
                          <Text style={styles.value}>{v}</Text>
                        </View>
                        <Bar value={v} />
                      </View>
                    );
                  })}
                </View>
              )}
              <Text style={styles.note}>※ スコアが低いほど優先的に伸ばすべき領域です</Text>
            </Card>
          </View>
        )}

        {tab === "analysis" && (
          <View style={{ gap: 12 }}>
            <Card>
              <Text style={styles.cardTitle}>詳細な分析結果</Text>
              <View style={{ gap: 8 }}>
                {(row.insights ?? []).map((insight, i) => (
                  <View key={i} style={styles.insightBox}>
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>
            </Card>
            <Card>
              <Text style={styles.cardTitle}>各指標のスコア</Text>
              <View style={{ gap: 10 }}>
                {Object.entries(row.scores || {}).map(([key, val]) => (
                  <View key={key} style={styles.scoreItem}>
                    <Text style={styles.label}>{jpLabel(key)}</Text>
                    <Text style={styles.value}>{Number(val)}</Text>
                    <View style={{ width: "100%", marginTop: 6 }}>
                      <Bar value={Number(val)} />
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {tab === "careers" && (
          <View style={{ gap: 12 }}>
            {(row.recommendations ?? []).map((job, index) => (
              <Card key={`${job.title}-${index}`}>
                <View style={styles.rowBetween}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{pct(job.match)}%</Text>
                    <Text style={styles.matchLabel}>マッチ度</Text>
                  </View>
                </View>
                {job.description ? <Text style={styles.jobDesc}>{job.description}</Text> : null}
                <View style={{ gap: 14 }}>
                  {(job.reasons?.length ?? 0) > 0 && (
                    <View>
                      <View style={styles.inlineTitle}>
                        <CheckCircle size={16} color="#22C55E" />
                        <Text style={styles.sectionTitle}>マッチする理由</Text>
                      </View>
                      <View style={styles.badgeRow}>
                        {job.reasons?.map((r, i) => (
                          <Badge key={`${r}-${i}`} text={r} variant="secondary" />
                        ))}
                      </View>
                    </View>
                  )}

                  {(job.requiredSkills?.length ?? 0) > 0 && (
                    <View>
                      <View style={styles.inlineTitle}>
                        <Lightbulb size={16} color="#F59E0B" />
                        <Text style={styles.sectionTitle}>必要なスキル</Text>
                      </View>
                      <View style={styles.badgeRow}>
                        {job.requiredSkills?.map((s, i) => (
                          <Badge key={`${s}-${i}`} text={s} variant="outline" />
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.metaRow}>
                    {job.averageSalary ? (
                      <Text style={styles.metaText}>平均年収: {job.averageSalary}</Text>
                    ) : null}
                    {job.growthRate ? (
                      <Text style={styles.metaText}>成長率: {job.growthRate}</Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {tab === "actions" && (
          <View style={{ gap: 12 }}>
            <Card>
              <Text style={styles.cardTitle}>次のステップ</Text>
              <Text style={styles.muted}>診断結果を活かして、キャリアを前進させましょう</Text>
              <View style={{ height: 8 }} />
              <Checklist
                color="#2563EB"
                items={[
                  ["業界研究を深める", "推奨された職種の業界動向を調べましょう"],
                  ["スキルマップを作成", "現在のスキルと必要なスキルのギャップを把握"],
                  ["ネットワーキング開始", "業界の先輩や専門家との接点を作りましょう"],
                ]}
              />
              <View style={{ height: 12 }} />
              <Checklist
                color="#16A34A"
                items={[
                  ["資格・認定取得", "職種に必要な専門資格の取得を検討"],
                  ["実務経験を積む", "インターンシップやプロジェクトに参加"],
                  ["ポートフォリオ構築", "成果物をまとめて実力をアピール"],
                ]}
              />
            </Card>
          </View>
        )}

        {/* Footer Actions */}
        <View style={styles.footerButtons}>
          <PrimaryButton onPress={() => router.push("/(student)/ipo/library")}>
            <BookOpen size={16} color="#FFF" />
            <Text style={styles.primaryBtnText}>業界・職種を詳しく調べる</Text>
          </PrimaryButton>
          <OutlineButton onPress={() => router.push("/(student)/ipo/diagnosis")}>
            <RotateCcw size={16} color="#111827" />
            <Text style={styles.outlineBtnText}>別の診断を受ける</Text>
          </OutlineButton>
          <OutlineButton onPress={() => router.push("/(student)/ipo/dashboard")}>
            <Download size={16} color="#111827" />
            <Text style={styles.outlineBtnText}>結果を保存</Text>
          </OutlineButton>
        </View>

        <View style={styles.bottomNoteRow}>
          <Text style={styles.mutedSmall}>セッションID: </Text>
          <Text style={styles.mono}>{row.session_id}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- Small atoms ---------- */
function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backBtn}>
      <ArrowLeft size={18} color="#111827" />
      <Text style={styles.backBtnText}>診断トップへ</Text>
    </TouchableOpacity>
  );
}

function SegmentedTabs({
  value,
  onChange,
}: {
  value: "overview" | "analysis" | "careers" | "actions";
  onChange: (v: "overview" | "analysis" | "careers" | "actions") => void;
}) {
  const items: { key: typeof value; label: string }[] = [
    { key: "overview", label: "概要" },
    { key: "analysis", label: "詳細分析" },
    { key: "careers", label: "適職" },
    { key: "actions", label: "行動計画" },
  ];
  return (
    <View style={styles.tabs}>
      {items.map((it) => (
        <TouchableOpacity
          key={it.key}
          onPress={() => onChange(it.key)}
          style={[styles.tabBtn, value === it.key && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, value === it.key && styles.tabTextActive]}>
            {it.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Badge({ text, variant }: { text: string; variant?: "secondary" | "outline" }) {
  const style =
    variant === "outline"
      ? [styles.badge, { backgroundColor: "transparent", borderWidth: 1, borderColor: "#E5E7EB", color: "#111827" }]
      : [styles.badge, { backgroundColor: "#F3F4F6", color: "#111827" }];
  return (
    <View style={style as any}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function Checklist({
  items,
  color,
}: {
  items: [string, string][];
  color: string;
}) {
  return (
    <View style={{ gap: 12 }}>
      {items.map(([title, desc], idx) => (
        <View key={`${title}-${idx}`} style={{ flexDirection: "row", gap: 10 }}>
          <View style={[styles.stepCircle, { backgroundColor: `${color}22`, borderColor: color }]}>
            <Text style={{ color, fontWeight: "700" }}>{idx + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.checkTitle}>{title}</Text>
            <Text style={styles.mutedSmall}>{desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function PrimaryButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.primaryBtn}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {children}
      </View>
    </TouchableOpacity>
  );
}
function OutlineButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.outlineBtn}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { padding: 16, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBadge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  subHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  subHeaderText: { fontSize: 12, color: "#6B7280" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 8,
  },
  tabBtn: { flex: 1, borderRadius: 6, paddingVertical: 8, alignItems: "center" },
  tabBtnActive: { backgroundColor: "#FFFFFF", elevation: 1 },
  tabText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  tabTextActive: { color: "#111827" },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  rowBetween: { flexDirection: "column" },
  label: { fontSize: 13, color: "#111827", fontWeight: "600" },
  value: { fontSize: 12, color: "#6B7280" },
  barTrack: { width: "100%", height: 8, borderRadius: 6, backgroundColor: "#E5E7EB", overflow: "hidden" },
  barFill: { height: 8, borderRadius: 6, backgroundColor: "#2563EB" },
  pillCard: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, backgroundColor: "#FFFFFF" },
  pillTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  muted: { color: "#6B7280", fontSize: 14 },
  mutedSmall: { color: "#6B7280", fontSize: 12 },
  errorText: { color: "#DC2626", fontSize: 13 },
  note: { marginTop: 8, fontSize: 11, color: "#6B7280" },
  insightBox: { backgroundColor: "#EFF6FF", borderLeftWidth: 3, borderLeftColor: "#60A5FA", borderRadius: 6, padding: 10 },
  insightText: { color: "#374151", fontSize: 14 },
  scoreItem: { },
  jobTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  jobDesc: { marginTop: 6, color: "#4B5563" },
  matchBadge: { flexDirection: "column", alignItems: "flex-end" },
  matchText: { fontWeight: "800", color: "#059669" },
  matchLabel: { fontSize: 10, color: "#6B7280" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginLeft: 6 },
  inlineTitle: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginRight: 6,
    marginBottom: 6,
  },
  badgeText: { fontSize: 12 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap" },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 4, flexWrap: "wrap" },
  metaText: { fontSize: 12, color: "#4B5563" },
  footerButtons: { gap: 10, marginTop: 8 },
  primaryBtn: { height: 48, backgroundColor: "#111827", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  outlineBtn: { height: 48, borderColor: "#E5E7EB", borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700" },
  outlineBtnText: { color: "#111827", fontWeight: "700" },
  bottomNoteRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 6 },
  mono: { fontFamily: Platform?.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, color: "#111827" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backBtnText: { fontSize: 13, color: "#111827" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  chartWrap: { alignItems: "center", justifyContent: "center", paddingTop: 6, paddingBottom: 6 },
});
