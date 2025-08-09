"use client";
import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
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
  Info
} from 'lucide-react';
// Local Route type to satisfy navigate prop
type Route = string;
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AIChat } from '@/components/analysis/AIChat';
import { LifeChart } from '@/components/analysis/LifeChart';
import { FutureVision } from '@/components/analysis/FutureVision';
import { StrengthAnalysis } from '@/components/analysis/StrengthAnalysis';
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
    id: 'strengthAnalysis',
    title: '強み・弱み分析',
    subtitle: '能力診断',
    description: '客観的な視点で自分の特性を分析',
    icon: Star,
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    longDescription: '多角的な質問で強みと改善点を明確にします。',
    benefits: ['強みの発見', '成長領域の特定', '具体的改善策'],
    estimatedTime: '20-35分',
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
    badge: 'HOT'
  }
];

export function AnalysisPage({ navigate }: AnalysisPageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(false);
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
  // 構造化ノート（自己分析 / 自己PR）
  const [manual, setManual] = useState({
    selfAnalysis: '',
    prTitle: '',
    about: '',
    prText: '',
    strengths: ['', '', ''],
  });
  // --- autosave control for manual note ---
  const manualFirstRenderRef = useRef(true);
  const manualSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
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
      }
    });

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  // シンプルなタグ抽出（#タグ を拾う）
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

      const next = {
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
            ])
      };

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

  // 手動ノートの保存（既存テーブル: student_profiles を利用、onConflictを避けて安定カラムのみでupdate-then-insert）
  const saveManualNote = async () => {
    if (!userId) return;
    setNoteSaving(true);

    try {
      const keyField = profileKey; // 'user_id' or 'id'

      // Minimal, stable columns only — these are confirmed to exist in your schema
      const minimalPayload: any = {
        pr_title: manual.prTitle || null,
        about: manual.about || null,
        pr_text: manual.prText || null,
        updated_at: new Date().toISOString(),
      };

      // 1) check if a row exists for this user
      const { data: existing, error: selErr } = await supabase
        .from('student_profiles')
        .select(keyField)
        .eq(keyField, userId)
        .maybeSingle();

      if (selErr && selErr.code !== 'PGRST116') {
        // PGRST116 = Results contain 0 rows; we'll treat it as no row
        throw selErr;
      }

      if (existing) {
        // 2) Update existing row
        const { error: updErr } = await supabase
          .from('student_profiles')
          .update(minimalPayload)
          .eq(keyField, userId);
        if (updErr) throw updErr;
      } else {
        // 3) Insert new row with the key field
        const { error: insErr } = await supabase
          .from('student_profiles')
          .insert([{ [keyField]: userId, ...minimalPayload }]);
        if (insErr) throw insErr;
      }

      // Best-effort: also sync to resumes.form_data for display elsewhere (ignores errors)
      try {
        await supabase
          .from('resumes')
          .upsert(
            {
              user_id: userId,
              form_data: {
                basic: {},
                pr: { title: manual.prTitle || '', content: manual.prText || '', motivation: manual.about || '' },
                conditions: {}
              }
            },
            { onConflict: 'user_id' }
          );
      } catch {}

      // Update preview values
      const serialized = JSON.stringify(manual);
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
        return <AnalysisOverview progress={progress} onNavigateToTool={setActiveTab} />;
      case 'aiChat':
        return <AIChat userId={userId ?? ''} onProgressUpdate={(p: number) => setToolProgress('aiChat', p)} />;
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
            <Label htmlFor="pr_title" className="text-xs sm:text-sm">PR タイトル</Label>
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
              <Label htmlFor="about" className="text-xs sm:text-sm">自己紹介（〜200文字）</Label>
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
              <Label htmlFor="pr_text" className="text-xs sm:text-sm">自己PR（〜800文字）</Label>
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
            <Label className="text-xs sm:text-sm">強み（最大3つ）</Label>
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
      case 'strengthAnalysis':
        return <StrengthAnalysis userId={userId ?? ''} onProgressUpdate={(p: number) => setToolProgress('strengthAnalysis', p)} />;
      case 'experienceReflection':
        return <SimpleExperienceReflection userId={userId ?? ''} onProgressUpdate={(p: number) => setToolProgress('experienceReflection', p)} />;
      default:
        return <AnalysisOverview progress={progress} onNavigateToTool={setActiveTab} />;
    }
  };

  const currentTool = getCurrentTool();

  // Mobile Bottom Sheet Navigation
  const MobileBottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className={`w-10 h-10 bg-gradient-to-r ${currentTool.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <currentTool.icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate">{currentTool.title}</h3>
            <p className="text-xs text-gray-500 truncate">{currentTool.subtitle}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMobileMenu(true)}
          className="flex-shrink-0 ml-3"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // Mobile Menu Sheet (no AnimatePresence to avoid Presence loops)
  const MobileMenuSheet = () => {
    if (!showMobileMenu) return null;
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h[80vh] overflow-y-auto md:hidden transition-transform duration-200"
        >
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">分析ツール</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="mt-3">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <BarChart3 className="w-4 h-4" />
                  <span>総合進捗 {overallProgress}%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Award className="w-4 h-4" />
                  <span>{Object.values(progress).filter(p => p >= 100).length}/{analysisTools.length} 完了</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {analysisTools.map((tool) => {
              const isActive = activeTab === tool.id;
              const toolProgress = (progress as any)[tool.id] || 0;
              const IconComponent = tool.icon;
              
              return (
                <button
                  key={tool.id}
                  onClick={() => handleTabChange(tool.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    isActive 
                      ? 'bg-blue-50 border-2 border-blue-200' 
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${tool.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-semibold truncate ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                          {tool.title}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                          {tool.badge && (
                            <Badge className="text-xs px-2 py-1 bg-blue-100 text-blue-700">
                              {tool.badge}
                            </Badge>
                          )}
                          <Badge className={`text-xs ${
                            tool.difficulty === '簡単' ? 'bg-green-100 text-green-700' :
                            tool.difficulty === '普通' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {tool.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tool.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{tool.estimatedTime}</span>
                        </div>
                        <div className="text-xs font-medium text-blue-600">
                          {toolProgress >= 100 ? '完了' : `${toolProgress}%`}
                        </div>
                      </div>
                      <Progress value={toolProgress} className="mt-2 h-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  };

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
    <div className="bg-background min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ipo/dashboard')}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                aria-label="ダッシュボードに戻る"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
                  自己分析プラットフォーム
                </h1>
                <p className="text-sm text-muted-foreground hidden md:block">
                  多角的なアプローチで自分自身を深く理解しましょう
                </p>
              </div>
            </div>
            
            {/* Desktop Progress */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">総合進捗</div>
                <div className="text-lg font-bold text-foreground">{overallProgress}%</div>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted opacity-20"
                  />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - overallProgress / 100)}`}
                    className="text-primary transition-all duration-1000 ease-out"
                    initial={{ strokeDashoffset: `${2 * Math.PI * 28}` }}
                    animate={{ strokeDashoffset: `${2 * Math.PI * 28 * (1 - overallProgress / 100)}` }}
                    transition={{ duration: 1, ease: "easeInOut", delay: 0.5 }}
                  />
                </svg>
                <Brain className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
            </div>

            {/* Mobile Progress */}
            <div className="flex md:hidden items-center space-x-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">進捗</div>
                <div className="text-sm font-bold text-foreground">{overallProgress}%</div>
              </div>
              <div className="w-10 h-10 relative">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted opacity-20"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - overallProgress / 100)}`}
                    className="text-primary transition-all duration-1000 ease-out"
                  />
                </svg>
                <Brain className="w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation + Content (render only on non-mobile to avoid double mounting) */}
      {!isMobile && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="w-full">
            <div className="sticky top-[120px] z-40 bg-background/80 backdrop-blur-sm pt-2 pb-3 mb-6">
              <div
                className="w-full h-12 p-1 bg-muted/40 rounded-xl border flex items-center gap-2 overflow-x-auto"
                role="tablist"
                aria-label="分析ツールナビゲーション"
              >
                {analysisTools.map((tool) => {
                  const isActive = activeTab === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleTabChange(tool.id)}
                      className={
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ` +
                        (isActive
                          ? 'bg-background shadow-sm text-foreground border border-border'
                          : 'text-muted-foreground hover:text-foreground')
                      }
                    >
                      <tool.icon className="w-4 h-4" />
                      <span className="hidden lg:block">{tool.title}</span>
                      <span className="lg:hidden">{tool.subtitle}</span>
                      {tool.badge && (
                        <Badge className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none bg-sky-100 text-sky-700">
                          {tool.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop Content */}
            <div className="mt-0">
              {renderContent()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Content (render only on mobile to avoid double mounting) */}
      {isMobile && (
        <>
          <div className="px-4 py-4">
            {renderContent()}
          </div>
          {/* Mobile Components */}
          <MobileBottomNav />
          <MobileMenuSheet />
        </>
      )}
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const navigate = (route: string) => router.push(route);
  return <AnalysisPage navigate={navigate} />;
}