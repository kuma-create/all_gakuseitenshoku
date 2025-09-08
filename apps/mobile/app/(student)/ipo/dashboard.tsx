"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import FloatingActionButton from "../../../components/FloatingActionButton";
import { BannerCarousel } from "../../../components/BannerCarousel";
// Props expected by the radar chart
// Chart component expects a simple label->value map

type RadarChartProps = { data: Record<string, number> };

// ===== Weekly AI Diagnosis helpers (NEW) =====
type SelectionStatus = {
  stage?: string | null;
  stage_order?: number | null; // 0:未応募, 1:応募, 2:書類, 3:一次, 4:二次, 5:最終, 6:内定
  active_applications?: number | null;
};
type ClarityInfo = {
  clarity_score?: number | null; // 0-100
  desired_industries?: string[] | null;
  desired_roles?: string[] | null;
};
type AgeOrGrade = { age?: number | null; grade?: string | null };

const clamp100 = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const scoreByKeywords = (text: string, keywords: string[], weight = 1): number => {
  const t = (text || "").toLowerCase();
  let count = 0;
  for (const k of keywords) {
    try {
      const m = t.match(new RegExp(`\\b${k.toLowerCase()}\\b`, "g"));
      count += m ? m.length : 0;
    } catch {}
  }
  return count * weight;
};
const lengthScore = (text: string): number => {
  const words = (text || "").split(/\s+/).filter(Boolean).length;
  if (words < 150) return 20;
  if (words < 300) return 40;
  if (words < 600) return 65;
  if (words < 1200) return 85;
  return 95;
};
const calculateCareerScoreFromResume = (text: string) => {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return {
      overall: 0,
      breakdown: { Communication: 0, Logic: 0, Leadership: 0, Fit: 0, Vitality: 0 },
      insights: {
        strengths: [],
        improvements: ["職務経歴書の内容が見つかりません。内容を充実させましょう。"],
        recommendations: ["職務内容・成果・数値指標（例：売上◯%成長）を追記してください。"],
      },
    };
  }
  const comm = scoreByKeywords(cleaned, [
    "client","stakeholder","presentation","negotiation","facilitated","cross-functional","collaboration","customer","mentored","coached",
    "顧客","クライアント","関係者","調整","交渉","提案","プレゼン","発表","協業","連携","顧客折衝","メンター","指導","支援","営業"
  ], 8) + lengthScore(cleaned) * 0.3;
  const logic = scoreByKeywords(cleaned, [
    "analysis","hypothesis","data","kpi","roi","experiment","ab test","cohort","segmentation","model","optimize","sql","python",
    "分析","仮説","データ","指標","検証","実験","abテスト","ABテスト","セグメント","モデル","最適化","SQL","Python","KPI","ROI"
  ], 9);
  const leader = scoreByKeywords(cleaned, [
    "led","managed","owner","launched","initiated","pm","product manager","scrum","okr","kpi","team of","hired","trained",
    "リード","主導","マネジ","管理","責任者","立ち上げ","推進","PM","プロダクトマネージャ","スクラム","OKR","目標","チーム","採用","育成","教育"
  ], 10);
  const fit = scoreByKeywords(cleaned, [
    "mission","vision","value","culture","customer obsession","ownership","bias for action","learn","growth","teamwork","integrity",
    "ミッション","ビジョン","バリュー","カルチャー","文化","顧客志向","オーナーシップ","行動","学習","成長","チームワーク","誠実"
  ], 6);
  const vitality = scoreByKeywords(cleaned, [
    "volunteer","hackathon","side project","startup","award","certified","certification","toefl","ielts","toeic","gpa","athletics","club","entrepreneur",
    "ボランティア","ハッカソン","副業","スタートアップ","受賞","表彰","資格","TOEIC","TOEFL","IELTS","GPA","部活","起業"
  ], 7);
  const numbersBoost = ((cleaned.match(/\b[0-9]+(?:\.[0-9]+)?%?/g) || []).length + (cleaned.match(/[０-９]+(?:．[０-９]+)?％/g) || []).length) * 2.5;

  const raw = {
    Communication: comm + numbersBoost,
    Logic: logic + numbersBoost,
    Leadership: leader + numbersBoost,
    Fit: fit,
    Vitality: vitality,
  };
  const maxAxis = 140;
  const breakdown = {
    Communication: clamp100((raw.Communication / maxAxis) * 100),
    Logic: clamp100((raw.Logic / maxAxis) * 100),
    Leadership: clamp100((raw.Leadership / maxAxis) * 100),
    Fit: clamp100((raw.Fit / maxAxis) * 100),
    Vitality: clamp100((raw.Vitality / maxAxis) * 100),
  };
  const overall = Math.round(
    (breakdown.Logic * 0.28) +
    (breakdown.Communication * 0.25) +
    (breakdown.Leadership * 0.22) +
    (breakdown.Fit * 0.15) +
    (breakdown.Vitality * 0.10)
  );
  const strengths = Object.entries(breakdown).filter(([, v]) => (v as number) >= 70).map(([k]) => `${k} が強みです`);
  const improvements = Object.entries(breakdown).filter(([, v]) => (v as number) < 50).map(([k]) => `${JA_LABELS[k as keyof typeof JA_LABELS] ?? k} を伸ばす余地があります（定量成果・役割の明記を追加）`);
  const recommendations: string[] = [];
  if (breakdown.Leadership < 55) recommendations.push("プロジェクトの主導経験や役割・体制（人数、期間）を追記しましょう");
  if (breakdown.Logic < 65) recommendations.push("KPI/データ活用（改善率や母数）を数値で記載すると説得力が増します");
  if (breakdown.Communication < 60) recommendations.push("プレゼンや交渉・顧客折衝の具体例を1-2件、成果とともに追記");
  return { overall, breakdown, insights: { strengths, improvements, recommendations } };
};

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
  Pressable,
  StyleSheet,
  Alert,
  Image, // add this import
} from "react-native";
import { Brain, RefreshCw, Clock, CheckSquare, ChevronRight } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// If you already have a shared supabase client for mobile, prefer that import.
let supabaseClient: any = null;
// --- Supabase client (Expo): persist session in AsyncStorage ---
if (!supabaseClient) {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: AsyncStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
}

// Simple progress bar for RN
const ProgressBar = ({ progress }: { progress: number }) => {
  const pct = Math.max(0, Math.min(100, progress || 0));
  return (
    <View style={{ width: "100%", height: 10, backgroundColor: "#E5E7EB", borderRadius: 999 }}>
      <View style={{ width: `${pct}%`, height: 10, backgroundColor: "#3B82F6", borderRadius: 999 }} />
    </View>
  );
};

// Small metric card (with press support)
const MetricCard = ({
  label,
  value,
  subtitle,
  icon,
  progress,
  onPress,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  progress?: number;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.8 : 1}
    onPress={onPress}
    style={{ flex: 1 }}
  >
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
        <View style={{ flexShrink: 1, paddingRight: 8, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "600", textAlign: "center" }}>{label}</Text>
          <Text style={{ fontSize: 24, color: "#111827", fontWeight: "800", marginTop: 2, textAlign: "center" }}>{value}</Text>
          {subtitle ? (
            <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4, textAlign: "center" }}>{subtitle}</Text>
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
  </TouchableOpacity>
);

const Pill = ({ text }: { text: string }) => (
  <View style={{ backgroundColor: "#111827", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
    <Text style={{ fontSize: 10, color: "#fff", fontWeight: "700", letterSpacing: 0.5 }}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: {
    color: "#fff",
    fontWeight: "700",
    marginLeft: 8,
  },
});


// === Post-signup choice popup (local only on this page) ===
const LATER_COOLDOWN_DAYS = 30;
const STORAGE_KEYS = {
  CHOICE: "postSignupChoice",            // 'ai' | 'consult' | 'later'
  DISMISSED_AT: "postSignupDismissedAt", // ISO string
} as const;

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

// 日本語ラベルマップ（表示用）
const JA_LABELS: Record<string, string> = {
  Communication: 'コミュニケーション',
  Logic: '論理性',
  Leadership: 'リーダーシップ',
  Fit: '適合度',
  Vitality: '活力',
};
// レーダーチャートの表示順（12時から時計回り）
const AXIS_ORDER: Array<keyof typeof JA_LABELS> = [
  'Communication',
  'Logic',
  'Leadership',
  'Fit',
  'Vitality',
];

export default function IPOMobileDashboard() {
  // Allow previewing the post-signup popup via URL param: ?showPopup=1
  const { showPopup } = useLocalSearchParams<{ showPopup?: string }>();
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState<boolean>(true);
  const [topTabActive, setTopTabActive] = useState<string>("home");

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

  // Post-signup choice popup state (this page only)
  const [showPostSignup, setShowPostSignup] = useState(false);

  // === Weekly AI Diagnosis (週次AI診断) ===
  const [lastDiagnosisAt, setLastDiagnosisAt] = useState<string | null>(null);
  const [nextDiagnosisAt, setNextDiagnosisAt] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const computeNextDiagnosis = useCallback((iso?: string | null) => {
    const base = iso ? new Date(iso) : new Date();
    const next = new Date(base.getTime());
    next.setDate(base.getDate() + 7);
    return next.toISOString();
  }, []);

  const shouldRunWeekly = useCallback((lastISO?: string | null) => {
    if (!lastISO) return true;
    const last = new Date(lastISO).getTime();
    return Date.now() - last > 6.5 * 24 * 60 * 60 * 1000; // 約6.5日
  }, []);

  const [loading, setLoading] = useState(true);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const [detailY, setDetailY] = useState<number>(0);

  const navigateFn = useCallback(
    (route: string) => {
      router.push(route as any);
    },
    [router]
  );



  const onNavigateToTool = useCallback(
    (key: string) => {
      if (key === "aiChat") {
        navigateFn("/ipo/analysis");
      }
    },
    [navigateFn]
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

        // Supabase client is now initialized above
        if (!supabaseClient) {
          setLoading(false);
          return;
        }

        // Auth: get session and user
        const { data: { session } } = await supabaseClient.auth.getSession();
        const user = session?.user ?? null;
        if (!user) {
          setIsAuthed(false);
          setLoading(false);
          return;
        }
        setIsAuthed(true);

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

        // Weekly diagnosis timestamps (NEW)
        try {
          const { data: lastRow } = await supabaseClient
            .from("ipo_career_score")
            .select("scored_at")
            .eq("user_id", user.id)
            .order("scored_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const last = lastRow?.scored_at ?? null;
          setLastDiagnosisAt(last);
          setNextDiagnosisAt(computeNextDiagnosis(last));
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Decide whether to show the post-signup popup (scoped to this page only)
  useEffect(() => {
    (async () => {
      // Preview override via query param
      if (showPopup === "1") {
        setShowPostSignup(true);
        return;
      }
      try {
        const [choice, dismissedAt] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CHOICE),
          AsyncStorage.getItem(STORAGE_KEYS.DISMISSED_AT),
        ]);

        if (choice === "ai" || choice === "consult") return; // already decided
        if (choice === "later" && dismissedAt) {
          const last = new Date(dismissedAt).getTime();
          const cool = LATER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
          if (Date.now() - last < cool) return;
        }
        setShowPostSignup(true);
      } catch {
        // on error, show to be safe
        setShowPostSignup(true);
      }
    })();
  }, [showPopup]);

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

  // === Weekly AI Diagnosis Runner (NEW) ===
  const runWeeklyDiagnosis = useCallback(async () => {
    if (!supabaseClient) return;
    try {
      setIsDiagnosing(true);
      const { data: { session } } = await supabaseClient.auth.getSession();
      const user = session?.user ?? null;
      if (!user) {
        Alert.alert("週次AI診断", "サインインが必要です。");
        return;
      }

      // 1) 職務経歴書テキスト集約
      const fetchResumeTextFromMultipleSources = async (supabase: any, userId: string): Promise<string> => {
        const chunks: string[] = [];
        try {
          const { data: r1 } = await supabase
            .from("resumes")
            .select("content, summary, achievements, projects, skills")
            .eq("user_id", userId)
            .maybeSingle();
          if (r1) {
            chunks.push(r1.content || "", r1.summary || "");
            if (Array.isArray(r1.achievements)) chunks.push(r1.achievements.filter(Boolean).join(" "));
            if (Array.isArray(r1.projects)) chunks.push(r1.projects.filter(Boolean).join(" "));
            if (Array.isArray(r1.skills)) chunks.push(r1.skills.filter(Boolean).join(" "));
          }
        } catch {}
        try {
          const { data: sp } = await supabase
            .from("student_profiles")
            .select("bio, about, summary, experiences, achievements, certifications, activities, tools, results")
            .or(`user_id.eq.${userId},id.eq.${userId}`)
            .maybeSingle();
          const flatten = (v: any): string => {
            if (!v) return "";
            if (Array.isArray(v)) {
              return v.map((x) => (x && typeof x === "object" ? Object.values(x).join(" ") : String(x))).join(" ");
            }
            if (typeof v === "object") return Object.values(v).join(" ");
            return String(v);
          };
          if (sp) {
            chunks.push(sp.bio || "", sp.about || "", sp.summary || "");
            chunks.push(flatten(sp.experiences));
            chunks.push(flatten(sp.achievements));
            chunks.push(flatten(sp.certifications));
            chunks.push(flatten(sp.activities));
            chunks.push(flatten(sp.tools));
            chunks.push(flatten(sp.results));
          }
        } catch {}
        try {
          const { data: se } = await supabase
            .from("student_experiences")
            .select("company, role, department, description, responsibilities, achievements, tools, results, notes")
            .eq("user_id", userId);
          if (Array.isArray(se)) {
            for (const row of se) {
              chunks.push(
                row.company || "",
                row.role || "",
                row.department || "",
                row.description || "",
                Array.isArray(row.responsibilities) ? row.responsibilities.join(" ") : (row.responsibilities || ""),
                Array.isArray(row.achievements) ? row.achievements.join(" ") : (row.achievements || ""),
                Array.isArray(row.tools) ? row.tools.join(" ") : (row.tools || ""),
                Array.isArray(row.results) ? row.results.join(" ") : (row.results || ""),
                row.notes || ""
              );
            }
          }
        } catch {}
        try {
          const { data: ie } = await supabase
            .from("ipo_experiences")
            .select("title, description, skills, impact, learning, months, category, started_on, ended_on")
            .eq("user_id", userId);
          if (Array.isArray(ie)) {
            for (const row of ie) {
              chunks.push(
                row.title || "",
                row.description || "",
                Array.isArray(row.skills) ? row.skills.join(" ") : (row.skills || ""),
                row.impact || "",
                row.learning || "",
                row.category || ""
              );
            }
          }
        } catch {}
        try {
          const { data: fv } = await supabase
            .from("ipo_future_vision")
            .select("short_goal, long_goal, target_industry, target_role, action_plan")
            .eq("user_id", userId)
            .maybeSingle();
          if (fv) {
            const ap = fv.action_plan && typeof fv.action_plan === "object"
              ? Object.values(fv.action_plan).join(" ")
              : (Array.isArray(fv.action_plan) ? fv.action_plan.join(" ") : "");
            chunks.push(
              fv.short_goal || "",
              fv.long_goal || "",
              fv.target_industry || "",
              fv.target_role || "",
              ap
            );
          }
        } catch {}
        try {
          const { data: tr } = await supabase
            .from("ipo_traits")
            .select("kind, title, note")
            .eq("user_id", userId);
          if (Array.isArray(tr)) {
            for (const row of tr) {
              chunks.push(row.kind || "", row.title || "", row.note || "");
            }
          }
        } catch {}
        return chunks.filter(Boolean).join(" \n\n");
      };

      const resumeText = await fetchResumeTextFromMultipleSources(supabaseClient, user.id);

      // 2) 選考状況
      let selection: SelectionStatus = {};
      try {
        const { data: comps } = await supabaseClient
          .from("ipo_selection_companies")
          .select("current_stage, status")
          .eq("user_id", user.id);
        let maxOrder = 0;
        let active = 0;
        if (Array.isArray(comps) && comps.length > 0) {
          maxOrder = comps.reduce((m: number, r: any) => Math.max(m, r?.current_stage ?? 0), 0);
          active = comps.length;
        } else {
          const { data: stages } = await supabaseClient
            .from("ipo_selection_stages")
            .select("name")
            .eq("user_id", user.id);
          const orderMap: Record<string, number> = {
            "未応募": 0, "応募": 1, "書類": 2, "一次": 3, "二次": 4, "最終": 5, "内定": 6,
            "書類選考": 2, "一次面接": 3, "二次面接": 4, "最終面接": 5, "内定承諾": 6
          };
          if (Array.isArray(stages) && stages.length > 0) {
            maxOrder = stages.reduce((m: number, r: any) => Math.max(m, orderMap[String(r?.name ?? "")] ?? 0), 0);
            active = stages.length;
          }
        }
        const stageLabels = ["未応募","応募","書類","一次","二次","最終","内定"];
        selection = {
          stage_order: maxOrder,
          stage: stageLabels[Math.min(maxOrder, stageLabels.length - 1)],
          active_applications: active,
        };
      } catch {}

      // 3) 解像度
      let clarity: ClarityInfo = {};
      try {
        const { data: prog } = await supabaseClient
          .from("ipo_analysis_progress")
          .select("ai_chat, life_chart, future_vision, strength_analysis, experience_reflection")
          .eq("user_id", user.id)
          .maybeSingle();
        if (prog) {
          const avg = Math.round(
            ((prog.ai_chat ?? 0) + (prog.life_chart ?? 0) + (prog.future_vision ?? 0) + (prog.strength_analysis ?? 0) + (prog.experience_reflection ?? 0)) / 5
          );
          clarity.clarity_score = avg;
        }
        const { data: fv2 } = await supabaseClient
          .from("ipo_future_vision")
          .select("target_industry, target_role")
          .eq("user_id", user.id)
          .maybeSingle();
        if (fv2) {
          clarity.desired_industries = fv2.target_industry ? [fv2.target_industry] : null;
          clarity.desired_roles = fv2.target_role ? [fv2.target_role] : null;
        }
      } catch {}

      // 4) API試行（任意）
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const payload = { resumeText, selection, clarity, ageOrGrade: { age: null, grade: null } };
      let result: any = null;
      if (baseUrl) {
        try {
          const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/ai/diagnose`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
          result = await res.json();
        } catch {}
      }

      // 5) フォールバック（ローカル）
      if (!result) {
        const computed = calculateCareerScoreFromResume(resumeText);
        const modifier =
          (clarity.clarity_score ?? 50) * 0.05 +
          (selection.stage_order ?? 0) * 1.5;
        const overall = clamp100(Math.round((computed.overall ?? 0) + modifier), 0, 100);
        result = {
          overall,
          breakdown: computed.breakdown,
          insights: {
            strengths: computed.insights.strengths,
            improvements: computed.insights.improvements,
            recommendations: [
              ...(computed.insights.recommendations ?? []),
              (selection.stage_order ?? 0) < 3
                ? "まずは3社にエントリーし、1週間以内に書類提出まで進めましょう"
                : "筆記/ケース対策を週2回ペースで継続しましょう",
              (clarity.clarity_score ?? 0) < 60
                ? "志望業界・職種を2〜3に絞り、違いを1枚に比較表で整理しましょう"
                : "志望理由に実体験と数値を加え、説得力を高めましょう",
            ],
          },
        };
      }

      // 6) 保存
      const { data: inserted, error: insertErr } = await supabaseClient
        .from("ipo_career_score")
        .insert({
          user_id: user.id,
          overall: result.overall ?? 0,
          breakdown: result.breakdown ?? null,
          insights: result.insights ?? null,
          trend: "flat",
          scored_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (insertErr) throw insertErr;

      // 7) UI更新
      setCareerScore({
        overall: inserted.overall ?? 0,
        breakdown: (inserted.breakdown ?? { Communication: 0, Logic: 0, Leadership: 0, Fit: 0, Vitality: 0 }) as any,
        trend: (inserted.trend ?? "flat") as "up" | "down" | "flat",
        insights: (inserted.insights ?? { strengths: [], improvements: [], recommendations: [] }) as any,
        lastUpdated: inserted.scored_at ?? new Date().toISOString(),
      });
      setLastDiagnosisAt(inserted.scored_at ?? null);
      setNextDiagnosisAt(computeNextDiagnosis(inserted.scored_at ?? undefined));

      // 履歴も更新
      try {
        const { data: historyRows } = await supabaseClient
          .from("ipo_career_score")
          .select("scored_at, overall")
          .eq("user_id", user.id)
          .order("scored_at", { ascending: true });
        setScoreHistory((historyRows ?? []).map((r: any) => ({ date: (r.scored_at ?? "").slice(0, 10), overall: r.overall ?? 0 })));
      } catch {}

      Alert.alert("週次AI診断", `保存しました（${(inserted.scored_at ?? "").slice(0,10)} / ${inserted.overall ?? 0} 点）`);
    } catch (e: any) {
      Alert.alert("週次AI診断に失敗しました", e?.message ?? "ネットワークまたはAPIエラーが発生しました。");
    } finally {
      setIsDiagnosing(false);
    }
  }, [computeNextDiagnosis]);

  // Handlers for popup actions
  const handleChooseAI = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.CHOICE, "ai");
    setShowPostSignup(false);
    router.push("/ipo/analysis" as any);
  }, [router]);

  const handleChooseConsult = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.CHOICE, "consult");
    setShowPostSignup(false);
    router.push("/ipo/calendar" as any); // change route if your scheduling page differs
  }, [router]);

  const handleChooseLater = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.CHOICE, "later");
    await AsyncStorage.setItem(STORAGE_KEYS.DISMISSED_AT, new Date().toISOString());
    setShowPostSignup(false);
  }, []);

  // === DEV helper: force open the popup in preview ===
  const debugOpenPopup = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEYS.CHOICE, STORAGE_KEYS.DISMISSED_AT]);
    setShowPostSignup(true);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Not logged in -> show CTA instead of empty defaults
  if (!supabaseClient) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, marginBottom: 12 }}>セットアップが未完了です。</Text>
        <Text style={{ color: "#6B7280", textAlign: "center" }}>環境変数 EXPO_PUBLIC_SUPABASE_URL / ANON_KEY を設定してください。</Text>
      </View>
    );
  }

  // helper for clamping and rounding
  const clamp05 = (n: any) => Math.max(0, Math.min(5, Number(n ?? 0)));
  const round1  = (n: number) => Math.round(n * 10) / 10;

  const raw = careerScore?.breakdown ?? {
    Communication: 0, Logic: 0, Leadership: 0, Fit: 0, Vitality: 0,
  };

  const breakdown: CareerScoreBreakdown = {
    Communication: round1(clamp05(raw.Communication)),
    Logic:         round1(clamp05(raw.Logic)),
    Leadership:    round1(clamp05(raw.Leadership)),
    Fit:           round1(clamp05(raw.Fit)),
    Vitality:      round1(clamp05(raw.Vitality)),
  };

  // チャート表示用：キーを日本語に変換（順序固定：12時→時計回り）
  const breakdownJa: Record<string, number> = Object.fromEntries(
    AXIS_ORDER.map((k) => [JA_LABELS[k], Number(breakdown[k as keyof CareerScoreBreakdown] ?? 0)])
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16 }}>
        {/* Login required prompt */}
        {!isAuthed && (
          <View style={{ marginBottom: 16, backgroundColor: "#FEF3C7", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 12, padding: 16 }}>
            <Text style={{ fontWeight: "800", marginBottom: 6 }}>ログインが必要です</Text>
            <Text style={{ color: "#6B7280", marginBottom: 12 }}>データ連携にはサインインしてください。</Text>
            <TouchableOpacity onPress={() => router.push("/(student)/login" as any)} style={{ backgroundColor: "#111827", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignSelf: "flex-start" }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>ログインへ</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Top Navigation */}
        {/* Full-width top tabs */}
        {/* Top Navigation removed (AppHeader2 not used) */}
        {/* 
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>ホーム</Text>
          <Text style={{ marginTop: 4, color: "#6B7280" }}>学生転職の主要機能に素早くアクセスしましょう</Text>
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 12, marginBottom: 4 }}>
          <View style={{ width: '32%' }}>
            <MetricCard
              label="キャリアスコア"
              value={careerScore?.overall ?? 0}
              // subtitle={
              //   scoreChange === null
              //     ? undefined
              //     : `${scoreChange > 0 ? "+" : ""}${scoreChange}（前回比）`
              // }
              progress={Math.max(0, Math.min(100, careerScore?.overall ?? 0))}
            />
          </View>
          <View style={{ width: '32%' }}>
            <MetricCard
              label="自己分析完了度"
              value={`${analysisCompletion}%`}
              progress={Math.max(0, Math.min(100, analysisCompletion))}
            />
          </View>
          {/* 週次AI診断カード */}
          <View style={{ width: '32%' }}>
            <TouchableOpacity
              onPress={runWeeklyDiagnosis}
              disabled={isDiagnosing}
              activeOpacity={0.8}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                borderColor: "#E5E7EB",
                borderWidth: 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "600" }}>週次AI診断</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Clock size={12} color={"#6B7280"} />
                    <Text style={{ fontSize: 12, color: "#374151" }}>
                      {lastDiagnosisAt
                        ? new Date(lastDiagnosisAt).toISOString().slice(0, 10).replace(/-/g, "/")
                        : "—"}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ToDo リスト */}
        <View style={{ marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 12, borderColor: "#E5E7EB", borderWidth: 1 }}>
          {/* Header (icon + title) */}
          <View
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderBottomColor: "#E5E7EB",
              borderBottomWidth: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckSquare size={16} color={"#3B82F6"} />
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>ToDoリスト</Text>
          </View>

          {/* Single item (compact, chevron only) */}
          <TouchableOpacity
            onPress={() => navigateFn("/ipo/preferences")}
            activeOpacity={0.8}
            style={{ paddingHorizontal: 14, paddingVertical: 12 }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E5E7EB",
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>
                プロフィールを埋めましょう
              </Text>
              <ChevronRight size={18} color={"#3B82F6"} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <BannerCarousel
          items={[
            { key: "c1", title: "準備中", image: require("../../../assets/images/goals4.png"), onPress: () => navigateFn("/ipo/events") },
            { key: "c2", title: "準備中", image: require("../../../assets/images/goals5.png"), onPress: () => navigateFn("/ipo/profile") },
          ]}
          height={96}
          interval={3200}
        />





        {/* 機能選択 */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 8 }}>機能</Text>
          <BannerCarousel
            items={[
              { key: "f1", title: "自己分析を進める", image: require("../../../assets/images/goals2.png"), onPress: () => navigateFn("/ipo/analysis") },
              { key: "f2", title: "選考状況を管理する", image: require("../../../assets/images/goals1.png"), onPress: () => navigateFn("/ipo/selection") },
              { key: "f3", title: "ケースやWebテストの練習", image: require("../../../assets/images/goals3.png"), onPress: () => navigateFn("/ipo/case") },
              { key: "f4", title: "業界や職種情報を見る", image: require("../../../assets/images/goals4.png"), onPress: () => navigateFn("/ipo/library") },
              { key: "f5", title: "性格や価値観を診断する", image: require("../../../assets/images/goals5.png"), onPress: () => navigateFn("/ipo/diagnosis") },
            ]}
            height={100}
            cardsPerScreen={2.2}
            gap={10}
            showDots={true}
          />
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

      {/* Post-signup choice Popup (only on this page) */}
      <Modal visible={showPostSignup} transparent animationType="fade" onRequestClose={() => setShowPostSignup(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 420, borderRadius: 16, backgroundColor: "#fff", padding: 16, borderColor: "#E5E7EB", borderWidth: 1 }}>
            {/* Illustration placeholder */}
            <View style={{ width: "100%", height: 140, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6", marginBottom: 12, alignItems: "center", justifyContent: "center" }}>
              <Image
                source={require("../../../assets/images/new_popup.png")}
                style={{ width: "100%", height: "100%", resizeMode: "cover" }}
              />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 6, textAlign: "center" }}>早速、自己分析から始めてみよう！</Text>
            <Text style={{ color: "#6B7280", lineHeight: 20, textAlign: "center" }}>
              新規登録が完了しました。
            </Text>
             <Text style={{ color: "#6B7280", lineHeight: 20, textAlign: "center" }}>
              まずはAIで自己分析から始めてみましょう。
            </Text>
            <Text style={{ color: "#6B7280", lineHeight: 20, textAlign: "center" }}>
              プロに相談したいという方は下をクリック‼︎
            </Text>

            <View style={{ marginTop: 16, gap: 8 }}>
              <TouchableOpacity style={{ backgroundColor: "#111827", paddingVertical: 12, borderRadius: 10, alignItems: "center" }}>
                <Text
                  style={{ color: "#fff", fontWeight: "700" }}
                  onPress={handleChooseAI}
                >
                  AIと就活を進める
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChooseConsult} style={{ borderColor: "#D1D5DB", borderWidth: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ fontWeight: "700" }}>プロに30分無料相談</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChooseLater} style={{ alignSelf: "center", padding: 8 }}>
                <Text style={{ color: "#6B7280" }}>あとで</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dev-only floating button to debug popup (preview) */}
      {__DEV__ && (
        <FloatingActionButton label="Popup" onPress={debugOpenPopup} position="left" />
      )}
      {/* Floating AI button */}
      <FloatingActionButton label="AIに相談する" onPress={() => onNavigateToTool('aiChat')} />
    </View>
  );
}

