import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import {
  Plus,
  Edit3,
  Save,
  Eye,
  EyeOff,
  Star,
  CheckCircle,
  Download,
} from 'lucide-react-native';

import { supabase } from '../../../src/lib/supabase';


// ---- Inlined constants for mobile (replaces ./constants/experienceConstants) ----
export const categoryConfig: Record<string, { label: string }> = {
  extracurricular: { label: '課外活動' },
  research: { label: '研究・ゼミ' },
  internship: { label: 'インターン' },
  parttime: { label: 'アルバイト' },
  volunteer: { label: 'ボランティア' },
  project: { label: 'プロジェクト' },
  competition: { label: 'コンテスト' },
  sports: { label: 'スポーツ' },
  art: { label: '文化・芸術' },
  other: { label: 'その他' },
};

// ---- Inlined util for mobile (replaces ./utils/experienceUtils) ----
export function calculateCompleteness(exp: Partial<Experience>): number {
  const e = exp || {} as any;
  let score = 0;

  // Core fields
  if (e.title) score += 10;
  if (e.description) score += 10;
  if (e.organization) score += 5;
  if (e.role) score += 5;

  // Period (start/end/duration)
  const periodFilled = e.period && (e.period.start || e.period.end || e.period.duration);
  if (periodFilled) score += 10;

  // Skills up to 15 pts (3 pts each)
  const skillsCount = Array.isArray(e.skills) ? e.skills.length : 0;
  score += Math.min(skillsCount * 3, 15);

  // STAR up to 20 pts (5 each)
  const sf = (e.starFramework || {}) as Partial<Record<'situation' | 'task' | 'action' | 'result', string>>;
  (['situation', 'task', 'action', 'result'] as const).forEach((k) => {
    const v = sf[k];
    if (typeof v === 'string' && v.trim()) score += 5;
  });

  // Achievements up to 10 pts (2 each)
  const ach = Array.isArray(e.achievements) ? e.achievements.length : 0;
  score += Math.min(ach * 2, 10);

  // Challenges up to 5 pts (1 each)
  const ch = Array.isArray(e.challenges) ? e.challenges.length : 0;
  score += Math.min(ch * 1, 5);

  // Quantified results up to 5 pts (2 each)
  const qr = Array.isArray(e.quantifiedResults) ? e.quantifiedResults.length : 0;
  score += Math.min(qr * 2, 5);

  // Job-hunt relevance up to 10 pts
  const jr = (e.jobHuntRelevance || {}) as Partial<{
    priority: Priority;
    targetIndustries: string[];
    targetPositions: string[];
    keywords: string[];
    esUsage: boolean;
    interviewUsage: boolean;
  }>;
  if (jr.priority && jr.priority !== 'low') score += 4;
  const jrTargets = (Array.isArray(jr.targetIndustries) ? jr.targetIndustries.length : 0) +
                    (Array.isArray(jr.targetPositions) ? jr.targetPositions.length : 0);
  if (jrTargets > 0) score += 6;

  // Reflection depth up to 5 pts
  const rd = typeof e.reflectionDepth === 'number' ? e.reflectionDepth : 0;
  score += Math.min(Math.max(rd, 0), 5);

  // Clamp & round
  score = Math.max(0, Math.min(100, score));
  return Math.round(score);
}

// ---- Local types (inlined for mobile) ----
type Priority = 'low' | 'medium' | 'high';

export interface Experience {
  id: string;
  title: string;
  category: string; // e.g., 'extracurricular', 'research', etc.
  period: { start: string; end: string; duration: string };
  organization: string;
  role: string;
  teamSize?: number;
  description: string;
  challenges: string[];
  achievements: string[];
  skills: string[];
  learnings: string[];
  starFramework: { situation: string; task: string; action: string; result: string };
  quantifiedResults: string[];
  jobHuntRelevance: {
    priority: Priority;
    targetIndustries: string[];
    targetPositions: string[];
    keywords: string[];
    esUsage: boolean;
    interviewUsage: boolean;
  };
  reflectionDepth: number;
  completeness: number;
  isPrivate: boolean;
  updated_at?: string;
}

export interface ExperienceReflectionProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
}

// --- DB <-> UI mappers (same as Web) ---
const fromRow = (row: any): Experience => ({
  id: row.id,
  title: row.title ?? '',
  category: row.category ?? 'extracurricular',
  period: row.period ?? { start: '', end: '', duration: '' },
  organization: row.organization ?? '',
  role: row.role ?? '',
  teamSize: row.team_size ?? undefined,
  description: row.description ?? '',
  challenges: row.challenges ?? [],
  achievements: row.achievements ?? [],
  skills: row.skills ?? [],
  learnings: row.learnings ?? [],
  starFramework: row.star_framework ?? { situation: '', task: '', action: '', result: '' },
  quantifiedResults: row.quantified_results ?? [],
  jobHuntRelevance: row.job_hunt_relevance ?? {
    priority: 'medium',
    targetIndustries: [],
    targetPositions: [],
    keywords: [],
    esUsage: false,
    interviewUsage: false,
  },
  reflectionDepth: row.reflection_depth ?? 3,
  completeness: row.completeness ?? 0,
  isPrivate: row.is_private ?? false,
});

const toRow = (exp: Partial<Experience>, userId: string) => ({
  id: exp.id,
  user_id: userId,
  title: exp.title,
  category: exp.category,
  period: exp.period,
  organization: exp.organization,
  role: exp.role,
  team_size: exp.teamSize,
  description: exp.description,
  challenges: exp.challenges,
  achievements: exp.achievements,
  skills: exp.skills,
  learnings: exp.learnings,
  star_framework: exp.starFramework,
  quantified_results: exp.quantifiedResults,
  job_hunt_relevance: exp.jobHuntRelevance,
  reflection_depth: exp.reflectionDepth,
  completeness: exp.completeness,
  is_private: exp.isPrivate,
});

const TAB_KEYS = ['overview', 'experiences', 'gakuchika', 'templates'] as const;

type TabKey = typeof TAB_KEYS[number];

export function ExperienceReflection({ userId, onProgressUpdate }: ExperienceReflectionProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [viewMode, setViewMode] = useState<TabKey>('overview');
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPrivate, setShowPrivate] = useState(true);

  const [newExperience, setNewExperience] = useState<Partial<Experience>>({
    title: '',
    category: 'extracurricular',
    period: { start: '', end: '', duration: '' },
    organization: '',
    role: '',
    teamSize: undefined,
    description: '',
    challenges: [],
    achievements: [],
    skills: [],
    learnings: [],
    starFramework: { situation: '', task: '', action: '', result: '' },
    quantifiedResults: [],
    jobHuntRelevance: {
      priority: 'medium',
      targetIndustries: [],
      targetPositions: [],
      keywords: [],
      esUsage: false,
      interviewUsage: false,
    },
    reflectionDepth: 3,
    completeness: 0,
    isPrivate: false,
  });

  useEffect(() => {
    if (!userId) return;
    loadExperiences();
  }, [userId]);

  useEffect(() => {
    const progress = Math.min(
      100,
      experiences.length * 15 +
        experiences.filter((e) => e.completeness > 80).length * 10 +
        experiences.filter((e) => e.jobHuntRelevance.priority === 'high').length * 5,
    );
    onProgressUpdate(progress);
  }, [experiences, onProgressUpdate]);

  const loadExperiences = async () => {
    const { data, error } = await supabase
      .from('ipo_experiences')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('loadExperiences error', error);
      setExperiences([]);
      return;
    }
    setExperiences((data ?? []).map(fromRow));
  };

  const handleSaveExperience = async () => {
    if (!newExperience.title) return;

    const completeness = calculateCompleteness(newExperience);

    const experience: Partial<Experience> = {
      title: newExperience.title!,
      category: (newExperience.category as any) || 'extracurricular',
      period: newExperience.period || { start: '', end: '', duration: '' },
      organization: newExperience.organization || '',
      role: newExperience.role || '',
      teamSize: newExperience.teamSize,
      description: newExperience.description || '',
      challenges: newExperience.challenges || [],
      achievements: newExperience.achievements || [],
      skills: newExperience.skills || [],
      learnings: newExperience.learnings || [],
      starFramework: newExperience.starFramework || { situation: '', task: '', action: '', result: '' },
      quantifiedResults: newExperience.quantifiedResults || [],
      jobHuntRelevance:
        newExperience.jobHuntRelevance ||
        ({
          priority: 'medium',
          targetIndustries: [],
          targetPositions: [],
          keywords: [],
          esUsage: false,
          interviewUsage: false,
        } as any),
      reflectionDepth: newExperience.reflectionDepth || 3,
      completeness,
      isPrivate: newExperience.isPrivate || false,
    };

    if (editingExperience?.id) experience.id = editingExperience.id;

    const payload = toRow(experience, userId) as any;

    try {
      if (editingExperience && editingExperience.id) {
        const { error } = await supabase.from('ipo_experiences').upsert(payload, { onConflict: 'id' }).select();
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from('ipo_experiences').insert(payload).select();
        if (error) throw error;
      }
      await loadExperiences();
    } catch (e) {
      console.error('save experience error', e);
    }

    resetForm();
    setShowExperienceModal(false);
  };

  const resetForm = () => {
    setNewExperience({
      title: '',
      category: 'extracurricular',
      period: { start: '', end: '', duration: '' },
      organization: '',
      role: '',
      teamSize: undefined,
      description: '',
      challenges: [],
      achievements: [],
      skills: [],
      learnings: [],
      starFramework: { situation: '', task: '', action: '', result: '' },
      quantifiedResults: [],
      jobHuntRelevance: {
        priority: 'medium',
        targetIndustries: [],
        targetPositions: [],
        keywords: [],
        esUsage: false,
        interviewUsage: false,
      },
      reflectionDepth: 3,
      completeness: 0,
      isPrivate: false,
    });
    setEditingExperience(null);
  };

  const filteredExperiences = useMemo(() => {
    return experiences
      .filter((exp) => selectedCategory === 'all' || exp.category === selectedCategory)
      .filter((exp) => showPrivate || !exp.isPrivate)
      .sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 } as any;
        if (a.jobHuntRelevance.priority !== b.jobHuntRelevance.priority) {
          return (
            priorityOrder[b.jobHuntRelevance.priority as keyof typeof priorityOrder] -
            priorityOrder[a.jobHuntRelevance.priority as keyof typeof priorityOrder]
          );
        }
        return b.completeness - a.completeness;
      });
  }, [experiences, selectedCategory, showPrivate]);

  // ----- UI helpers -----
  const CategoryChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip
          label="すべて"
          active={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        />
        {Object.entries(categoryConfig).map(([key, cfg]) => (
          <Chip
            key={key}
            label={(cfg as any).label}
            active={selectedCategory === key}
            onPress={() => setSelectedCategory(key)}
          />
        ))}
      </View>
    </ScrollView>
  );

  const Header = () => (
    <View style={styles.headerCard}>
      <View>
        <Text style={styles.headerTitle}>ガクチカ・経験整理</Text>
        <Text style={styles.headerSubtitle}>学生時代の経験を就活で効果的に活用できる形で整理しましょう</Text>
      </View>
      <TouchableOpacity style={styles.outlineBtn} onPress={() => { /* TODO: export ES */ }}>
        <Download size={18} />
        <Text style={styles.outlineBtnText}>ESテンプレート出力</Text>
      </TouchableOpacity>
    </View>
  );

  const Tabs = () => (
    <View style={styles.tabsRow}>
      {TAB_KEYS.map((key) => (
        <TouchableOpacity
          key={key}
          onPress={() => setViewMode(key)}
          style={[styles.tabBtn, viewMode === key && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, viewMode === key && styles.tabTextActive]}>
            {key === 'overview' && '概要'}
            {key === 'experiences' && '経験詳細'}
            {key === 'gakuchika' && 'ガクチカ生成'}
            {key === 'templates' && 'ESテンプレート'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const Overview = () => {
    const highPriority = experiences.filter((e) => e.jobHuntRelevance.priority === 'high');
    const completed = experiences.filter((e) => e.completeness > 80);
    const avgCompleteness = experiences.length
      ? Math.round(experiences.reduce((sum, e) => sum + e.completeness, 0) / experiences.length)
      : 0;

    return (
      <View style={{ gap: 12 }}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="総経験数" value={`${experiences.length}`} accent="#2563EB" />
          <StatCard label="就活重要度高" value={`${highPriority.length}`} accent="#16A34A" />
          <StatCard label="完成度80%以上" value={`${completed.length}`} accent="#7C3AED" />
          <StatCard label="平均完成度" value={`${avgCompleteness}%`} accent="#EA580C" />
        </View>

        {/* Top Experiences */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>就活で活用予定の主要経験</Text>
          <View style={{ gap: 10 }}>
            {highPriority.slice(0, 3).map((experience) => {
              const cfg: any = (categoryConfig as any)[experience.category];
              return (
                <View key={experience.id} style={styles.highlightItem}>
                  <View style={styles.highlightIcon}>
                    {/* Icon optional: constants may differ between Web/Native */}
                    {/* Render a dot badge instead */}
                    <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.itemTitle}>{experience.title}</Text>
                      <View style={styles.badgesRow}>
                        <Badge label="優先度高" tone="green" />
                        <Badge label={cfg?.label ?? ''} tone="indigo" />
                      </View>
                    </View>
                    <Text style={styles.itemBody}>{experience.description}</Text>
                    <View style={styles.threeColRow}>
                      <KeyVal k="期間" v={experience.period.duration || '-'} />
                      <KeyVal k="完成度" v={`${experience.completeness}%`} />
                      <KeyVal k="スキル数" v={`${experience.skills.length}個`} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Category Distribution */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>経験の分野別分布</Text>
          <View style={styles.categoryGrid}>
            {Object.entries(categoryConfig).map(([key, cfg]) => {
              const count = experiences.filter((e) => e.category === key).length;
              return (
                <View key={key} style={styles.categoryCell}>
                  <View style={styles.categoryIcon} />
                  <Text style={styles.categoryLabel}>{(cfg as any).label}</Text>
                  <Text style={styles.categoryCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const ExperienceList = () => (
    <View style={{ gap: 12 }}>
      <View style={styles.card}>
        <CategoryChips />
        <View style={styles.filtersRow}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowPrivate((v) => !v)}>
            {showPrivate ? <Eye size={18} /> : <EyeOff size={18} />}
            <Text style={styles.outlineBtnText}>{showPrivate ? 'プライベート表示' : 'プライベート非表示'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setEditingExperience(null);
              setShowExperienceModal(true);
            }}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>経験を追加</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredExperiences}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => <ExperienceItem exp={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );

  const ExperienceItem = ({ exp }: { exp: Experience }) => {
    const cfg: any = (categoryConfig as any)[exp.category];
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.itemTitle}>{exp.title}</Text>
          <View style={styles.badgesRow}>
            <Badge label={cfg?.label ?? ''} tone="indigo" />
            {exp.jobHuntRelevance.priority === 'high' && <Badge label="優先度高" tone="green" />}
            {exp.isPrivate && <Badge label="プライベート" tone="outline" />}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                setNewExperience(exp);
                setEditingExperience(exp);
                setShowExperienceModal(true);
              }}
            >
              <Edit3 size={18} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.threeColRow}>
          <KeyVal k="組織" v={exp.organization || '-'} />
          <KeyVal k="役割" v={exp.role || '-'} />
          <KeyVal k="期間" v={exp.period.duration || '-'} />
        </View>

        <Text style={styles.itemBody}>{exp.description}</Text>

        {!!exp.starFramework?.situation && (
          <View style={styles.starBox}>
            <Text style={styles.starTitle}>STAR法での整理</Text>
            <Text style={styles.starBody}>{exp.starFramework.situation}</Text>
          </View>
        )}

        {!!exp.skills?.length && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.kvKey}>スキル:</Text>
            <View style={styles.skillRow}>
              {exp.skills.slice(0, 3).map((s, i) => (
                <Badge key={`${s}-${i}`} label={s} tone="secondary" />
              ))}
              {exp.skills.length > 3 && <Badge label={`+${exp.skills.length - 3}`} tone="outline" />}
            </View>
          </View>
        )}

        <View style={[styles.rowBetween, { marginTop: 10 }] }>
          <View style={styles.rowCenter}>
            <View style={styles.rowCenter}>
              <CheckCircle size={16} />
              <Text style={styles.metaText}>完成度 {exp.completeness}%</Text>
            </View>
            <View style={[styles.rowCenter, { marginLeft: 12 }]}>
              <Star size={16} />
              <Text style={styles.metaText}>反省深度 {exp.reflectionDepth}/5</Text>
            </View>
          </View>
          <Text style={styles.metaText}>
            最終更新: {(() => {
              const anyExp: any = exp as any;
              return anyExp.updated_at
                ? new Date(anyExp.updated_at).toLocaleDateString()
                : new Date().toLocaleDateString();
            })()}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <Header />
        <Tabs />

        {viewMode === 'overview' && <Overview />}
        {viewMode === 'experiences' && <ExperienceList />}
        {viewMode === 'gakuchika' && (
          <View style={styles.centerBox}>
            <Text style={styles.muted}>ガクチカ生成機能を実装中...</Text>
          </View>
        )}
        {viewMode === 'templates' && (
          <View style={styles.centerBox}>
            <Text style={styles.muted}>ESテンプレート機能を実装中...</Text>
          </View>
        )}
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={showExperienceModal} animationType="slide" onRequestClose={() => setShowExperienceModal(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text style={styles.modalTitle}>{editingExperience ? '経験を編集' : '新しい経験を追加'}</Text>
            <Text style={styles.muted}>STAR法を活用して就活で使える経験を整理しましょう</Text>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>タイトル *</Text>
              <TextInput
                style={styles.input}
                value={newExperience.title}
                onChangeText={(t) => setNewExperience((p) => ({ ...p, title: t }))}
                placeholder="例: サークル代表として組織改革"
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>カテゴリー</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {Object.entries(categoryConfig).map(([key, cfg]) => (
                    <Chip
                      key={key}
                      label={(cfg as any).label}
                      active={newExperience.category === key}
                      onPress={() => setNewExperience((p) => ({ ...p, category: key as any }))}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>概要説明</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                multiline
                value={newExperience.description}
                onChangeText={(t) => setNewExperience((p) => ({ ...p, description: t }))}
                placeholder="この経験について簡潔に説明してください..."
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setShowExperienceModal(false)}>
                <Text style={styles.outlineBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, !newExperience.title && { opacity: 0.5 }]}
                onPress={handleSaveExperience}
                disabled={!newExperience.title}
              >
                <Save size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---- Small UI atoms for RN ----
const Chip = ({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const Badge = ({ label, tone }: { label: string; tone?: 'green' | 'indigo' | 'secondary' | 'outline' }) => {
  const base: any[] = [styles.badge];
  switch (tone) {
    case 'green':
      base.push({ backgroundColor: '#DCFCE7', borderColor: '#16A34A' });
      break;
    case 'indigo':
      base.push({ backgroundColor: '#E0E7FF', borderColor: '#4F46E5' });
      break;
    case 'secondary':
      base.push({ backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' });
      break;
    case 'outline':
      base.push({ backgroundColor: 'transparent', borderColor: '#CBD5E1' });
      break;
  }
  return (
    <View style={base}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

const StatCard = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const KeyVal = ({ k, v }: { k: string; v: string }) => (
  <View style={{ gap: 2 }}>
    <Text style={styles.kvKey}>{k}:</Text>
    <Text style={styles.kvVal}>{v}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 12 },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSubtitle: { color: '#4B5563', marginTop: 2 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  outlineBtnText: { color: '#111827', fontWeight: '600' },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginTop: 10,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4 },
  tabText: { color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#111827' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#6B7280', fontSize: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#111827' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },

  highlightItem: { flexDirection: 'row', gap: 12, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  highlightIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#111827' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  itemBody: { color: '#374151', marginTop: 6 },
  threeColRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  kvKey: { color: '#374151', fontWeight: '600' },
  kvVal: { color: '#111827' },
  metaText: { color: '#6B7280', fontSize: 12 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCell: { width: '30%', backgroundColor: '#F9FAFB', borderRadius: 10, alignItems: 'center', padding: 10 },
  categoryIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#6366F1', marginBottom: 6 },
  categoryLabel: { fontWeight: '600', color: '#111827', marginBottom: 2, textAlign: 'center' },
  categoryCount: { fontSize: 18, fontWeight: '800', color: '#374151' },

  filtersRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  primaryBtn: { flexDirection: 'row', gap: 6, backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  iconBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },

  starBox: { marginTop: 6, backgroundColor: '#DBEAFE', borderRadius: 10, padding: 10 },
  starTitle: { fontWeight: '700', color: '#1E3A8A', marginBottom: 4 },
  starBody: { color: '#1D4ED8' },

  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { color: '#374151', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  centerBox: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#6B7280' },

  label: { fontWeight: '600', color: '#111827', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#111827' },
});