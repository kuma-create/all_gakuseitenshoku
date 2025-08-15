import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Switch, StyleSheet, Dimensions, Alert as RNAlert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, BarChart3, MessageCircle, Target as TargetIcon, BookOpen, TrendingUp, FileText, Star, Info, ChevronDown, ChevronUp, Trash2, PlusCircle, Building } from 'lucide-react-native';
import { supabase } from "src/lib/supabase";

import AIChat from 'components/ipo/analysis/AIChat';
import AnalysisOverview from 'components/ipo/analysis/AnalysisOverview';
import LifeChart from 'components/ipo/analysis/LifeChart';
import FutureVision from 'components/ipo/analysis/FutureVision';
import SimpleExperienceReflection from 'components/ipo/analysis/SimpleExperienceReflection';

// ===== Types =====
// Local Route type to satisfy navigate prop
export type Route = string;

interface AnalysisProgress {
  aiChat: number;
  lifeChart: number;
  futureVision: number;
  strengthAnalysis: number;
  experienceReflection: number;
}

interface AnalysisToolMeta {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
}

const analysisTools: AnalysisToolMeta[] = [
  { id: 'overview', title: '分析概要', subtitle: '全体進捗', description: '自己分析の進捗状況を確認', icon: BarChart3 },
  { id: 'aiChat', title: 'AI対話分析', subtitle: 'AI壁打ち', description: 'AIとの対話で自己理解を深める', icon: MessageCircle },
  { id: 'manual', title: '自己分析ノート', subtitle: '自己PR/自己分析', description: '自由記述で自己分析・自己PRを作成', icon: BookOpen },
  { id: 'resume', title: '職務経歴書', subtitle: '職歴入力', description: 'アルバイト/インターン等の職歴を入力・保存', icon: FileText },
  { id: 'lifeChart', title: 'ライフチャート', subtitle: '人生振り返り', description: '重要な出来事を時系列で可視化', icon: TrendingUp },
  { id: 'futureVision', title: '将来ビジョン', subtitle: 'キャリア設計', description: '将来像と行動計画を設計', icon: TargetIcon },
];

// 職歴アイテム型（web版互換）
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

// 簡易 強み/弱み
interface SimpleTrait {
  id: string;
  title: string;
  note: string;
}

// ===== Main Page =====
export default function AnalysisIndex() {
  const router = useRouter();
  const navigate = (route: string) => router.push(route as any);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [progress, setProgress] = useState<AnalysisProgress>({ aiChat: 0, lifeChart: 0, futureVision: 0, strengthAnalysis: 0, experienceReflection: 0 });
  const [userId, setUserId] = useState<string | null>(null);
  const [profileKey, setProfileKey] = useState<'user_id' | 'id'>('user_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preserve tab bar scroll position
  const tabScrollRef = useRef<ScrollView | null>(null);
  const tabScrollXRef = useRef(0);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const restoreTabScroll = () => {
    const x = tabScrollXRef.current || 0;
    if (tabScrollRef.current) tabScrollRef.current.scrollTo({ x, animated: false });
  };

  // manual note state
  const [manual, setManual] = useState({
    selfAnalysis: '',
    prTitle: '',
    about: '',
    prText: '',
    strengths: ['', '', ''],
    strengthItems: [] as SimpleTrait[],
    weaknessItems: [] as SimpleTrait[],
  });
  const [manualText, setManualText] = useState('');
  const [manualTags, setManualTags] = useState<string[]>([]);
  const manualFirstRenderRef = useRef(true);
  const manualSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // resume state
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>([{
    id: 1, isOpen: true, company: '', position: '', jobTypes: [], startDate: '', endDate: '', isCurrent: false, description: '', technologies: '', achievements: ''
  }]);
  const [resumeSaving, setResumeSaving] = useState(false);
  const resumeSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const upsertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== helpers =====
  const runIdle = (cb: () => void) => setTimeout(cb, 0);

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

  const computeSelfNoteProgress = (m: typeof manual): number => {
    const len = (s?: string) => (typeof s === 'string' ? s.trim().length : 0);
    const titleDone = len(m.prTitle) > 0 ? 1 : 0;
    const aboutRatio = Math.min(1, len(m.about) / 200);
    const prRatio = Math.min(1, len(m.prText) / 800);
    const selfAnalysisRatio = Math.min(1, len(m.selfAnalysis) / 600);
    const strengthCountRatio = Math.min(1, (Math.min(3, (m.strengthItems?.filter((x) => len(x.title) > 0).length) || 0) / 3));
    const weaknessCountRatio = Math.min(1, (Math.min(2, (m.weaknessItems?.filter((x) => len(x.title) > 0).length) || 0) / 2));
    const weighted = 0.12 * titleDone + 0.18 * aboutRatio + 0.30 * prRatio + 0.15 * selfAnalysisRatio + 0.15 * strengthCountRatio + 0.10 * weaknessCountRatio;
    return Math.max(0, Math.min(1, Number.isFinite(weighted) ? weighted : 0));
  };

  const sectionProgress = useMemo(() => ({
    selfNote: computeSelfNoteProgress(manual),
    lifeChart: Math.max(0, Math.min(1, (progress.lifeChart || 0) / 100)),
    strengthsWeaknesses: Math.max(0, Math.min(1, (progress.strengthAnalysis || 0) / 100)),
    experience: Math.max(0, Math.min(1, (progress.experienceReflection || 0) / 100)),
    futureVision: Math.max(0, Math.min(1, (progress.futureVision || 0) / 100)),
  }), [manual, progress]);

  const overviewPercentFromSections = useMemo(() => {
    const vals = [sectionProgress.selfNote, sectionProgress.lifeChart, sectionProgress.strengthsWeaknesses, sectionProgress.experience, sectionProgress.futureVision];
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 100);
  }, [sectionProgress]);

  const progressForOverview = useMemo(() => ({
    aiChat: Math.round((sectionProgress.selfNote ?? 0) * 100),
    lifeChart: progress.lifeChart,
    futureVision: progress.futureVision,
    strengthAnalysis: progress.strengthAnalysis,
    experienceReflection: progress.experienceReflection,
  }), [sectionProgress.selfNote, progress]);

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
      (obj.strengthItems || []).forEach((it) => { [it.title, it.note].forEach((s) => { if (!s) return; const mt = s.match(regex); mt?.forEach((tag) => set.add(tag.replace(/^#/, '').slice(0,24))); }); });
      (obj.weaknessItems || []).forEach((it) => { [it.title, it.note].forEach((s) => { if (!s) return; const mt = s.match(regex); mt?.forEach((tag) => set.add(tag.replace(/^#/, '').slice(0,24))); }); });
    }
    return Array.from(set).slice(0, 12);
  };

  const analyzeText = (text: string) => {
    const src = (text ?? '').toLowerCase();
    const charCount = src.length;
    const sentenceCount = src.split(/[。\.!?]+/u).filter(Boolean).length;
    const tokens = src.replace(/[^\p{L}\p{N}_一-龥ぁ-んァ-ヶー\s]/gu, ' ').split(/\s+/).filter(Boolean);
    const wordCount = tokens.length;
    const readMin = Math.max(1, Math.round(wordCount / 400));
    const stop = new Set(['の','に','は','を','た','が','で','て','と','し','れ','さ','です','ます','する','いる','ある','そして','また','ため','こと','もの','よう','から','まで','や','など','なり','なる','へ','か','も','その','この','あの']);
    const freq = new Map<string, number>();
    for (const t of tokens) { if (stop.has(t)) continue; freq.set(t, (freq.get(t) ?? 0) + 1); }
    const top = Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12);
    return { words: top.map(([w])=>w), counts: top.map(([,c])=>c), charCount, sentenceCount, wordCount, readMin };
  };

  // ---- AIChat → 自己分析ノート反映用（Web版互換） ----
  const applyManualUpdate = React.useCallback((upd: Partial<{ prTitle: string; about: string; prText: string; selfAnalysis: string; strengths: string[] }>) => {
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
        if ((!prev.strengthItems || prev.strengthItems.length === 0) && Array.isArray(next.strengths)) {
          const seeded = next.strengths
            .filter((s) => s && s.trim())
            .map((s) => ({ id: `${Math.random()}` as string, title: s.trim(), note: '' }));
          if (seeded.length) next.strengthItems = seeded.slice(0, 3);
        }
      }
      return next;
    });
  }, [setManual]);

  // ===== Supabase IO =====
  const upsertProgress = useCallback((p: AnalysisProgress) => {
    if (!userId) return;
    if (upsertTimerRef.current) clearTimeout(upsertTimerRef.current);
    upsertTimerRef.current = setTimeout(async () => {
      try {
        const payload = { user_id: userId, ai_chat: p.aiChat, life_chart: p.lifeChart, future_vision: p.futureVision, strength_analysis: p.strengthAnalysis, experience_reflection: p.experienceReflection, updated_at: new Date().toISOString() } as any;
        const { error: upsertErr } = await supabase.from('ipo_analysis_progress').upsert(payload, { onConflict: 'user_id' });
        if (upsertErr) throw upsertErr;
      } catch (err) {
        console.warn('Error updating progress:', err);
        setError('進捗の保存に失敗しました');
      }
    }, 500);
  }, [userId]);

  const setToolProgress = useCallback((key: keyof AnalysisProgress, value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value || 0)));
    if (progress[key] === v) return;
    const next = { ...progress, [key]: v } as AnalysisProgress;
    setProgress(next);
    upsertProgress(next);
  }, [progress, upsertProgress]);

  const pickNonEmpty = (...vals: any[]): string => {
    for (const v of vals) { if (typeof v === 'string' && v.trim() !== '') return v; }
    return '';
  };

  const loadManualNote = async (uid: string) => {
    try {
      const colsA = 'user_id,id,pr_title,about,pr_text,pr_body,strength1,strength2,strength3,motive,updated_at';
      const colsB = 'user_id,id,analysis_note,pr_title,about,pr_text,strengths,pr_body,strength1,strength2,strength3,motive,updated_at';
      const tryFetch = async (cols: string, key: 'user_id' | 'id') => supabase.from('student_profiles').select(cols).eq(key, uid).maybeSingle();

      let res = await tryFetch(colsA, 'user_id');
      if (res.error?.code === '42703' || (!res.data && res.error)) res = await tryFetch(colsB, 'user_id');
      if (!res.data) {
        let resId = await tryFetch(colsA, 'id');
        if (resId.error?.code === '42703' || (!resId.data && resId.error)) resId = await tryFetch(colsB, 'id');
        res = resId;
      }
      if (res.error) console.warn('loadManualNote warning:', res.error.message);
      const data: any = res.data;
      if (!data) return;
      setProfileKey(data.user_id ? 'user_id' : 'id');

      let parsed: any = null;
      const raw = (data as any).analysis_note ?? '';
      if (typeof raw === 'string' && raw.trim()) { try { parsed = JSON.parse(raw); } catch { parsed = { selfAnalysis: String(raw) }; } }
      else if (raw && typeof raw === 'object') { parsed = raw; }

      const next = {
        selfAnalysis: pickNonEmpty(parsed?.selfAnalysis, ''),
        prTitle:      pickNonEmpty(parsed?.prTitle, (data as any).pr_title, ''),
        about:        pickNonEmpty(parsed?.about, (data as any).about, (data as any).motive, ''),
        prText:       pickNonEmpty(parsed?.prText, (data as any).pr_text, (data as any).pr_body, ''),
        strengths: [
          pickNonEmpty((parsed?.strengths||[])[0], (data as any).strength1, ''),
          pickNonEmpty((parsed?.strengths||[])[1], (data as any).strength2, ''),
          pickNonEmpty((parsed?.strengths||[])[2], (data as any).strength3, ''),
        ],
        strengthItems: [] as SimpleTrait[],
        weaknessItems: [] as SimpleTrait[],
      };

      try {
        const { data: sRows } = await supabase.from('ipo_traits').select('id,title,note').eq('user_id', uid).eq('kind', 'strength');
        if (Array.isArray(sRows)) next.strengthItems = sRows.map((r: any) => ({ id: String(r.id ?? `${Math.random()}`), title: String(r.title || ''), note: String(r.note || '') }));
      } catch {}
      try {
        const { data: wRows } = await supabase.from('ipo_traits').select('id,title,note').eq('user_id', uid).eq('kind', 'weakness');
        if (Array.isArray(wRows)) next.weaknessItems = wRows.map((r: any) => ({ id: String(r.id ?? `${Math.random()}`), title: String(r.title || ''), note: String(r.note || '') }));
      } catch {}

      if ((next.strengthItems?.length ?? 0) === 0) {
        const seeded = (next.strengths || []).filter((s) => s && s.trim()).map((s) => ({ id: `${Math.random()}`, title: s.trim(), note: '' }));
        next.strengthItems = seeded.slice(0,3);
      }

      setManual(next);
      const serialized = JSON.stringify(next);
      setManualText(serialized);
      setManualTags(extractTags(serialized, next));
    } catch (e) {
      console.warn('loadManualNote skipped:', e);
    }
  };

  const saveManualNote = async () => {
    if (!userId) return;
    try {
      const keyField = profileKey;
      const { data: existing, error: selErr } = await supabase.from('student_profiles').select(keyField).eq(keyField, userId).maybeSingle();
      if (selErr && selErr.code !== 'PGRST116') throw selErr;

      const minimalPayload: any = { pr_title: manual.prTitle || null, about: manual.about || null, pr_text: manual.prText || null, updated_at: new Date().toISOString() };
      if (existing) {
        const { error: updErr } = await supabase.from('student_profiles').update(minimalPayload).eq(keyField, userId);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from('student_profiles').insert([{ [keyField]: userId, ...minimalPayload }]);
        if (insErr) throw insErr;
      }

      try {
        const sPayload = (manual.strengthItems || []).filter((it) => (it.title || '').trim()).map((it) => ({ user_id: userId, kind: 'strength', title: it.title.trim(), note: (it.note || '').trim() || null, updated_at: new Date().toISOString() }));
        if (sPayload.length) {
          const { error: sUpErr } = await supabase.from('ipo_traits').upsert(sPayload as any, { onConflict: 'user_id,kind,title' });
          if (sUpErr) throw sUpErr;
        }
        const keepS = sPayload.map((r) => r.title);
        const { data: existingS } = await supabase.from('ipo_traits').select('title').eq('user_id', userId).eq('kind', 'strength');
        const toDeleteS = (existingS||[]).map((r:any)=>String(r.title)).filter((t)=>!keepS.includes(t));
        if (toDeleteS.length) await supabase.from('ipo_traits').delete().eq('user_id', userId).eq('kind','strength').in('title', toDeleteS as any);
      } catch (e) { console.warn('strength save warn', e); }

      try {
        const wPayload = (manual.weaknessItems || []).filter((it) => (it.title || '').trim()).map((it) => ({ user_id: userId, kind: 'weakness', title: it.title.trim(), note: (it.note || '').trim() || null, updated_at: new Date().toISOString() }));
        if (wPayload.length) {
          const { error: wUpErr } = await supabase.from('ipo_traits').upsert(wPayload as any, { onConflict: 'user_id,kind,title' });
          if (wUpErr) throw wUpErr;
        }
        const keepW = wPayload.map((r) => r.title);
        const { data: existingW } = await supabase.from('ipo_traits').select('title').eq('user_id', userId).eq('kind', 'weakness');
        const toDeleteW = (existingW||[]).map((r:any)=>String(r.title)).filter((t)=>!keepW.includes(t));
        if (toDeleteW.length) await supabase.from('ipo_traits').delete().eq('user_id', userId).eq('kind','weakness').in('title', toDeleteW as any);
      } catch (e) { console.warn('weakness save warn', e); }

      try {
        await supabase.from('resumes').upsert({ user_id: userId, form_data: { basic: {}, pr: { title: manual.prTitle || '', content: manual.prText || '', motivation: manual.about || '' }, conditions: {} } }, { onConflict: 'user_id' });
      } catch {}

      const serialized = JSON.stringify(manual);
      setManualText(serialized);
      setManualTags(extractTags(serialized, manual));
    } catch (e) {
      console.warn('saveManualNote error:', e);
      setError('ノートの保存に失敗しました（student_profiles のスキーマを確認してください）');
    }
  };

  // load auth + data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id ?? null;
        if (!mounted) return;
        setUserId(uid);
        if (uid) {
          const { data } = await supabase.from('ipo_analysis_progress').select('ai_chat, life_chart, future_vision, strength_analysis, experience_reflection').eq('user_id', uid).maybeSingle();
          if (data) setProgress({ aiChat: data.ai_chat ?? 0, lifeChart: data.life_chart ?? 0, futureVision: data.future_vision ?? 0, strengthAnalysis: data.strength_analysis ?? 0, experienceReflection: data.experience_reflection ?? 0 });
          await loadManualNote(uid);
          try {
            const { data: resumeRow } = await supabase.from('resumes').select('id, work_experiences').eq('user_id', uid).maybeSingle();
            if (resumeRow?.work_experiences && Array.isArray(resumeRow.work_experiences)) setWorkExperiences(resumeRow.work_experiences as unknown as WorkExperience[]);
          } catch {}
        }
      } catch (e) {
        setError('データ取得に失敗しました');
      } finally {
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      const shouldRefetch = event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION';
      if (uid && shouldRefetch) {
        supabase.from('ipo_analysis_progress').select('ai_chat, life_chart, future_vision, strength_analysis, experience_reflection').eq('user_id', uid).maybeSingle().then(({ data }) => {
          if (data) setProgress({ aiChat: data.ai_chat ?? 0, lifeChart: data.life_chart ?? 0, futureVision: data.future_vision ?? 0, strengthAnalysis: data.strength_analysis ?? 0, experienceReflection: data.experience_reflection ?? 0 });
        });
        loadManualNote(uid);
        supabase.from('resumes').select('id, work_experiences').eq('user_id', uid).maybeSingle().then(({ data: resumeRow }) => {
          if (resumeRow?.work_experiences && Array.isArray(resumeRow.work_experiences)) setWorkExperiences(resumeRow.work_experiences as unknown as WorkExperience[]);
        });
      }
    });

    return () => { try { sub?.subscription?.unsubscribe?.(); } catch {} mounted = false; };
  }, []);

  // debounced save: manual
  useEffect(() => {
    if (manualFirstRenderRef.current) { manualFirstRenderRef.current = false; return; }
    if (!userId) return;
    try {
      const serialized = JSON.stringify(manual);
      setManualText(serialized);
      setManualTags(extractTags(serialized, manual));
    } catch {}
    if (manualSaveTimerRef.current) clearTimeout(manualSaveTimerRef.current);
    manualSaveTimerRef.current = setTimeout(() => { saveManualNote(); }, 500);
    return () => { if (manualSaveTimerRef.current) clearTimeout(manualSaveTimerRef.current); };
  }, [manual, userId]);

  // debounced save: resume work experiences
  useEffect(() => {
    if (!userId) return;
    if (resumeSaveTimerRef.current) clearTimeout(resumeSaveTimerRef.current);
    resumeSaveTimerRef.current = setTimeout(async () => {
      try {
        setResumeSaving(true);
        const { data: existing } = await supabase.from('resumes').select('id').eq('user_id', userId).maybeSingle();
        if (existing?.id) {
          const { error: updErr } = await supabase.from('resumes').update({ work_experiences: workExperiences as any, updated_at: new Date().toISOString() }).eq('id', existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from('resumes').insert({ user_id: userId, work_experiences: workExperiences as any, updated_at: new Date().toISOString() });
          if (insErr) throw insErr;
        }
      } catch (e) {
        setError('職歴の保存に失敗しました');
      } finally {
        setResumeSaving(false);
      }
    }, 800);
    return () => { if (resumeSaveTimerRef.current) clearTimeout(resumeSaveTimerRef.current); };
  }, [workExperiences, userId]);

  // ===== UI small helpers =====
  const Tag = ({ label }: { label: string }) => (
    <View style={styles.tag}><Text style={styles.tagText}>#{label}</Text></View>
  );

  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity accessibilityLabel="ダッシュボードに戻る" onPress={() => navigate('/ipo/dashboard')} style={styles.iconBtn}>
        <ArrowLeft size={20} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>自己分析</Text>
        <Text style={styles.headerSub}>AIと対話しながら自己分析を進めましょう</Text>
      </View>
    </View>
  );

  const MobileTabs = () => (
    <ScrollView
      ref={(r) => { tabScrollRef.current = r; }}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.tabBar, styles.tabBarTight]}
      onScroll={(e) => {
        tabScrollXRef.current = e.nativeEvent.contentOffset.x;
      }}
      scrollEventThrottle={16}
      onContentSizeChange={restoreTabScroll}
    >
      {analysisTools.map((tool) => {
        const isActive = activeTab === tool.id;
        const Icon = tool.icon;
        return (
          <TouchableOpacity
            key={tool.id}
            onLayout={({ nativeEvent: { layout } }) => {
              tabLayoutsRef.current[tool.id] = { x: layout.x, width: layout.width };
            }}
            onPress={() => {
              // Keep current scroll position and center the tapped tab if possible
              startTransition(() => setActiveTab(tool.id));
              const layout = tabLayoutsRef.current[tool.id];
              if (layout && tabScrollRef.current) {
                const screenW = Dimensions.get('window').width;
                const targetX = Math.max(0, layout.x - (screenW - layout.width) / 2);
                tabScrollRef.current.scrollTo({ x: targetX, animated: true });
              } else {
                // Fallback: restore previous position
                requestAnimationFrame(restoreTabScroll);
              }
            }}
            style={[styles.tabChip, isActive && styles.tabChipActive]}
          >
            <Icon size={18} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tool.subtitle || tool.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ===== render blocks =====
  const renderOverview = () => (
    <View style={{ gap: 12 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>全体進捗</Text>
        <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <View style={{ flex: Math.max(0, Math.min(100, overviewPercentFromSections)), backgroundColor: '#111827' }} />
            <View style={{ flex: Math.max(0, 100 - Math.max(0, Math.min(100, overviewPercentFromSections))) }} />
          </View>
        </View>
        <Text style={styles.muted}>平均 {overviewPercentFromSections}%</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>各セクション</Text>
        {[
          ['AI対話/自己PR', Math.round((sectionProgress.selfNote||0)*100)],
          ['ライフチャート', progress.lifeChart||0],
          ['経験の整理', progress.experienceReflection||0],
          ['将来ビジョン', progress.futureVision||0],
        ].map(([label, pct], idx) => (
          <View key={`${label}-${idx}`} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.muted}>{label as string}</Text>
              <Text style={styles.muted}>{pct as number}%</Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginTop: 4 }}>
              <View style={{ flexDirection: 'row', flex: 1 }}>
                <View style={{ flex: Math.max(0, Math.min(100, Number(pct))), backgroundColor: '#2563EB' }} />
                <View style={{ flex: Math.max(0, 100 - Math.max(0, Math.min(100, Number(pct)))) }} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const addStrengthItem = () => setManual((p) => ({ ...p, strengthItems: [...(p.strengthItems||[]), { id: `${Math.random()}`, title: '', note: '' }] }));
  const removeStrengthItem = (id: string) => setManual((p) => ({ ...p, strengthItems: (p.strengthItems||[]).filter((s)=>s.id!==id) }));
  const updateStrengthItem = (id: string, field: keyof SimpleTrait, value: string) => setManual((p) => ({ ...p, strengthItems: (p.strengthItems||[]).map((s)=> s.id===id ? { ...s, [field]: value } : s) }));
  const addWeaknessItem = () => setManual((p) => ({ ...p, weaknessItems: [...(p.weaknessItems||[]), { id: `${Math.random()}`, title: '', note: '' }] }));
  const removeWeaknessItem = (id: string) => setManual((p) => ({ ...p, weaknessItems: (p.weaknessItems||[]).filter((s)=>s.id!==id) }));
  const updateWeaknessItem = (id: string, field: keyof SimpleTrait, value: string) => setManual((p) => ({ ...p, weaknessItems: (p.weaknessItems||[]).map((s)=> s.id===id ? { ...s, [field]: value } : s) }));

  const renderManual = () => (
    <View style={{ gap: 12 }}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FileText size={18} />
          <Text style={[styles.cardTitle, { marginLeft: 6 }]}>自己PR／自己分析ノート</Text>
        </View>
        <Text style={styles.muted}>自己分析・自己PRをここでまとめて保存できます（200/800 文字制限あり）</Text>

        <Text style={styles.label}>PR タイトル</Text>
        <TextInput value={manual.prTitle} onChangeText={(t)=>setManual((p)=>({ ...p, prTitle: t }))} placeholder="あなたを一言で" style={styles.input} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.label}>自己紹介（〜200文字）</Text>
          <Text style={styles.counter}>{manual.about.length}/200</Text>
        </View>
        <TextInput value={manual.about} onChangeText={(t)=>setManual((p)=>({ ...p, about: t.slice(0,200) }))} placeholder="200文字以内で自己紹介" style={[styles.input, styles.textarea]} multiline />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.label}>自己PR（〜800文字）</Text>
          <Text style={styles.counter}>{manual.prText.length}/800</Text>
        </View>
        <TextInput value={manual.prText} onChangeText={(t)=>setManual((p)=>({ ...p, prText: t.slice(0,800) }))} placeholder="課題 → 行動 → 成果 の順でエピソードを具体的に" style={[styles.input, styles.textarea]} multiline />

        <Text style={styles.label}>強み（最大3つ）</Text>
        {[0,1,2].map((i)=> (
          <TextInput key={i} value={manual.strengths[i]} onChangeText={(t)=>setManual((p)=>{ const arr=[...p.strengths]; arr[i]=t; return { ...p, strengths: arr }; })} placeholder={`強み${i+1}`} style={styles.input} />
        ))}

        {manualTags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            {manualTags.map((t) => <Tag key={t} label={t} />)}
          </View>
        )}
      </View>

      {/* 強み・弱み（簡易） */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Star size={18} />
          <Text style={[styles.cardTitle, { marginLeft: 6 }]}>強み・弱み（簡易入力・複数可）</Text>
        </View>
        <Text style={styles.muted}>詳細なスコアやカテゴリは不要。名称と一言メモだけでOKです。</Text>

        {/* 強み */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.label}>強み</Text>
          <TouchableOpacity style={styles.btnOutlineSm} onPress={addStrengthItem}><PlusCircle size={16} /><Text style={styles.btnOutlineSmText}> 追加</Text></TouchableOpacity>
        </View>
        {(manual.strengthItems||[]).length === 0 ? (
          <Text style={styles.muted}>まだ追加されていません。</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {(manual.strengthItems||[]).map((it) => (
              <View key={it.id} style={styles.blockBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput placeholder="例：課題解決力" value={it.title} onChangeText={(t)=>updateStrengthItem(it.id, 'title', t)} style={[styles.input, { flex: 1 }]} />
                  <TouchableOpacity onPress={()=>removeStrengthItem(it.id)} style={{ marginLeft: 6 }}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
                </View>
                <TextInput placeholder="根拠や一言メモ（任意）" value={it.note} onChangeText={(t)=>updateStrengthItem(it.id, 'note', t)} style={[styles.input, styles.textarea]} multiline />
              </View>
            ))}
          </View>
        )}

        {/* 弱み */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <Text style={styles.label}>弱み</Text>
          <TouchableOpacity style={styles.btnOutlineSm} onPress={addWeaknessItem}><PlusCircle size={16} /><Text style={styles.btnOutlineSmText}> 追加</Text></TouchableOpacity>
        </View>
        {(manual.weaknessItems||[]).length === 0 ? (
          <Text style={styles.muted}>まだ追加されていません。</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {(manual.weaknessItems||[]).map((it) => (
              <View key={it.id} style={styles.blockBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput placeholder="例：優先順位付けが苦手" value={it.title} onChangeText={(t)=>updateWeaknessItem(it.id, 'title', t)} style={[styles.input, { flex: 1 }]} />
                  <TouchableOpacity onPress={()=>removeWeaknessItem(it.id)} style={{ marginLeft: 6 }}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
                </View>
                <TextInput placeholder="改善方針や工夫（任意）" value={it.note} onChangeText={(t)=>updateWeaknessItem(it.id, 'note', t)} style={[styles.input, styles.textarea]} multiline />
              </View>
            ))}
          </View>
        )}

        {/* Tip box */}
        <View style={[styles.tipBox]}> 
          <Info size={16} color="#3b82f6" />
          <View style={{ marginLeft: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1d4ed8' }}>自己PRのコツ</Text>
            <Text style={{ fontSize: 12, color: '#1d4ed8' }}>・数字や結果を用いて具体性を出す</Text>
            <Text style={{ fontSize: 12, color: '#1d4ed8' }}>・役割だけでなく、課題⇢行動⇢成果 を示す</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const addWorkExperience = () => {
    const newId = workExperiences.length > 0 ? Math.max(...workExperiences.map(e=>e.id)) + 1 : 1;
    setWorkExperiences([...workExperiences, { id: newId, isOpen: true, company: '', position: '', jobTypes: [], startDate: '', endDate: '', isCurrent: false, description: '', technologies: '', achievements: '' }]);
  };
  const removeWorkExperience = (id: number) => setWorkExperiences(prev => prev.filter(e => e.id !== id));
  const toggleCollapsible = (id: number) => setWorkExperiences(prev => prev.map(e => e.id === id ? { ...e, isOpen: !e.isOpen } : e));
  const handleWorkExperienceChange = (id: number, field: keyof WorkExperience, value: string | boolean | string[]) => setWorkExperiences(prev => prev.map(e => e.id === id ? ({ ...e, [field]: value } as WorkExperience) : e));

  const renderResume = () => {
    const workPct = calcWorkCompletion(workExperiences);
    const jobOptions = ['エンジニア','営業','コンサルタント','経営・経営企画','総務・人事','経理・財務','企画','マーケティング','デザイナー','広報','その他'];
    return (
      <View style={{ gap: 12 }}>
        <View style={[styles.card, { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' }] }>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FileText size={18} color="#4338ca" />
              <Text style={[styles.cardTitle, { marginLeft: 6, color: '#3730a3' }]}>職務経歴書（職歴）</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#3730a3' }}>完成度 {workPct}%</Text>
          </View>
        </View>

        <View style={[styles.card, { gap: 12 }] }>
          {workExperiences.length === 0 ? (
            <View style={[styles.tipBox, { backgroundColor: '#fffbeb' }] }>
              <Info size={16} color="#f59e0b" />
              <View style={{ marginLeft: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>職歴情報がありません</Text>
                <Text style={{ fontSize: 12, color: '#92400e' }}>アルバイトやインターンシップの経験を追加しましょう。</Text>
              </View>
            </View>
          ) : (
            workExperiences.map((exp) => (
              <View key={exp.id} style={styles.blockBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Building size={16} color="#6b7280" />
                    <Text style={{ marginLeft: 6, fontSize: 14, fontWeight: '600' }}>{exp.company || `職歴 #${exp.id}`} {exp.position ? `（${exp.position}）` : ''}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => toggleCollapsible(exp.id)} style={styles.iconBtn}>{exp.isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</TouchableOpacity>
                    {workExperiences.length > 1 && (
                      <TouchableOpacity onPress={() => removeWorkExperience(exp.id)} style={styles.iconBtn}><Trash2 size={18} color="#ef4444" /></TouchableOpacity>
                    )}
                  </View>
                </View>
                {exp.isOpen && (
                  <View style={{ marginTop: 10, gap: 10 }}>
                    <View>
                      <Text style={styles.label}>企業・組織名</Text>
                      <TextInput placeholder="〇〇株式会社" value={exp.company} onChangeText={(t)=>handleWorkExperienceChange(exp.id,'company',t)} style={styles.input} />
                    </View>

                    <View>
                      <Text style={styles.label}>職種（複数選択可）</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {jobOptions.map(opt => {
                          const checked = (exp.jobTypes||[]).includes(opt);
                          return (
                            <TouchableOpacity key={opt} onPress={()=>handleWorkExperienceChange(exp.id,'jobTypes', checked ? (exp.jobTypes||[]).filter(v=>v!==opt) : [...new Set([...(exp.jobTypes||[]), opt])])} style={[styles.choice, checked && styles.choiceOn]}>
                              <Text style={[styles.choiceText, checked && styles.choiceTextOn]}>{opt}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View>
                      <Text style={styles.label}>役職・ポジション</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {['メンバー','リーダー','マネージャー','責任者','役員','代表'].map(v => {
                          const checked = exp.position === v;
                          return (
                            <TouchableOpacity key={v} onPress={()=>handleWorkExperienceChange(exp.id,'position',v)} style={[styles.choice, checked && styles.choiceOn]}>
                              <Text style={[styles.choiceText, checked && styles.choiceTextOn]}>{v}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>開始年月 (YYYY-MM)</Text>
                        <TextInput placeholder="YYYY-MM" value={exp.startDate} onChangeText={(t)=>handleWorkExperienceChange(exp.id,'startDate',t)} style={styles.input} keyboardType="numbers-and-punctuation" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>終了年月 (YYYY-MM)</Text>
                        <TextInput placeholder="YYYY-MM" value={exp.endDate} onChangeText={(t)=>handleWorkExperienceChange(exp.id,'endDate',t)} style={[styles.input, exp.isCurrent && { opacity: 0.4 }]} editable={!exp.isCurrent} keyboardType="numbers-and-punctuation" />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Switch value={exp.isCurrent} onValueChange={(v)=>handleWorkExperienceChange(exp.id,'isCurrent',v)} />
                      <Text style={{ marginLeft: 8 }}>現在も在籍中</Text>
                    </View>

                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.label}>業務内容</Text>
                        <Text style={styles.counter}>{exp.description.length}/500文字</Text>
                      </View>
                      <TextInput placeholder="担当した業務内容や成果について記入してください" value={exp.description} onChangeText={(t)=>handleWorkExperienceChange(exp.id,'description',t)} style={[styles.input, styles.textarea]} multiline maxLength={500} />
                    </View>

                    <View>
                      <Text style={styles.label}>使用技術・ツール</Text>
                      <TextInput placeholder="Word, Python, AWS, Figmaなど" value={exp.technologies} onChangeText={(t)=>handleWorkExperienceChange(exp.id,'technologies',t)} style={styles.input} />
                      {!!exp.technologies && exp.technologies.split(',').some(t=>t.trim()!=='') && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                          {exp.technologies.split(',').map((tech, i) => { const t = tech.trim(); if (!t) return null; return (<View key={`${t}-${i}`} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>); })}
                        </View>
                      )}
                    </View>

                    <View>
                      <Text style={styles.label}>成果・実績</Text>
                      <TextInput placeholder="具体的な成果や数値、評価されたポイントなどを記入してください" value={exp.achievements} onChangeText={(t)=>handleWorkExperienceChange(exp.id,'achievements',t)} style={[styles.input, styles.textarea]} multiline />
                    </View>
                  </View>
                )}
              </View>
            ))
          )}

          <TouchableOpacity style={styles.btnOutline} onPress={addWorkExperience}>
            <PlusCircle size={18} />
            <Text style={styles.btnOutlineText}> 職歴を追加</Text>
          </TouchableOpacity>
          {resumeSaving && <Text style={styles.muted}>保存中...</Text>}
        </View>
      </View>
    );
  };

  const renderVisualize = () => {
    const a = analyzeText(manualText);
    const max = Math.max(1, ...a.counts);
    return (
      <View style={{ gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>概要</Text>
          <View style={styles.statGrid}>
            <Stat label="文字数" value={a.charCount} />
            <Stat label="文の数" value={a.sentenceCount} />
            <Stat label="語数(粗)" value={a.wordCount} />
            <Stat label="読了目安" value={`~${a.readMin}分`} />
          </View>
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.cardTitle}>頻出キーワード（上位12）</Text>
            <Text style={styles.muted}>#タグ: {manualTags.length}</Text>
          </View>
          {a.words.length === 0 ? (
            <Text style={styles.muted}>自己分析ノートに文章を入力すると可視化されます。</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {a.words.map((w, i) => (
                <View key={`${w}-${i}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ width: 90, color: '#6b7280' }} numberOfLines={1}>{w}</Text>
                  <View style={{ flex: 1, height: 10, backgroundColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden', marginHorizontal: 8 }}>
                    <View style={{ flexDirection: 'row', flex: 1 }}>
                      {(() => { const p = Math.max(0, Math.min(100, (a.counts[i] / max) * 100)); return (
                        <>
                          <View style={{ flex: p, backgroundColor: '#06b6d4' }} />
                          <View style={{ flex: 100 - p }} />
                        </>
                      ); })()}
                    </View>
                  </View>
                  <Text style={{ width: 32, textAlign: 'right' }}>{a.counts[i]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <AnalysisOverview
            progress={{
              aiChat: Math.round((sectionProgress.selfNote ?? 0) * 100),
              lifeChart: progress.lifeChart,
              futureVision: progress.futureVision,
              strengthAnalysis: progress.strengthAnalysis,
              experienceReflection: progress.experienceReflection,
            }}
            onNavigateToTool={(id: string) => setActiveTab(id)}
          />
        );

      case 'aiChat':
        return (
          <AIChat
            userId={userId ?? ''}
            onProgressUpdate={(p: number) => setToolProgress('aiChat', p)}
            onApplyToManual={applyManualUpdate}
            sectionProgress={sectionProgress}
          />
        );

      case 'lifeChart':
        return (
          <LifeChart
            userId={userId ?? ''}
            onProgressUpdate={(p: number) => setToolProgress('lifeChart', p)}
          />
        );

      case 'futureVision':
        return (
          <FutureVision
            onProgressUpdate={(p: number) => setToolProgress('futureVision', p)}
          />
        );

      case 'experienceReflection':
        return (
          <SimpleExperienceReflection
            userId={userId ?? ''}
            onProgressUpdate={(p: number) => setToolProgress('experienceReflection', p)}
          />
        );

      case 'manual':
        return renderManual();

      case 'resume':
        return renderResume();

      case 'visualize':
        return renderVisualize();

      default:
        return renderOverview();
    }
  };

  // ===== screens =====
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>データを読み込んでいます...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}> 
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>エラーが発生しました</Text>
        <Text style={{ color: '#6b7280', marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={()=>{ startTransition(()=>{ setError(null); setLoading(true); runIdle(()=>setLoading(false)); }); }}>
          <Text style={styles.btnPrimaryText}>再読み込み</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!userId && !loading) {
    return (
      <View style={styles.center}> 
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>ログインが必要です</Text>
        <Text style={{ color: '#6b7280', marginBottom: 12 }}>自己分析データを保存・同期するにはログインしてください。</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={()=>navigate('/login')}>
          <Text style={styles.btnPrimaryText}>ログインへ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
        <Header />
        <MobileTabs />
        <View style={{ marginTop: 6 }}>
          {renderContent()}
        </View>
      </ScrollView>
    </View>
  );
}

// ===== styles =====
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'white' },
  header: { paddingTop: 10, paddingBottom: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', backgroundColor: 'white' },
  iconBtn: { padding: 8, borderRadius: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, color: '#6b7280' },
  tabBar: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  tabBarTight: { paddingVertical: 4, marginBottom: 6 },
  tabChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', paddingHorizontal: 12, borderRadius: 9999, marginRight: 6, backgroundColor: 'white', height: 36, minWidth: 92 },
  tabChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  tabText: { color: '#6b7280', fontWeight: '600', fontSize: 13, lineHeight: 16 },
  tabTextActive: { color: 'white', fontWeight: '600', fontSize: 13, lineHeight: 16 },
  card: { backgroundColor: 'white', borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', borderRadius: 12, padding: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  muted: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  counter: { fontSize: 12, color: '#6b7280' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'white' },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  tag: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, margin: 2 },
  tagText: { fontSize: 11, color: '#0369a1' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statBox: { flexBasis: '48%', backgroundColor: '#f3f4f6', padding: 10, borderRadius: 10 },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { fontSize: 14, fontWeight: '700' },
  blockBox: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e7eb', backgroundColor: 'white', borderRadius: 10, padding: 10 },
  choice: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9999, backgroundColor: 'white', borderColor: '#e5e7eb', borderWidth: StyleSheet.hairlineWidth, marginRight: 6, marginBottom: 6 },
  choiceOn: { backgroundColor: '#111827', borderColor: '#111827' },
  choiceText: { fontSize: 12, color: '#6b7280' },
  choiceTextOn: { fontSize: 12, color: 'white', fontWeight: '600' },
  btnOutline: { marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnOutlineText: { color: '#111827', fontWeight: '600' },
  btnOutlineSm: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  btnOutlineSmText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  tipBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  btnPrimary: { backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  btnPrimaryText: { color: 'white', fontWeight: '700' },
});
