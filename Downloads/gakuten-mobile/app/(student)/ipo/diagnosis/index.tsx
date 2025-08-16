/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useEffect, useCallback, startTransition } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Animated } from 'react-native';
import { useRouter } from "expo-router";
import {
  Brain,
  CheckCircle,
  TrendingUp,
  Star,
  Target,
  Heart,
  Users,
  Lightbulb,
  Shield,
  ArrowRight,
  RotateCcw,
  Download,
  BookOpen,
  Award,
  Clock,
  X,
} from "lucide-react-native";
import { Svg, Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';


// Card (RN)
const Card = ({ style, children }: { style?: any; children?: React.ReactNode }) => (
  <View style={[{ borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', shadowColor: '#00000020', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 }, style]}>
    {children}
  </View>
);
const CardHeader = ({ style, children }: { style?: any; children?: React.ReactNode }) => (
  <View style={[{ paddingHorizontal: 16, paddingTop: 16 }, style]}>{children}</View>
);
const CardContent = ({ style, children }: { style?: any; children?: React.ReactNode }) => (
  <View style={[{ paddingHorizontal: 16, paddingBottom: 16 }, style]}>{children}</View>
);

const Button = ({
  variant = 'default',
  size = 'md',
  onPress,
  children,
  style,
}: {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'icon';
  onPress?: () => void;
  children?: React.ReactNode;
  style?: any;
}) => {
  const base = { alignItems: 'center', justifyContent: 'center', borderRadius: 8 } as const;
  const sizeStyle = size === 'sm' ? { height: 32, paddingHorizontal: 12 } : size === 'icon' ? { height: 40, width: 40 } : { height: 40, paddingHorizontal: 16 };
  const variantStyle =
    variant === 'outline'
      ? { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' }
      : variant === 'ghost'
      ? { backgroundColor: 'transparent' }
      : { backgroundColor: '#2563eb' };
  const textColor = variant === 'default' ? '#fff' : '#111827';
  return (
    <Pressable onPress={onPress} style={[base, sizeStyle, variantStyle, style]}>
      {typeof children === 'string' ? <Text style={{ color: textColor, fontSize: 14, fontWeight: '600' }}>{children}</Text> : children}
    </Pressable>
  );
};

const Badge = ({ children, variant = 'default', style }: { children?: React.ReactNode; variant?: 'default' | 'secondary' | 'outline'; style?: any }) => {
  const base = { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 } as const;
  const variantStyle =
    variant === 'secondary'
      ? { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' }
      : variant === 'outline'
      ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1d5db' }
      : { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' };
  const textColor = variant === 'default' ? '#1d4ed8' : '#374151';
  return (
    <View style={[base, variantStyle, style]}>
      {typeof children === 'string' ? <Text style={{ fontSize: 12, color: textColor }}>{children}</Text> : children}
    </View>
  );
};

const Progress = ({ value = 0, height = 8, style }: { value?: number; height?: number; style?: any }) => (
  <View style={[{ width: '100%', borderRadius: 9999, backgroundColor: '#e5e7eb', overflow: 'hidden', height }, style]}>
    <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', backgroundColor: '#3b82f6' }} />
  </View>
);

// Tabs (RN minimal)
type TabsCtxType = { value: string; setValue: (v: string) => void };
const TabsCtx = React.createContext<TabsCtxType | null>(null);
const Tabs = ({ defaultValue, children, style }: { defaultValue: string; children: React.ReactNode; style?: any }) => {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <View style={style}>
      <TabsCtx.Provider value={{ value, setValue }}>{children}</TabsCtx.Provider>
    </View>
  );
};
const TabsList = ({ style, children }: { style?: any; children?: React.ReactNode }) => (
  <View style={[{ borderRadius: 8, backgroundColor: '#f3f4f6', padding: 4 }, style]}>{children}</View>
);
const TabsTrigger = ({ value, children, style }: { value: string; children?: React.ReactNode; style?: any }) => {
  const ctx = React.useContext(TabsCtx)!;
  const active = ctx.value === value;
  return (
    <Pressable onPress={() => ctx.setValue(value)} style={[{ width: '100%', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: active ? '#fff' : 'transparent' }, style]}>
      {typeof children === 'string' ? <Text style={{ color: active ? '#111827' : '#4b5563', fontSize: 14 }}>{children}</Text> : children}
    </Pressable>
  );
};
const TabsContent = ({ value, children, style }: { value: string; children?: React.ReactNode; style?: any }) => {
  const ctx = React.useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <View style={style}>{children}</View>;
};

const MiniRadarChart = ({ data }: { data: Record<string, number> }) => {
  const entries = Object.entries(data);
  const size = 220;
  const c = size / 2;
  const r = c - 20;
  if (entries.length === 0) return <Text style={{ fontSize: 12, color: '#6b7280' }}>データがありません</Text>;
  const toPoint = (i: number, v: number) => {
    const angle = (Math.PI * 2 * i) / entries.length - Math.PI / 2;
    const rr = (Math.max(0, Math.min(100, v)) / 100) * r;
    return [c + rr * Math.cos(angle), c + rr * Math.sin(angle)];
  };
  const points = entries.map(([_, v], i) => toPoint(i, Number(v))).map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((p, idx) => (
        <Circle key={idx} cx={c} cy={c} r={r * p} fill="none" stroke="#e5e7eb" />
      ))}
      {entries.map((_, i) => {
        const [x, y] = toPoint(i, 100);
        return <Line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#e5e7eb" />;
      })}
      <Polygon points={points} fill="rgba(59,130,246,0.25)" stroke="#3b82f6" />
      {entries.map(([k], i) => {
        const [x, y] = toPoint(i, 112);
        return (
          <SvgText key={k} x={x} y={y} fontSize="10" textAnchor="middle" alignmentBaseline="middle" fill="#374151">
            {k}
          </SvgText>
        );
      })}
    </Svg>
  );
};

import { supabase } from "src/lib/supabase";


// ---- helpers ---------------------------------------------------------
function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Supabase row types ---------------------------------------------
export type DiagnosisRowType = "personality" | "values" | "career" | "skills";
interface DiagnosisQuestionRow {
  id: number;
  text: string;
  category: string;
  type: DiagnosisRowType;
  sort_order?: number | null;
}
interface DiagnosisSessionRow {
  id: string;
  type: DiagnosisRowType;
  created_at?: string;
}

export type DiagnosisType = DiagnosisRowType;
interface Question {
  id: number;
  text: string;
  category: string;
  type: DiagnosisType;
}
interface JobRecommendation {
  title: string;
  match: number;
  description: string;
  reasons: string[];
  averageSalary: string;
  growthRate: string;
  requiredSkills: string[];
}
interface DiagnosisResult {
  type: DiagnosisType;
  scores: Record<string, number>;
  strengths: string[];
  growthAreas: string[];
  recommendations: JobRecommendation[];
  insights: string[];
}
interface DiagnosisResultRow {
  id: string;
  session_id: string;
  type: DiagnosisType;
  scores: Record<string, number>;
  strengths: string[];
  growth_areas: string[];
  recommendations: JobRecommendation[];
  insights: string[];
  created_at: string;
}

const DIAGNOSIS_TYPES = {
  personality: {
    title: "性格診断",
    description: "あなたの性格特性を分析し、適職を見つけます",
    icon: Brain,
    color: "from-purple-400 to-purple-600",
    questions: 40,
    duration: "約15分",
  },
  values: {
    title: "価値観診断",
    description: "あなたが大切にする価値観を明確にします",
    icon: Heart,
    color: "from-pink-400 to-pink-600",
    questions: 36,
    duration: "約10分",
  },
  career: {
    title: "キャリア適性診断",
    description: "様々な職種への適性を総合的に評価します",
    icon: Target,
    color: "from-blue-400 to-blue-600",
    questions: 30,
    duration: "約8分",
  },
  skills: {
    title: "スキル診断",
    description: "現在のスキルレベルと今後の成長可能性を分析",
    icon: Award,
    color: "from-green-400 to-green-600",
    questions: 36,
    duration: "約9分",
  },
} as const;

export default function DiagnosisPage() {
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<DiagnosisResult | null>(null);
  const [animationStep, setAnimationStep] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<DiagnosisResultRow[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [resTab, setResTab] = useState<'overview'|'analysis'|'careers'|'actions'>('overview');
  const router = useRouter();

  const progress = selectedDiagnosis && questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const runIdle = (cb: () => void) => {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      // @ts-ignore
      (window as any).requestIdleCallback(cb);
    } else {
      setTimeout(cb, 0);
    }
  };

  const fetchHistory = useCallback(async () => {
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("diagnosis_results")
        .select(
          "id, session_id, type, scores, strengths, growth_areas, recommendations, insights, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) setHistoryError("過去の結果の取得に失敗しました。");
      else setHistory((data as any) ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }, []);


  const handleSelectDiagnosis = useCallback((d: DiagnosisType) => {
    startTransition(() => setSelectedDiagnosis(d));
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function run() {
      setLoadError(null);
      setQuestions([]);
      if (!selectedDiagnosis) return;

      const { data, error } = await supabase
        .from("diagnosis_questions")
        .select("id,text,category,type,sort_order")
        .eq("type", selectedDiagnosis)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        if (!isMounted) return;
        setLoadError("質問の取得に失敗しました。管理者にお問い合わせください。");
        return;
      }
      if (!data || data.length === 0) {
        if (!isMounted) return;
        setLoadError("この診断タイプの質問が登録されていません。");
        return;
      }

      if (!isMounted) return;
      const mapped: Question[] = (data as any).map((q: DiagnosisQuestionRow) => ({
        id: q.id,
        text: q.text,
        category: q.category,
        type: q.type as DiagnosisType,
      }));
      setQuestions(shuffleArray(mapped));

      const { data: sessionIns, error: sessionErr } = await supabase
        .from("diagnosis_sessions")
        .insert({ type: selectedDiagnosis })
        .select("id")
        .single();
      if (sessionErr) setSessionId(null);
      else setSessionId((sessionIns as any)?.id ?? null);
    }
    run();
    return () => {
      isMounted = false;
    };
  }, [selectedDiagnosis]);

  const handleAnswer = useCallback(
    async (value: number) => {
      const q = questions[currentQuestion];
      if (!q) return;
      startTransition(() => setAnswers((prev) => ({ ...prev, [q.id]: value })));

      if (sessionId) {
        runIdle(async () => {
          await supabase
            .from("diagnosis_answers")
            .upsert({ session_id: sessionId, question_id: q.id, value })
            .select("*");
        });
      }

      const isLast = currentQuestion >= questions.length - 1;
      if (!isLast) {
        startTransition(() => setCurrentQuestion((prev) => prev + 1));
        return;
      }

      startTransition(() => {
        setIsProcessing(true);
        setAnimationStep(0);
      });
      setTimeout(() => setAnimationStep(1), 400);
      setTimeout(() => setAnimationStep(2), 1200);
      setTimeout(() => setAnimationStep(3), 2000);

      runIdle(() => {
        void calculateAndFetchResults();
      });
    },
    [questions, currentQuestion, sessionId]
  );

  const calculateAndFetchResults = async () => {
    if (!selectedDiagnosis) {
      setLoadError("診断タイプが未選択です。");
      return;
    }
    try {
      let sid = sessionId;
      if (!sid) {
        const { data: sessionIns, error: sessionErr } = await supabase
          .from("diagnosis_sessions")
          .insert({ type: selectedDiagnosis })
          .select("id")
          .single();
        if (sessionErr) throw sessionErr;
        sid = (sessionIns as any)?.id ?? null;
        setSessionId(sid);
      }
      if (!sid) {
        setLoadError("セッション作成に失敗しました。");
        return;
      }

      const { error: rpcError } = await supabase.rpc("calculate_diagnosis", {
        p_session_id: sid,
      });
      if (rpcError) {
        // continue and try fetching result with retries
        console.warn("[diagnosis] RPC error", rpcError);
      }

      const fetchOnce = async () =>
        await supabase
          .from("diagnosis_results")
          .select(
            "type,scores,strengths,growth_areas,recommendations,insights,created_at"
          )
          .eq("session_id", sid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      let resRow: any = null;
      let lastErr: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await fetchOnce();
        if (error) lastErr = error;
        if (data) {
          resRow = data;
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!resRow) {
        if (lastErr) console.warn("[diagnosis] fetch error", lastErr);
        setLoadError("結果がまだ生成されていません。（サーバー集計が遅延中）数秒後にもう一度お試しください。");
        return;
      }

      const mapped: DiagnosisResult = {
        type: (resRow as any).type as DiagnosisType,
        scores: (resRow as any).scores ?? {},
        strengths: (resRow as any).strengths ?? [],
        growthAreas: (resRow as any).growth_areas ?? [],
        recommendations: (resRow as any).recommendations ?? [],
        insights: (resRow as any).insights ?? [],
      };

      setResults(mapped);
      setShowResults(true);
    } catch (e) {
      console.warn("[diagnosis] exception", (e as Error).message);
      setLoadError("結果の生成に失敗しました。");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDiagnosis = useCallback(() => {
    startTransition(() => {
      setSelectedDiagnosis(null);
      setCurrentQuestion(0);
      setAnswers({});
      setShowResults(false);
      setResults(null);
      setIsProcessing(false);
      setAnimationStep(0);
    });
  }, []);

  // ---- UI Parts (tuned for MOBILE) ----------------------------------
  const ProcessingAnimation = () => {
    const [w] = useState(new Animated.Value(0));
    useEffect(() => {
      Animated.timing(w, { toValue: (animationStep + 1) * 25, duration: 400, useNativeDriver: false }).start();
    }, [animationStep]);
    const stepText =
      animationStep === 0
        ? { title: '回答を分析中…', sub: 'あなたの特性を分析しています' }
        : animationStep === 1
        ? { title: 'パターン解析中…', sub: '回答パターンから抽出しています' }
        : animationStep === 2
        ? { title: '適職をマッチング中…', sub: '最適な職種を検索しています' }
        : { title: 'レポート作成中…', sub: '結果をまとめています' };
    const widthInterpolated = w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: '100%', maxWidth: 380, paddingHorizontal: 16 }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={36} color="#fff" />
            </View>
          </View>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{stepText.title}</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{stepText.sub}</Text>
          </View>
          <View style={{ width: '100%', height: 8, backgroundColor: '#e5e7eb', borderRadius: 9999, overflow: 'hidden' }}>
            <Animated.View style={{ height: '100%', backgroundColor: '#6366f1', width: widthInterpolated }} />
          </View>
        </View>
      </View>
    );
  };

  // ---- SELECT SCREEN (mobile-first) ---------------------------------
  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' },
    container: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
    outlineBtn: { height: 36, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    outlineBtnText: { fontSize: 12, color: '#111827' },
    titleWrap: { alignItems: 'center', marginBottom: 16 },
    heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1' },
    title: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 8 },
    subtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
    errorBadge: { marginTop: 8, alignSelf: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
    errorText: { fontSize: 11, color: '#b45309' },
    card: { borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', padding: 14 },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    iconSquare: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1, marginLeft: 12 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    cardDesc: { fontSize: 12, color: '#6b7280', marginTop: 4 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    metaText: { fontSize: 11, color: '#6b7280' },
    startText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
    listGap: { rowGap: 12 },
  });

  if (!selectedDiagnosis) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Pressable style={styles.outlineBtn} onPress={() => router.push('/ipo/diagnosis/result')}>
              <Text style={styles.outlineBtnText}>過去の診断結果</Text>
            </Pressable>
          </View>

          <View style={styles.titleWrap}>
            <View style={styles.heroIcon}>
              {React.createElement(Brain as any, { size: 28, color: '#fff' })}
            </View>
            <Text style={styles.title}>診断システム</Text>
            <Text style={styles.subtitle}>AI分析で強みと最適なキャリアパスを発見</Text>
            {loadError ? (
              <View style={styles.errorBadge}><Text style={styles.errorText}>{loadError}</Text></View>
            ) : null}
          </View>

          <View style={styles.listGap}>
            {Object.entries(DIAGNOSIS_TYPES).map(([key, diagnosis], index) => {
              const IconComponent = diagnosis.icon as any;
              const gradientColors: Record<string, string> = {
                personality: '#8b5cf6',
                values: '#ec4899',
                career: '#3b82f6',
                skills: '#22c55e',
              };
              return (
                <Pressable key={key} onPress={() => handleSelectDiagnosis(key as DiagnosisType)}>
                  <View style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconSquare, { backgroundColor: gradientColors[key as keyof typeof gradientColors] }]}>
                        {React.createElement(IconComponent, { size: 24, color: '#fff' })}
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{diagnosis.title}</Text>
                        <Text style={styles.cardDesc}>{diagnosis.description}</Text>
                        <View style={styles.metaRow}>
                          <Text style={styles.metaText}> {diagnosis.questions}問</Text>
                          <Text style={styles.metaText}>⏱ {diagnosis.duration}</Text>
                          <Text style={styles.startText}>開始 →</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---- PROCESSING ----------------------------------------------------
  if (isProcessing) return <ProcessingAnimation />;

  // ---- helpers for results ------------------------------------------
  const toRadarData = (scores: Record<string, number>) => {
    const pick = (candidates: string[], fallback = 50) => {
      for (const key of candidates) {
        if (key in scores) return scores[key];
        const found = Object.keys(scores).find((k) => k.toLowerCase() === key.toLowerCase());
        if (found) return scores[found];
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
  };
  const jpLabel = (key: string) => {
    const map: Record<string, string> = {
      communication: "コミュニケーション",
      logic: "ロジック",
      leadership: "リーダーシップ",
      fit: "フィット（適応）",
      vitality: "バイタリティ",
    };
    const k = key.toLowerCase();
    return map[k] ?? key;
  };
  const scoreOf = (cat: string) => {
    if (!results?.scores) return 0;
    const direct = results.scores[cat];
    if (typeof direct === "number") return direct;
    const foundKey = Object.keys(results.scores).find((k) => k.toLowerCase() === cat.toLowerCase());
    return foundKey ? (results.scores[foundKey] as number) : 0;
  };

  const strengthsSorted = (results?.strengths ?? []).slice().sort((a, b) => scoreOf(b) - scoreOf(a));
  const growthSorted = (results?.growthAreas ?? []).slice().sort((a, b) => scoreOf(a) - scoreOf(b));

  // ---- RESULTS (mobile-first, RN) ----------------------------------
  if (showResults && results) {
    const rStyles = StyleSheet.create({
      screen: { flex: 1, backgroundColor: '#f8fafc' },
      container: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 20 },
      center: { alignItems: 'center' },
      hero: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
      title: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginTop: 8 },
      subtitle: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 2, marginBottom: 8 },

      topBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
      outlineBtn: { height: 36, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
      outlineBtnText: { fontSize: 12, color: '#111827' },

      chipRowWrap: { marginTop: 4, marginBottom: 12 },
      chipRow: { flexDirection: 'row', columnGap: 8, flexWrap: 'wrap' },
      chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
      chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
      chipText: { fontSize: 12, color: '#111827' },
      chipTextActive: { color: '#fff' },

      section: { borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 12 },
      secTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
      badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
      badge: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f8fafc', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 3 },
      badgeText: { fontSize: 11, color: '#111827' },
      meter: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 9999, overflow: 'hidden', marginTop: 6 },
      meterFill: { height: '100%', backgroundColor: '#3b82f6' },

      actionsRow: { rowGap: 8 },
      primaryBtn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb' },
      primaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
      twoCol: { flexDirection: 'row', columnGap: 8 },
      ghostBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
      ghostText: { fontSize: 14, color: '#111827' },
    });


    return (
      <View style={rStyles.screen}>
        <ScrollView contentContainerStyle={rStyles.container}>
          <View style={rStyles.hero}>{React.createElement(CheckCircle as any, { size: 28, color: '#fff' })}</View>
          <Text style={rStyles.title}>{DIAGNOSIS_TYPES[results.type].title}結果</Text>
          <Text style={rStyles.subtitle}>あなたの特性と最適なキャリアパス</Text>

          <View style={rStyles.topBtnRow}>
            <Pressable style={rStyles.outlineBtn} onPress={() => router.push('/ipo/diagnosis/result')}>
              <Text style={rStyles.outlineBtnText}>過去の診断結果</Text>
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={rStyles.chipRowWrap}>
            <View style={rStyles.chipRow}>
              {[
                {k:'overview', t:'概要'},
                {k:'analysis', t:'分析'},
                {k:'careers', t:'適職'},
                {k:'actions', t:'行動'},
              ].map(({k,t}) => (
                <Pressable key={k} onPress={() => setResTab(k as any)} style={[rStyles.chip, resTab===k ? rStyles.chipActive: null]}>
                  <Text style={[rStyles.chipText, resTab===k ? rStyles.chipTextActive: null]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Overview */}
          {resTab==='overview' && (
            <>
              <View style={rStyles.section}>
                <Text style={rStyles.secTitle}>特性スコア</Text>
                <View>
                  <MiniRadarChart data={toRadarData(results.scores)} />
                </View>
              </View>

              <View style={rStyles.section}>
                <Text style={rStyles.secTitle}>あなたの強み</Text>
                {strengthsSorted.length===0 ? (
                  <Text style={{fontSize:12,color:'#6b7280'}}>データが足りません</Text>
                ) : (
                  strengthsSorted.map((sKey, i) => {
                    const s = scoreOf(sKey);
                    return (
                      <View key={i} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                          <Text style={{ fontSize:13, fontWeight:'600', color:'#111827' }}>{jpLabel(sKey)}</Text>
                          <Text style={{ fontSize:12, color:'#6b7280' }}>{s}</Text>
                        </View>
                        <View style={rStyles.meter}><View style={[rStyles.meterFill,{ width: `${s}%` }]} /></View>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={rStyles.section}>
                <Text style={rStyles.secTitle}>成長できる分野</Text>
                {growthSorted.length===0 ? (
                  <Text style={{fontSize:12,color:'#6b7280'}}>データが足りません</Text>
                ) : (
                  growthSorted.map((gKey, i) => {
                    const s = scoreOf(gKey);
                    return (
                      <View key={i} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                          <Text style={{ fontSize:13, fontWeight:'600', color:'#111827' }}>{jpLabel(gKey)}</Text>
                          <Text style={{ fontSize:12, color:'#6b7280' }}>{s}</Text>
                        </View>
                        <View style={rStyles.meter}><View style={[rStyles.meterFill,{ width: `${s}%`, backgroundColor:'#f59e0b' }]} /></View>
                      </View>
                    );
                  })
                )}
                <Text style={{ fontSize:10, color:'#6b7280', marginTop:4 }}>※ スコアが低いほど優先的に伸ばすべき領域です</Text>
              </View>
            </>
          )}

          {/* Analysis */}
          {resTab==='analysis' && (
            <View style={rStyles.section}>
              {Object.entries(results.scores).map(([key, score]) => (
                <View key={key} style={{ marginBottom:10 }}>
                  <View style={{ alignItems:'center' }}>
                    <Text style={{ fontSize:22, fontWeight:'700', color:'#111827' }}>{score}</Text>
                    <Text style={{ fontSize:12, color:'#6b7280', marginBottom:6 }}>{jpLabel(key)}</Text>
                  </View>
                  <View style={rStyles.meter}><View style={[rStyles.meterFill,{ width: `${score}%` }]} /></View>
                </View>
              ))}
            </View>
          )}

          {/* Careers */}
          {resTab==='careers' && (
            <View style={{ rowGap:12 }}>
              {results.recommendations.map((job, index) => (
                <View key={index} style={rStyles.section}>
                  <View style={{ flexDirection:'row', alignItems:'center', columnGap:10 }}>
                    <View style={{ width:36, height:36, borderRadius:18, backgroundColor:'#22c55e', alignItems:'center', justifyContent:'center' }}>
                      <Text style={{ color:'#fff', fontWeight:'700', fontSize:12 }}>#{index+1}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                        <Text style={{ fontSize:15, fontWeight:'700', color:'#111827' }} numberOfLines={1}>{job.title}</Text>
                        <Text style={{ fontSize:12, color:'#16a34a', fontWeight:'700' }}>{job.match}%</Text>
                      </View>
                      <Text style={{ fontSize:12, color:'#6b7280', marginTop:2 }} numberOfLines={3}>{job.description}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop:8 }}>
                    <Text style={{ fontSize:12, fontWeight:'700', color:'#111827', marginBottom:4 }}>マッチする理由</Text>
                    <View style={rStyles.badgeRow}>
                      {job.reasons.map((r,i)=>(
                        <View key={i} style={rStyles.badge}><Text style={rStyles.badgeText}>{r}</Text></View>
                      ))}
                    </View>
                  </View>
                  <View style={{ marginTop:8 }}>
                    <Text style={{ fontSize:12, fontWeight:'700', color:'#111827', marginBottom:4 }}>必要なスキル</Text>
                    <View style={rStyles.badgeRow}>
                      {job.requiredSkills.map((s,i)=>(
                        <View key={i} style={[rStyles.badge,{ backgroundColor:'#fff' }]}><Text style={rStyles.badgeText}>{s}</Text></View>
                      ))}
                    </View>
                  </View>
                  <View style={{ flexDirection:'row', columnGap:12, marginTop:8 }}>
                    <Text style={{ fontSize:11, color:'#6b7280' }}>平均年収: {job.averageSalary}</Text>
                    <Text style={{ fontSize:11, color:'#6b7280' }}>成長率: {job.growthRate}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          {resTab==='actions' && (
            <View style={{ rowGap:12 }}>
              <View style={rStyles.section}>
                <Text style={rStyles.secTitle}>次のステップ</Text>
                <View style={{ rowGap:8 }}>
                  {['業界研究を深める','スキルマップを作成','ネットワーキング開始'].map((t,i)=>(
                    <View key={i} style={{ flexDirection:'row', columnGap:8, alignItems:'center' }}>
                      <View style={{ width:24, height:24, borderRadius:12, backgroundColor:'#dbeafe', alignItems:'center', justifyContent:'center' }}><Text style={{ color:'#2563eb', fontSize:12, fontWeight:'700' }}>{i+1}</Text></View>
                      <Text style={{ fontSize:13, color:'#374151' }}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={rStyles.section}>
                <Text style={rStyles.secTitle}>中長期的な取り組み</Text>
                <View style={{ rowGap:8 }}>
                  {['資格・認定取得','実務経験を積む','ポートフォリオ構築'].map((t,i)=>(
                    <View key={i} style={{ flexDirection:'row', columnGap:8, alignItems:'center' }}>
                      <View style={{ width:24, height:24, borderRadius:12, backgroundColor:'#dcfce7', alignItems:'center', justifyContent:'center' }}><Text style={{ color:'#16a34a', fontSize:12, fontWeight:'700' }}>{i+1}</Text></View>
                      <Text style={{ fontSize:13, color:'#374151' }}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* bottom actions */}
          <View style={[rStyles.actionsRow,{ marginTop:8 }] }>
            <Pressable style={rStyles.primaryBtn} onPress={() => startTransition(() => router.push('/ipo/library'))}>
              <Text style={rStyles.primaryText}>業界・職種を詳しく調べる</Text>
            </Pressable>
            <View style={rStyles.twoCol}>
              <Pressable style={[rStyles.ghostBtn,{ flex:1 }]} onPress={resetDiagnosis}>
                <Text style={rStyles.ghostText}>別の診断を受ける</Text>
              </Pressable>
              <Pressable style={[rStyles.ghostBtn,{ flex:1 }]} onPress={async ()=>{
                if (!sessionId && selectedDiagnosis) {
                  const { data: sessionIns, error: sessionErr } = await supabase
                    .from('diagnosis_sessions')
                    .insert({ type: selectedDiagnosis })
                    .select('id')
                    .single();
                  if (!sessionErr) setSessionId((sessionIns as any)?.id ?? null);
                }
                startTransition(()=> router.push('/ipo/dashboard'))
              }}>
                <Text style={rStyles.ghostText}>結果を保存</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---- QUESTIONS (mobile-first) -------------------------------------
  const currentQ = questions[currentQuestion];
  if (!currentQ) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 20 }}>
          <Card style={{ marginBottom: 12 }}>
            <CardContent>
              <Text style={{ textAlign: 'center', fontSize: 12, color: loadError ? '#dc2626' : '#4b5563' }}>
                {loadError ? loadError : '質問が表示できません。時間をおいて再度お試しください。'}
              </Text>
            </CardContent>
          </Card>
          <View style={{ alignItems: 'center' }}>
            <Button variant="outline" size="sm" onPress={resetDiagnosis}>診断を選び直す</Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Styles dedicated to the question screen
  const qStyles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' },
    container: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    titleWrap: { flexShrink: 1, paddingRight: 12 },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },
    subtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
    counterWrap: { alignItems: 'flex-end' },
    counterNum: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
    counterLabel: { fontSize: 11, color: '#6b7280' },

    progressWrap: { marginTop: 8 },
    progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 9999, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#3b82f6' },
    progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    progressMetaText: { fontSize: 10, color: '#6b7280' },

    card: { borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', padding: 18, marginTop: 12 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
    questionNo: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 },
    questionText: { fontSize: 15, color: '#111827', lineHeight: 22, textAlign: 'center' },

    optionBtn: { width: '100%', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' },
    optionText: { fontSize: 14, color: '#fff', fontWeight: '600' },
    optionGap: { height: 10 },

    navRow: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
    backText: { fontSize: 13, color: '#111827' },
    dotsRow: { flexDirection: 'row', columnGap: 4 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
  });

  return (
    <View style={qStyles.screen}>
      <ScrollView contentContainerStyle={qStyles.container}>
        {/* Header */}
        <View style={qStyles.headerRow}>
          <View style={qStyles.titleWrap}>
            <Text style={qStyles.title}>{DIAGNOSIS_TYPES[selectedDiagnosis!].title}</Text>
            <Text style={qStyles.subtitle}>{DIAGNOSIS_TYPES[selectedDiagnosis!].description}</Text>
          </View>
          <View style={qStyles.counterWrap}>
            <Text style={qStyles.counterNum}>
              {questions.length > 0 ? `${currentQuestion + 1}/${questions.length}` : '-/-'}
            </Text>
            <Text style={qStyles.counterLabel}>質問</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={qStyles.progressWrap}>
          <View style={qStyles.progressBar}>
            <View style={[qStyles.progressFill, { width: `${Math.round(progress)}%` }]} />
          </View>
          <View style={qStyles.progressMeta}>
            <Text style={qStyles.progressMetaText}>開始</Text>
            <Text style={qStyles.progressMetaText}>{Math.round(progress)}% 完了</Text>
            <Text style={qStyles.progressMetaText}>終了</Text>
          </View>
        </View>

        {/* Question Card */}
        <View style={qStyles.card}>
          <View style={qStyles.iconCircle}>
            {React.createElement(Brain as any, { size: 28, color: '#fff' })}
          </View>
          <Text style={qStyles.questionNo}>質問 {currentQuestion + 1}</Text>
          <Text style={qStyles.questionText}>{currentQ.text}</Text>
        </View>

        {/* Options */}
        <View style={{ marginTop: 12 }}>
          {[
            { value: 5, label: '非常にそう思う', bg: '#16a34a' },
            { value: 4, label: 'そう思う', bg: '#22c55e' },
            { value: 3, label: 'どちらでもない', bg: '#6b7280' },
            { value: 2, label: 'そう思わない', bg: '#fb923c' },
            { value: 1, label: '全くそう思わない', bg: '#ef4444' },
          ].map((opt, idx) => (
            <React.Fragment key={opt.value}>
              <Pressable
                onPress={() => handleAnswer(opt.value)}
                style={[qStyles.optionBtn, { backgroundColor: opt.bg }]}
              >
                <Text style={qStyles.optionText}>{opt.label}</Text>
                {React.createElement(ArrowRight as any, { size: 16, color: '#ffffffcc' })}
              </Pressable>
              {idx < 4 ? <View style={qStyles.optionGap} /> : null}
            </React.Fragment>
          ))}
        </View>

        {/* Bottom nav */}
        <View style={qStyles.navRow}>
          {currentQuestion > 0 ? (
            <Pressable onPress={() => setCurrentQuestion((prev) => prev - 1)} style={qStyles.backBtn}>
              <Text style={qStyles.backText}>← 前へ</Text>
            </Pressable>
          ) : <View />}
          <View style={qStyles.dotsRow}>
            {questions.map((_, idx) => (
              <View key={idx} style={[qStyles.dot, idx === currentQuestion ? { backgroundColor: '#3b82f6' } : idx < currentQuestion ? { backgroundColor: '#10b981' } : null]} />
            ))}
          </View>
          <View />
        </View>
      </ScrollView>
    </View>
  );
}
