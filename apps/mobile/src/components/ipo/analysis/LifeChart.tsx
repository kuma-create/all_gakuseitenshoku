import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Share,
} from 'react-native';
import {
  Plus,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Star,
  Award,
  Users,
  BookOpen,
  Heart,
  Target,
  Eye,
  EyeOff,
  Download as DownloadIcon,
  Minus,
} from 'lucide-react-native';
import { supabase } from '../../../src/lib/supabase';

// ===== Types =====
interface LifeChartProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
}

interface LifeEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  age: number;
  category:
    | 'academic'
    | 'personal'
    | 'work'
    | 'challenge'
    | 'achievement'
    | 'relationship'
    | 'discovery';
  emotionalLevel: number; // -5 to 5
  impactLevel: number; // 1 to 5
  skills: string[];
  learnings: string[];
  values: string[];
  isPrivate: boolean;
  starFramework?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  jobHuntRelevance: {
    relevant: boolean;
    industries: string[];
    jobTypes: string[];
    keywords: string[];
  };
}

interface Insight {
  type: 'pattern' | 'strength' | 'value' | 'growth';
  title: string;
  description: string;
  evidence: string[];
  jobHuntApplication: string;
}

// Supabase upsert payload shape: match DB schema exactly
// (keep the same as web so API/DB stays compatible)
type UpsertLifeEvent = {
  id?: string;
  user_id: string;
  title: string;
  year: number;
  month?: number;
  note?: string;
  date: string; // YYYY-MM-DD
  category: LifeEvent['category'];
  emotional_level?: number;
  impact_level?: number;
  is_private?: boolean;
  job_relevant?: boolean;
  job_industries?: string[];
  job_job_types?: string[];
  job_keywords?: string[];
};

const categoryConfig = {
  academic: { label: '学業・勉強', icon: BookOpen, pill: '#e6f0ff', text: '#1e40af' },
  personal: { label: '個人的成長', icon: Heart, pill: '#ffe4ef', text: '#9d174d' },
  work: { label: '仕事・インターン', icon: Target, pill: '#e7f7ee', text: '#166534' },
  challenge: { label: '困難・挑戦', icon: TrendingUp, pill: '#fff1e6', text: '#9a3412' },
  achievement: { label: '成果・達成', icon: Award, pill: '#fff7da', text: '#92400e' },
  relationship: { label: '人間関係', icon: Users, pill: '#efe7ff', text: '#5b21b6' },
  discovery: { label: '発見・気づき', icon: Star, pill: '#e9ebff', text: '#3730a3' },
} as const;

const initialFormState: Partial<LifeEvent> = {
  title: '',
  description: '',
  date: '',
  age: 18,
  category: 'personal',
  emotionalLevel: 0,
  impactLevel: 3,
  skills: [],
  learnings: [],
  values: [],
  isPrivate: false,
  starFramework: { situation: '', task: '', action: '', result: '' },
  jobHuntRelevance: { relevant: false, industries: [], jobTypes: [], keywords: [] },
};

// ===== Helper small UI primitives (mobile friendly) =====
type PillProps = { selected?: boolean; onPress?: () => void; bg?: string; fg?: string; children?: React.ReactNode };
const Pill: React.FC<PillProps> = ({ selected, onPress, bg = '#f1f5f9', fg = '#0f172a', children }) => (
  <Pressable onPress={onPress} style={[styles.pill, { backgroundColor: selected ? bg : '#fff', borderColor: selected ? fg : '#e5e7eb' }]}>
    <Text style={{ color: selected ? fg : '#334155', fontSize: 12 }}>{children}</Text>
  </Pressable>
);

type RowProps = { style?: any; children?: React.ReactNode };
const Row: React.FC<RowProps> = ({ style, children }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>
);

// ===== Main Component =====
export function LifeChart({ userId, onProgressUpdate }: LifeChartProps) {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [showPrivate, setShowPrivate] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Object.keys(categoryConfig));
  const [view, setView] = useState<'chart' | 'timeline' | 'analysis'>('chart');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LifeEvent | null>(null);
  const [form, setForm] = useState<Partial<LifeEvent>>(initialFormState);
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const currentAge = 22; // if needed, wire to profile
  const chartBox = useRef({ w: 0, h: 0 });

  const updateProgress = useCallback((evs: LifeEvent[], ins: Insight[]) => {
    const progress = Math.min(100, evs.length * 10 + ins.length * 5);
    onProgressUpdate(progress);
  }, [onProgressUpdate]);

  useEffect(() => { updateProgress(events, insights); }, [events.length, insights.length, updateProgress]);

  const mapDbToLifeEvent = (row: any): LifeEvent => {
    const y = row.year ?? (row.date ? new Date(row.date).getFullYear() : new Date().getFullYear());
    const m = row.month ?? (row.date ? new Date(row.date).getMonth() + 1 : 1);
    const computedAge = currentAge - (new Date().getFullYear() - y);
    return {
      id: row.id,
      title: row.title ?? '',
      description: row.note ?? '',
      date: row.date ?? `${y}-${String(m).padStart(2, '0')}-01`,
      age: computedAge,
      category: row.category,
      emotionalLevel: row.emotional_level ?? 0,
      impactLevel: row.impact_level ?? 3,
      skills: row.skills ?? [],
      learnings: row.learnings ?? [],
      values: row.values ?? [],
      isPrivate: row.is_private ?? false,
      starFramework: {
        situation: row.star_situation ?? '',
        task: row.star_task ?? '',
        action: row.star_action ?? '',
        result: row.star_result ?? '',
      },
      jobHuntRelevance: {
        relevant: row.job_relevant ?? false,
        industries: row.job_industries ?? [],
        jobTypes: row.job_job_types ?? [],
        keywords: row.job_keywords ?? [],
      },
    };
  };

  const loadLifeEvents = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadError(null);
      const res: any = await (supabase as any)
        .from('ipo_life_chart_events')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (res?.error) {
        setLoadError('データの読み込みに失敗しました。権限・RLS またはテーブルの有無を確認してください。');
        setEvents([]);
        setInsights([]);
        return;
      }
      const items: LifeEvent[] = (res?.data ?? []).map(mapDbToLifeEvent);
      setEvents(items);
      if (items.length) {
        setInsights([{ 
          type: 'pattern',
          title: '記録の傾向',
          description: '最近の出来事が多く記録されています。過去も追加すると一貫性が出ます。',
          evidence: items.slice(-3).map((e: LifeEvent) => e.title),
          jobHuntApplication: '時系列の一貫性は面接での説得力向上に役立ちます。',
        }]);
      }
    } catch (e) {
      setLoadError('データの読み込みで未知のエラーが発生しました。');
    }
  }, [userId]);

  useEffect(() => { loadLifeEvents(); }, [loadLifeEvents]);

  const handleSave = useCallback(async () => {
    if (!form.title || !form.date || !userId) return;

    const d = new Date(form.date as string);
    let y = d.getFullYear();
    let m = d.getMonth() + 1;
    let dateToSave = form.date as string;

    if (typeof form.age === 'number' && !Number.isNaN(form.age)) {
      const nowYear = new Date().getFullYear();
      const derivedYear = nowYear - (currentAge - form.age);
      if (Number.isFinite(derivedYear)) {
        y = derivedYear;
        const patched = new Date(d);
        patched.setFullYear(y);
        dateToSave = patched.toISOString().slice(0, 10);
        m = patched.getMonth() + 1;
      }
    }

    const payload: UpsertLifeEvent = {
      ...(editingEvent ? { id: editingEvent.id } : {}),
      user_id: userId,
      title: form.title!,
      year: y,
      month: m,
      note: form.description || '',
      date: dateToSave,
      category: (form.category as LifeEvent['category']) ?? 'personal',
      emotional_level: form.emotionalLevel ?? 0,
      impact_level: form.impactLevel ?? 3,
      is_private: form.isPrivate ?? false,
      job_relevant: form.jobHuntRelevance?.relevant ?? false,
      job_industries: form.jobHuntRelevance?.industries ?? [],
      job_job_types: form.jobHuntRelevance?.jobTypes ?? [],
      job_keywords: form.jobHuntRelevance?.keywords ?? [],
    };

    const tempId = editingEvent?.id || `tmp-${Date.now()}`;
    const optimistic: LifeEvent = {
      id: tempId,
      title: payload.title,
      description: form.description ?? '',
      date: payload.date,
      age: (typeof form.age === 'number' && !Number.isNaN(form.age)) ? form.age : currentAge - (new Date().getFullYear() - y),
      category: payload.category,
      emotionalLevel: payload.emotional_level ?? 0,
      impactLevel: payload.impact_level ?? 3,
      skills: form.skills ?? [],
      learnings: form.learnings ?? [],
      values: form.values ?? [],
      isPrivate: payload.is_private ?? false,
      starFramework: form.starFramework ?? { situation: '', task: '', action: '', result: '' },
      jobHuntRelevance: {
        relevant: payload.job_relevant ?? false,
        industries: payload.job_industries ?? [],
        jobTypes: payload.job_job_types ?? [],
        keywords: payload.job_keywords ?? [],
      },
    };

    setEvents(prev => editingEvent ? prev.map(e => e.id === editingEvent.id ? optimistic : e) : [...prev, optimistic]);

    try {
      const res: any = await (supabase as any)
        .from('ipo_life_chart_events')
        .upsert([payload] as any, { onConflict: 'id' })
        .select('*')
        .single();

      if (res?.error) throw res.error;
      const saved = mapDbToLifeEvent(res?.data ?? res);
      setEvents(prev => prev.map(e => (e.id === tempId || (editingEvent && e.id === editingEvent.id)) ? saved : e));
    } catch (err) {
      // rollback new add
      if (!editingEvent) setEvents(prev => prev.filter(e => e.id !== tempId));
    }

    setEditingEvent(null);
    setForm(initialFormState);
    setModalOpen(false);
  }, [form, userId, editingEvent]);

  const handleDelete = useCallback(async (eventId: string) => {
    Alert.alert('削除確認', 'このライフイベントを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          const prev = events;
          setEvents(p => p.filter(e => e.id !== eventId));
          const sb: any = supabase as any;
          const { error } = await sb
            .from('ipo_life_chart_events' as any)
            .delete()
            .eq('id' as any, eventId as any)
            .eq('user_id', userId);
          if (error) {
            setEvents(prev);
          }
        }
      }
    ]);
  }, [events, userId]);

  const displayEvents = useMemo(() => {
    return events
      .filter(e => showPrivate || !e.isPrivate)
      .filter(e => selectedCategories.includes(e.category))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, showPrivate, selectedCategories]);

  // axis numbers
  const { maxAge, minAge, span } = useMemo(() => {
    const maxA = Math.max(...displayEvents.map(e => e.age), currentAge);
    const minA = Math.min(...displayEvents.map(e => e.age), 15);
    return { maxAge: maxA, minAge: minA, span: Math.max(1, maxA - minA) };
  }, [displayEvents]);

  // ===== Views =====
  const ChartView = () => (
    <View style={styles.card}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={styles.cardTitle}>人生グラフ</Text>
        <Pressable onPress={() => setShowPrivate(p => !p)} style={styles.iconRow}>
          {showPrivate ? <Eye size={18} color="#111827"/> : <EyeOff size={18} color="#111827"/>}
          <Text style={styles.iconRowText}>{showPrivate ? 'プライベート表示' : 'プライベート非表示'}</Text>
        </Pressable>
      </Row>

      <View style={styles.chartBox}
        onLayout={(e) => { chartBox.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}>
        {/* Y labels */}
        <View style={styles.yLabels}>
          {['+5','+3','0','-3','-5'].map((t,i)=> (
            <Text key={i} style={styles.axisText}>{t}</Text>
          ))}
        </View>
        {/* X labels */}
        <View style={styles.xLabels}>
          {Array.from({ length: maxAge - minAge + 1 }, (_, i) => minAge + i).map(age => (
            <Text key={age} style={styles.axisText}>{age}歳</Text>
          ))}
        </View>
        {/* Grid lines */}
        {[ -5, -3, 0, 3, 5 ].map(level => {
          const top = ((5 - level) / 10) * 100;
          return <View key={level} style={[styles.gridLine, { top: `${top}%` }]} />;
        })}

        {/* Event dots */}
        <View style={StyleSheet.absoluteFill}>
          {displayEvents.map(ev => {
            const x = ((ev.age - minAge) / span) * (chartBox.current.w - 48) + 48; // left axis offset ~48
            const y = ((5 - ev.emotionalLevel) / 10) * (chartBox.current.h - 40);
            const cfg = (categoryConfig as any)[ev.category];
            return (
              <Pressable key={ev.id}
                style={[styles.dot, { left: x - 6, top: y - 6, backgroundColor: cfg?.text || '#111827' }]}
                onPress={() => { setEditingEvent(ev); setForm(ev); setModalOpen(true); }}
              />
            );
          })}
        </View>
      </View>

      {/* Category filters */}
      <View style={{ marginTop: 12 }}>
        <Text style={styles.subTitle}>カテゴリーフィルター</Text>
        <Row style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {Object.entries(categoryConfig).map(([key, cfg]) => {
            const selected = selectedCategories.includes(key);
            const Icon = cfg.icon;
            return (
              <Pill key={key} selected={selected} bg={cfg.pill} fg={cfg.text}
                onPress={() => setSelectedCategories(prev => selected ? prev.filter(c => c !== key) : [...prev, key])}
              >
                <Row style={{ gap: 6 }}>
                  <Icon size={14} color={selected ? cfg.text : '#64748b'} />
                  <Text style={{ color: selected ? cfg.text : '#334155', fontSize: 12 }}>{cfg.label}</Text>
                  <Text style={{ color: selected ? cfg.text : '#64748b', fontSize: 10 }}>
                    {events.filter(e => e.category === key).length}
                  </Text>
                </Row>
              </Pill>
            );
          })}
        </Row>
      </View>
    </View>
  );

  const TimelineItem: React.FC<{ item: LifeEvent }>= ({ item }) => {
    const cfg = (categoryConfig as any)[item.category];
    const Icon = cfg.icon;
    return (
      <View style={styles.timelineCard}>
        <View style={[styles.avatar, { backgroundColor: cfg.pill }]}>
          <Icon size={20} color={cfg.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={styles.timelineTitle}>{item.title}</Text>
            <Row style={{ gap: 6 }}>
              <Text style={[styles.badge, { backgroundColor: cfg.pill, color: cfg.text }]}>{cfg.label}</Text>
              {item.jobHuntRelevance.relevant ? (
                <Text style={[styles.badge, { backgroundColor: '#ecfdf5', color: '#166534' }]}>就活関連</Text>
              ) : null}
              {item.isPrivate ? (
                <Text style={[styles.badge, { backgroundColor: '#fff', color: '#334155', borderWidth: 1, borderColor: '#cbd5e1' }]}>プライベート</Text>
              ) : null}
            </Row>
          </Row>
          <Row style={{ gap: 12, marginTop: 6 }}>
            <Row style={{ gap: 4 }}>
              <CalendarIcon size={14} color="#475569" />
              <Text style={styles.meta}>{item.date}（{item.age}歳）</Text>
            </Row>
            <Row style={{ gap: 4 }}>
              {item.emotionalLevel > 0 ? (
                <TrendingUp size={14} color="#16a34a" />
              ) : item.emotionalLevel < 0 ? (
                <TrendingDown size={14} color="#dc2626" />
              ) : (
                <Minus size={14} color="#94a3b8" />
              )}
              <Text style={styles.meta}>感情レベル: {item.emotionalLevel > 0 ? '+' : ''}{item.emotionalLevel}</Text>
            </Row>
            <Row style={{ gap: 4 }}>
              <Star size={14} color="#f59e0b" />
              <Text style={styles.meta}>影響度: {item.impactLevel}/5</Text>
            </Row>
          </Row>
          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}
          <Row style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Pressable style={styles.btnOutline} onPress={() => { setEditingEvent(item); setForm(item); setModalOpen(true); }}>
              <Edit3 size={16} color="#0f172a" />
              <Text style={styles.btnOutlineText}>編集</Text>
            </Pressable>
            <Pressable style={styles.btnOutline} onPress={() => handleDelete(item.id)}>
              <Trash2 size={16} color="#0f172a" />
              <Text style={styles.btnOutlineText}>削除</Text>
            </Pressable>
          </Row>
        </View>
      </View>
    );
  };

  const TimelineView = () => (
    <View style={{ gap: 8 }}>
      <FlatList
        data={displayEvents}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <TimelineItem item={item} />}
        scrollEnabled={false}
      />
    </View>
  );

  const generateHeuristicInsights = useCallback((): Insight[] => {
    if (!events.length) return [];
    const skillFreq = new Map<string, number>();
    events.forEach(e => (e.skills || []).forEach(s => skillFreq.set(s, (skillFreq.get(s) || 0) + 1)));
    const topSkills = [...skillFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);

    const valueFreq = new Map<string, number>();
    events.forEach(e => (e.values || []).forEach(v => valueFreq.set(v, (valueFreq.get(v) || 0) + 1)));
    const topValues = [...valueFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);

    const catFreq = new Map<string, number>();
    events.forEach(e => catFreq.set(e.category, (catFreq.get(e.category) || 0) + 1));
    const dominantCategory = [...catFreq.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] as keyof typeof categoryConfig | undefined;

    const recent = [...events].sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,3);

    const list: Insight[] = [];
    if (topSkills.length) list.push({
      type: 'strength',
      title: '強みの傾向',
      description: `あなたは ${topSkills.join('・')} を繰り返し発揮しています。これらを面接のキーワードに。`,
      evidence: events.filter(e => e.skills?.some(s => topSkills.includes(s))).slice(0,5).map(e => e.title),
      jobHuntApplication: '強みを1〜2に絞りSTARで語りましょう。',
    });
    if (topValues.length) list.push({
      type: 'value',
      title: '価値観の傾向',
      description: `大切にしている価値観は ${topValues.join('・')} の可能性があります。`,
      evidence: events.filter(e => e.values?.some(v => topValues.includes(v))).slice(0,5).map(e => e.title),
      jobHuntApplication: '企業選びの軸として活用。',
    });
    if (dominantCategory) list.push({
      type: 'pattern',
      title: '活動の偏り',
      description: `「${categoryConfig[dominantCategory].label}」に偏っています。別カテゴリも補完すると良いです。`,
      evidence: recent.map(e => e.title),
      jobHuntApplication: '志望職種に関連するカテゴリの経験を追加しましょう。',
    });

    const half = Math.ceil(events.length/2);
    const avg1 = events.slice(0, half).reduce((a,e)=> a + (e.emotionalLevel||0),0) / Math.max(1, half);
    const avg2 = events.slice(half).reduce((a,e)=> a + (e.emotionalLevel||0),0) / Math.max(1, events.length-half);
    const delta = Math.round((avg2-avg1)*10)/10;
    list.push({
      type: 'growth',
      title: '感情トレンド',
      description: `平均感情レベルの差は ${delta >= 0 ? '+' : ''}${delta}。変化の要因を言語化しましょう。`,
      evidence: recent.map(e => `${e.date} ${e.title}`),
      jobHuntApplication: 'STARのA（行動）に落とし込み。',
    });
    return list;
  }, [events]);

  const AnalysisView = () => {
    const hasInsights = insights.length > 0;
    const fallback = hasInsights ? [] : generateHeuristicInsights();
    const list = hasInsights ? insights : fallback;
    return (
      <View style={{ gap: 12 }}>
        <View style={styles.card}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.cardTitle}>分析・インサイト</Text>
              <Text style={styles.help}>AIでイベント全体を解析し、強み・価値観・傾向を要約します。</Text>
              {aiError ? <Text style={styles.error}>{aiError}</Text> : null}
            </View>
            <Pressable
              disabled={aiLoading || events.length === 0}
              onPress={async () => {
                setAiError(null); setAiLoading(true);
                try {
                  const payload = {
                    userId,
                    events: events.map(e => ({
                      id: e.id,
                      title: e.title,
                      description: e.description,
                      date: e.date,
                      age: e.age,
                      category: e.category,
                      emotionalLevel: e.emotionalLevel,
                      impactLevel: e.impactLevel,
                      skills: e.skills,
                      learnings: e.learnings,
                      values: e.values,
                      jobHuntRelevance: e.jobHuntRelevance,
                    }))
                  };
                  // NOTE: Replace with your absolute API base if needed in native env
                  const res = await fetch('/api/ai/life-insights', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) throw new Error(`API Error (${res.status})`);
                  const json = await res.json();
                  const next = (json?.insights ?? []) as Insight[];
                  if (!Array.isArray(next)) throw new Error('Invalid AI response');
                  setInsights(next);
                  updateProgress(events, next);
                } catch (e: any) {
                  setAiError(e?.message || 'AI分析に失敗しました。');
                } finally { setAiLoading(false); }
              }}
              style={[styles.btn, aiLoading || events.length === 0 ? styles.btnDisabled : null]}
            >
              <Text style={styles.btnText}>{aiLoading ? '分析中…' : 'AIで分析する'}</Text>
            </Pressable>
          </Row>
        </View>

        {list.map((ins, idx) => (
          <View key={idx} style={styles.card}>
            <Row style={{ gap: 10, alignItems: 'flex-start' }}>
              <View style={styles.iconBadge}>
                {ins.type === 'strength' ? <Star size={18} color="#111827"/> :
                 ins.type === 'value' ? <Heart size={18} color="#111827"/> :
                 ins.type === 'growth' ? <TrendingUp size={18} color="#111827"/> :
                 <BookOpen size={18} color="#111827"/>}
              </View>
              <View style={{ flex: 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={styles.insightTitle}>{ins.title}</Text>
                  <Text style={styles.badgeOutline}>{ins.type}</Text>
                </Row>
                <Text style={styles.description}>{ins.description}</Text>
                {ins.evidence?.length ? (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.meta}>根拠となる出来事</Text>
                    <Row style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {ins.evidence.slice(0, 8).map((evi, i) => (
                        <Text key={i} style={styles.badgeSecondary}>{evi}</Text>
                      ))}
                    </Row>
                  </View>
                ) : null}
                {ins.jobHuntApplication ? (
                  <View style={styles.tipBox}>
                    <Text style={styles.tipText}>就活での活用: {ins.jobHuntApplication}</Text>
                  </View>
                ) : null}
              </View>
            </Row>
          </View>
        ))}

        {!events.length ? (
          <View style={[styles.card, { alignItems: 'center' }]}> 
            <Text style={styles.meta}>まずはイベントを追加してください。AI分析ボタンでサマリーが生成されます。</Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ===== Header / Stats / Toolbar =====
  const Header = () => (
    <View style={styles.card}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.title}>ライフチャート</Text>
          <Text style={styles.help}>人生の重要な出来事を整理し、就活で活用できるエピソードを発見しましょう</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Pressable
            onPress={async () => {
              const relevant = events.filter(e => e.jobHuntRelevance.relevant);
              const exportData = {
                summary: `${relevant.length}つの主要経験を通じた成長ストーリー`,
                events: relevant.map(e => ({
                  title: e.title,
                  period: e.date,
                  category: (categoryConfig as any)[e.category]?.label ?? e.category,
                  starFramework: e.starFramework,
                  skills: e.skills,
                  values: e.values,
                  industries: e.jobHuntRelevance.industries,
                  keywords: e.jobHuntRelevance.keywords,
                })),
                insights,
                strengthKeywords: [...new Set(relevant.flatMap(e => e.skills))],
                valueKeywords: [...new Set(relevant.flatMap(e => e.values))],
              };
              const text = JSON.stringify(exportData, null, 2);
              try { await Share.share({ message: text }); } catch {}
            }}
            style={styles.btnOutline}
          >
            <DownloadIcon size={16} color="#0f172a" />
            <Text style={styles.btnOutlineText}>就活用エクスポート</Text>
          </Pressable>
          <Pressable
            onPress={() => { setEditingEvent(null); setForm(initialFormState); setModalOpen(true); }}
            style={styles.btn}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.btnText}>イベント追加</Text>
          </Pressable>
        </View>
      </Row>
    </View>
  );

  const Stats = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}><Text style={styles.statNum}>{events.length}</Text><Text style={styles.statLabel}>総イベント数</Text></View>
      <View style={styles.statCard}><Text style={styles.statNum}>{events.filter(e=>e.jobHuntRelevance.relevant).length}</Text><Text style={styles.statLabel}>就活関連</Text></View>
      <View style={styles.statCard}><Text style={styles.statNum}>{[...new Set(events.flatMap(e=>e.skills))].length}</Text><Text style={styles.statLabel}>スキル種類</Text></View>
      <View style={styles.statCard}><Text style={styles.statNum}>{insights.length}</Text><Text style={styles.statLabel}>インサイト</Text></View>
    </View>
  );

  const Toolbar = () => (
    <View style={styles.card}>
      <Row style={{ justifyContent: 'space-between' }}>
        {(['chart','timeline','analysis'] as const).map(key => (
          <Pressable key={key} onPress={() => setView(key)} style={[styles.segment, view===key && styles.segmentActive]}>
            <Text style={[styles.segmentText, view===key && styles.segmentTextActive]}>
              {key === 'chart' ? 'グラフ表示' : key === 'timeline' ? 'タイムライン' : '分析・インサイト'}
            </Text>
          </Pressable>
        ))}
      </Row>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Header />
      {loadError ? (
        <View style={[styles.card, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
          <Text style={{ color: '#991b1b', fontSize: 12 }}>{loadError}\n（開発者向けヒント: コンソールに診断情報を出力しています）</Text>
        </View>
      ) : null}
      <Stats />
      <Toolbar />
      {view === 'chart' ? <ChartView /> : view === 'timeline' ? <TimelineView /> : <AnalysisView />}

      {/* Event Modal */}
      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => { setModalOpen(false); setEditingEvent(null); }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.modalTitle}>{editingEvent ? 'ライフイベントを編集' : '新しいライフイベントを追加'}</Text>

          <Text style={styles.label}>タイトル *</Text>
          <TextInput value={form.title ?? ''} onChangeText={(t)=> setForm(p=> ({...p, title: t}))} placeholder="例: 大学受験、サークル代表就任" style={styles.input} />

          <Text style={styles.label}>日付 (YYYY-MM-DD) *</Text>
          <TextInput value={form.date ?? ''} onChangeText={(t)=> setForm(p=> ({...p, date: t}))} placeholder="2023-04-01" style={styles.input} />

          <Row style={{ gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>年齢</Text>
              <TextInput keyboardType='number-pad' value={String(form.age ?? 18)} onChangeText={(t)=> setForm(p=> ({...p, age: parseInt(t||'0',10) || 18}))} style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>カテゴリー</Text>
              <Pressable onPress={() => setCatPickerOpen(true)} style={[styles.input, { justifyContent: 'center' }]}> 
                <Text>{(categoryConfig as any)[(form.category as string) || 'personal']?.label || '選択してください'}</Text>
              </Pressable>

              {/* Category Sub-Modal */}
              <Modal
                visible={catPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setCatPickerOpen(false)}
              >
                <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', padding:16 }} onPress={() => setCatPickerOpen(false)}>
                  <View style={{ backgroundColor:'#fff', borderRadius:12, overflow:'hidden' }}>
                    <View style={{ padding:12, borderBottomWidth:1, borderColor:'#e5e7eb' }}>
                      <Text style={{ fontWeight:'700', fontSize:16 }}>カテゴリーを選択</Text>
                    </View>
                    {Object.entries(categoryConfig).map(([key, cfg]) => (
                      <Pressable
                        key={key}
                        onPress={() => { setForm(p=>({ ...p, category: key as any })); setCatPickerOpen(false); }}
                        style={{ paddingVertical:12, paddingHorizontal:16, borderBottomWidth:1, borderColor:'#f1f5f9', flexDirection:'row', alignItems:'center', gap:8 }}
                      >
                        <cfg.icon size={16} color={cfg.text} />
                        <Text style={{ color:'#0f172a' }}>{cfg.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Pressable>
              </Modal>
            </View>
          </Row>

          <Text style={styles.label}>詳細説明</Text>
          <TextInput value={form.description ?? ''} onChangeText={(t)=> setForm(p=> ({...p, description: t}))} placeholder="この出来事について詳しく…" style={[styles.input,{ height:120, textAlignVertical:'top' }]} multiline />

          <Row style={{ justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Pressable onPress={() => { setEditingEvent(null); setForm(initialFormState); setModalOpen(false); }} style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>キャンセル</Text>
            </Pressable>
            <Pressable onPress={handleSave} disabled={!form.title || !form.date} style={[styles.btn, (!form.title || !form.date) && styles.btnDisabled]}>
              <Text style={styles.btnText}>保存</Text>
            </Pressable>
          </Row>
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: { padding: 12, gap: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6 },
  help: { fontSize: 12, color: '#475569' },
  error: { marginTop: 6, color: '#dc2626', fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  insightTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  subTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flexBasis: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1d4ed8' },
  statLabel: { fontSize: 12, color: '#475569', marginTop: 2 },
  segment: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  segmentText: { fontSize: 13, color: '#475569' },
  segmentTextActive: { color: '#3730a3', fontWeight: '700' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconRowText: { fontSize: 12, color: '#111827' },
  chartBox: { height: 260, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f8fafc', overflow: 'hidden' },
  yLabels: { position: 'absolute', left: 6, top: 8, bottom: 32, justifyContent: 'space-between' },
  xLabels: { position: 'absolute', right: 6, left: 48, bottom: 6, flexDirection: 'row', justifyContent: 'space-between' },
  axisText: { fontSize: 10, color: '#64748b' },
  gridLine: { position: 'absolute', left: 48, right: 6, height: 1, backgroundColor: '#e5e7eb' },
  dot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff', elevation: 2 },
  timelineCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  timelineTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  badge: { fontSize: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  badgeOutline: { fontSize: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, borderColor: '#cbd5e1', color: '#0f172a' },
  badgeSecondary: { fontSize: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: '#f1f5f9', color: '#0f172a' },
  meta: { fontSize: 12, color: '#475569' },
  description: { fontSize: 13, color: '#1f2937', marginTop: 8, lineHeight: 18 },
  tipBox: { marginTop: 8, backgroundColor: '#ecfdf5', borderColor: '#d1fae5', borderWidth: 1, borderRadius: 8, padding: 8 },
  tipText: { fontSize: 12, color: '#065f46' },
  iconBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  btn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', gap: 6, backgroundColor: '#fff' },
  btnOutlineText: { color: '#0f172a', fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  label: { fontSize: 12, color: '#334155', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
});

export default LifeChart;
