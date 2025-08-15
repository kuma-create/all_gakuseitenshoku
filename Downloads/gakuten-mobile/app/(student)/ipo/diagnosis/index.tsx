/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useEffect, useCallback, startTransition } from "react";
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


// ---- minimal local UI (no external components) --------------------
const cn = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");

type DivProps = React.HTMLAttributes<HTMLDivElement> & { className?: string };
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "icon";
};

// Card
const Card = ({ className, ...props }: DivProps) => (
  <div {...props} className={cn("rounded-xl border bg-white shadow-sm", className)} />
);
const CardHeader = ({ className, ...props }: DivProps) => (
  <div {...props} className={cn("px-4 pt-4", className)} />
);
const CardContent = ({ className, ...props }: DivProps) => (
  <div {...props} className={cn("px-4 pb-4", className)} />
);

// Button
const Button = ({ className, variant = "default", size = "md", ...props }: BtnProps) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition",
      size === "sm" && "h-8 px-3",
      size === "md" && "h-10 px-4",
      size === "icon" && "h-10 w-10",
      variant === "default" && "bg-blue-600 text-white hover:bg-blue-700",
      variant === "outline" && "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
      variant === "ghost" && "text-gray-700 hover:bg-gray-100",
      className
    )}
  />
);

// Badge
type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  className?: string;
  variant?: "default" | "secondary" | "outline";
};
const Badge = ({ className, children, variant = "default", ...props }: BadgeProps) => {
  const base = "inline-flex items-center rounded-md px-2 py-0.5 text-xs";
  const styles =
    variant === "secondary"
      ? "bg-gray-100 text-gray-700 border border-gray-200"
      : variant === "outline"
      ? "bg-transparent text-gray-700 border border-gray-300"
      : "bg-blue-50 text-blue-700 border border-blue-200";
  return (
    <span {...props} className={cn(base, styles, className)}>
      {children}
    </span>
  );
};

// Progress
const Progress = ({ value = 0, className }: { value?: number; className?: string }) => (
  <div className={cn("w-full rounded-full bg-gray-200", className)}>
    <div
      className="h-full rounded-full bg-blue-500"
      style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%" }}
    />
  </div>
);

// Tabs (very small implementation for this page)
type TabsCtxType = { value: string; setValue: (v: string) => void };
const TabsCtx = React.createContext<TabsCtxType | null>(null);
const Tabs = ({ defaultValue, className, children }: { defaultValue: string; className?: string; children: React.ReactNode }) => {
  const [value, setValue] = React.useState(defaultValue);
  return (
    <div className={className}>
      <TabsCtx.Provider value={{ value, setValue }}>{children}</TabsCtx.Provider>
    </div>
  );
};
const TabsList = ({ className, ...props }: DivProps) => (
  <div {...props} className={cn("rounded-lg bg-gray-100 p-1", className)} />
);
const TabsTrigger = ({ value, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) => {
  const ctx = React.useContext(TabsCtx)!;
  const active = ctx.value === value;
  return (
    <button
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        ctx.setValue(value);
      }}
      className={cn(
        "w-full rounded-md px-3 py-2 text-sm",
        active ? "bg-white shadow-sm" : "text-gray-600 hover:bg-white/60",
        className
      )}
    >
      {children}
    </button>
  );
};
const TabsContent = ({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) => {
  const ctx = React.useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
};

// Lightweight radar chart (SVG)
const MiniRadarChart = ({ data }: { data: Record<string, number> }) => {
  const entries = Object.entries(data);
  const size = 220;
  const c = size / 2;
  const r = c - 20;
  if (entries.length === 0) return <div className="text-xs text-gray-500">データがありません</div>;
  const toPoint = (i: number, v: number) => {
    const angle = (Math.PI * 2 * i) / entries.length - Math.PI / 2;
    const rr = (Math.max(0, Math.min(100, v)) / 100) * r;
    return [c + rr * Math.cos(angle), c + rr * Math.sin(angle)];
  };
  const poly = entries.map(([_, v], i) => toPoint(i, Number(v))).map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs mx-auto">
      {/* grid */}
      {[0.25, 0.5, 0.75, 1].map((p, idx) => (
        <circle key={idx} cx={c} cy={c} r={r * p} fill="none" stroke="#e5e7eb" />
      ))}
      {/* axes */}
      {entries.map((_, i) => {
        const [x, y] = toPoint(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#e5e7eb" />;
      })}
      {/* polygon */}
      <polygon points={poly} fill="rgba(59,130,246,0.25)" stroke="#3b82f6" />
      {/* labels */}
      {entries.map(([k], i) => {
        const [x, y] = toPoint(i, 112);
        return (
          <text key={k} x={x} y={y} fontSize="10" textAnchor="middle" dominantBaseline="middle" fill="#374151">
            {k}
          </text>
        );
      })}
    </svg>
  );
};
import { motion, AnimatePresence } from "framer-motion";

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
  const ProcessingAnimation = () => (
    <div className="bg-background min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              {React.createElement(Brain as any, { className: "w-10 h-10 text-white" })}
            </motion.div>
          </div>
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.div
            key={animationStep}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {animationStep === 0 && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">回答を分析中…</h2>
                <p className="text-sm text-gray-600">あなたの特性を分析しています</p>
              </>
            )}
            {animationStep === 1 && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">パターン解析中…</h2>
                <p className="text-sm text-gray-600">回答パターンから抽出しています</p>
              </>
            )}
            {animationStep === 2 && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">適職をマッチング中…</h2>
                <p className="text-sm text-gray-600">最適な職種を検索しています</p>
              </>
            )}
            {animationStep === 3 && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">レポート作成中…</h2>
                <p className="text-sm text-gray-600">結果をまとめています</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="mt-5">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(animationStep + 1) * 25}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ---- SELECT SCREEN (mobile-first) ---------------------------------
  if (!selectedDiagnosis) {
    return (
      <div className="bg-background min-h-screen">
        <div className="w-full max-w-md mx-auto px-4 py-5">
          <div className="flex justify-end mb-3">
            <Button variant="outline" onClick={() => router.push("/ipo/diagnosis/result")} className="h-9 text-sm">
              過去の診断結果
            </Button>
          </div>
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              {React.createElement(Brain as any, { className: "w-8 h-8" })}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">診断システム</h1>
            <p className="text-sm text-gray-600">AI分析で強みと最適なキャリアパスを発見</p>
            {loadError && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 inline-block px-2 py-1 rounded">
                {loadError}
              </p>
            )}
          </motion.div>

          <div className="grid grid-cols-1 gap-4">
            {Object.entries(DIAGNOSIS_TYPES).map(([key, diagnosis], index) => {
              const IconComponent = diagnosis.icon;
              return (
                <motion.div
                  key={key}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.06 }}
                  onClick={() => handleSelectDiagnosis(key as DiagnosisType)}
                  className="cursor-pointer"
                >
                  <Card className="transition-all duration-200 active:scale-[0.99]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${diagnosis.color} text-white rounded-xl flex items-center justify-center`}>
                          {React.createElement(IconComponent as any, { className: "w-6 h-6" })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-gray-900 truncate">{diagnosis.title}</h3>
                          <p className="text-xs text-gray-600 line-clamp-2">{diagnosis.description}</p>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">{React.createElement(Users as any, { className: "w-3.5 h-3.5" })}{diagnosis.questions}問</span>
                            <span className="flex items-center gap-1">{React.createElement(Clock as any, { className: "w-3.5 h-3.5" })}{diagnosis.duration}</span>
                            <span className="text-blue-600 font-medium flex items-center gap-1">開始{React.createElement(ArrowRight as any, { className: "w-3.5 h-3.5" })}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
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

  // ---- RESULTS (mobile-first) ---------------------------------------
  if (showResults && results) {
    return (
      <div className="bg-background min-h-screen">
        <div className="w-full max-w-md mx-auto px-4 py-5">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-5">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-3">
              {React.createElement(CheckCircle as any, { className: "w-8 h-8" })}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{DIAGNOSIS_TYPES[results.type].title}結果</h1>
            <p className="text-sm text-gray-600">あなたの特性と最適なキャリアパス</p>
          </motion.div>

          <div className="flex justify-end mb-3">
            <Button variant="outline" onClick={() => router.push("/ipo/diagnosis/result")} className="h-9 text-sm">
              過去の診断結果
            </Button>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 text-[13px]">
              <TabsTrigger value="overview">概要</TabsTrigger>
              <TabsTrigger value="analysis">分析</TabsTrigger>
              <TabsTrigger value="careers">適職</TabsTrigger>
              <TabsTrigger value="actions">行動</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-base font-bold text-gray-900">特性スコア</h3>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <MiniRadarChart data={toRadarData(results.scores)} />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4">
                <Card>
                  <CardHeader>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center">{React.createElement(Star as any, { className: "w-4 h-4 text-yellow-500 mr-2" })}あなたの強み</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {strengthsSorted.length === 0 && <p className="text-xs text-gray-500">データが足りません</p>}
                      {strengthsSorted.map((sKey, i) => {
                        const s = scoreOf(sKey);
                        return (
                          <div key={i} className="rounded-md border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold text-gray-900">{jpLabel(sKey)}</div>
                              <div className="text-xs text-gray-600">{s}</div>
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
                    <h3 className="text-sm font-bold text-gray-900 flex items-center">{React.createElement(TrendingUp as any, { className: "w-4 h-4 text-blue-500 mr-2" })}成長できる分野</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {growthSorted.length === 0 && <p className="text-xs text-gray-500">データが足りません</p>}
                      {growthSorted.map((gKey, i) => {
                        const s = scoreOf(gKey);
                        return (
                          <div key={i} className="rounded-md border p-3 bg-orange-50/30">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-semibold text-gray-900">{jpLabel(gKey)}</div>
                              <div className="text-xs text-gray-600">{s}</div>
                            </div>
                            <Progress value={s} className="h-2" />
                          </div>
                        );
                      })}
                      <p className="text-[10px] text-gray-500 mt-1">※ スコアが低いほど優先的に伸ばすべき領域です</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(results.scores).map(([key, score], index) => (
                  <motion.div key={key} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 mb-1">{score}</div>
                          <div className="text-xs text-gray-600 mb-3">{jpLabel(key)}</div>
                          <Progress value={score} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <h3 className="text-base font-bold text-gray-900">詳細な分析結果</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.insights.map((insight, index) => (
                      <motion.div key={index} initial={{ x: -14, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.08 }} className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                        <p className="text-sm text-gray-700">{insight}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="careers" className="space-y-4">
              <div className="space-y-3">
                {results.recommendations.map((job, index) => (
                  <motion.div key={index} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: index * 0.06 }}>
                    <Card className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">#{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-bold text-gray-900 truncate">{job.title}</h3>
                              <div className="flex items-center gap-1">
                                <div className="font-bold text-green-600 text-sm">{job.match}%</div>
                                <div className="text-[10px] text-gray-500">マッチ</div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{job.description}</p>
                            <div className="mb-2">
                              <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center">マッチする理由</h4>
                              <div className="flex flex-wrap gap-1">
                                {job.reasons.map((r, i) => (
                                  <Badge key={i} variant="secondary" className="text-[11px]">{r}</Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center">必要なスキル</h4>
                              <div className="flex flex-wrap gap-1">
                                {job.requiredSkills.map((s, i) => (
                                  <Badge key={i} variant="outline" className="text-[11px]">{s}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                              <span className="flex items-center">{React.createElement(Target as any, { className: "w-3.5 h-3.5 mr-1" })}平均年収: {job.averageSalary}</span>
                              <span className="flex items-center">{React.createElement(TrendingUp as any, { className: "w-3.5 h-3.5 mr-1" })}成長率: {job.growthRate}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-base font-bold text-gray-900">次のステップ</h3>
                  <p className="text-xs text-gray-600">診断結果を活かして前進しましょう</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-900">すぐに始められること</h4>
                      <div className="space-y-2">
                        {["業界研究を深める","スキルマップを作成","ネットワーキング開始"].map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">{i+1}</div>
                            <div className="text-sm text-gray-700">{t}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-900">中長期的な取り組み</h4>
                      <div className="space-y-2">
                        {["資格・認定取得","実務経験を積む","ポートフォリオ構築"].map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">{i+1}</div>
                            <div className="text-sm text-gray-700">{t}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col gap-2 mt-4">
            <Button onClick={() => startTransition(() => router.push("/ipo/library"))} className="h-11 text-sm flex items-center justify-center gap-2">
              {React.createElement(BookOpen as any, { className: "w-4 h-4" })}
              業界・職種を詳しく調べる
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={resetDiagnosis} className="h-11 text-sm">別の診断を受ける</Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!sessionId && selectedDiagnosis) {
                    const { data: sessionIns, error: sessionErr } = await supabase
                      .from("diagnosis_sessions")
                      .insert({ type: selectedDiagnosis })
                      .select("id")
                      .single();
                    if (!sessionErr) setSessionId((sessionIns as any)?.id ?? null);
                  }
                  startTransition(() => router.push("/ipo/dashboard"));
                }}
                className="h-11 text-sm"
              >
                {React.createElement(Download as any, { className: "w-4 h-4" })}結果を保存
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ---- QUESTIONS (mobile-first) -------------------------------------
  const currentQ = questions[currentQuestion];
  if (!currentQ) {
    return (
      <div className="bg-background min-h-screen">
        <div className="w-full max-w-md mx-auto px-4 py-5">
          <Card className="mb-4">
            <CardContent className="p-4 text-center">
              {loadError ? <div className="text-red-600 text-sm">{loadError}</div> : <div className="text-gray-600 text-sm">質問が表示できません。時間をおいて再度お試しください。</div>}
            </CardContent>
          </Card>
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={resetDiagnosis}>診断を選び直す</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="w-full max-w-md mx-auto px-4 py-5">
        <motion.div initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{DIAGNOSIS_TYPES[selectedDiagnosis!].title}</h1>
              <p className="text-xs text-gray-600">{DIAGNOSIS_TYPES[selectedDiagnosis!].description}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-600">{questions.length > 0 ? `${currentQuestion + 1}/${questions.length}` : "-/-"}</div>
              <div className="text-[11px] text-gray-600">質問</div>
            </div>
          </div>
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>開始</span>
              <span>{Math.round(progress)}% 完了</span>
              <span>終了</span>
            </div>
          </div>
        </motion.div>

        {questions.length === 0 && (
          <Card className="mb-4">
            <CardContent className="p-4 text-center">
              {loadError ? <div className="text-red-600 text-sm">{loadError}</div> : <div className="text-gray-600 text-sm">質問を読み込んでいます…</div>}
            </CardContent>
          </Card>
        )}

        <motion.div key={currentQuestion} initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${DIAGNOSIS_TYPES[selectedDiagnosis!].color} text-white rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {React.createElement(Brain as any, { className: "w-8 h-8" })}
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-3">質問 {currentQuestion + 1}</h2>
                <p className="text-base text-gray-800 leading-relaxed">{currentQ.text}</p>
              </div>

              <div className="space-y-2.5">
                {[
                  { value: 5, label: "非常にそう思う", color: "from-green-500 to-green-600" },
                  { value: 4, label: "そう思う", color: "from-green-400 to-green-500" },
                  { value: 3, label: "どちらでもない", color: "from-gray-400 to-gray-500" },
                  { value: 2, label: "そう思わない", color: "from-orange-400 to-orange-500" },
                  { value: 1, label: "全くそう思わない", color: "from-red-500 to-red-600" },
                ].map((option) => (
                  <motion.button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 rounded-2xl bg-gradient-to-r ${option.color} text-white font-medium transition-all duration-150 active:translate-y-[1px] flex items-center justify-between`}
                  >
                    <span className="text-sm">{option.label}</span>
                    {React.createElement(ArrowRight as any, { className: "w-4 h-4 opacity-70" })}
                  </motion.button>
                ))}
              </div>

              <div className="mt-5 flex justify-between items-center">
                {currentQuestion > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setCurrentQuestion((prev) => prev - 1)} className="flex items-center gap-1">
                    {React.createElement(ArrowRight as any, { className: "w-4 h-4 rotate-180" })}
                    <span className="text-sm">前へ</span>
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-1">
                  {questions.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${idx === currentQuestion ? "bg-blue-500" : idx < currentQuestion ? "bg-green-500" : "bg-gray-300"}`}
                    />
                  ))}
                </div>
                <div />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* History drawer (kept for feature parity) */}
      {showHistory && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">過去の診断結果</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowHistory(false); router.push("/ipo/diagnosis/result"); }}>一覧へ</Button>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="rounded-full" aria-label="Close history">
                  {React.createElement(X as any, { className: "w-5 h-5" })}
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-44px)]">
              {historyLoading && <div className="text-xs text-gray-600">読み込み中…</div>}
              {historyError && <div className="text-xs text-red-600">{historyError}</div>}
              {!historyLoading && !historyError && history.length === 0 && (
                <div className="text-xs text-gray-600">過去の診断結果はまだありません。</div>
              )}
              {!historyLoading && history.length > 0 && (
                <div className="space-y-2">
                  {history.map((row) => (
                    <Card key={row.id} className="hover:border-blue-300 transition">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[11px] text-gray-500">{new Date(row.created_at).toLocaleString("ja-JP")}</div>
                            <div className="text-sm font-semibold mt-0.5">{DIAGNOSIS_TYPES[row.type].title}</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {Object.keys(row.scores || {}).slice(0, 3).map((k) => (
                                <Badge key={k} variant="secondary" className="text-[11px]">
                                  {k}: {Math.round(Number((row.scores as any)?.[k] ?? 0))}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => { setShowHistory(false); router.push(`/ipo/diagnosis/result/${row.id}`); }}>開く</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
