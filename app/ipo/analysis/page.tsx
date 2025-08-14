"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  Target,
  Star,
  BookOpen,
  CheckCircle,
  Clock,
  BarChart3,
  MessageCircle,
  Calendar,
  Zap,
  Loader2,
  AlertCircle,
  Play,
  Award,
  Menu,
  X,
  Plus,
  Lightbulb,
  Users,
  Settings,
  FileText,
  Info,
  Briefcase,
  Building,
  ChevronDown,
  ChevronUp,
  Trash2,
  PlusCircle,
} from 'lucide-react';
// Local Route type to satisfy navigate prop
type Route = string;
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AIChat } from '@/components/analysis/AIChat';
import { LifeChart } from '@/components/analysis/LifeChart';
import { FutureVision } from '@/components/analysis/FutureVision';
import { SimpleExperienceReflection } from '@/components/analysis/SimpleExperienceReflection';
import { AnalysisOverview } from '@/components/analysis/AnalysisOverview';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface AnalysisPageProps {
  navigate: (route: Route) => void;
}

interface AnalysisProgress {
  aiChat: number;
  lifeChart: number;
  futureVision: number;
  strengthAnalysis: number;
  experienceReflection: number;
}

const analysisTools = [
  {
    id: 'overview',
    title: '分析概要',
    subtitle: '全体進捗',
    description: 'あなたの自己分析の進捗状況を確認',
    icon: BarChart3,
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    longDescription: '全体の進捗状況と次に取り組むべき項目を確認できます。',
    benefits: ['全体像の把握', '進捗の可視化', '次のステップ提案'],
    estimatedTime: '5分',
    difficulty: '簡単'
  },
  {
    id: 'aiChat',
    title: 'AI対話分析',
    subtitle: 'AI壁打ち',
    description: 'AIとの対話で深い自己理解を実現',
    icon: MessageCircle,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    longDescription: 'AIがあなたの悩みや思考を整理し、新たな視点を提供します。',
    benefits: ['客観的視点の獲得', '思考の整理', '深い自己洞察'],
    estimatedTime: '15-30分',
    difficulty: '簡単',
    badge: 'AI'
  },
  // --- Inserted tools ---
  {
    id: 'manual',
    title: '自己分析ノート',
    subtitle: '自己分析/自己PR',
    description: '自己分析と自己PRを一箇所で作成・保存',
    icon: BookOpen,
    color: 'from-sky-500 to-cyan-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    longDescription: '自由に文章を書き、タグ付けして保存できます。',
    benefits: ['自分の言葉で整理', 'タグ付け', '保存と再編集'],
    estimatedTime: '10-20分',
    difficulty: '簡単',
  },
  // --- Resume tool inserted here ---
  {
    id: 'resume',
    title: '職務経歴書（職歴）',
    subtitle: '職歴入力',
    description: 'アルバイト・インターン等の職歴を入力・保存',
    icon: Briefcase,
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    longDescription: '履歴書に使う職歴（企業名・役職・期間・業務内容・成果など）を管理します。',
    benefits: ['職歴の体系化', '成果の可視化', 'PDF化に向けた準備'],
    estimatedTime: '15-30分',
    difficulty: '普通'
  },
  // --- End inserted tools ---
  {
    id: 'lifeChart',
    title: 'ライフチャート',
    subtitle: '人生振り返り',
    description: '人生の重要な出来事を時系列で振り返る',
    icon: TrendingUp,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    longDescription: '過去の経験から成長パターンや価値観を発見します。',
    benefits: ['成長パターン分析', 'ターニングポイント発見', '価値観の明確化'],
    estimatedTime: '20-40分',
    difficulty: '普通'
  },

  {
    id: 'experienceReflection',
    title: '経験の整理',
    subtitle: '経験の棚卸し',
    description: '学生時代の経験をシンプルに整理',
    icon: BookOpen,
    color: 'from-sky-500 to-cyan-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    longDescription: '就活で活用できる経験を分かりやすく整理・構造化します。',
    benefits: ['経験の体系化', 'スキルの発見', '就活準備完了'],
    estimatedTime: '15-25分',
    difficulty: '簡単'
  },
  {
    id: 'futureVision',
    title: '将来ビジョン',
    subtitle: 'キャリア設計',
    description: '理想の将来像とキャリアプランを設計',
    icon: Target,
    color: 'from-pink-500 to-red-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    longDescription: '5年後、10年後の目標を明確化し、具体的な行動計画を作成します。',
    benefits: ['目標の明確化', 'アクションプラン', 'モチベーション向上'],
    estimatedTime: '25-45分',
    difficulty: '普通',
  }
];

// 職歴アイテム型（/app/resume/page.tsx と同等）
interface WorkExperience {
  id: number;
  isOpen: boolean;
  company: string;
  position: string;
  jobTypes: string[];
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  technologies: string;
  achievements: string;
}

// シンプルな強み・弱みエントリ
interface SimpleTrait {
  id: string;
  title: string; // 名称
  note: string;  // 補足メモ（根拠・改善方針など自由記述）
}

export function AnalysisPage({ navigate }: AnalysisPageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false));
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress>({
    aiChat: 0,
    lifeChart: 0,
    futureVision: 0,
    strengthAnalysis: 0,
    experienceReflection: 0,
  });
  const [userId, setUserId] = useState<string | null>(null);
  // Track which key is used in student_profiles (user_id or id)
  const [profileKey, setProfileKey] = useState<'user_id' | 'id'>('user_id');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 自己記述用（AI以外）
  const [manualText, setManualText] = useState<string>('');
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [, setNoteSaving] = useState(false);
  // Desktop tool search/filter
  const [navQuery, setNavQuery] = useState('');
  // 構造化ノート（自己分析 / 自己PR）
  const [manual, setManual] = useState({
    selfAnalysis: '',
    prTitle: '',
    about: '',
    prText: '',
    strengths: ['', '', ''],
    // 追加: シンプルな強み・弱み（複数追加可）
    strengthItems: [] as SimpleTrait[],
    weaknessItems: [] as SimpleTrait[],
  });

  // ===== 職務経歴書（職歴）セクション用 State =====
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([{
    id: 1,
    isOpen: true,
    company: '',
    position: '',
    jobTypes: [],
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
    technologies: '',
    achievements: '',
  }]);
  const [resumeSaving, setResumeSaving] = useState(false);
  const resumeSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addWorkExperience = (): void => {
    const newId = workExperiences.length > 0 ? Math.max(...workExperiences.map(e => e.id)) + 1 : 1;
    setWorkExperiences([...workExperiences, {
      id: newId,
      isOpen: true,
      company: '',
      position: '',
      jobTypes: [],
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: '',
      technologies: '',
      achievements: '',
    }]);
  };
  const removeWorkExperience = (id: number): void => {
    setWorkExperiences(prev => prev.filter(e => e.id !== id));
  };
  const toggleCollapsible = (id: number): void => {
    setWorkExperiences(prev => prev.map(e => e.id === id ? { ...e, isOpen: !e.isOpen } : e));
  };
  const handleWorkExperienceChange = (
    id: number,
    field: keyof WorkExperience,
    value: string | boolean | string[]
  ): void => {
    setWorkExperiences(prev => prev.map(e => e.id === id ? { ...e, [field]: value } as WorkExperience : e));
  };
  const handleJobTypeToggle = (id: number, value: string, checked: boolean): void => {
    setWorkExperiences(prev => prev.map(e => e.id === id ? {
      ...e,
      jobTypes: checked ? [...new Set([...(e.jobTypes || []), value])] : (e.jobTypes || []).filter(v => v !== value),
    } : e));
  };

  // ===== 強み・弱み（簡易）操作系 =====
  const addStrengthItem = () => {
    setManual((p) => ({
      ...p,
      strengthItems: [...(p.strengthItems || []), { id: crypto.randomUUID(), title: '', note: '' }],
    }));
  };
  const removeStrengthItem = (id: string) => {
    setManual((p) => ({
      ...p,
      strengthItems: (p.strengthItems || []).filter((s) => s.id !== id),
    }));
  };
  const updateStrengthItem = (id: string, field: keyof SimpleTrait, value: string) => {
    setManual((p) => ({
      ...p,
      strengthItems: (p.strengthItems || []).map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };
  const addWeaknessItem = () => {
    setManual((p) => ({
      ...p,
      weaknessItems: [...(p.weaknessItems || []), { id: crypto.randomUUID(), title: '', note: '' }],
    }));
  };
  const removeWeaknessItem = (id: string) => {
    setManual((p) => ({
      ...p,
      weaknessItems: (p.weaknessItems || []).filter((s) => s.id !== id),
    }));
  };
  const updateWeaknessItem = (id: string, field: keyof SimpleTrait, value: string) => {
    setManual((p) => ({
      ...p,
      weaknessItems: (p.weaknessItems || []).map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  // 職歴 完了率（6項目均等）
  const calcWorkCompletion = useCallback((rows: WorkExperience[]): number => {
    if (!rows?.length) return 0;
    const requiredPerRow = 6;
    const totalRequired = rows.length * requiredPerRow;
    const filled = rows.reduce((cnt, w) => {
      if (w.company.trim()) cnt++;
      if (w.position.trim()) cnt++;
      if (w.startDate.trim()) cnt++;
      if (w.isCurrent || w.endDate.trim()) cnt++;
      if (w.description.trim()) cnt++;
      if (w.achievements.trim()) cnt++;
      return cnt;
    }, 0);
    return Math.round((filled / totalRequired) * 100);
  }, []);

  // 自己分析ノート（manual）から充足率を推定（0~1）
  const computeSelfNoteProgress = (m: typeof manual): number => {
    const lenSafe = (s?: string) => (typeof s === 'string' ? s.trim().length : 0);
    const titleDone = lenSafe(m.prTitle) > 0 ? 1 : 0;                // 12%
    const aboutRatio = Math.min(1, lenSafe(m.about) / 200);          // 18%
    const prRatio = Math.min(1, lenSafe(m.prText) / 800);            // 30%
    const selfAnalysisRatio = Math.min(1, lenSafe(m.selfAnalysis) / 600); // 15%
    const strengthCountRatio = Math.min(1, (Math.min(3, (m.strengthItems?.filter((x) => lenSafe(x.title) > 0).length) || 0) / 3)); // 15%
    const weaknessCountRatio = Math.min(1, (Math.min(2, (m.weaknessItems?.filter((x) => lenSafe(x.title) > 0).length) || 0) / 2)); // 10%
    const weighted =
      0.12 * titleDone +
      0.18 * aboutRatio +
      0.30 * prRatio +
      0.15 * selfAnalysisRatio +
      0.15 * strengthCountRatio +
      0.10 * weaknessCountRatio;
    return Math.max(0, Math.min(1, Number.isFinite(weighted) ? weighted : 0));
  };
  // --- autosave control for manual note ---
  const manualFirstRenderRef = useRef(true);
  const manualSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- AIChat → 自己分析ノート反映用（トップレベルで定義：Hooks順保持） ----
  const applyManualUpdate = useCallback((upd: Partial<{ prTitle: string; about: string; prText: string; selfAnalysis: string; strengths: string[] }>) => {
    setManual(prev => {
      const next = { ...prev } as typeof prev;
      if (typeof upd.prTitle === 'string') next.prTitle = upd.prTitle;
      if (typeof upd.about === 'string') next.about = upd.about;
      if (typeof upd.prText === 'string') next.prText = upd.prText;
      if (typeof upd.selfAnalysis === 'string') next.selfAnalysis = (prev.selfAnalysis ? prev.selfAnalysis + '\n' : '') + upd.selfAnalysis;
      if (Array.isArray(upd.strengths) && upd.strengths.length) {
        const merged = [...prev.strengths];
        for (const s of upd.strengths) {
          if (!s) continue;
          const idx = merged.findIndex(x => !x);
          if (idx !== -1) merged[idx] = s;
        }
        next.strengths = merged.slice(0, 3);
        // 互換: 文字列 strengths から空の strengthItems を自動生成
        if ((!prev.strengthItems || prev.strengthItems.length === 0) && Array.isArray(next.strengths)) {
          const seeded = next.strengths
            .filter((s) => s && s.trim())
            .map((s) => ({ id: crypto.randomUUID(), title: s.trim(), note: '' } as SimpleTrait));
          if (seeded.length) next.strengthItems = seeded.slice(0, 3);
        }
      }
      return next;
    });
  }, [setManual]);

  // --- Debounce timer for progress upserts ---
  const upsertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Run a callback when the main thread is idle (fallback to setTimeout)
  const runIdle = (cb: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // @ts-ignore
      (window as any).requestIdleCallback(cb);
    } else {
      setTimeout(cb, 0);
    }
  };

  // safely upsert progress to Supabase (debounced)
  const upsertProgress = useCallback((p: AnalysisProgress) => {
    if (!userId) return;
    if (upsertTimerRef.current) {
      clearTimeout(upsertTimerRef.current);
    }
    upsertTimerRef.current = setTimeout(async () => {
      try {
        const payload = {
          user_id: userId,
          ai_chat: p.aiChat,
          life_chart: p.lifeChart,
          future_vision: p.futureVision,
          strength_analysis: p.strengthAnalysis,
          experience_reflection: p.experienceReflection,
          updated_at: new Date().toISOString(),
        };
        const { error: upsertErr } = await supabase
          .from('ipo_analysis_progress')
          .upsert(payload, { onConflict: 'user_id' });
        if (upsertErr) throw upsertErr;
      } catch (err) {
        console.error('Error updating progress:', err);
        setError('進捗の保存に失敗しました');
      }
    }, 500); // debounce 500ms
  }, [userId]);

  // Check if mobile (via media query)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else {
      // Safari <14 fallback
      mq.addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, []);

  // Resolve Supabase auth user and load saved progress
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        // Prefer getSession: faster and avoids transient "no user" states
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id ?? null;
        if (!mounted) return;
        setUserId(uid);
        if (uid) {
          // Fetch progress row
          const { data, error: fetchErr } = await supabase
            .from('ipo_analysis_progress')
            .select('ai_chat, life_chart, future_vision, strength_analysis, experience_reflection')
            .eq('user_id', uid)
            .maybeSingle();
          if (!fetchErr && data) {
            setProgress({
              aiChat: data.ai_chat ?? 0,
              lifeChart: data.life_chart ?? 0,
              futureVision: data.future_vision ?? 0,
              strengthAnalysis: data.strength_analysis ?? 0,
              experienceReflection: data.experience_reflection ?? 0,
            });
          }
          // 自己分析ノート
          await loadManualNote(uid);
          // 職歴（resumes.work_experiences）読み込み
          try {
            const { data: resumeRow, error: resumeErr } = await supabase
              .from('resumes')
              .select('id, work_experiences')
              .eq('user_id', uid)
              .maybeSingle();
            if (!resumeErr && resumeRow?.work_experiences && Array.isArray(resumeRow.work_experiences)) {
              setWorkExperiences(resumeRow.work_experiences as unknown as WorkExperience[]);
            }
          } catch (e) {
            console.warn('load work_experiences skipped:', e);
          }
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        // 本当の失敗のみ error。未ログインは error にしない
        setError('データ取得に失敗しました');
        setLoading(false);
      }
    };
    run();

    // Subscribe to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      // Only refetch on meaningful changes; avoid TOKEN_REFRESH which can interrupt typing
      const shouldRefetch = event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION';
      if (uid && shouldRefetch) {
        // 最新の進捗とノートを再取得
        supabase
          .from('ipo_analysis_progress')
          .select('ai_chat, life_chart, future_vision, strength_analysis, experience_reflection')
          .eq('user_id', uid)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setProgress({
                aiChat: data.ai_chat ?? 0,
                lifeChart: data.life_chart ?? 0,
                futureVision: data.future_vision ?? 0,
                strengthAnalysis: data.strength_analysis ?? 0,
                experienceReflection: data.experience_reflection ?? 0,
              });
            }
          });
        loadManualNote(uid);
        // 職歴も再取得
        supabase
          .from('resumes')
          .select('id, work_experiences')
          .eq('user_id', uid)
          .maybeSingle()
          .then(({ data: resumeRow, error: resumeErr }) => {
            if (!resumeErr && resumeRow?.work_experiences && Array.isArray(resumeRow.work_experiences)) {
              setWorkExperiences(resumeRow.work_experiences as unknown as WorkExperience[]);
            }
          });
      }
    });

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);
  // --- Debounced auto-save for work experiences (resumes.work_experiences) ---
  useEffect(() => {
    if (!userId) return;
    if (resumeSaveTimerRef.current) clearTimeout(resumeSaveTimerRef.current);
    resumeSaveTimerRef.current = setTimeout(async () => {
      try {
        setResumeSaving(true);
        // Check for existing resume row
        const { data: existing, error: selErr } = await supabase
          .from('resumes')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        if (selErr && selErr.code !== 'PGRST116') throw selErr;

        if (existing?.id) {
          const { error: updErr } = await supabase
            .from('resumes')
            .update({ work_experiences: workExperiences as any, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('resumes')
            .insert({ user_id: userId, work_experiences: workExperiences as any, updated_at: new Date().toISOString() });
          if (insErr) throw insErr;
        }
      } catch (e) {
        console.error('save work_experiences error:', e);
        setError('職歴の保存に失敗しました');
      } finally {
        setResumeSaving(false);
      }
    }, 800);

    return () => {
      if (resumeSaveTimerRef.current) clearTimeout(resumeSaveTimerRef.current);
    };
  }, [workExperiences, userId]);

  // シンプルなタグ抽出（#タグ を拾う／structuredも見る）
  const extractTags = (text: string, obj?: typeof manual): string[] => {
    const set = new Set<string>();
    const regex = /#([\p{L}\p{N}_一-龥ぁ-んァ-ヶー]+)/gu;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const t = m[1].trim();
      if (t) set.add(t.slice(0, 24));
    }
    if (obj) {
      [obj.prTitle, obj.about, obj.prText, obj.selfAnalysis, ...(obj.strengths || [])].forEach((s) => {
        if (!s) return;
        const it = s.match(regex);
        it?.forEach((tag) => set.add(tag.replace(/^#/, '').slice(0, 24)));
      });
      // 追加: 強み・弱み（簡易）の title / note からも抽出
      (obj.strengthItems || []).forEach((it) => {
        [it.title, it.note].forEach((s) => {
          if (!s) return;
          const mt = s.match(regex);
          mt?.forEach((tag) => set.add(tag.replace(/^#/, '').slice(0, 24)));
        });
      });
      (obj.weaknessItems || []).forEach((it) => {
        [it.title, it.note].forEach((s) => {
          if (!s) return;
          const mt = s.match(regex);
          mt?.forEach((tag) => set.add(tag.replace(/^#/, '').slice(0, 24)));
        });
      });
    }
    return Array.from(set).slice(0, 12);
  };

  // ===== Text analyzer for visualize tab =====
  type AnalyzeResult = {
    words: string[];
    counts: number[];
    charCount: number;
    sentenceCount: number;
    wordCount: number;
    readMin: number;
  };

  const analyzeText = (text: string): AnalyzeResult => {
    const src = (text ?? '').toLowerCase();
    const charCount = src.length;

    // Very rough sentence split for JP/EN
    const sentenceCount = src
      .split(/[。\.!\?]+/u)
      .filter(Boolean)
      .length;

    // Tokenize: keep letters/numbers/CJK/kana
    const tokens = src
      .replace(/[^\p{L}\p{N}_一-龥ぁ-んァ-ヶー\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);

    const wordCount = tokens.length;
    const readMin = Math.max(1, Math.round(wordCount / 400)); // ~400w/min rough

    // Simple stopword list (JP heavy)
    const stop = new Set([
      'の','に','は','を','た','が','で','て','と','し','れ','さ','です','ます','する','いる','ある','そして','また','ため','こと','もの','よう','から','まで','や','など','なり','なる','へ','か','も','その','この','あの'
    ]);

    const freq = new Map<string, number>();
    for (const t of tokens) {
      if (stop.has(t)) continue;
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }

    const top = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    return {
      words: top.map(([w]) => w),
      counts: top.map(([, c]) => c),
      charCount,
      sentenceCount,
      wordCount,
      readMin,
    };
  };

  // Return first non-empty (trimmed) string among candidates
  const pickNonEmpty = (...vals: any[]): string => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim() !== '') return v;
    }
    return '';
  };

  // 手動ノートの読み込み（既存テーブル: student_profiles を利用）
  const loadManualNote = async (uid: string) => {
    try {
      // 2 column sets: A = columns commonly present today, B = legacy columns incl. analysis_note/strengths
      const colsA = 'user_id,id,pr_title,about,pr_text,pr_body,strength1,strength2,strength3,motive,updated_at';
      const colsB = 'user_id,id,analysis_note,pr_title,about,pr_text,strengths,pr_body,strength1,strength2,strength3,motive,updated_at';

      const tryFetch = async (cols: string, key: 'user_id' | 'id') =>
        supabase
          .from('student_profiles')
          .select(cols)
          .eq(key, uid)
          .maybeSingle();

      // Try by user_id first with safe columns; if undefined-column error, fall back to legacy set.
      let res = await tryFetch(colsA, 'user_id');
      if (res.error?.code === '42703' || (!res.data && res.error)) {
        // 42703 = undefined_column in Postgres
        res = await tryFetch(colsB, 'user_id');
      }

      // If nothing by user_id, try by id (some rows stored auth uid in `id`). Try both column sets safely.
      if (!res.data) {
        let resId = await tryFetch(colsA, 'id');
        if (resId.error?.code === '42703' || (!resId.data && resId.error)) {
          resId = await tryFetch(colsB, 'id');
        }
        res = resId;
      }

      if (res.error) {
        console.warn('loadManualNote warning:', res.error.message);
      }

      const data = res.data as any;
      if (!data) {
        console.warn('student_profiles: no row for uid', uid);
        return; // keep initial empty state
      }

      // Decide key field for future upserts
      setProfileKey(data.user_id ? 'user_id' : 'id');

      // Prefer analysis_note JSON if available, otherwise map legacy columns
      let parsed: any = null;
      const raw = (data as any).analysis_note ?? '';

      if (typeof raw === 'string' && raw.trim()) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = { selfAnalysis: String(raw) };
        }
      } else if (raw && typeof raw === 'object') {
        parsed = raw;
      }

      const next: {
        selfAnalysis: string;
        prTitle: string;
        about: string;
        prText: string;
        strengths: string[];
        strengthItems: SimpleTrait[];
        weaknessItems: SimpleTrait[];
      } = {
        selfAnalysis: pickNonEmpty(parsed?.selfAnalysis, ''),
        prTitle:     pickNonEmpty(parsed?.prTitle,     (data as any).pr_title,  ''),
        about:       pickNonEmpty(parsed?.about,       (data as any).about,     (data as any).motive, ''),
        prText:      pickNonEmpty(parsed?.prText,      (data as any).pr_text,   (data as any).pr_body, ''),
        strengths: Array.isArray(parsed?.strengths) && parsed.strengths.some((s: any) => typeof s === 'string' && s.trim() !== '')
          ? [pickNonEmpty(parsed.strengths[0], ''), pickNonEmpty(parsed.strengths[1], ''), pickNonEmpty(parsed.strengths[2], '')]
          : ([
              pickNonEmpty((data as any).strength1, Array.isArray((data as any).strengths) ? (data as any).strengths[0] : '', ''),
              pickNonEmpty((data as any).strength2, Array.isArray((data as any).strengths) ? (data as any).strengths[1] : '', ''),
              pickNonEmpty((data as any).strength3, Array.isArray((data as any).strengths) ? (data as any).strengths[2] : '', ''),
            ]),
        strengthItems: [] as SimpleTrait[],
        weaknessItems: [] as SimpleTrait[],
      };

      // 強み・弱みは専用テーブルから取得
      try {
        const { data: sRows, error: sErr } = await supabase
          .from('ipo_traits')
          .select('id,title,note')
          .eq('user_id', uid)
          .eq('kind', 'strength');
        if (!sErr && Array.isArray(sRows)) {
          next.strengthItems = sRows.map((r: any) => ({ id: String(r.id ?? crypto.randomUUID()), title: String(r.title || ''), note: String(r.note || '') }));
        }
      } catch {}
      try {
        const { data: wRows, error: wErr } = await supabase
          .from('ipo_traits')
          .select('id,title,note')
          .eq('user_id', uid)
          .eq('kind', 'weakness');
        if (!wErr && Array.isArray(wRows)) {
          next.weaknessItems = wRows.map((r: any) => ({ id: String(r.id ?? crypto.randomUUID()), title: String(r.title || ''), note: String(r.note || '') }));
        }
      } catch {}

      // 互換: テーブルが空なら legacy strengths からシード
      if ((next.strengthItems?.length ?? 0) === 0) {
        const seeded = (next.strengths || [])
          .filter((s) => s && s.trim())
          .map((s) => ({ id: crypto.randomUUID(), title: s.trim(), note: '' }));
        next.strengthItems = seeded.slice(0, 3);
      }

      setManual(next);

      // For visualization panel
      const serialized = JSON.stringify(next);
      setManualText(serialized);
      setManualTags(extractTags(serialized, next));

      // Optional: debug
      console.debug('[loadManualNote] loaded manual:', next);
    } catch (e) {
      console.warn('loadManualNote skipped due to exception:', e);
    }
  };

  // 手動ノートの保存（PR系はstudent_profiles、強み・弱みは ipo_strength / ipo_weakness）
  const saveManualNote = async () => {
    if (!userId) return;
    setNoteSaving(true);

    try {
      const keyField = profileKey; // 'user_id' or 'id'

      // 既存行の存在確認
      const { data: existing, error: selErr } = await supabase
        .from('student_profiles')
        .select(keyField)
        .eq(keyField, userId)
        .maybeSingle();
      if (selErr && selErr.code !== 'PGRST116') {
        throw selErr;
      }

      // 保存用オブジェクト（全文）
      const fullNote = {
        selfAnalysis: manual.selfAnalysis,
        prTitle: manual.prTitle,
        about: manual.about,
        prText: manual.prText,
        strengths: manual.strengths,
        strengthItems: manual.strengthItems || [],
        weaknessItems: manual.weaknessItems || [],
      };

      // 最小カラム（確実に存在）
      const minimalPayload: any = {
        pr_title: manual.prTitle || null,
        about: manual.about || null,
        pr_text: manual.prText || null,
        updated_at: new Date().toISOString(),
      };

      const doUpdate = async () => {
        const { error: updErr } = await supabase
          .from('student_profiles')
          .update(minimalPayload)
          .eq(keyField, userId);
        if (updErr) throw updErr;
        // best-effort: analysis_note がある場合は JSON 保存
        // Removed: update analysis_note on student_profiles
      };

      const doInsert = async () => {
        const { error: insErr } = await supabase
          .from('student_profiles')
          .insert([{ [keyField]: userId, ...minimalPayload }]);
        if (insErr) throw insErr;
        // Removed: update analysis_note on student_profiles
      };

      if (existing) await doUpdate(); else await doInsert();

      // ---- 強み・弱みは ipo_traits テーブルに同報保存（安全版） ----
      try {
        // --- strengths ---
        const sPayload =
          (manual.strengthItems || [])
            .filter((it) => (it.title || '').trim())
            .map((it) => ({ user_id: userId, kind: 'strength', title: it.title.trim(), note: (it.note || '').trim() || null }));

        if (sPayload.length) {
          const { error: sUpErr } = await supabase
            .from('ipo_traits')
            .upsert(
              sPayload.map((r) => ({ ...r, updated_at: new Date().toISOString() })) as any,
              { onConflict: 'user_id,kind,title' }
            );
          if (sUpErr) throw sUpErr;
        }

        // 古いレコード掃除（まず既存を取得し、差分だけ削除）
        try {
          const keepS = sPayload.map((r) => r.title);
          const { data: existingS, error: sSelErr } = await supabase
            .from('ipo_traits')
            .select('title')
            .eq('user_id', userId)
            .eq('kind', 'strength');
          if (!sSelErr && Array.isArray(existingS)) {
            const toDelete = existingS
              .map((r: any) => String(r.title))
              .filter((lbl) => !keepS.includes(lbl));
            if (toDelete.length) {
              const { error: sDelErr } = await supabase
                .from('ipo_traits')
                .delete()
                .eq('user_id', userId)
                .eq('kind', 'strength')
                .in('title', toDelete);
              if (sDelErr && sDelErr.code !== 'PGRST116') {
                console.warn('ipo_traits (strength) cleanup skipped due to RLS/policy:', sDelErr);
              }
            }
          }
        } catch (e) {
          console.warn('ipo_traits (strength) cleanup skipped:', e);
        }
      } catch (e) {
        console.error('ipo_traits (strength) save error:', e);
        // strengths 側は UI を止めない（弱み保存のほうで詳細表示）
      }

      try {
        // --- weaknesses ---
        const wPayload =
          (manual.weaknessItems || [])
            .filter((it) => (it.title || '').trim())
            .map((it) => ({ user_id: userId, kind: 'weakness', title: it.title.trim(), note: (it.note || '').trim() || null }));

        if (wPayload.length) {
          const { error: wUpErr } = await supabase
            .from('ipo_traits')
            .upsert(
              wPayload.map((r) => ({ ...r, updated_at: new Date().toISOString() })) as any,
              { onConflict: 'user_id,kind,title' }
            );
          if (wUpErr) {
            console.error('ipo_traits (weakness) upsert error:', wUpErr);
            const code = (wUpErr as any)?.code || 'unknown';
            const msg = (wUpErr as any)?.message || JSON.stringify(wUpErr);
            setError(`弱みの保存に失敗しました（${code}: ${msg}）`);
            throw wUpErr;
          }
        }

        try {
          const keepW = wPayload.map((r) => r.title);
          const { data: existingW, error: wSelErr } = await supabase
            .from('ipo_traits')
            .select('title')
            .eq('user_id', userId)
            .eq('kind', 'weakness');
          if (!wSelErr && Array.isArray(existingW)) {
            const toDelete = existingW
              .map((r: any) => String(r.title))
              .filter((lbl) => !keepW.includes(lbl));
            if (toDelete.length) {
              const { error: wDelErr } = await supabase
                .from('ipo_traits')
                .delete()
                .eq('user_id', userId)
                .eq('kind', 'weakness')
                .in('title', toDelete);
              if (wDelErr && wDelErr.code !== 'PGRST116') {
                console.warn('ipo_traits (weakness) cleanup skipped due to RLS/policy:', wDelErr);
              }
            }
          }
        } catch (e) {
          console.warn('ipo_traits (weakness) cleanup skipped:', e);
        }
      } catch (e) {
        console.error('ipo_traits (weakness) save error:', e);
        setError('弱みの保存でエラーが発生しました（テーブルのRLS/カラム定義を確認してください）');
        // rethrow せず UI 継続
      }

      // 履歴書テーブルにも traits を同期（任意、エラーは握りつぶす）
      try {
        await supabase
          .from('resumes')
          .upsert(
            {
              user_id: userId,
              form_data: {
                basic: {},
                pr: { title: manual.prTitle || '', content: manual.prText || '', motivation: manual.about || '' },
                conditions: {},
              },
            },
            { onConflict: 'user_id' }
          );
      } catch {}

      // live preview 更新
      const serialized = JSON.stringify(fullNote);
      setManualText(serialized);
      setManualTags(extractTags(serialized, manual));
    } catch (e) {
      console.error('saveManualNote error:', e);
      setError('ノートの保存に失敗しました（student_profiles のスキーマを確認してください）');
    } finally {
      setNoteSaving(false);
    }
  };

  // --- Debounced auto-save for manual note ---
  useEffect(() => {
    // Skip effect on initial load of manual from DB
    if (manualFirstRenderRef.current) {
      manualFirstRenderRef.current = false;
      return;
    }
    if (!userId) return;

    // update live preview data used by visualize tab
    try {
      const serialized = JSON.stringify(manual);
      setManualText(serialized);
      setManualTags(extractTags(serialized, manual));
    } catch {}

    // debounce save
    if (manualSaveTimerRef.current) clearTimeout(manualSaveTimerRef.current);
    manualSaveTimerRef.current = setTimeout(() => {
      saveManualNote();
    }, 500);

    return () => {
      if (manualSaveTimerRef.current) clearTimeout(manualSaveTimerRef.current);
    };
  }, [manual, userId]);

  // Update a single tool's progress with guard (prevents infinite update loops)
  const setToolProgress = useCallback((key: keyof AnalysisProgress, value: number) => {
    // normalize
    const v = Math.max(0, Math.min(100, Math.round(value || 0)));
    // short-circuit if no change
    if (progress[key] === v) return;

    const next = { ...progress, [key]: v } as AnalysisProgress;
    setProgress(next);
    upsertProgress(next);
  }, [progress, upsertProgress]);

  // AIChatに渡す実充足率（0~1）
  const sectionProgress = useMemo(() => ({
    selfNote: computeSelfNoteProgress(manual),
    lifeChart: Math.max(0, Math.min(1, (progress.lifeChart || 0) / 100)),
    strengthsWeaknesses: Math.max(0, Math.min(1, (progress.strengthAnalysis || 0) / 100)),
    experience: Math.max(0, Math.min(1, (progress.experienceReflection || 0) / 100)),
    futureVision: Math.max(0, Math.min(1, (progress.futureVision || 0) / 100)),
  }), [manual, progress.lifeChart, progress.strengthAnalysis, progress.experienceReflection, progress.futureVision]);

  // 概要ページ用：5セクション平均（0..1 → %）。AIChatの進捗値は使わず、selfNoteを代表させる
  const overviewPercentFromSections = useMemo(() => {
    const vals = [
      sectionProgress.selfNote ?? 0,
      sectionProgress.lifeChart ?? 0,
      sectionProgress.strengthsWeaknesses ?? 0,
      sectionProgress.experience ?? 0,
      sectionProgress.futureVision ?? 0,
    ];
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 100);
  }, [sectionProgress]);

  // AnalysisOverview に渡すときは、aiChat を selfNote% に読み替えたオブジェクトを渡す
  const progressForOverview = useMemo(() => ({
    aiChat: Math.round((sectionProgress.selfNote ?? 0) * 100),
    lifeChart: progress.lifeChart,
    futureVision: progress.futureVision,
    strengthAnalysis: progress.strengthAnalysis,
    experienceReflection: progress.experienceReflection,
  }), [sectionProgress.selfNote, progress.lifeChart, progress.futureVision, progress.strengthAnalysis, progress.experienceReflection]);

  const handleTabChange = useCallback((value: string) => {
    // Prioritize UI state switch; defer non-urgent work
    startTransition(() => {
      setActiveTab(value);
      setShowMobileMenu(false);
    });
    if (typeof window !== 'undefined') {
      runIdle(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }, []);

  const overallProgress = Math.round(
    Object.values(progress).reduce((sum, value) => sum + value, 0) / Object.keys(progress).length
  );

  const getCurrentTool = () => {
    return analysisTools.find(tool => tool.id === activeTab) || analysisTools[0];
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AnalysisOverview progress={progressForOverview} onNavigateToTool={setActiveTab} />;
      case 'aiChat':
        return (
          <AIChat
            userId={userId ?? ''}
            onProgressUpdate={(p: number) => setToolProgress('aiChat', p)}
            onApplyToManual={applyManualUpdate}
            sectionProgress={sectionProgress}
          />
        );
      case 'manual':
        return (
          <div className="space-y-4">
            <Card>
              <div className="flex items-center gap-2 p-4">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold">自己PR／自己分析ノート</h3>
                  <p className="text-sm text-muted-foreground">自己分析・自己PRをここでまとめて保存できます（200/800 文字制限あり）</p>
                </div>
              </div>
              <div className="space-y-4 p-4 pt-0">
                <div className="space-y-1">
                  <Label htmlFor="pr_title" className="text-sm">PR タイトル</Label>
                  <Input
                    id="pr_title"
                    value={manual.prTitle}
                    onChange={(e) => setManual((p) => ({ ...p, prTitle: e.target.value }))}
                    placeholder="あなたを一言で"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="about" className="text-sm">自己紹介（〜200文字）</Label>
                    <span className="text-xs text-gray-500">{manual.about.length}/200</span>
                  </div>
                  <Textarea
                    id="about"
                    rows={5}
                    value={manual.about}
                    onChange={(e) => setManual((p) => ({ ...p, about: e.target.value.slice(0,200) }))}
                    placeholder="200文字以内で自己紹介"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pr_text" className="text-sm">自己PR（〜800文字）</Label>
                    <span className="text-xs text-gray-500">{manual.prText.length}/800</span>
                  </div>
                  <Textarea
                    id="pr_text"
                    rows={10}
                    value={manual.prText}
                    onChange={(e) => setManual((p) => ({ ...p, prText: e.target.value.slice(0,800) }))}
                    placeholder="課題 → 行動 → 成果 の順でエピソードを具体的に"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">強み（最大3つ）</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {manual.strengths.map((v, i) => (
                      <Input
                        key={i}
                        value={v}
                        placeholder={`強み${i+1}`}
                        onChange={(e) =>
                          setManual((p) => {
                            const arr = [...p.strengths];
                            arr[i] = e.target.value;
                            return { ...p, strengths: arr };
                          })
                        }
                        className="text-sm"
                      />
                    ))}
                  </div>
                </div>

                {manualTags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {manualTags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">#{t}</Badge>
                    ))}
                  </div>
                )}

                {/* 強み・弱み（簡易） */}
                <Card className="mt-2">
                  <div className="flex items-center gap-2 p-4">
                    <Star className="h-5 w-5 text-yellow-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold">強み・弱み（簡易入力・複数可）</h3>
                      <p className="text-sm text-muted-foreground">詳細なスコアやカテゴリは不要。名称と一言メモだけでOKです。</p>
                    </div>
                  </div>
                  <div className="p-4 pt-0 space-y-6">
                    {/* 強み */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">強み</Label>
                        <Button variant="outline" size="sm" className="h-7 gap-1" onClick={addStrengthItem}>
                          <PlusCircle className="h-4 w-4" /> 追加
                        </Button>
                      </div>
                      {(manual.strengthItems || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">まだ追加されていません。</p>
                      ) : (
                        <div className="space-y-3">
                          {(manual.strengthItems || []).map((it) => (
                            <div key={it.id} className="rounded-md border p-3 bg-white">
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="例：課題解決力"
                                  value={it.title}
                                  onChange={(e) => updateStrengthItem(it.id, 'title', e.target.value)}
                                  className="text-sm"
                                />
                                <Button variant="ghost" size="sm" className="h-8 w-8 text-red-500" onClick={() => removeStrengthItem(it.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Textarea
                                placeholder="根拠や一言メモ（任意）"
                                value={it.note}
                                onChange={(e) => updateStrengthItem(it.id, 'note', e.target.value)}
                                className="mt-2 text-sm"
                                rows={2}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* 弱み */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">弱み</Label>
                        <Button variant="outline" size="sm" className="h-7 gap-1" onClick={addWeaknessItem}>
                          <PlusCircle className="h-4 w-4" /> 追加
                        </Button>
                      </div>
                      {(manual.weaknessItems || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">まだ追加されていません。</p>
                      ) : (
                        <div className="space-y-3">
                          {(manual.weaknessItems || []).map((it) => (
                            <div key={it.id} className="rounded-md border p-3 bg-white">
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="例：優先順位付けが苦手"
                                  value={it.title}
                                  onChange={(e) => updateWeaknessItem(it.id, 'title', e.target.value)}
                                  className="text-sm"
                                />
                                <Button variant="ghost" size="sm" className="h-8 w-8 text-red-500" onClick={() => removeWeaknessItem(it.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Textarea
                                placeholder="改善方針や工夫（任意）"
                                value={it.note}
                                onChange={(e) => updateWeaknessItem(it.id, 'note', e.target.value)}
                                className="mt-2 text-sm"
                                rows={2}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <TipBox />
              </div>
            </Card>
          </div>
        );
      function TipBox() {
        return (
          <Alert className="bg-blue-50">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-sm font-medium text-blue-800">自己PRのコツ</AlertTitle>
            <AlertDescription className="text-xs text-blue-700 space-y-1">
              <p>・数字や結果を用いて具体性を出す</p>
              <p>・役割だけでなく、課題⇢行動⇢成果 を示す</p>
            </AlertDescription>
          </Alert>
        );
      }
      case 'resume': {
        const workPct = calcWorkCompletion(workExperiences);
        return (
          <div className="space-y-4">
            <Card className="border-2 border-indigo-200/60 bg-indigo-50/40">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-indigo-700">職務経歴書（職歴）</h3>
                </div>
                <div className="text-xs text-indigo-700">完成度 {workPct}%</div>
              </div>
            </Card>

            <Card className="p-4 md:p-6 space-y-4">
              {workExperiences.length === 0 ? (
                <Alert className="bg-amber-50">
                  <Info className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-sm font-medium text-amber-800">職歴情報がありません</AlertTitle>
                  <AlertDescription className="text-xs text-amber-700">アルバイトやインターンシップの経験を追加しましょう。</AlertDescription>
                </Alert>
              ) : (
                workExperiences.map((exp) => (
                  <Collapsible key={exp.id} open={exp.isOpen} onOpenChange={() => toggleCollapsible(exp.id)}>
                    <div className="rounded-lg border bg-white p-3 md:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <h4 className="text-sm font-medium">
                            {exp.company || `職歴 #${exp.id}`} {exp.position && <span className="ml-2 text-xs text-gray-500">（{exp.position}）</span>}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              {exp.isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                          {workExperiences.length > 1 && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => removeWorkExperience(exp.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <CollapsibleContent className="mt-3 space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor={`company-${exp.id}`} className="text-sm">企業・組織名</Label>
                          <Input id={`company-${exp.id}`} placeholder="〇〇株式会社" className="h-10 text-sm md:h-8 md:text-xs" value={exp.company} onChange={(e) => handleWorkExperienceChange(exp.id, 'company', e.target.value)} />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm">職種（複数選択可）</Label>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 md:grid-cols-3 md:gap-2">
                            {[ 'エンジニア','営業','コンサルタント','経営・経営企画','総務・人事','経理・財務','企画','マーケティング','デザイナー','広報','その他' ].map(opt => (
                              <div key={opt} className="flex items-center space-x-2">
                                <Checkbox id={`jobType-${exp.id}-${opt}`} className="h-4 w-4 md:h-3.5 md:w-3.5" checked={(exp.jobTypes||[]).includes(opt)} onCheckedChange={(checked) => handleJobTypeToggle(exp.id, opt, checked as boolean)} />
                                <Label htmlFor={`jobType-${exp.id}-${opt}`} className="text-xs">{opt}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`position-${exp.id}`} className="text-sm">役職・ポジション</Label>
                          <Select value={exp.position} onValueChange={(v) => handleWorkExperienceChange(exp.id, 'position', v)}>
                            <SelectTrigger className="w-48 h-10 text-sm md:h-8 md:text-xs" id={`position-${exp.id}`}>
                              <SelectValue placeholder="役職を選択" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="メンバー">メンバー</SelectItem>
                              <SelectItem value="リーダー">リーダー</SelectItem>
                              <SelectItem value="マネージャー">マネージャー</SelectItem>
                              <SelectItem value="責任者">責任者</SelectItem>
                              <SelectItem value="役員">役員</SelectItem>
                              <SelectItem value="代表">代表</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`startDate-${exp.id}`} className="text-sm">開始年月</Label>
                            <Input id={`startDate-${exp.id}`} type="month" inputMode="numeric" placeholder="YYYY-MM" className="h-10 text-sm md:h-8 md:text-xs" value={exp.startDate} onChange={(e) => handleWorkExperienceChange(exp.id, 'startDate', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`endDate-${exp.id}`} className="text-sm">終了年月</Label>
                            <Input id={`endDate-${exp.id}`} type="month" inputMode="numeric" placeholder="YYYY-MM" className="h-10 text-sm md:h-8 md:text-xs" value={exp.endDate} onChange={(e) => handleWorkExperienceChange(exp.id, 'endDate', e.target.value)} disabled={exp.isCurrent} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`current-${exp.id}`} className="h-4 w-4 md:h-3.5 md:w-3.5" checked={exp.isCurrent} onCheckedChange={(checked) => handleWorkExperienceChange(exp.id, 'isCurrent', Boolean(checked))} />
                            <Label htmlFor={`current-${exp.id}`} className="text-sm">現在も在籍中</Label>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`jobDescription-${exp.id}`} className="text-sm">業務内容</Label>
                            <span className="text-xs text-gray-500">{exp.description.length}/500文字</span>
                          </div>
                          <Textarea id={`jobDescription-${exp.id}`} placeholder="担当した業務内容や成果について記入してください" className="min-h-[100px] text-sm" value={exp.description} onChange={(e) => handleWorkExperienceChange(exp.id, 'description', e.target.value)} maxLength={500} />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`technologies-${exp.id}`} className="text-sm">使用技術・ツール</Label>
                          <Input id={`technologies-${exp.id}`} placeholder="Word, Python, AWS, Figmaなど" className="h-10 text-sm md:h-8 md:text-xs" value={exp.technologies} onChange={(e) => handleWorkExperienceChange(exp.id, 'technologies', e.target.value)} />
                          {exp.technologies && exp.technologies.split(',').some(t => t.trim() !== '') && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {exp.technologies.split(',').map((tech, i) => {
                                const t = tech.trim();
                                if (!t) return null;
                                return <Badge key={i} variant="outline" className="bg-blue-50 text-xs">{t}</Badge>;
                              })}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`achievements-${exp.id}`} className="text-sm">成果・実績</Label>
                          <Textarea id={`achievements-${exp.id}`} placeholder="具体的な成果や数値、評価されたポイントなどを記入してください" className="min-h-[80px] text-sm" value={exp.achievements} onChange={(e) => handleWorkExperienceChange(exp.id, 'achievements', e.target.value)} />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}

              <Button variant="outline" className="w-full gap-1 border-dashed text-xs" onClick={addWorkExperience}>
                <PlusCircle className="h-4 w-4" /> 職歴を追加
              </Button>
              {resumeSaving && <p className="text-xs text-muted-foreground">保存中...</p>}
            </Card>
          </div>
        );
      }
      case 'visualize': {
        const a: AnalyzeResult = analyzeText(manualText);
        const max = Math.max(1, ...a.counts);
        return (
          <div className="space-y-4">
            <Card className="p-4 md:p-6">
              <h3 className="font-semibold text-foreground mb-2">概要</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">文字数</div>
                  <div className="font-semibold">{a.charCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">文の数</div>
                  <div className="font-semibold">{a.sentenceCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">語数(粗)</div>
                  <div className="font-semibold">{a.wordCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40">
                  <div className="text-xs text-muted-foreground">読了目安</div>
                  <div className="font-semibold">~{a.readMin}分</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">頻出キーワード（上位12）</h3>
                <div className="text-xs text-muted-foreground">#タグ: {manualTags.length}</div>
              </div>
              {a.words.length === 0 ? (
                <p className="text-sm text-muted-foreground">自己分析ノートに文章を入力すると可視化されます。</p>
              ) : (
                <div className="space-y-2">
                  {a.words.map((w: string, i: number) => (
                    <div key={w} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-muted-foreground truncate">{w}</div>
                      <div className="flex-1 h-3 bg-muted rounded">
                        <div
                          className="h-3 rounded bg-gradient-to-r from-blue-500 to-cyan-600"
                          style={{ width: `${(a.counts[i] / max) * 100}%` }}
                        />
                      </div>
                      <div className="w-8 text-right text-sm">{a.counts[i]}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        );
      }
      case 'lifeChart':
        return <LifeChart userId={userId ?? ''} onProgressUpdate={(p: number) => setToolProgress('lifeChart', p)} />;
      case 'futureVision':
        return <FutureVision onProgressUpdate={(p: number) => setToolProgress('futureVision', p)} />;

      case 'experienceReflection':
        return <SimpleExperienceReflection userId={userId ?? ''} onProgressUpdate={(p: number) => setToolProgress('experienceReflection', p)} />;
      default:
        return <AnalysisOverview progress={progress} onNavigateToTool={setActiveTab} />;
    }
  };

  const currentTool = getCurrentTool();

  // Per-tool progress for card grid
  const getToolProgressPct = useCallback((toolId: string): number => {
    switch (toolId) {
      case 'overview':
        return overviewPercentFromSections;
      case 'manual':
      case 'aiChat':
        return Math.round((sectionProgress.selfNote ?? 0) * 100);
      case 'lifeChart':
        return progress.lifeChart || 0;
      case 'futureVision':
        return progress.futureVision || 0;
      case 'strengthAnalysis':
        return progress.strengthAnalysis || 0;
      case 'experienceReflection':
        return progress.experienceReflection || 0;
      case 'resume': {
        try {
          return calcWorkCompletion(workExperiences);
        } catch { return 0; }
      }
      default:
        return 0;
    }
  }, [overviewPercentFromSections, sectionProgress.selfNote, progress.lifeChart, progress.futureVision, progress.strengthAnalysis, progress.experienceReflection, workExperiences, calcWorkCompletion]);

  const filteredTools = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return analysisTools;
    return analysisTools.filter(t =>
      [t.title, t.subtitle, t.description].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [navQuery]);


  if (loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-bold text-foreground mb-2">エラーが発生しました</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            ページを更新
          </Button>
        </Card>
      </div>
    );
  }

  if (!userId && !loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="font-bold text-foreground mb-2">ログインが必要です</h3>
          <p className="text-muted-foreground mb-4">自己分析データを保存・同期するにはログインしてください。</p>
          <Button onClick={() => navigate('/login')}>ログインへ</Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="bg-background min-h-screen md:pb-0 w-full max-w-[100vw] overflow-x-hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 5rem)' }}
    >
      <style jsx global>{`
        html, body, #__next { max-width: 100%; overflow-x: hidden; }
        * { box-sizing: border-box; }
        .no-horizontal-overflow { max-width: 100vw; overflow-x: hidden; }
      `}</style>
      {/* Header (minimal) */}
      <div className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/80">
        <div className="w-full max-w-[100vw] mx-auto px-4 sm:px-6 lg:px-6 py-2 md:py-4 min-h-14 flex items-center">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/ipo/dashboard')}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              aria-label="ダッシュボードに戻る"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate">自己分析</h1>
              <p className="text-xs text-muted-foreground hidden md:block">AIと対話しながら自己分析を進めましょう</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation + Content (render only on non-mobile to avoid double mounting) */}
      {!isMobile && (
        <div className="w-full max-w-[100vw] mx-auto px-4 sm:px-6 lg:px-6 py-6">
          <div className="w-full max-w-full overflow-x-hidden grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <aside className="hidden md:block md:col-span-4 lg:col-span-4 min-w-0">
              <div className="sticky top-[var(--header-height,64px)] space-y-3 min-w-0">
                {/* Vertical menu */}
                <nav aria-label="分析ツールメニュー" className="bg-muted/30 rounded-xl border p-2">
                  <ul className="flex flex-col">
                    {filteredTools.map((tool) => {
                      const isActive = activeTab === tool.id;
                      const Icon = tool.icon;
                      return (
                        <li key={tool.id}>
                          <button
                            onClick={() => handleTabChange(tool.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                              isActive ? 'bg-background border border-border text-foreground' : 'hover:bg-white/60 text-muted-foreground'
                            }`}
                          >
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r ${tool.color}`}>
                              <Icon className="h-4 w-4 text-white" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{tool.title}</div>
                              <div className="text-xs text-muted-foreground truncate">{tool.subtitle}</div>
                            </div>
                            {tool.badge && (
                              <Badge className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none bg-sky-100 text-sky-700">
                                {tool.badge}
                              </Badge>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {filteredTools.length === 0 && (
                    <div className="text-sm text-muted-foreground p-3 text-center">該当するツールが見つかりません</div>
                  )}
                </nav>
              </div>
            </aside>

            {/* Right content */}
            <div className="col-span-1 md:col-span-8 lg:col-span-8 min-w-0">
              {renderContent()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Content (render only on mobile to avoid double mounting) */}
      {isMobile && (
        <div className="px-3 sm:px-3 lg:px-3 pt-3 w-full max-w-[100vw] overflow-x-hidden no-horizontal-overflow">
          <div className="sticky top-14 z-40 bg-background border-b pb-3 pt-2">
            <div className="relative" aria-label="分析タブ">
              <div className="h-12 w-full max-w-full min-w-0 overscroll-x-contain rounded-lg border flex items-center gap-2 overflow-x-auto snap-x snap-mandatory whitespace-nowrap px-1.5">
                {analysisTools.map((tool) => {
                  const isActive = activeTab === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleTabChange(tool.id)}
                      className={`snap-start shrink-0 flex items-center gap-2 px-3 py-3.5 rounded-full text-sm whitespace-nowrap min-w-[70px] transition-colors ${
                        isActive ? 'bg-background text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <tool.icon className="w-5 h-5 shrink-0" />
                      <span>{tool.subtitle || tool.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="pt-4 px-1 max-w-full overflow-x-hidden">{renderContent()}</div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const navigate = (route: string) => router.push(route);
  return <AnalysisPage navigate={navigate} />;
}