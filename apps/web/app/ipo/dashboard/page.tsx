"use client";
import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Users, Target, Calendar, Star, Plus, ArrowUp, ArrowDown, Minus, HelpCircle, BookOpen, Rocket, Gift } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { CareerRadarChart } from '@/components/charts/CareerRadarChart';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CareerScore } from '@/utils/careerScore';
import { CareerScoreInfo } from '@/components/CareerScoreInfo';
import OnboardingGuide from '@/components/OnboardingGuide';
import { createClient as createSbClient } from '@/lib/supabase/client';
import { RefreshCw, Clock as ClockIcon } from "lucide-react";


interface DashboardPageProps {
  navigate?: (route: string) => void;
}

// ===== Career Score from Resume (heuristic) =====
// Lightweight NLP-less heuristic based on resume text
// Produces 5-dim breakdown + overall + simple insights

type Breakdown = {
  Communication: number;
  Logic: number;
  Leadership: number;
  Fit: number;
  Vitality: number;
};

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

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

function scoreByKeywords(text: string, keywords: string[], weight = 1): number {
  const t = text.toLowerCase();
  let count = 0;
  for (const k of keywords) {
    const m = t.match(new RegExp(`\\b${k.toLowerCase()}\\b`, 'g'));
    count += m ? m.length : 0;
  }
  return count * weight;
}

function lengthScore(text: string): number {
  // Encourage substantive resumes but cap to avoid bias to verbosity
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 150) return 20;
  if (words < 300) return 40;
  if (words < 600) return 65;
  if (words < 1200) return 85;
  return 95;
}

function calculateCareerScoreFromResume(text: string) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    const empty: { overall: number; breakdown: Breakdown; insights: any; lastUpdated: string } = {
      overall: 0,
      breakdown: { Communication: 0, Logic: 0, Leadership: 0, Fit: 0, Vitality: 0 },
      insights: { strengths: [], improvements: ["職務経歴書の内容が見つかりません。内容を充実させましょう。"], recommendations: ["職務内容・成果・数値指標（例：売上◯%成長）を追記してください。"] },
      lastUpdated: new Date().toISOString(),
    };
    return empty;
  }

  // Feature buckets
  const comm = scoreByKeywords(cleaned, [
    // EN
    'client','stakeholder','presentation','negotiation','facilitated','cross-functional','collaboration','customer','mentored','coached',
    // JP
    '顧客','クライアント','関係者','調整','交渉','提案','プレゼン','発表','協業','連携','顧客折衝','メンター','指導','支援','営業'
  ], 8) + lengthScore(cleaned) * 0.3;

  const logic = scoreByKeywords(cleaned, [
    // EN
    'analysis','hypothesis','data','kpi','roi','experiment','ab test','cohort','segmentation','model','optimize','sql','python',
    // JP
    '分析','仮説','データ','指標','検証','実験','abテスト','ABテスト','セグメント','モデル','最適化','SQL','Python','KPI','ROI'
  ], 9) + scoreByKeywords(cleaned, ['because','therefore','so that','なぜ','だから','そのため'], 3);

  const leader = scoreByKeywords(cleaned, [
    // EN
    'led','managed','owner','launched','initiated','pm','product manager','scrum','okr','kpi','team of','hired','trained',
    // JP
    'リード','主導','マネジ','管理','責任者','立ち上げ','推進','PM','プロダクトマネージャ','スクラム','OKR','目標','チーム','採用','育成','教育'
  ], 10);

  const fit = scoreByKeywords(cleaned, [
    // EN
    'mission','vision','value','culture','customer obsession','ownership','bias for action','learn','growth','teamwork','integrity',
    // JP
    'ミッション','ビジョン','バリュー','カルチャー','文化','顧客志向','オーナーシップ','行動','学習','成長','チームワーク','誠実'
  ], 6);

  const vitality = scoreByKeywords(cleaned, [
    // EN
    'volunteer','hackathon','side project','startup','award','certified','certification','toefl','ielts','toeic','gpa','athletics','club','entrepreneur',
    // JP
    'ボランティア','ハッカソン','副業','スタートアップ','受賞','表彰','資格','TOEIC','TOEFL','IELTS','GPA','部活','起業'
  ], 7);

  // Numerical achievements boost (support % and ％)
  const numbersBoost = ((cleaned.match(/\b[0-9]+(?:\.[0-9]+)?%?/g) || []).length + (cleaned.match(/[０-９]+(?:．[０-９]+)?％/g) || []).length) * 2.5;

  const raw: Breakdown = {
    Communication: comm + numbersBoost,
    Logic: logic + numbersBoost,
    Leadership: leader + numbersBoost,
    Fit: fit,
    Vitality: vitality,
  };

  // Normalize each axis to 0-100 with soft caps
  const maxAxis = 140; // heuristic cap
  const breakdown: Breakdown = {
    Communication: clamp((raw.Communication / maxAxis) * 100),
    Logic: clamp((raw.Logic / maxAxis) * 100),
    Leadership: clamp((raw.Leadership / maxAxis) * 100),
    Fit: clamp((raw.Fit / maxAxis) * 100),
    Vitality: clamp((raw.Vitality / maxAxis) * 100),
  };

  // Weighted overall (prioritize Logic/Communication/Leadership)
  const overall = Math.round(
    (breakdown.Logic * 0.28) +
    (breakdown.Communication * 0.25) +
    (breakdown.Leadership * 0.22) +
    (breakdown.Fit * 0.15) +
    (breakdown.Vitality * 0.10)
  );

  // Insights (very simple rule-based)
  const strengths = Object.entries(breakdown)
    .filter(([, v]) => v >= 70)
    .map(([k]) => `${k} が強みです`);
  const improvements = Object.entries(breakdown)
    .filter(([, v]) => v < 50)
    .map(([k]) => `${k} を伸ばす余地があります（定量成果・役割の明記を追加）`);
  const recommendations: string[] = [];
  if (breakdown.Leadership < 55) recommendations.push('プロジェクトの主導経験や役割・体制（人数、期間）を追記しましょう');
  if (breakdown.Logic < 65) recommendations.push('KPI/データ活用（改善率や母数）を数値で記載すると説得力が増します');
  if (breakdown.Communication < 60) recommendations.push('プレゼンや交渉・顧客折衝の具体例を1-2件、成果とともに追記');

  return {
    overall,
    breakdown,
    insights: { strengths, improvements, recommendations },
    lastUpdated: new Date().toISOString(),
  } as const;
}

async function fetchResumeTextFromMultipleSources(supabase: any, userId: string): Promise<string> {
  const chunks: string[] = [];

  // 1) resumes
  try {
    const { data: r1 } = await supabase
      .from('resumes')
      .select('content, summary, achievements, projects, skills')
      .eq('user_id', userId)
      .maybeSingle();
    if (r1) {
      chunks.push(r1.content || '', r1.summary || '');
      if (Array.isArray(r1.achievements)) chunks.push(r1.achievements.filter(Boolean).join(' '));
      if (Array.isArray(r1.projects)) chunks.push(r1.projects.filter(Boolean).join(' '));
      if (Array.isArray(r1.skills)) chunks.push(r1.skills.filter(Boolean).join(' '));
    }
  } catch {}

  // 2) student_profiles (arrays may be objects)
  try {
    const { data: sp } = await supabase
      .from('student_profiles')
      .select('bio, about, summary, experiences, achievements, certifications, activities, tools, results')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();
    const flatten = (v: any): string => {
      if (!v) return '';
      if (Array.isArray(v)) {
        return v.map((x) => {
          if (x && typeof x === 'object') {
            return Object.values(x).join(' ');
          }
          return String(x);
        }).join(' ');
      }
      if (typeof v === 'object') return Object.values(v).join(' ');
      return String(v);
    };
    if (sp) {
      chunks.push(sp.bio || '', sp.about || '', sp.summary || '');
      chunks.push(flatten(sp.experiences));
      chunks.push(flatten(sp.achievements));
      chunks.push(flatten(sp.certifications));
      chunks.push(flatten(sp.activities));
      chunks.push(flatten(sp.tools));
      chunks.push(flatten(sp.results));
    }
  } catch {}

  // 3) student_experiences (separate table, one row per経験)
  try {
    const { data: se } = await supabase
      .from('student_experiences')
      .select('company, role, department, description, responsibilities, achievements, tools, results, notes')
      .eq('user_id', userId);
    if (Array.isArray(se)) {
      for (const row of se) {
        chunks.push(
          row.company || '',
          row.role || '',
          row.department || '',
          row.description || '',
          Array.isArray(row.responsibilities) ? row.responsibilities.join(' ') : (row.responsibilities || ''),
          Array.isArray(row.achievements) ? row.achievements.join(' ') : (row.achievements || ''),
          Array.isArray(row.tools) ? row.tools.join(' ') : (row.tools || ''),
          Array.isArray(row.results) ? row.results.join(' ') : (row.results || ''),
          row.notes || ''
        );
      }
    }
  } catch {}

  // 4) ipo_experiences (既存IPOテーブル)
  try {
    const { data: ie } = await supabase
      .from('ipo_experiences')
      .select('title, description, skills, impact, learning, months, category, started_on, ended_on');
    if (Array.isArray(ie)) {
      for (const row of ie) {
        chunks.push(
          row.title || '',
          row.description || '',
          Array.isArray(row.skills) ? row.skills.join(' ') : (row.skills || ''),
          row.impact || '',
          row.learning || '',
          row.category || ''
        );
      }
    }
  } catch {}

  // 5) ipo_future_vision（将来像）
  try {
    const { data: fv } = await supabase
      .from('ipo_future_vision')
      .select('short_goal, long_goal, target_industry, target_role, action_plan')
      .eq('user_id', userId)
      .maybeSingle();
    if (fv) {
      const ap = fv.action_plan && typeof fv.action_plan === 'object'
        ? Object.values(fv.action_plan).join(' ')
        : (Array.isArray(fv.action_plan) ? fv.action_plan.join(' ') : '');
      chunks.push(
        fv.short_goal || '',
        fv.long_goal || '',
        fv.target_industry || '',
        fv.target_role || '',
        ap
      );
    }
  } catch {}

  // 6) ipo_traits（強み・特性）
  try {
    const { data: tr } = await supabase
      .from('ipo_traits')
      .select('kind, title, note')
      .eq('user_id', userId);
    if (Array.isArray(tr)) {
      for (const row of tr) {
        chunks.push(row.kind || '', row.title || '', row.note || '');
      }
    }
  } catch {}

  return chunks.filter(Boolean).join(' \n\n');
}


export function DashboardPage({ navigate }: DashboardPageProps) {
  const [careerScore, setCareerScore] = useState<CareerScore | null>(null);
  const [scoreHistory, setScoreHistory] = useState<Array<{ date: string; overall: number }>>([]);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [completedOnboardingSteps, setCompletedOnboardingSteps] = useState<number[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [analysisCompletion, setAnalysisCompletion] = useState(0);

  // toast
  const { toast } = useToast();

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
    return Date.now() - last > 6.5 * 24 * 60 * 60 * 1000; // 約6.5日で再実行
  }, []);

  const router = useRouter();
  // Run a callback when the main thread is idle (fallback to setTimeout)
  const runIdle = (cb: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // @ts-ignore
      (window as any).requestIdleCallback(cb);
    } else {
      setTimeout(cb, 0);
    }
  };

  // Prefetch common routes to make client navigation snappier
  useEffect(() => {
    runIdle(() => {
      router.prefetch('/ipo/analysis');
      router.prefetch('/ipo/case');
      router.prefetch('/ipo/calendar');
    });
  }, [router]);

  // 最終診断の取得（スコアの最新時刻）
  useEffect(() => {
    (async () => {
      try {
        const supabase = createSbClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: row } = await supabase
          .from('ipo_career_score')
          .select('scored_at')
          .eq('user_id', user.id)
          .order('scored_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const last = row?.scored_at ?? null;
        setLastDiagnosisAt(last);
        setNextDiagnosisAt(computeNextDiagnosis(last));
      } catch {
        // no-op
      }
    })();
  }, [computeNextDiagnosis]);

  const navigateFn = React.useCallback((route: string) => {
    if (navigate) {
      navigate(route);
    } else {
      router.push(route);
    }
  }, [navigate, router]);

  useEffect(() => {
    // キャリアスコア計算
    // const score = calculateDemoCareerScore();
    // setCareerScore(score);
    // スコア履歴の取得（実際のアプリではユーザーIDを使用）
    // const history = getScoreHistory('demo-user');
    // setScoreHistory(history);
    // スコア履歴の保存
    // saveScoreHistory(score, 'demo-user');

    // 初回利用チェック
    const hasVisited = localStorage.getItem('ipo-has-visited');
    if (!hasVisited) {
      setIsFirstTime(true);
      localStorage.setItem('ipo-has-visited', 'true');
    }

    // オンボーディング進捗の取得
    const savedProgress = localStorage.getItem('ipo-onboarding-progress');
    if (savedProgress) {
      setCompletedOnboardingSteps(JSON.parse(savedProgress));
    }

    // --- Supabaseからデータ取得例 ---
    // 実際のアプリでは下記のようにデータを取得
    // （ダミー用のasync即時関数で囲む）
    (async () => {
      try {
        // 1) supabase client取得
        // @ts-ignore
        const { createClient } = await import('@supabase/supabase-js');
        // 必要に応じてenvなどからURL/KEY取得
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;
        const supabase = createClient(supabaseUrl, supabaseKey);
        // 2) 認証ユーザー取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 3) 直近のキャリアスコアを確認し、無ければ職務経歴書から推定して保存
        let latestScoreRow: any = null;
        try {
          const { data: existing } = await supabase
            .from('ipo_career_score')
            .select('*')
            .eq('user_id', user.id)
            .order('scored_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          latestScoreRow = existing || null;
        } catch {}

        if (!latestScoreRow) {
          const resumeText = await fetchResumeTextFromMultipleSources(supabase, user.id);
          const computed = calculateCareerScoreFromResume(resumeText);
          try {
            const { data: inserted, error: insertErr } = await supabase
              .from('ipo_career_score')
              .insert({
                user_id: user.id,
                overall: computed.overall,
                breakdown: computed.breakdown,
                insights: computed.insights,
                trend: 'flat',
                scored_at: new Date().toISOString()
              })
              .select('*')
              .single();
            if (!insertErr && inserted) {
              latestScoreRow = inserted;
            }
          } catch {}
        }



        // 5) キャリアスコア履歴
        const { data: historyRows, error: historyErr } = await supabase
          .from('ipo_career_score')
          .select('scored_at, overall')
          .eq('user_id', user.id)
          .order('scored_at', { ascending: true });
        if (historyErr) throw historyErr;
        setScoreHistory((historyRows ?? []).map((r: any) => ({
          date: (r.scored_at ?? '').slice(0, 10),
          overall: r.overall ?? 0,
        })));

        // 6) 自己分析完了度（5要素の平均％）
        const { data: progRow, error: progErr } = await supabase
          .from('ipo_analysis_progress')
          .select('ai_chat, life_chart, future_vision, strength_analysis, experience_reflection')
          .eq('user_id', user.id)
          .maybeSingle();
        if (progErr) throw progErr;
        if (progRow) {
          const a = progRow.ai_chat ?? 0;
          const b = progRow.life_chart ?? 0;
          const c = progRow.future_vision ?? 0;
          const d = progRow.strength_analysis ?? 0;
          const e = progRow.experience_reflection ?? 0;
          const avg = Math.round((a + b + c + d + e) / 5);
          setAnalysisCompletion(avg);
        } else {
          setAnalysisCompletion(0);
        }
        // 7) キャリアスコア最新
        if (!latestScoreRow) {
          const { data: scoreRow } = await supabase
            .from('ipo_career_score')
            .select('*')
            .eq('user_id', user.id)
            .order('scored_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          latestScoreRow = scoreRow || null;
        }
        if (latestScoreRow) {
          setCareerScore({
            overall: latestScoreRow.overall ?? 0,
            breakdown: (latestScoreRow.breakdown ?? {}) as CareerScore['breakdown'],
            trend: (latestScoreRow.trend ?? undefined) as CareerScore['trend'],
            insights: (latestScoreRow.insights ?? undefined) as CareerScore['insights'],
            lastUpdated: (latestScoreRow.scored_at ?? new Date().toISOString()),
          });
        }
      } catch (e) {
        // fallback: 0%
        setAnalysisCompletion(0);
      }
    })();
  }, []);
  
  const handleOnboardingStepComplete = (stepId: number) => {
    const updated = [...completedOnboardingSteps, stepId];
    setCompletedOnboardingSteps(updated);
    localStorage.setItem('ipo-onboarding-progress', JSON.stringify(updated));
  };

  // キャリアスコアデータ（計算されたものを使用、フォールバック付き）
  const careerScoreData = careerScore?.breakdown ?? {
    Communication: 0,
    Logic: 0,
    Leadership: 0,
    Fit: 0,
    Vitality: 0,
  };
  
  // 前回からの変化を計算
  const getScoreChange = () => {
    if (!careerScore || scoreHistory.length < 2) return null;
    const current = careerScore.overall;
    const previous = scoreHistory[scoreHistory.length - 2]?.overall || current;
    return current - previous;
  };
  
  const scoreChange = getScoreChange();
  const getTrendIcon = () => {
    if (!careerScore) return <Minus className="w-4 h-4 text-gray-500" />;
    switch (careerScore.trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };




  const runWeeklyDiagnosis = useCallback(async () => {
    try {
      setIsDiagnosing(true);
      const supabase = createSbClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // 1) 職務経歴書テキストの集約
      const resumeText = await fetchResumeTextFromMultipleSources(supabase, user.id);

      // 2) 選考状況（IPO 既存テーブルから集計）
      let selection: SelectionStatus = {};
      try {
        // まずは会社テーブルから現在の段階を集計
        const { data: comps } = await supabase
          .from('ipo_selection_companies')
          .select('current_stage, status')
          .eq('user_id', user.id);
        let maxOrder = 0;
        let active = 0;
        if (Array.isArray(comps) && comps.length > 0) {
          maxOrder = comps.reduce((m: number, r: any) => Math.max(m, r?.current_stage ?? 0), 0);
          active = comps.length; // ステータス種別が多数あるため、ここでは総数を「進行中の応募数」とみなす
        } else {
          // 会社データがない場合はステージテーブルから名前で推定
          const { data: stages } = await supabase
            .from('ipo_selection_stages')
            .select('name')
            .eq('user_id', user.id);
          const orderMap: Record<string, number> = {
            '未応募': 0, '応募': 1, '書類': 2, '一次': 3, '二次': 4, '最終': 5, '内定': 6,
            '書類選考': 2, '一次面接': 3, '二次面接': 4, '最終面接': 5, '内定承諾': 6
          };
          if (Array.isArray(stages) && stages.length > 0) {
            maxOrder = stages.reduce((m: number, r: any) => Math.max(m, orderMap[String(r?.name ?? '')] ?? 0), 0);
            active = stages.length;
          }
        }
        const stageLabels = ['未応募','応募','書類','一次','二次','最終','内定'];
        selection = {
          stage_order: maxOrder,
          stage: stageLabels[Math.min(maxOrder, stageLabels.length - 1)],
          active_applications: active
        };
      } catch {}

      // 3) 解像度・年齢/学年（IPO 既存テーブルから推定）
      let clarity: ClarityInfo = {};
      let ageOrGrade: AgeOrGrade = {};
      try {
        // 自己分析の5指標の平均を clarity_score として利用
        const { data: prog } = await supabase
          .from('ipo_analysis_progress')
          .select('ai_chat, life_chart, future_vision, strength_analysis, experience_reflection')
          .eq('user_id', user.id)
          .maybeSingle();
        if (prog) {
          const avg = Math.round(
            ((prog.ai_chat ?? 0) +
             (prog.life_chart ?? 0) +
             (prog.future_vision ?? 0) +
             (prog.strength_analysis ?? 0) +
             (prog.experience_reflection ?? 0)) / 5
          );
          clarity.clarity_score = avg;
        }
        // 志望業界・職種は future_vision から拝借
        const { data: fv2 } = await supabase
          .from('ipo_future_vision')
          .select('target_industry, target_role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (fv2) {
          clarity.desired_industries = fv2.target_industry ? [fv2.target_industry] : null;
          clarity.desired_roles = fv2.target_role ? [fv2.target_role] : null;
        }
        // 年齢・学年は既存IPOテーブルに無いため null
        ageOrGrade = { age: null, grade: null };
      } catch {}

      // 4) サーバーAPIでAI診断（ご指定パス /api/ai/diagnose）
      const payload = { resumeText, selection, clarity, ageOrGrade };
      let result: any = null;
      try {
        const res = await fetch('/api/ai/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`API /api/ai/diagnose ${res.status} ${res.statusText} ${txt}`);
        }
        result = await res.json();
      } catch (apiErr) {
        throw apiErr;
      }

      // 5) フォールバック（ローカルヒューリスティック）
      if (!result) {
        const computed = calculateCareerScoreFromResume(resumeText);
        const modifier =
          (clarity.clarity_score ?? 50) * 0.05 +
          (selection.stage_order ?? 0) * 1.5;
        const overall = clamp(Math.round(computed.overall + modifier), 0, 100);
        result = {
          overall,
          breakdown: computed.breakdown,
          insights: {
            strengths: computed.insights.strengths,
            improvements: computed.insights.improvements,
            recommendations: [
              ...(computed.insights.recommendations ?? []),
              (selection.stage_order ?? 0) < 3
                ? 'まずは3社にエントリーし、1週間以内に書類提出まで進めましょう'
                : '筆記/ケース対策を週2回ペースで継続しましょう',
              (clarity.clarity_score ?? 0) < 60
                ? '志望業界・職種を2〜3に絞り、違いを1枚に比較表で整理しましょう'
                : '志望理由に実体験と数値を加え、説得力を高めましょう',
            ],
          },
        };
      }

      // 6) 保存
      const { data: inserted, error: insertErr } = await supabase
        .from('ipo_career_score')
        .insert({
          user_id: user.id,
          overall: result.overall ?? 0,
          breakdown: result.breakdown ?? null,
          insights: result.insights ?? null,
          trend: 'flat',
          scored_at: new Date().toISOString()
        })
        .select('*')
        .single();
      if (insertErr) throw insertErr;

      // 7) UI更新
      setCareerScore({
        overall: inserted.overall ?? 0,
        breakdown: (inserted.breakdown ?? {}) as CareerScore['breakdown'],
        trend: (inserted.trend ?? undefined) as CareerScore['trend'],
        insights: (inserted.insights ?? undefined) as CareerScore['insights'],
        lastUpdated: inserted.scored_at ?? new Date().toISOString(),
      });
      setLastDiagnosisAt(inserted.scored_at ?? null);
      setNextDiagnosisAt(computeNextDiagnosis(inserted.scored_at ?? undefined));

      // トースト（成功）
      toast({
        title: '週次AI診断を保存しました',
        description: `総合スコア ${inserted.overall ?? 0} 点（${(inserted.scored_at ?? '').slice(0,10)} 更新）`,
      });

      // 履歴更新
      try {
        const { data: historyRows } = await supabase
          .from('ipo_career_score')
          .select('scored_at, overall')
          .eq('user_id', user.id)
          .order('scored_at', { ascending: true });
        setScoreHistory((historyRows ?? []).map((r: any) => ({
          date: (r.scored_at ?? '').slice(0, 10),
          overall: r.overall ?? 0,
        })));
      } catch {}
    } catch (e) {
      const message = e instanceof Error ? e.message : (typeof e === 'string' ? e : JSON.stringify(e));
      console.error('runWeeklyDiagnosis failed:', message, e);
      toast({
        title: '週次AI診断に失敗しました',
        description: message || 'ネットワークまたはAPIエラーが発生しました。時間をおいて再度お試しください。',
        variant: 'destructive',
      });
    } finally {
      setIsDiagnosing(false);
    }
  }, [computeNextDiagnosis, toast]);
  return (
    <div className="bg-background overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">ダッシュボード</h1>
              <p className="text-sm sm:text-base text-muted-foreground">あなたのキャリア開発の進捗を確認しましょう</p>
            </div>
            <div className="flex items-center space-x-0 sm:space-x-3 gap-2 flex-wrap w-full sm:w-auto">
              {completedOnboardingSteps.length < 6 && (
                <Button
                  variant="outline"
                  onClick={() => startTransition(() => setShowOnboardingGuide(true))}
                  className="flex items-center justify-center space-x-2 border-orange-200 text-orange-700 hover:bg-orange-50 w-full sm:w-auto"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>進め方ガイド</span>
                  {completedOnboardingSteps.length > 0 && (
                    <Badge className="bg-orange-100 text-orange-700 ml-1">
                      {completedOnboardingSteps.length}/6
                    </Badge>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* First Time User Welcome */}
        {isFirstTime && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      🎉 IPO Universityへようこそ！
                    </h3>
                    <p className="text-gray-700 mb-4">
                      就活成功への6ステップガイドで、効率的にキャリア開発を進めましょう。
                      自己分析から選考対策まで、あなたの就活を徹底サポートします。
                    </p>
                    <div className="flex items-center space-x-3">
                      <Button 
                        onClick={() => {
                          startTransition(() => {
                            setShowOnboardingGuide(true);
                            setIsFirstTime(false);
                          });
                        }}
                        className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      >
                        <Rocket className="w-4 h-4" />
                        <span>ガイドを開始する</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => startTransition(() => setIsFirstTime(false))}
                        className="text-gray-600"
                      >
                        後で確認する
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Header Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">キャリアスコア</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {careerScore?.overall ?? 0}
                    </p>
                    {getTrendIcon()}
                    {scoreChange && (
                      <span className={`text-sm ${scoreChange > 0 ? 'text-green-600' : scoreChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {scoreChange > 0 ? '+' : ''}{scoreChange}
                      </span>
                    )}
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500 shrink-0" />
              </div>
              <ProgressBar progress={careerScore?.overall ?? 0} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">自己分析完了度</p>
                  <p className="text-2xl font-bold text-gray-900">{analysisCompletion}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-sky-500 shrink-0" />
              </div>
              <ProgressBar progress={analysisCompletion} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">週次AI診断</p>
                  <div className="text-sm text-gray-700 flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    <span>{lastDiagnosisAt ? `最終: ${(lastDiagnosisAt ?? '').slice(0,10)}` : '未実行'}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    次回目安: {nextDiagnosisAt ? nextDiagnosisAt.slice(0,10) : '—'}
                  </div>
                </div>
                <Button
                  onClick={runWeeklyDiagnosis}
                  disabled={isDiagnosing || !shouldRunWeekly(lastDiagnosisAt)}
                  className="flex items-center gap-2"
                  variant={shouldRunWeekly(lastDiagnosisAt) ? 'default' : 'outline'}
                >
                  <RefreshCw className={`w-4 h-4 ${isDiagnosing ? 'animate-spin' : ''}`} />
                  {isDiagnosing ? '診断中...' : (shouldRunWeekly(lastDiagnosisAt) ? '今すぐ診断' : '実行済み')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Career Score Radar */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">キャリアスコア詳細</h2>
                    <p className="text-gray-600">5つの軸であなたの強みを可視化</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScoreInfo(true)}
                      className="flex items-center space-x-1"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>詳細を見る</span>
                    </Button>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{careerScore?.overall ?? 0}</div>
                      <div className="text-sm text-gray-500">総合スコア</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
                  <div className="min-w-[320px] sm:min-w-0">
                    <CareerRadarChart data={careerScoreData} />
                  </div>
                </div>
                <div className="mt-4 sm:mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 text-sm">
                  {Object.entries(careerScoreData).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="font-bold text-lg text-gray-900">
                        {value ? Math.round(value) : '-'}
                      </div>
                      <div className="text-gray-600">{key}</div>
                    </div>
                  ))}
                </div>
                
                {/* AI インサイト */}
                {careerScore?.insights && (
                  <div className="mt-6 space-y-4">
                    {careerScore.insights.strengths?.length > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg break-words">
                        <h4 className="font-medium text-green-800 mb-2">💪 あなたの強み</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          {careerScore.insights.strengths?.map((strength, index) => (
                            <li key={index}>• {strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {careerScore.insights.improvements?.length > 0 && (
                      <div className="p-4 bg-orange-50 rounded-lg break-words">
                        <h4 className="font-medium text-orange-800 mb-2">🎯 改善ポイント</h4>
                        <ul className="text-sm text-orange-700 space-y-1">
                          {careerScore.insights.improvements?.map((improvement, index) => (
                            <li key={index}>• {improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {careerScore.insights.recommendations?.length > 0 && (
                      <div className="p-4 bg-blue-50 rounded-lg break-words">
                        <h4 className="font-medium text-blue-800 mb-2">💡 おすすめアクション</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          {careerScore.insights.recommendations?.map((recommendation, index) => (
                            <li key={index}>• {recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Advisory: AIコーチ相談リンク */}
                    <div className="mt-4 text-sm text-gray-600">
                      次の一手に迷ったら、<button
                        className="underline underline-offset-2"
                        onClick={() => navigateFn('/ipo/analysis')}
                      >AIコーチに相談</button>してプランを具体化しましょう。
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar */}
          <div className="space-y-8">

            {/* Quick Actions */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900">クイックアクション</h2>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
                <Button 
                  variant="outline" 
                  className="w-full justify-start py-5 sm:py-6"
                  onClick={() => navigateFn('/ipo/analysis')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  AI自己分析を続ける
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start py-5 sm:py-6"
                  onClick={() => navigateFn('/ipo/case')}
                >
                  <Target className="w-4 h-4 mr-2" />
                  ケース問題を解く
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start py-5 sm:py-6"
                  onClick={() => navigateFn('/ipo/calendar')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  今週の予定を確認
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>


      {/* Career Score Info Dialog */}
      <CareerScoreInfo
        isOpen={showScoreInfo}
        onClose={() => setShowScoreInfo(false)}
      />

      {/* Onboarding Guide */}
      <OnboardingGuide
        isOpen={showOnboardingGuide}
        onClose={() => setShowOnboardingGuide(false)}
        navigate={navigateFn}
        currentStep={completedOnboardingSteps.length + 1}
        onStepComplete={handleOnboardingStepComplete}
      />
    </div>
  );
}
export default DashboardPage;