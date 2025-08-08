"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Brain, CheckCircle, TrendingUp, Star, Target, Heart, 
  Users, Lightbulb, Shield, ArrowRight, RotateCcw, 
  Download, Share2, BookOpen, Award, Clock
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
  const progress = selectedDiagnosis ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  // Fetch questions from Supabase when a diagnosis type is chosen
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
        .order('sort_order', { ascending: true });

      if (error) {
        // Fall back to local mock if table missing or other errors
        console.warn('[diagnosis] Falling back to local questions:', error.message);
        if (!isMounted) return;
        setQuestions(generateQuestions(selectedDiagnosis));
        setLoadError('サーバーからの取得に失敗したため、ローカルの質問で表示しています。');
        return;
      }

      if (!data || data.length === 0) {
        // Also fall back if no rows
        if (!isMounted) return;
        setQuestions(generateQuestions(selectedDiagnosis));
        setLoadError('質問が未登録のため、ローカルの質問で表示しています。');
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
        .single();

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

  // Generate questions based on diagnosis type
  function generateQuestions(type: DiagnosisType | null): Question[] {
    if (!type) return [];
    
    const baseQuestions = {
      personality: [
        { id: 1, text: '新しいアイデアや創造的な活動に興味がある', category: 'openness' },
        { id: 2, text: '計画を立てて物事を進めるのが得意だ', category: 'conscientiousness' },
        { id: 3, text: '人と話すのが好きで、社交的だ', category: 'extraversion' },
        { id: 4, text: '他人に親切で、協力的だ', category: 'agreeableness' },
        { id: 5, text: 'ストレスを感じやすく、心配になることが多い', category: 'neuroticism' },
        { id: 6, text: '芸術や美しいものに感動することが多い', category: 'openness' },
        { id: 7, text: '責任感が強く、約束は必ず守る', category: 'conscientiousness' },
        { id: 8, text: 'パーティーや集まりでは積極的に参加する', category: 'extraversion' },
        { id: 9, text: '困っている人を見ると助けたくなる', category: 'agreeableness' },
        { id: 10, text: '将来について不安になることがある', category: 'neuroticism' },
        { id: 11, text: '抽象的な概念について考えるのが好きだ', category: 'openness' },
        { id: 12, text: '細かいところまで注意を払って作業する', category: 'conscientiousness' },
        { id: 13, text: '初対面の人とでもすぐに打ち解けられる', category: 'extraversion' },
        { id: 14, text: 'チームワークを大切にして仕事をする', category: 'agreeableness' },
        { id: 15, text: '批判されると落ち込みやすい', category: 'neuroticism' }
      ],
      values: [
        { id: 1, text: '仕事で社会に貢献することが重要だ', category: 'social_impact' },
        { id: 2, text: '高い収入を得ることを優先したい', category: 'financial_security' },
        { id: 3, text: '自分の時間を大切にしたい', category: 'work_life_balance' },
        { id: 4, text: 'チャレンジングな仕事に取り組みたい', category: 'growth' },
        { id: 5, text: '安定した環境で働きたい', category: 'stability' },
        { id: 6, text: '創造性を活かせる仕事がしたい', category: 'creativity' },
        { id: 7, text: 'リーダーシップを発揮したい', category: 'leadership' },
        { id: 8, text: 'チームで協力することが好きだ', category: 'collaboration' },
        { id: 9, text: '専門知識を深めたい', category: 'expertise' },
        { id: 10, text: '多様な経験を積みたい', category: 'variety' }
      ],
      career: [
        { id: 1, text: 'データを分析して洞察を得るのが得意だ', category: 'analytical' },
        { id: 2, text: '人とコミュニケーションを取るのが得意だ', category: 'interpersonal' },
        { id: 3, text: '新しい技術を学ぶことに興味がある', category: 'technical' },
        { id: 4, text: 'クリエイティブな解決策を考えるのが得意だ', category: 'creative' },
        { id: 5, text: 'チームを率いて目標を達成するのが得意だ', category: 'leadership' },
        { id: 6, text: '細かい作業に集中することができる', category: 'detail_oriented' },
        { id: 7, text: '変化の激しい環境でも適応できる', category: 'adaptability' },
        { id: 8, text: '論理的に物事を考えるのが得意だ', category: 'logical' },
        { id: 9, text: 'お客様のニーズを理解するのが得意だ', category: 'customer_focus' },
        { id: 10, text: '新しいアイデアを提案するのが得意だ', category: 'innovation' }
      ],
      skills: [
        { id: 1, text: 'プログラミング言語を使って開発ができる', category: 'technical' },
        { id: 2, text: 'プレゼンテーションが得意だ', category: 'communication' },
        { id: 3, text: 'プロジェクトを管理するスキルがある', category: 'management' },
        { id: 4, text: 'デザインツールを使えるスキルがある', category: 'design' },
        { id: 5, text: '外国語でコミュニケーションができる', category: 'language' },
        { id: 6, text: 'データ分析ツールを使えるスキルがある', category: 'analytics' },
        { id: 7, text: '営業活動の経験がある', category: 'sales' },
        { id: 8, text: 'マーケティングの知識がある', category: 'marketing' },
        { id: 9, text: '財務・会計の知識がある', category: 'finance' },
        { id: 10, text: '法務・コンプライアンスの知識がある', category: 'legal' }
      ]
    };

    return (baseQuestions[type] || []).map(q => ({ ...q, type }));
  }

  const handleAnswer = async (value: number) => {
    const q = questions[currentQuestion];
    setAnswers((prev) => ({ ...prev, [q.id]: value }));

    // Persist the single answer if we already have a session
    if (sessionId) {
      const { error: ansErr } = await supabase
        .from('diagnosis_answers')
        .upsert({
          session_id: sessionId,
          question_id: q.id,
          value,
        });
      if (ansErr) {
        console.warn('[diagnosis] answer upsert failed:', ansErr.message);
      }
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      // Start processing
      setIsProcessing(true);

      // Simulate processing with animation steps
      setTimeout(() => setAnimationStep(1), 500);
      setTimeout(() => setAnimationStep(2), 1500);
      setTimeout(() => setAnimationStep(3), 2500);
      setTimeout(async () => {
        const calculatedResults = calculateResults();

        // Save results to Supabase if possible
        try {
          if (sessionId) {
            const payload = {
              session_id: sessionId,
              type: calculatedResults.type,
              scores: calculatedResults.scores,
              strengths: calculatedResults.strengths,
              growth_areas: calculatedResults.growthAreas,
              recommendations: calculatedResults.recommendations,
              insights: calculatedResults.insights,
              source: 'client_calculated',
            };

            const { error: resErr } = await supabase.from('diagnosis_results').upsert(payload);
            if (resErr) {
              console.warn('[diagnosis] results upsert failed:', resErr.message);
            }
          }
        } catch (e) {
          console.warn('[diagnosis] results save exception:', (e as Error).message);
        }

        setResults(calculatedResults);
        setShowResults(true);
        setIsProcessing(false);
      }, 3500);
    }
  };

  const calculateResults = (): DiagnosisResult => {
    if (!selectedDiagnosis) throw new Error('No diagnosis type selected');

    // Mock sophisticated calculation
    const mockResults: Record<DiagnosisType, DiagnosisResult> = {
      personality: {
        type: 'personality',
        scores: {
          openness: Math.floor(Math.random() * 30) + 60,
          conscientiousness: Math.floor(Math.random() * 30) + 65,
          extraversion: Math.floor(Math.random() * 30) + 55,
          agreeableness: Math.floor(Math.random() * 30) + 70,
          neuroticism: Math.floor(Math.random() * 40) + 30
        },
        strengths: ['創造的思考', '責任感', '協調性'],
        growthAreas: ['ストレス耐性', '自信'],
        recommendations: getJobRecommendations(),
        insights: [
          'あなたは新しいアイデアに対してオープンで、チームワークを大切にする傾向があります。',
          '責任感が強く、約束や期限を守ることを重視します。',
          '時にはストレスを感じやすいため、リラックスする時間を作ることが大切です。'
        ]
      },
      values: {
        type: 'values',
        scores: {
          social_impact: Math.floor(Math.random() * 30) + 70,
          financial_security: Math.floor(Math.random() * 30) + 60,
          work_life_balance: Math.floor(Math.random() * 30) + 80,
          growth: Math.floor(Math.random() * 30) + 65,
          stability: Math.floor(Math.random() * 30) + 55
        },
        strengths: ['社会貢献意識', 'ワークライフバランス重視'],
        growthAreas: ['キャリアアップ意識'],
        recommendations: getJobRecommendations(),
        insights: [
          'あなたは社会に貢献できる仕事に強い価値を見出します。',
          'ワークライフバランスを重視し、私生活も大切にしたいと考えています。',
          '安定性よりも成長機会を求める傾向があります。'
        ]
      },
      career: {
        type: 'career',
        scores: {
          analytical: Math.floor(Math.random() * 30) + 70,
          interpersonal: Math.floor(Math.random() * 30) + 75,
          technical: Math.floor(Math.random() * 30) + 60,
          creative: Math.floor(Math.random() * 30) + 65,
          leadership: Math.floor(Math.random() * 30) + 68
        },
        strengths: ['分析力', '対人スキル', 'リーダーシップ'],
        growthAreas: ['技術スキル', 'クリエイティビティ'],
        recommendations: getJobRecommendations(),
        insights: [
          'データを分析して洞察を得ることが得意で、論理的な思考力があります。',
          '人との関わりを重視し、コミュニケーション能力に長けています。',
          'リーダーシップの素質があり、チームを引っ張る力があります。'
        ]
      },
      skills: {
        type: 'skills',
        scores: {
          technical: Math.floor(Math.random() * 30) + 50,
          communication: Math.floor(Math.random() * 30) + 75,
          management: Math.floor(Math.random() * 30) + 60,
          design: Math.floor(Math.random() * 30) + 45,
          analytics: Math.floor(Math.random() * 30) + 70
        },
        strengths: ['コミュニケーション', 'データ分析'],
        growthAreas: ['技術スキル', 'デザインスキル'],
        recommendations: getJobRecommendations(),
        insights: [
          'コミュニケーション能力が高く、チームでの協働が得意です。',
          'データ分析のスキルがあり、数値に基づいた意思決定ができます。',
          '技術スキルを伸ばすことで、より幅広い職種に挑戦できます。'
        ]
      }
    };

    return mockResults[selectedDiagnosis];
  };

  const getJobRecommendations = (): JobRecommendation[] => {
    return [
      {
        title: 'プロダクトマネージャー',
        match: 92,
        description: 'ユーザーニーズを分析し、開発チームと協力して価値のあるプロダクトを創出する役割',
        reasons: ['高い分析力', '優秀なコミュニケーション能力', 'リーダーシップ素質'],
        averageSalary: '600-1000万円',
        growthRate: '年平均15%成長',
        requiredSkills: ['データ分析', '企画力', 'プロジェクト管理']
      },
      {
        title: 'ビジネスコンサルタント',
        match: 87,
        description: '企業の課題を分析し、戦略的な解決策を提案・実行支援する専門職',
        reasons: ['論理的思考力', '問題解決能力', '対人影響力'],
        averageSalary: '700-1200万円',
        growthRate: '年平均12%成長',
        requiredSkills: ['戦略思考', 'プレゼンテーション', '業界知識']
      },
      {
        title: 'UI/UXデザイナー',
        match: 81,
        description: 'ユーザー体験を向上させる直感的なインターフェースデザインを手がける職種',
        reasons: ['創造性', 'ユーザー共感力', '細部へのこだわり'],
        averageSalary: '500-800万円',
        growthRate: '年平均18%成長',
        requiredSkills: ['デザインツール', 'ユーザーリサーチ', 'プロトタイピング']
      }
    ];
  };

  const resetDiagnosis = () => {
    setSelectedDiagnosis(null);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setResults(null);
    setIsProcessing(false);
    setAnimationStep(0);
  };

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
                  onClick={() => setSelectedDiagnosis(key as DiagnosisType)}
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
                        {results.strengths.map((strength, index) => (
                          <motion.div
                            key={index}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                          >
                            <Badge variant="secondary" className="mr-2 mb-2">
                              {strength}
                            </Badge>
                          </motion.div>
                        ))}
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
                        {results.growthAreas.map((area, index) => (
                          <motion.div
                            key={index}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                          >
                            <Badge variant="outline" className="mr-2 mb-2">
                              {area}
                            </Badge>
                          </motion.div>
                        ))}
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
                          <div className="text-gray-600 capitalize mb-4">{key.replace('_', ' ')}</div>
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
              onClick={() => router.push('/ipo/library')} 
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
                    .single();
                  if (!sessionErr) setSessionId(sessionIns?.id ?? null);
                }
                router.push('/ipo/dashboard');
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
  if (!currentQ) return null;

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
            <CardContent className="p-6 text-center text-gray-600">
              質問を読み込んでいます…
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
}