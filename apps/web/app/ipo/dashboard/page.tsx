/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Users, User, Target, Calendar, Star, Plus, ArrowUp, ArrowDown, Minus, HelpCircle, BookOpen, Rocket, Gift, CheckCircle, ArrowRight } from 'lucide-react';
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
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';


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

// 日本語ラベルマップ（表示用）
const JA_LABELS: Record<string, string> = {
  Communication: 'コミュニケーション',
  Logic: '論理性',
  Leadership: 'リーダーシップ',
  Fit: '適合度',
  Vitality: '活力',
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
    .map(([k]) => `${JA_LABELS[k as keyof typeof JA_LABELS] ?? k} を伸ばす余地があります（定量成果・役割の明記を追加）`);
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

// ===== Helpers for Profile Completion (70:30 weighted) =====
const isFilled = (v: any) => {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.values(v).filter(Boolean).length > 0;
  return String(v).trim().length > 0;
};

async function computeWeightedProfileCompletion(
  supabase: any,
  userId: string
): Promise<{ completion: number; profilePct: number; workPct: number }> {
  // --- 1) student_profiles: 基本 / PR / 志向 ---
  let basicFilled = 0, basicTotal = 10;
  let prFilled = 0, prTotal = 3;
  let prefFilled = 0, prefTotal = 4;

  try {
    const { data: sp } = await supabase
      .from('student_profiles')
      .select('last_name, first_name, last_name_kana, first_name_kana, birth_date, gender, postal_code, prefecture, city, address_line, pr_title, pr_text, about, desired_positions, work_style_options, preferred_industries, desired_locations')
      .eq('user_id', userId)
      .maybeSingle();

    if (sp) {
      const basicKeys = ['last_name','first_name','last_name_kana','first_name_kana','birth_date','gender','postal_code','prefecture','city','address_line'] as const;
      const prKeys = ['pr_title','pr_text','about'] as const;
      const prefKeys = ['desired_positions','work_style_options','preferred_industries','desired_locations'] as const;

      basicFilled = basicKeys.reduce((n, k) => n + (isFilled((sp as any)[k]) ? 1 : 0), 0);
      prFilled    = prKeys.reduce((n, k) => n + (isFilled((sp as any)[k]) ? 1 : 0), 0);
      prefFilled  = prefKeys.reduce((n, k) => n + (isFilled((sp as any)[k]) ? 1 : 0), 0);
    }
  } catch {}

  const pctBasic = Math.round((basicFilled / basicTotal) * 100) || 0;
  const pctPr    = Math.round((prFilled / prTotal) * 100) || 0;
  const pctPref  = Math.round((prefFilled / prefTotal) * 100) || 0;
  const profilePct = Math.round((pctBasic + pctPr + pctPref) / 3);

  // --- 2) 職歴: resumes.work_experiences 優先 / 無ければ student_experiences ---
  let workPct = 0;
  try {
    const { data: r2 } = await supabase
      .from('resumes')
      .select('work_experiences')
      .eq('user_id', userId)
      .maybeSingle();

    let works: any[] = Array.isArray(r2?.work_experiences) ? r2!.work_experiences : [];

    if (!works || works.length === 0) {
      const { data: se } = await supabase
        .from('student_experiences')
        .select('company, role, description, achievements, results, start_date, end_date, is_current')
        .eq('user_id', userId);
      if (Array.isArray(se)) {
        works = se.map((w: any) => ({
          company: w.company,
          position: w.role,
          description: w.description,
          achievements: w.achievements ?? w.results,
          startDate: w.start_date,
          endDate: w.end_date,
          isCurrent: w.is_current,
        }));
      }
    }

    if (Array.isArray(works) && works.length > 0) {
      const keys = ['company','position','startDate','description','achievements'] as const;
      let f = 0;
      let t = works.length * 6; // 5フィールド + (isCurrent or endDate)
      for (const w of works) {
        for (const k of keys) f += isFilled(w?.[k]) ? 1 : 0;
        f += (isFilled(w?.isCurrent) || isFilled(w?.endDate)) ? 1 : 0;
      }
      workPct = Math.round((f / t) * 100);
    } else {
      workPct = 0;
    }
  } catch {
    workPct = 0;
  }

  // --- 3) 重み付け合成 ---
  const completion = Math.round(profilePct * 0.7 + workPct * 0.3);
  return { completion, profilePct, workPct };
}


export function DashboardPage({ navigate }: DashboardPageProps) {
  const [careerScore, setCareerScore] = useState<CareerScore | null>(null);
  const [scoreHistory, setScoreHistory] = useState<Array<{ date: string; overall: number }>>([]);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [completedOnboardingSteps, setCompletedOnboardingSteps] = useState<number[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [analysisCompletion, setAnalysisCompletion] = useState(0);

  const [profileName, setProfileName] = useState<string>('');
  const [university, setUniversity] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [profileCompletion, setProfileCompletion] = useState<number>(0);
  const [overallProfileCompletion, setOverallProfileCompletion] = useState<number>(0);
  const [profilePctDetail, setProfilePctDetail] = useState<number>(0);
  const [workPctDetail, setWorkPctDetail] = useState<number>(0);
  const [missingFields, setMissingFields] = useState<number>(0);

  // AI対話UI
  const [aiMessage, setAiMessage] = useState<string>('');
  const [aiIsSending, setAiIsSending] = useState<boolean>(false);
  const [nextActions, setNextActions] = useState<string[]>([]);

  // シンプルなチャット履歴
  type ChatTurn = { role: 'user' | 'assistant'; content: string };
  const [aiHistory, setAiHistory] = useState<ChatTurn[]>([]);
  const pushTurn = (role: 'user' | 'assistant', content: string) =>
    setAiHistory((prev) => [...prev, { role, content }]);

  // toast
  const { toast } = useToast();

  // === Weekly AI Diagnosis (週次AI診断) ===
  const [lastDiagnosisAt, setLastDiagnosisAt] = useState<string | null>(null);
  const [nextDiagnosisAt, setNextDiagnosisAt] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  // ===== Jobs rail (締切間近 / おすすめ) =====
  type JobCard = {
    id: string;
    title: string;
    company: string;
    image_url?: string | null;
    deadline?: string | null;
    tag?: '締切間近' | 'おすすめ' | 'NEW';
  };
  const [jobsRail, setJobsRail] = useState<JobCard[]>([]);
  const formatDate = (iso?: string | null) => (iso ? (iso.slice(0,10)) : '');

  // ===== Banner Section (Baseme-like) =====
  const bannerItems = [
    { id: 'ai', title: 'AI自己分析を進めよう', subtitle: '最短5分で診断', href: '/ipo/analysis', badge: 'おすすめ' },
    { id: 'case', title: 'ケース対策で差をつける', subtitle: '頻出テーマを予習', href: '/ipo/case', badge: '人気' },
    { id: 'calendar', title: '選考スケジュールを整える', subtitle: '1週間のTODO整理', href: '/ipo/calendar', badge: 'NEW' },
  ];
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const children = Array.from(el.querySelectorAll('[data-banner]')) as HTMLElement[];
    if (children.length === 0) return;
    const idx = Math.max(0, Math.min(bannerIndex, children.length - 1));
    const child = children[idx];
    el.scrollTo({ left: child.offsetLeft - 16, behavior: 'smooth' });
  }, [bannerIndex]);
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((i) => (i + 1) % bannerItems.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ===== Trending News (横スクロール・バナー) =====
  type NewsItem = {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    source?: string | null;
    publishedAt?: string | null;
    url?: string | null;
  };
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsIndex, setNewsIndex] = useState(0);
  const newsRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = newsRef.current;
    if (!el) return;
    const children = Array.from(el.querySelectorAll('[data-news]')) as HTMLElement[];
    if (children.length === 0) return;
    const idx = Math.max(0, Math.min(newsIndex, children.length - 1));
    const child = children[idx];
    el.scrollTo({ left: child.offsetLeft - 16, behavior: 'smooth' });
  }, [newsIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNewsIndex((i) => {
        const n = newsItems.length || 1;
        return (i + 1) % n;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [newsItems.length]);

  useEffect(() => {
    (async () => {
      try {
        const fallbackImg = '/logo3.png';
        const res = await fetch('/api/articles');
        let arr: any[] = [];
        if (res.ok) {
          const data = await res.json().catch(() => ({} as any));
          arr = Array.isArray(data) ? data : (data?.articles ?? []);
        }
        // Fallback: try /api/media/trending
        if (!Array.isArray(arr) || arr.length === 0) {
          try {
            const r2 = await fetch('/api/media/trending');
            if (r2.ok) {
              const d2 = await r2.json().catch(() => ({} as any));
              arr = Array.isArray(d2) ? d2 : (d2?.articles ?? []);
            }
          } catch {}
        }
        const mapped: NewsItem[] = (arr || []).slice(0, 12).map((a: any, i: number) => {
          const rawImg = a.imageUrl ?? a.image_url ?? a.image ?? a.img ?? a.thumbnail ?? a.cover_image_url ?? '';
          const imageUrl = typeof rawImg === 'string' && rawImg.trim() !== '' ? rawImg : fallbackImg;
          return {
            id: String(a.id ?? a.guid ?? a.url ?? i),
            title: a.title ?? 'No title',
            description: a.description ?? a.excerpt ?? null,
            imageUrl,
            source: a.source ?? a.provider ?? a.site ?? 'News',
            publishedAt: a.publishedAt ?? a.published_at ?? a.date ?? null,
            url: a.url ?? a.link ?? null,
          };
        });
        if (mapped.length > 0) setNewsItems(mapped);
      } catch {
        // no-op
      }
    })();
  }, []);

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

        // 8) プロフィール取得（氏名・大学・アバター）
        try {
          const { data: prof } = await supabase
            .from('student_profiles')
            .select('full_name, university, avatar_url')
            .eq('user_id', user.id)
            .maybeSingle();
          if (prof) {
            setProfileName(prof.full_name || '');
            setUniversity(prof.university || '');
            setAvatarUrl(prof.avatar_url || '');
            // プロフィール完成度（3項目：氏名・大学・アバター）
            const totalFields = 3;
            const filled = [prof.full_name, prof.university, prof.avatar_url].filter((v) => !!(v && String(v).trim())).length;
            setProfileCompletion(Math.round((filled / totalFields) * 100));
            setMissingFields(Math.max(0, totalFields - filled));
          }
          // 8.5) プロフィール完成度（70:30）の再計算
          try {
            const { data: { user: userForComp } } = await supabase.auth.getUser();
            if (userForComp) {
              const comp = await computeWeightedProfileCompletion(supabase, userForComp.id);
              setOverallProfileCompletion(comp.completion);
              setProfilePctDetail(comp.profilePct);
              setWorkPctDetail(comp.workPct);
            }
          } catch {}
        } catch {}

        // 9) ネクストでやるべきこと（簡易生成）
        const recs: string[] = [];
        if (latestScoreRow?.overall != null) {
          if (latestScoreRow.overall < 60) recs.push('プロフィールを更新して実績を数値で追記');
          if ((analysisCompletion ?? 0) < 60) recs.push('自己分析の未完了セクションを進める');
        }
        const insightRecs = (latestScoreRow?.insights?.recommendations ?? []) as string[];
        setNextActions([...(recs || []), ...((insightRecs || []).slice(0,3))]);
        // 10) 締切間近 / おすすめの求人（ホームの取得方法に合わせて実装）
        try {
          const soonLimitDays = 10;
          const nowISO = new Date().toISOString();
          const soonISO = new Date(Date.now() + soonLimitDays * 24 * 60 * 60 * 1000).toISOString();
          const isLoggedIn = !!user;
          let combined: JobCard[] = [];

          // a) 締切間近（application_deadline が今日以降・10日以内）を締切昇順
          try {
            const { data: soon, error: soonErr } = await supabase
              .from('jobs')
              .select(`
                id, title, created_at, application_deadline,
                is_recommended, member_only,
                cover_image_url, thumbnail_url, image_url,
                company_name,
                companies ( name, logo )
              `)
              .eq('published', true)
              .not('application_deadline', 'is', null)
              .gte('application_deadline', nowISO)
              .lte('application_deadline', soonISO)
              .order('application_deadline', { ascending: true })
              .limit(12);

            if (!soonErr && Array.isArray(soon)) {
              combined.push(
                ...soon.map((r: any): JobCard => {
                  const shouldMask = !!r.member_only && !isLoggedIn;
                  const company =
                    shouldMask
                      ? '（ログイン後に表示）'
                      : (r?.companies?.name ?? r?.company_name ?? '企業名');
                  const img =
                    shouldMask
                      ? null
                      : (r?.cover_image_url ?? r?.thumbnail_url ?? r?.image_url ?? null);
                  return {
                    id: String(r.id),
                    title: (r.title as string) || '募集職種',
                    company,
                    image_url: img,
                    deadline: (r.application_deadline as string) || null,
                    tag: '締切間近',
                  };
                })
              );
            }
          } catch {}

          // b) おすすめ（is_recommended または recommended_score>=70 を降順で）
          try {
            const { data: recs } = await supabase
              .from('jobs')
              .select(`
                id, title, created_at, application_deadline,
                is_recommended, recommended_score, member_only,
                cover_image_url, thumbnail_url, image_url,
                company_name,
                companies ( name, logo )
              `)
              .eq('published', true)
              .or('is_recommended.eq.true,recommended_score.gte.70')
              .order('is_recommended', { ascending: false })
              .order('recommended_score', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(12);

            if (Array.isArray(recs)) {
              combined.push(
                ...recs.map((r: any): JobCard => {
                  const shouldMask = !!r.member_only && !isLoggedIn;
                  const company =
                    shouldMask
                      ? '（ログイン後に表示）'
                      : (r?.companies?.name ?? r?.company_name ?? '企業名');
                  const img =
                    shouldMask
                      ? null
                      : (r?.cover_image_url ?? r?.thumbnail_url ?? r?.image_url ?? null);
                  return {
                    id: String(r.id),
                    title: (r.title as string) || '募集職種',
                    company,
                    image_url: img,
                    deadline: (r.application_deadline as string) || null,
                    tag: 'おすすめ',
                  };
                })
              );
            }
          } catch {}

          // c) NEW（作成7日以内）
          try {
            const weekAgoISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: news } = await supabase
              .from('jobs')
              .select(`
                id, title, created_at, application_deadline,
                member_only,
                cover_image_url, thumbnail_url, image_url,
                company_name,
                companies ( name, logo )
              `)
              .eq('published', true)
              .gte('created_at', weekAgoISO)
              .order('created_at', { ascending: false })
              .limit(12);

            if (Array.isArray(news)) {
              combined.push(
                ...news.map((r: any): JobCard => {
                  const shouldMask = !!r.member_only && !isLoggedIn;
                  const company =
                    shouldMask
                      ? '（ログイン後に表示）'
                      : (r?.companies?.name ?? r?.company_name ?? '企業名');
                  const img =
                    shouldMask
                      ? null
                      : (r?.cover_image_url ?? r?.thumbnail_url ?? r?.image_url ?? null);
                  return {
                    id: String(r.id),
                    title: (r.title as string) || '募集職種',
                    company,
                    image_url: img,
                    deadline: (r.application_deadline as string) || null,
                    tag: 'NEW',
                  };
                })
              );
            }
          } catch {}

          // d) フォールバック（ダミー）
          if (combined.length === 0) {
            combined = [
              { id: 'demo1', title: 'JINS 1day Summer Internship', company: '株式会社ジンズ', image_url: '/demo/jins.jpg', deadline: soonISO.slice(0,10), tag: '締切間近' },
              { id: 'demo2', title: 'データアナリスト', company: 'PayPay株式会社', image_url: '/demo/paypay.jpg', deadline: soonISO.slice(0,10), tag: 'おすすめ' },
              { id: 'demo3', title: '新卒向け業務職', company: '東京ガス株式会社', image_url: '/demo/tokyogas.jpg', deadline: soonISO.slice(0,10), tag: 'NEW' },
            ];
          }

          // ユニーク化（締切間近 → おすすめ → NEW の優先度で並ぶよう先着順）
          const seen = new Set<string>();
          const uniqOrdered: JobCard[] = [];
          for (const j of combined) {
            if (!seen.has(j.id)) {
              seen.add(j.id);
              uniqOrdered.push(j);
            }
          }
          setJobsRail(uniqOrdered.slice(0, 12));
        } catch {
          // ignore
        }
      } catch (e) {
        // fallback: 0%
        setAnalysisCompletion(0);
      }
    })();
  }, []);

  // --- Keep profile (name/university/avatar) & completion reactive ---
  useEffect(() => {
    const supabase = createSbClient();
    let channel: any | null = null;
    let isMounted = true;

    const recalc = (prof: { full_name?: string | null; university?: string | null; avatar_url?: string | null } | null) => {
      const total = 3;
      const filled = [prof?.full_name, prof?.university, prof?.avatar_url]
        .filter((v) => !!(v && String(v).trim())).length;
      if (!isMounted) return;
      setProfileCompletion(Math.round((filled / total) * 100));
      setMissingFields(Math.max(0, total - filled));
      // --- recompute weighted completion reactively ---
      (async () => {
        try {
          const { data: { user: userForComp } } = await supabase.auth.getUser();
          if (userForComp) {
            const comp = await computeWeightedProfileCompletion(supabase, userForComp.id);
            setOverallProfileCompletion(comp.completion);
            setProfilePctDetail(comp.profilePct);
            setWorkPctDetail(comp.workPct);
          }
        } catch {}
      })();
    };

    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: prof } = await supabase
          .from('student_profiles')
          .select('full_name, university, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!isMounted) return;
        if (prof) {
          setProfileName(prof.full_name || '');
          setUniversity(prof.university || '');
          setAvatarUrl(prof.avatar_url || '');
          recalc(prof);
        }
      } catch {}
    };

    // initial fetch on mount & on tab focus
    fetchProfile();
    const onFocus = () => fetchProfile();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') fetchProfile();
      });
    }

    // subscribe realtime updates for this user's row
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        channel = supabase
          .channel('student_profiles:me')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'student_profiles',
            filter: `user_id=eq.${user.id}`,
          }, () => {
            fetchProfile();
          })
          .subscribe();
      } catch {}
    })();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, []);

  // AIチャット送信ハンドラ（useEffectの外に配置）
  const handleSendAi = async () => {
    const msg = aiMessage.trim();
    if (!msg) return;
    setAiIsSending(true);
    try {
      // 送信を履歴に反映
      pushTurn('user', msg);
      setAiMessage('');

      // 実API呼び出し（/api/ai/chat）
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, source: 'dashboard' }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
      }

      // 期待レスポンス: { reply: string }
      const data = await res.json().catch(() => ({}));
      const reply: string = (data && (data.reply || data.answer || data.content)) ?? '（応答を取得できませんでした）';
      pushTurn('assistant', reply);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ title: 'AI送信エラー', description: message, variant: 'destructive' });
    } finally {
      setAiIsSending(false);
    }
  };

  // AI入力のチップ候補（コンポーネントスコープ）
  const promptChips = ['履歴書を要約して', '今週の優先タスク教えて', '志望動機の添削', 'ケース面接の練習'];
  
  const handleOnboardingStepComplete = (stepId: number) => {
    const updated = [...completedOnboardingSteps, stepId];
    setCompletedOnboardingSteps(updated);
    localStorage.setItem('ipo-onboarding-progress', JSON.stringify(updated));
  };

  // レーダーチャートの表示順（12時から時計回り）
  const AXIS_ORDER: Array<keyof typeof JA_LABELS> = [
    'Communication',
    'Logic',
    'Leadership',
    'Fit',
    'Vitality',
  ];

  // キャリアスコアデータ（計算されたものを使用、フォールバック付き）
  // 元データ（英語キー保持）
  const careerScoreData = careerScore?.breakdown ?? {
    Communication: 0,
    Logic: 0,
    Leadership: 0,
    Fit: 0,
    Vitality: 0,
  };

  // チャート表示用：キーを日本語に変換し、指定順に整列
  const careerScoreDataJa = Object.fromEntries(
    AXIS_ORDER.map((k) => [JA_LABELS[k], Number(careerScoreData[k] ?? 0)])
  );
  
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
    <div className="bg-white overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header (moved to top) */}
        <div className="mb-2 sm:mb-3">
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
                  className="flex items-center justify-center space-x-2 border border-orange-300 text-orange-700 hover:bg-orange-50 w-full sm:w-auto"
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
        {/* Top Section: Left Profile / Right AI & Next Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {/* Left: Profile Summary */}
          <Card className="lg:col-span-1 rounded-2xl shadow-sm bg-white border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {/* Avatar + Progress */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-slate-400" aria-label="no avatar">
                        <User className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  {/* Gradient progress ring (aligned to avatar) */}
                  <svg
                    className="absolute inset-0 w-20 h-20 -rotate-90 pointer-events-none"
                    viewBox="0 0 36 36"
                    aria-hidden
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      className="stroke-slate-200"
                      strokeWidth="3.5"
                      fill="none"
                      pathLength={100}
                    />
                    <defs>
                      <linearGradient id="avatar-progress-gradient" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#6366f1" />
                        <stop offset="1" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="url(#avatar-progress-gradient)"
                      strokeWidth="3.5"
                      fill="none"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray={`${Math.max(0, Math.min(100, overallProfileCompletion || profileCompletion))} 100`}
                      strokeDashoffset="0"
                    />
                  </svg>
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold text-slate-900 truncate">{profileName || 'ユーザー'}</div>
                  <div className="text-sm text-slate-600 truncate">{university || '大学未設定'}</div>
                  <div className="mt-2 text-sm text-slate-700 font-medium">
                    プロフィール完成度：<span className="font-bold text-slate-900">{overallProfileCompletion || profileCompletion}%</span>
                  </div>
                </div>
              </div>

              

              {/* Buttons */}
              <div className="mt-5 flex gap-3">
                <Button
                  onClick={runWeeklyDiagnosis}
                  disabled={isDiagnosing}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isDiagnosing ? 'animate-spin' : ''}`} />
                  週次AI診断
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigateFn('/settings/profile')}
                  className="flex-1 border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  プロフィールを編集
                </Button>
              </div>
              {/* Compact Metrics inside Profile Card */}
              <div className="mt-5 border-t pt-4">
                <div className="grid grid-cols-1 gap-3">
                  {/* Career Score */}
                  <div className="p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-600">キャリアスコア</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold text-gray-900">{careerScore?.overall ?? 0}</p>
                      {getTrendIcon()}
                      {scoreChange && (
                        <span className={`text-xs ${scoreChange > 0 ? 'text-green-600' : scoreChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {scoreChange > 0 ? '+' : ''}{scoreChange}
                        </span>
                      )}
                    </div>
                    <ProgressBar progress={careerScore?.overall ?? 0} className="mt-2" />
                  </div>

                  {/* Analysis Completion */}
                  <div className="p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-gray-600">自己分析完了度</p>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{analysisCompletion}%</div>
                    <ProgressBar progress={analysisCompletion} className="mt-2" />
                  </div>

                  {/* Weekly AI Diagnosis 
                  <div className="p-3 rounded-xl border border-slate-200">
                    <p className="text-xs font-medium text-gray-600 mb-1.5">週次AI診断</p>
                    <div className="text-xs text-gray-700 flex items-center gap-2">
                      <ClockIcon className="w-4 h-4" />
                      <span>{lastDiagnosisAt ? `最終: ${(lastDiagnosisAt ?? '').slice(0,10)}` : '未実行'}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">次回目安: {nextDiagnosisAt ? nextDiagnosisAt.slice(0,10) : '—'}</div>
                    <div className="mt-2">
                      <Button
                        onClick={runWeeklyDiagnosis}
                        disabled={isDiagnosing || !shouldRunWeekly(lastDiagnosisAt)}
                        className={shouldRunWeekly(lastDiagnosisAt)
                          ? 'h-8 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700'
                          : 'h-8 px-3 border border-indigo-300 text-indigo-700 hover:bg-indigo-50'}
                        variant={shouldRunWeekly(lastDiagnosisAt) ? 'default' : 'outline'}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isDiagnosing ? 'animate-spin' : ''}`} />
                        {isDiagnosing ? '診断中…' : (shouldRunWeekly(lastDiagnosisAt) ? '今すぐ診断' : '実行済み')}
                      </Button>
                    </div>
                  </div>*/}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: AI Chat and Next Actions */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-2xl shadow-[0_6px_24px_rgba(17,24,39,0.06)] bg-white border border-slate-200">
              <CardHeader className="p-6">
                <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">
                  AIに何でも聞いてください
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {promptChips.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="px-3 py-1.5 text-sm rounded-full border border-indigo-200 text-indigo-700 hover:bg-indigo-50 active:scale-[0.99] transition"
                      onClick={() => setAiMessage((v) => (v ? `${v}\n${p}` : p))}
                      aria-label={`チップ: ${p}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6 px-6">
                {/* 履歴表示 */}
                <div className="mb-4 max-h-64 overflow-y-auto space-y-3 pr-1" aria-live="polite">
                  {aiHistory.length === 0 ? (
                    <div className="text-sm text-slate-500">まずは質問を入力してみましょう。例：「今週の優先タスク教えて」</div>
                  ) : (
                    aiHistory.map((t, i) => (
                      <div
                        key={i}
                        className={`rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          t.role === 'user'
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-indigo-50 text-slate-900 border border-indigo-200'
                        }`}
                      >
                        <span className="mr-2 text-xs font-semibold text-slate-500">{t.role === 'user' ? 'あなた' : 'AI'}</span>
                        {t.content}
                      </div>
                    ))
                  )}
                </div>

                {/* 入力行 */}
                <div className="flex gap-2 items-start">
                  <textarea
                    className="flex-1 border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 resize-y min-h-[44px]"
                    placeholder="何でも聞いてください（Enterで送信 / Shift+Enterで改行）"
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAi();
                      }
                    }}
                    aria-label="AIへの質問入力"
                  />
                  <Button
                    onClick={handleSendAi}
                    disabled={aiIsSending || !aiMessage.trim()}
                    className="min-w-20 bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700"
                  >
                    {aiIsSending ? '送信中…' : '送信'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-[0_6px_24px_rgba(17,24,39,0.06)] bg-white border border-slate-200">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">
                  次にやるべきこと
                </h2>
                <p className="text-sm text-muted-foreground">プロフィール/診断結果から、今日やるべき具体アクションを提案します</p>
              </CardHeader>
              <CardContent className="pt-3 pb-6 px-6 space-y-3">
                {nextActions && nextActions.length > 0 ? (
                  nextActions.slice(0, 3).map((a, i) => (
                    <div
                      key={i}
                      className="group flex items-center justify-between gap-3 p-3 rounded-xl border bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-sm transition"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex items-start gap-2 min-w-0">
                          <CheckCircle className="w-4 h-4 mt-0.5 text-indigo-600 flex-shrink-0" />
                          <div className="text-sm text-slate-800 break-words flex-1">{a}</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">提案は現在ありません。プロフィールを2つ更新すると提案が増えます。</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Jobs Rail: 締切間近 / おすすめ */}
        {jobsRail.length > 0 && (
          <Card className="rounded-2xl bg-white border border-slate-200 mb-6">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">締切間近の求人</h3>
                  <p className="text-xs text-slate-500">おすすめ求人も含まれます</p>
                </div>
                <Button variant="outline" className="h-8 px-3 border-indigo-300 text-indigo-700 hover:bg-indigo-50" onClick={() => navigateFn('/jobs?sort=deadline')}>
                  すべて見る
                </Button>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar">
                {jobsRail.map((j) => (
                  <div key={j.id} className="shrink-0 w-[260px] sm:w-[300px] rounded-xl border border-slate-200 bg-white hover:shadow-sm transition">
                    <div className="relative h-36 rounded-t-xl overflow-hidden bg-slate-100">
                      {j.image_url ? (
                        <Image src={j.image_url} alt={j.title} fill sizes="(max-width: 768px) 260px, 300px" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm">No image</div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{j.tag || 'NEW'}</span>
                        {j.deadline && (<span className="text-[11px] text-slate-500">締切: {formatDate(j.deadline)}</span>)}
                      </div>
                      <div className="text-xs text-slate-600 truncate">{j.company}</div>
                      <div className="text-sm font-semibold text-slate-900 line-clamp-2 min-h-[2.5rem]">{j.title}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <Button variant="outline" className="h-8 px-3 border-slate-300" onClick={() => navigateFn(`/jobs/${j.id}`)}>詳細</Button>
                        <Button className="h-8 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700">気になる</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banner Section (Baseme-like) */}
        <div className="mb-6">
          <div
            ref={bannerRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar p-4 sm:p-5"
          >
            {bannerItems.map((b, i) => (
              <button
                key={b.id}
                data-banner
                onClick={() => navigateFn(b.href)}
                className="snap-start shrink-0 w-[260px] sm:w-[340px] h-28 rounded-xl p-4 text-left border border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 active:scale-[0.99] transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 border border-indigo-200 text-indigo-700">{b.badge}</span>
                  <span className="text-xs text-slate-500">▶</span>
                </div>
                <div className="mt-2 font-semibold text-slate-900">{b.title}</div>
                <div className="text-sm text-slate-600">{b.subtitle}</div>
              </button>
            ))}
          </div>
          {/* dots */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {bannerItems.map((_, i) => (
              <button
                key={i}
                aria-label={`banner ${i + 1}`}
                onClick={() => setBannerIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? 'w-6 bg-indigo-500' : 'w-2.5 bg-slate-300'}`}
              />
            ))}
          </div>
        </div>

        {/* Trending News Banner (時事ニュース) */}
        {newsItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between px-4 sm:px-5 mb-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">時事ニュース</h3>
              <button
                onClick={() => navigateFn('/media')}
                className="text-sm text-indigo-700 hover:underline"
              >
                学転メディアへ
              </button>
            </div>
            <div
              ref={newsRef}
              className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar px-4 sm:px-5"
            >
              {newsItems.map((a) => (
                <a
                  key={a.id}
                  href={a.url || '#'}
                  target={a.url ? '_blank' : undefined}
                  rel={a.url ? 'noreferrer' : undefined}
                  data-news
                  className="snap-start shrink-0 w-[260px] sm:w-[300px] rounded-xl border border-slate-200 bg-white hover:shadow-sm transition"
                >
                  <div className="relative h-36 rounded-t-xl overflow-hidden bg-slate-100">
                    {a.imageUrl ? (
                      <Image src={a.imageUrl} alt={a.title} fill sizes="(max-width: 768px) 260px, 300px" className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm">No image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {a.source || 'News'}
                      </span>
                      {a.publishedAt && (
                        <span className="text-[11px] text-slate-500">
                          {(a.publishedAt || '').slice(0,10)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 line-clamp-2 min-h-[2.5rem]">
                      {a.title}
                    </div>
                    {a.description && (
                      <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                        {a.description}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
            {/* dots */}
            <div className="mt-3 flex items-center justify-center gap-2">
              {newsItems.map((_, i) => (
                <button
                  key={i}
                  aria-label={`news ${i + 1}`}
                  onClick={() => setNewsIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === newsIndex ? 'w-6 bg-indigo-500' : 'w-2.5 bg-slate-300'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* First Time User Welcome */}
        {isFirstTime && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-slate-300">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
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
                      className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white"
                    >
                      <Rocket className="w-4 h-4" />
                      <span>ガイドを開始する</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => startTransition(() => setIsFirstTime(false))}
                      className="border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
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


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Career Score Radar */}
            <Card className="bg-white border border-slate-200">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">キャリアスコア詳細</h2>
                    <p className="text-gray-600">5つの軸であなたの強みを可視化</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScoreInfo(true)}
                      className="flex items-center space-x-1 border border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>詳細を見る</span>
                    </Button>
                    <div className="text-right">
                      <div className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">{careerScore?.overall ?? 0}</div>
                      <div className="text-sm text-gray-500">総合スコア</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
                  <div className="min-w-[320px] sm:min-w-0">
                    <CareerRadarChart data={careerScoreDataJa} />
                  </div>
                </div>
                <div className="mt-4 sm:mt-6 grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 text-sm">
                  {AXIS_ORDER.map((key) => {
                    const value = careerScoreData[key] ?? 0;
                    return (
                      <div key={key} className="text-center">
                        <div className="font-bold text-lg text-gray-900">
                          {value ? Math.round(value) : '-'}
                        </div>
                        <div className="text-gray-600">{JA_LABELS[key]}</div>
                      </div>
                    );
                  })}
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
            <Card className="bg-white border border-slate-200">
              <CardHeader className="p-4 sm:p-6">
                <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent">クイックアクション</h2>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
                <Button
                  variant="outline"
                  className="w-full justify-start py-5 sm:py-6 border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => navigateFn('/ipo/analysis')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  AI自己分析を続ける
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start py-5 sm:py-6 border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => navigateFn('/ipo/case')}
                >
                  <Target className="w-4 h-4 mr-2" />
                  ケース問題を解く
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start py-5 sm:py-6 border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
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