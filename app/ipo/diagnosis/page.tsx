/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Brain, CheckCircle, TrendingUp, Star, Target, Heart, 
  Users, Lightbulb, Shield, ArrowRight, RotateCcw, 
  Download, Share2, BookOpen, Award, Clock, X
} from 'lucide-react';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CareerRadarChart } from '@/components/charts/CareerRadarChart';
import { motion, AnimatePresence } from 'framer-motion';

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ---- Supabase row types (align these names/columns to your schema) ----
type DiagnosisRowType = 'personality' | 'values' | 'career' | 'skills';

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


type DiagnosisType = 'personality' | 'values' | 'career' | 'skills';

interface Question {
  id: number;
  text: string;
  category: string;
  type: DiagnosisType;
}

interface DiagnosisResult {
  type: DiagnosisType;
  scores: Record<string, number>;
  strengths: string[];
  growthAreas: string[];
  recommendations: JobRecommendation[];
  insights: string[];
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

// ---- Past Results (history) types ----
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

const mapRowToResult = (row: DiagnosisResultRow): DiagnosisResult => ({
  type: row.type,
  scores: row.scores ?? {},
  strengths: row.strengths ?? [],
  growthAreas: row.growth_areas ?? [],
  recommendations: row.recommendations ?? [],
  insights: row.insights ?? [],
});

const DIAGNOSIS_TYPES = {
  personality: {
    title: '性格診断',
    description: 'あなたの性格特性を分析し、適職を見つけます',
    icon: Brain,
    color: 'from-purple-400 to-purple-600',
    questions: 40,
    duration: '約10分'
  },
  values: {
    title: '価値観診断',
    description: 'あなたが大切にする価値観を明確にします',
    icon: Heart,
    color: 'from-pink-400 to-pink-600',
    questions: 30,
    duration: '約8分'
  },
  career: {
    title: 'キャリア適性診断',
    description: '様々な職種への適性を総合的に評価します',
    icon: Target,
    color: 'from-blue-400 to-blue-600',
    questions: 50,
    duration: '約12分'
  },
  skills: {
    title: 'スキル診断',
    description: '現在のスキルレベルと今後の成長可能性を分析',
    icon: Award,
    color: 'from-green-400 to-green-600',
    questions: 35,
    duration: '約9分'
  }
};

export default function DiagnosisPage() {
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<DiagnosisResult | null>(null);
  const [animationStep, setAnimationStep] = useState(0);
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const progress = selectedDiagnosis && questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  // History (past results)
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<DiagnosisResultRow[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Run a callback when the main thread is idle (fallback to setTimeout)
  const runIdle = (cb: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // @ts-ignore
      (window as any).requestIdleCallback(cb);
    } else {
      setTimeout(cb, 0);
    }
  };

  // Fetch past diagnosis results (limited)
  const fetchHistory = useCallback(async () => {
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('diagnosis_results')
        .select('id, session_id, type, scores, strengths, growth_areas, recommendations, insights, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<DiagnosisResultRow[]>();
      if (error) {
        setHistoryError('過去の結果の取得に失敗しました。');
      } else {
        setHistory(data ?? []);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Prefetch routes used right after diagnosis
  useEffect(() => {
    runIdle(() => {
      router.prefetch('/ipo/library');
      router.prefetch('/ipo/dashboard');
    });
  }, [router]);

  // Fetch questions from Supabase when a diagnosis type is chosen
  const handleSelectDiagnosis = useCallback((d: DiagnosisType) => {
    startTransition(() => {
      setSelectedDiagnosis(d);
    });
  }, []);
  useEffect(() => {
    let isMounted = true;

    async function run() {
      setLoadError(null);
      setQuestions([]);

      if (!selectedDiagnosis) return;

      // Try to fetch from Supabase
      const { data, error } = await supabase
        .from('diagnosis_questions')
        .select('id,text,category,type,sort_order')
        .eq('type', selectedDiagnosis)
        .order('sort_order', { ascending: true })
        .returns<DiagnosisQuestionRow[]>();

      if (error) {
        console.warn('[diagnosis] failed to load questions:', error.message);
        if (!isMounted) return;
        setLoadError('質問の取得に失敗しました。管理者にお問い合わせください。');
        return;
      }

      if (!data || data.length === 0) {
        if (!isMounted) return;
        setLoadError('この診断タイプの質問が登録されていません。');
        return;
      }

      if (!isMounted) return;
      // Map DB rows to local Question type
      const mapped: Question[] = data.map((q) => ({
        id: q.id,
        text: q.text,
        category: q.category,
        type: q.type as DiagnosisType,
      }));
      setQuestions(mapped);

      // Create a session row up-front
      const { data: sessionIns, error: sessionErr } = await supabase
        .from('diagnosis_sessions')
        .insert({ type: selectedDiagnosis })
        .select('id')
        .single<DiagnosisSessionRow>();

      if (sessionErr) {
        console.warn('[diagnosis] failed to create session:', sessionErr.message);
        setSessionId(null);
      } else {
        setSessionId(sessionIns?.id ?? null);
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, [selectedDiagnosis]);


  const handleAnswer = useCallback(async (value: number) => {
    const q = questions[currentQuestion];

    // Optimistic UI update first
    startTransition(() => {
      setAnswers((prev) => ({ ...prev, [q.id]: value }));
    });

    // Persist the single answer in the background; never block UI
    if (sessionId) {
      runIdle(async () => {
        const { error: ansErr } = await supabase
          .from('diagnosis_answers')
          .upsert({ session_id: sessionId, question_id: q.id, value })
          .select('*');
        if (ansErr) console.warn('[diagnosis] answer upsert failed:', ansErr.message);
      });
    }

    const isLast = currentQuestion >= questions.length - 1;
    if (!isLast) {
      startTransition(() => {
        setCurrentQuestion((prev) => prev + 1);
      });
      return;
    }

    // Last question: start processing animation immediately
    startTransition(() => {
      setIsProcessing(true);
      setAnimationStep(0);
    });
    setTimeout(() => setAnimationStep(1), 500);
    setTimeout(() => setAnimationStep(2), 1500);
    setTimeout(() => setAnimationStep(3), 2500);

    // Run the heavy calculation/fetch off the critical path
    runIdle(() => {
      void calculateAndFetchResults();
    });
  }, [questions, currentQuestion, sessionId]);


  const calculateAndFetchResults = async () => {
    if (!selectedDiagnosis) {
      setLoadError('診断タイプが未選択です。');
      return;
    }
    try {
      // Ensure session exists
      let sid = sessionId;
      if (!sid) {
        const { data: sessionIns, error: sessionErr } = await supabase
          .from('diagnosis_sessions')
          .insert({ type: selectedDiagnosis })
          .select('id')
          .single<DiagnosisSessionRow>();
        if (sessionErr) throw sessionErr;
        sid = sessionIns?.id ?? null;
        setSessionId(sid);
      }
      if (!sid) {
        setLoadError('セッション作成に失敗しました。');
        return;
      }

      // --- Server-side calculation (RPC) ---
      // Supabase's rpc does NOT throw; it returns { data, error }.
      const { data: rpcData, error: rpcError, status: rpcStatus, statusText: rpcStatusText } =
        await supabase.rpc('calculate_diagnosis', { p_session_id: sid });

      if (rpcError) {
        console.warn('[diagnosis] RPC calculate_diagnosis failed:', {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: (rpcError as any).hint,
          status: rpcStatus,
          statusText: rpcStatusText,
        });
        // Continue; we will still try to fetch results (and we also retry below)
      }

      // --- Fetch latest results with small retries ---
      const fetchOnce = async () => {
        return await supabase
          .from('diagnosis_results')
          .select('type,scores,strengths,growth_areas,recommendations,insights,created_at')
          .eq('session_id', sid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      };

      let resRow: any = null;
      let lastErr: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await fetchOnce();
        if (error) {
          lastErr = error;
          // If table/columns mismatch we break early; otherwise just retry
          if (error.code && !['PGRST116', 'PGRST106', '406'].includes(String(error.code))) {
            break;
          }
        }
        if (data) {
          resRow = data;
          break;
        }
        // Wait 300ms before next attempt to give RPC time to insert the result
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!resRow) {
        if (lastErr) {
          console.warn('[diagnosis] result fetch failed:', {
            code: lastErr.code,
            message: lastErr.message,
            details: lastErr.details,
            hint: (lastErr as any).hint,
          });
        }
        setLoadError('結果がまだ生成されていません。（サーバー集計が遅延中）数秒後にもう一度お試しください。');
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
      console.warn('[diagnosis] calculate/fetch exception:', (e as Error).message);
      setLoadError('結果の生成に失敗しました。');
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

  // Processing Animation Component
  const ProcessingAnimation = () => (
    <div className="bg-background min-h-screen flex items-center justify-center">
      <div className="max-w-md mx-auto px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-12 h-12 text-white" />
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={animationStep}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {animationStep === 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">回答を分析中...</h2>
                <p className="text-gray-600">あなたの特性を詳しく分析しています</p>
              </div>
            )}
            {animationStep === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">パターン解析中...</h2>
                <p className="text-gray-600">回答パターンから性格特性を抽出しています</p>
              </div>
            )}
            {animationStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">適職をマッチング中...</h2>
                <p className="text-gray-600">あなたに最適な職種を検索しています</p>
              </div>
            )}
            {animationStep === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">レポート作成中...</h2>
                <p className="text-gray-600">詳細な診断結果をまとめています</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(animationStep + 1) * 25}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Main Diagnosis Selection
  if (!selectedDiagnosis) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => router.push('/ipo/diagnosis/result')}
              className="h-10"
            >
              過去の診断結果を見る
            </Button>
          </div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-12"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">診断システム</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              AIが分析する包括的な自己診断で、あなたの強みと最適なキャリアパスを発見しましょう
            </p>
            {loadError && (
              <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 inline-block px-3 py-1 rounded">
                {loadError}
              </p>
            )}
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {Object.entries(DIAGNOSIS_TYPES).map(([key, diagnosis], index) => {
              const IconComponent = diagnosis.icon;
              return (
                <motion.div
                  key={key}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleSelectDiagnosis(key as DiagnosisType)}
                  className="cursor-pointer group"
                >
                  <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group-hover:border-blue-300">
                    <CardContent className="p-8">
                      <div className={`w-16 h-16 bg-gradient-to-br ${diagnosis.color} text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        <IconComponent className="w-8 h-8" />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">{diagnosis.title}</h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">{diagnosis.description}</p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{diagnosis.questions}問</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{diagnosis.duration}</span>
                        </div>
                      </div>

                      <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                        <span>診断を開始する</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center"
          >
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-yellow-500 mr-2" />
                  <h3 className="text-xl font-bold text-gray-900">診断の特徴</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div>
                    <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900 mb-1">科学的根拠</h4>
                    <p className="text-sm text-gray-600">心理学の研究に基づいた信頼性の高い診断</p>
                  </div>
                  <div>
                    <Lightbulb className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900 mb-1">AI分析</h4>
                    <p className="text-sm text-gray-600">最新のAI技術による精密な特性分析</p>
                  </div>
                  <div>
                    <BookOpen className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900 mb-1">詳細レポート</h4>
                    <p className="text-sm text-gray-600">具体的な改善提案と行動計画を提供</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Processing state
  if (isProcessing) {
    return <ProcessingAnimation />;
  }

  // Helper: adapt results.scores to CareerRadarChart shape
  const toRadarData = (scores: Record<string, number>) => {
    const pick = (candidates: string[], fallback = 50) => {
      for (const key of candidates) {
        if (key in scores) return scores[key];
        // also try case-insensitive match
        const found = Object.keys(scores).find(k => k.toLowerCase() === key.toLowerCase());
        if (found) return scores[found];
      }
      return fallback;
    };

    return {
      Communication: pick(['communication', 'interpersonal', 'extraversion']),
      Logic: pick(['logic', 'analytical', 'logical', 'conscientiousness']),
      Leadership: pick(['leadership']),
      Fit: pick(['fit', 'agreeableness', 'customer_focus', 'adaptability']),
      Vitality: pick(['vitality', 'openness', 'technical', 'creativity', 'innovation'])
    };
  };

  // ---- Helpers for nicer result rendering ----
  const jpLabel = (key: string) => {
    const map: Record<string, string> = {
      communication: 'コミュニケーション',
      logic: 'ロジック',
      leadership: 'リーダーシップ',
      fit: 'フィット（適応）',
      vitality: 'バイタリティ',
    };
    const k = key.toLowerCase();
    return map[k] ?? key;
  };

  const scoreOf = (cat: string) => {
    if (!results?.scores) return 0;
    const direct = results.scores[cat];
    if (typeof direct === 'number') return direct;
    const foundKey = Object.keys(results.scores).find(
      (k) => k.toLowerCase() === cat.toLowerCase()
    );
    return foundKey ? (results.scores[foundKey] as number) : 0;
  };

  const strengthsSorted = (results?.strengths ?? []).slice().sort((a, b) => scoreOf(b) - scoreOf(a));
  const growthSorted = (results?.growthAreas ?? []).slice().sort((a, b) => scoreOf(a) - scoreOf(b));
  // Results display
  if (showResults && results) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {DIAGNOSIS_TYPES[results.type].title}結果
            </h1>
            <p className="text-xl text-gray-600">あなたの特性と最適なキャリアパスをご確認ください</p>
          </motion.div>

          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={() => router.push('/ipo/diagnosis/result')}
              className="h-9"
            >
              過去の診断結果を見る
            </Button>
          </div>

          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">概要</TabsTrigger>
              <TabsTrigger value="analysis">詳細分析</TabsTrigger>
              <TabsTrigger value="careers">適職</TabsTrigger>
              <TabsTrigger value="actions">行動計画</TabsTrigger>
            </TabsList>

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
                      <CareerRadarChart data={toRadarData(results.scores)} />
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

            <TabsContent value="analysis" className="space-y-8">
              <div className="grid lg:grid-cols-3 gap-6">
                {Object.entries(results.scores).map(([key, score], index) => (
                  <motion.div
                    key={key}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-900 mb-2">{score}</div>
                          <div className="text-gray-600 mb-4">{jpLabel(key)}</div>
                          <Progress value={score} className="h-2" />
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
                    {results.insights.map((insight, index) => (
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

            <TabsContent value="careers" className="space-y-8">
              <div className="space-y-6">
                {results.recommendations.map((job, index) => (
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
                                  <div className="font-bold text-green-600 text-lg">{job.match}%</div>
                                  <div className="text-xs text-gray-500">マッチ度</div>
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-gray-600 mb-6 text-lg">{job.description}</p>
                            
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                              <div>
                                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                                  マッチする理由
                                </h4>
                                <div className="space-y-2">
                                  {job.reasons.map((reason, reasonIndex) => (
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
                                  {job.requiredSkills.map((skill, skillIndex) => (
                                    <Badge key={skillIndex} variant="outline" className="mr-2">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Target className="w-4 h-4 mr-1" />
                                平均年収: {job.averageSalary}
                              </div>
                              <div className="flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                成長率: {job.growthRate}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

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

          {/* Action Buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 mt-8"
          >
            <Button 
              onClick={() => startTransition(() => router.push('/ipo/library'))} 
              className="flex-1 flex items-center justify-center space-x-2 h-12"
            >
              <BookOpen className="w-4 h-4" />
              <span>業界・職種を詳しく調べる</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={resetDiagnosis} 
              className="flex-1 flex items-center justify-center space-x-2 h-12"
            >
              <RotateCcw className="w-4 h-4" />
              <span>別の診断を受ける</span>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                // Ensure we have a session and results saved, then route
                if (!sessionId && selectedDiagnosis) {
                  const { data: sessionIns, error: sessionErr } = await supabase
                    .from('diagnosis_sessions')
                    .insert({ type: selectedDiagnosis })
                    .select('id')
                    .single<DiagnosisSessionRow>();
                  if (!sessionErr) setSessionId(sessionIns?.id ?? null);
                }
                startTransition(() => router.push('/ipo/dashboard'));
              }}
              className="flex-1 flex items-center justify-center space-x-2 h-12"
            >
              <Download className="w-4 h-4" />
              <span>結果を保存</span>
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Question Display
  const currentQ = questions[currentQuestion];
  if (!currentQ) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              {loadError ? (
                <div className="text-red-600">{loadError}</div>
              ) : (
                <div className="text-gray-600">質問が表示できません。時間をおいて再度お試しください。</div>
              )}
            </CardContent>
          </Card>
          <div className="text-center">
            <Button variant="outline" onClick={resetDiagnosis}>診断を選び直す</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {DIAGNOSIS_TYPES[selectedDiagnosis].title}
              </h1>
              <p className="text-gray-600 mt-1">
                {DIAGNOSIS_TYPES[selectedDiagnosis].description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {questions.length > 0 ? `${currentQuestion + 1}/${questions.length}` : '-/-'}
              </div>
              <div className="text-sm text-gray-600">質問</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>開始</span>
              <span>{Math.round(progress)}% 完了</span>
              <span>終了</span>
            </div>
          </div>
        </motion.div>

        {/* Loading fallback */}
        {questions.length === 0 && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              {loadError ? (
                <div className="text-red-600">{loadError}</div>
              ) : (
                <div className="text-gray-600">質問を読み込んでいます…</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        <motion.div
          key={currentQuestion}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-10">
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className={`w-20 h-20 bg-gradient-to-br ${DIAGNOSIS_TYPES[selectedDiagnosis].color} text-white rounded-full flex items-center justify-center mx-auto mb-6`}
                >
                  <Brain className="w-10 h-10" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  質問 {currentQuestion + 1}
                </h2>
                
                <p className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto">
                  {currentQ.text}
                </p>
              </div>

              {/* Answer Options */}
              <div className="space-y-4">
                {[
                  { value: 5, label: '非常にそう思う', color: 'from-green-500 to-green-600', emoji: '😊' },
                  { value: 4, label: 'そう思う', color: 'from-green-400 to-green-500', emoji: '🙂' },
                  { value: 3, label: 'どちらでもない', color: 'from-gray-400 to-gray-500', emoji: '😐' },
                  { value: 2, label: 'そう思わない', color: 'from-orange-400 to-orange-500', emoji: '🙁' },
                  { value: 1, label: '全くそう思わない', color: 'from-red-500 to-red-600', emoji: '😞' }
                ].map((option) => (
                  <motion.button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-5 rounded-2xl bg-gradient-to-r ${option.color} text-white font-medium transition-all duration-200 hover:shadow-lg flex items-center justify-between`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{option.emoji}</span>
                      <span className="text-lg">{option.label}</span>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-70" />
                  </motion.button>
                ))}
              </div>

              {/* Navigation */}
              <div className="mt-8 flex justify-between items-center">
                {currentQuestion > 0 ? (
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentQuestion(prev => prev - 1)}
                    className="flex items-center space-x-2"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    <span>前の質問</span>
                  </Button>
                ) : (
                  <div />
                )}
                
                <div className="flex space-x-2">
                  {questions.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentQuestion
                          ? 'bg-blue-500'
                          : index < currentQuestion
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <div />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
  {/* ───────────── Past Results Modal ───────────── */}
  {showHistory && (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setShowHistory(false)}
      />
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">過去の診断結果</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowHistory(false);
                router.push('/ipo/diagnosis/result');
              }}
            >
              一覧へ
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(false)}
              className="rounded-full"
              aria-label="Close history"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto h-[calc(100%-56px)]">
          {historyLoading && (
            <div className="text-sm text-gray-600">読み込み中…</div>
          )}
          {historyError && (
            <div className="text-sm text-red-600">{historyError}</div>
          )}
          {!historyLoading && !historyError && history.length === 0 && (
            <div className="text-sm text-gray-600">過去の診断結果はまだありません。</div>
          )}

          {!historyLoading && history.length > 0 && (
            <div className="space-y-3">
              {history.map((row) => (
                <Card key={row.id} className="hover:border-blue-300 transition">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-gray-500">
                          {new Date(row.created_at).toLocaleString('ja-JP')}
                        </div>
                        <div className="text-base font-semibold mt-1">
                          {DIAGNOSIS_TYPES[row.type].title}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(Object.keys(row.scores || {}).slice(0, 3)).map((k) => (
                            <Badge key={k} variant="secondary">
                              {k}: {Math.round(Number(row.scores?.[k] ?? 0))}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowHistory(false);
                            router.push(`/ipo/diagnosis/result/${row.id}`);
                          }}
                        >
                          開く
                        </Button>
                      </div>
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
}