'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Target, Calendar as CalendarIcon, Lightbulb, Save as SaveIcon, Eye, Loader2, AlertCircle } from 'lucide-react-native';
import { supabase } from '../../../src/lib/supabase';

// Minimal Json type for Supabase jsonb
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

interface FutureVisionProps {
  onProgressUpdate: (progress: number) => void;
}

interface VisionData {
  timeframe: '5年後' | '10年後' | '20年後';
  career: string;
  lifestyle: string;
  relationships: string;
  skills: string;
  values: string;
  achievements: string;
  challenges: string;
  learnings: string;
}

export type Timeframe = '5年後' | '10年後' | '20年後';

const EMPTY_VISION: Record<Timeframe, VisionData> = {
  '5年後': { timeframe: '5年後', career: '', lifestyle: '', relationships: '', skills: '', values: '', achievements: '', challenges: '', learnings: '' },
  '10年後': { timeframe: '10年後', career: '', lifestyle: '', relationships: '', skills: '', values: '', achievements: '', challenges: '', learnings: '' },
  '20年後': { timeframe: '20年後', career: '', lifestyle: '', relationships: '', skills: '', values: '', achievements: '', challenges: '', learnings: '' },
};

const prompts = {
  career: '理想のキャリア、職業、ポジション、働き方について詳しく書いてください',
  lifestyle: 'どんな場所でどんな生活をしていたいか、ライフスタイルを描いてください',
  relationships: '家族、友人、パートナーとの関係性はどうありたいですか',
  skills: '身につけていたいスキル、専門性、資格などを挙げてください',
  values: '大切にしたい価値観、信念、人生の軸は何ですか',
  achievements: '達成したい目標、成し遂げたいことを具体的に書いてください',
  challenges: '乗り越えたい課題、挑戦してみたいことは何ですか',
  learnings: '学び続けたいこと、成長したい分野を教えてください',
} as const;

const fieldLabels = {
  career: 'キャリア・仕事',
  lifestyle: 'ライフスタイル',
  relationships: '人間関係',
  skills: 'スキル・能力',
  values: '価値観',
  achievements: '目標・成果',
  challenges: '挑戦・課題',
  learnings: '学習・成長',
} as const;

type VisionField = keyof Omit<VisionData, 'timeframe'>;

export function FutureVision({ onProgressUpdate }: FutureVisionProps) {
  const [visions, setVisions] = useState<Record<Timeframe, VisionData>>(EMPTY_VISION);
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('5年後');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allFieldsCount = 3 * 8; // 3 timeframes x 8 fields

  const getCompletionRate = (vision: VisionData) => {
    const n = Object.entries(vision).filter(([k, val]) => k !== 'timeframe' && Boolean(val)).length;
    return Math.round((n / 8) * 100);
  };

  const overallCompletion = useMemo(() => {
    const filled = Object.values(visions).reduce((sum, v) => {
      const n = Object.entries(v).filter(([k, val]) => k !== 'timeframe' && Boolean(val)).length;
      return sum + n;
    }, 0);
    return Math.round((filled / allFieldsCount) * 100);
  }, [visions]);

  // propagate completion to parent
  useEffect(() => {
    onProgressUpdate(overallCompletion);
  }, [overallCompletion, onProgressUpdate]);

  // --------- load current user & data ---------
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = (userRes as any)?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ipo_future_vision')
        .select('action_plan')
        .eq('user_id', uid)
        .maybeSingle();

      if (!error && data) {
        const ap = (data as any)?.action_plan ?? {};
        const stored = ap?.visions as Record<Timeframe, VisionData> | undefined;
        if (stored && typeof stored === 'object') {
          const merged = { ...EMPTY_VISION } as Record<Timeframe, VisionData>;
          (Object.keys(merged) as Timeframe[]).forEach((tf) => {
            merged[tf] = {
              ...merged[tf],
              ...(stored[tf] ?? {}),
              timeframe: tf,
            } as VisionData;
          });
          setVisions(merged);
        }
      }
      setLoading(false);
    })();
  }, []);

  // --------- save (debounced) ---------
  const saveAllToJson = async (current: Record<Timeframe, VisionData>) => {
    if (!userId) return;
    setSaving('saving');
    const payload: { user_id: string; action_plan: Json; updated_at: string } = {
      user_id: userId,
      action_plan: ({ visions: current } as unknown) as Json,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('ipo_future_vision')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) {
      console.error('save future_visions error', error);
      setSaving('error');
    } else {
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 1500);
    }
  };

  const saveAll = async () => {
    await saveAllToJson(visions);
  };

  const scheduleSave = (nextState: Record<Timeframe, VisionData>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveAllToJson(nextState);
    }, 800);
  };

  const updateVision = (field: VisionField, value: string) => {
    setVisions((prev) => {
      const next = {
        ...prev,
        [activeTimeframe]: { ...prev[activeTimeframe], [field]: value },
      } as Record<Timeframe, VisionData>;
      scheduleSave(next);
      return next;
    });
  };

  // --------- UI ---------
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>将来ビジョン設計</Text>
            <Text style={styles.subtitle}>5年後、10年後、20年後の理想の姿を具体的に描いてみましょう</Text>
          </View>
          <View style={styles.rightHeader}>
            <View style={styles.badge}><Text style={styles.badgeText}>完了率: {overallCompletion}%</Text></View>
            <TouchableOpacity onPress={saveAll} disabled={!userId || loading} style={[styles.saveBtn, (!userId || loading) && styles.saveBtnDisabled]}>
              {saving === 'saving' ? (
                <ActivityIndicator />
              ) : (
                <SaveIcon size={18} />
              )}
              <Text style={styles.saveBtnText}>
                {saving === 'saving' ? '保存中…' : saving === 'saved' ? '保存済み' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!userId && (
          <View style={styles.warnRow}>
            <AlertCircle size={16} />
            <Text style={styles.warnText}>ログインユーザーが確認できません。保存するにはログインしてください。</Text>
          </View>
        )}

        <View style={styles.progressRow}>
          {(Object.entries(visions) as [Timeframe, VisionData][]).map(([timeframe, vision]) => (
            <View key={timeframe} style={styles.progressCell}>
              <Text style={styles.progressPercent}>{getCompletionRate(vision)}%</Text>
              <Text style={styles.progressLabel}>{timeframe}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsList}>
        {(['5年後','10年後','20年後'] as Timeframe[]).map((tf) => (
          <TouchableOpacity key={tf} style={[styles.tabBtn, activeTimeframe === tf && styles.tabBtnActive]} onPress={() => setActiveTimeframe(tf)}>
            {tf === '5年後' && <Target size={16} />}
            {tf === '10年後' && <CalendarIcon size={16} />}
            {tf === '20年後' && <Eye size={16} />}
            <Text style={[styles.tabText, activeTimeframe === tf && styles.tabTextActive]}>{tf}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(Object.entries(visions) as [Timeframe, VisionData][])
        .filter(([tf]) => tf === activeTimeframe)
        .map(([timeframe, vision]) => (
        <View key={timeframe} style={styles.card}>
          <Text style={styles.sectionTitle}>{timeframe}のビジョン</Text>
          <View style={styles.grid2Cols}>
            {(Object.entries(fieldLabels) as [VisionField, string][]).map(([field, label]) => (
              <View key={field} style={styles.fieldBlock}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{label}</Text>
                  <Lightbulb size={16} />
                </View>
                <TextInput
                  value={vision[field] as string}
                  onChangeText={(t) => updateVision(field, t)}
                  placeholder={prompts[field as keyof typeof prompts]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={styles.textarea}
                />
              </View>
            ))}
          </View>

          {getCompletionRate(vision) > 50 && (
            <View style={[styles.card, styles.summaryCard]}>
              <Text style={styles.summaryTitle}>🎯 {timeframe}のビジョンサマリー</Text>
              <View style={{ gap: 6 }}>
                {!!vision.career && (
                  <Text style={styles.summaryText}><Text style={styles.summaryStrong}>キャリア：</Text>{vision.career.substring(0, 100)}...</Text>
                )}
                {!!vision.lifestyle && (
                  <Text style={styles.summaryText}><Text style={styles.summaryStrong}>ライフスタイル：</Text>{vision.lifestyle.substring(0, 100)}...</Text>
                )}
                {!!vision.values && (
                  <Text style={styles.summaryText}><Text style={styles.summaryStrong}>価値観：</Text>{vision.values.substring(0, 100)}...</Text>
                )}
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Inspiration */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💡 ビジョン作成のヒント</Text>
        <View style={styles.grid2Cols}>
          <View style={{ gap: 6 }}>
            <Text style={styles.subSectionTitle}>効果的なビジョンの特徴</Text>
            <View style={{ gap: 4 }}>
              <Text style={styles.hintItem}>• 具体的で詳細に描かれている</Text>
              <Text style={styles.hintItem}>• 感情に訴えかける内容になっている</Text>
              <Text style={styles.hintItem}>• 実現可能性と挑戦性のバランスが取れている</Text>
              <Text style={styles.hintItem}>• 自分の価値観と一致している</Text>
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.subSectionTitle}>考える際のポイント</Text>
            <View style={{ gap: 4 }}>
              <Text style={styles.hintItem}>• 「なぜそうありたいのか」理由も考える</Text>
              <Text style={styles.hintItem}>• 数字や期限を入れて具体化する</Text>
              <Text style={styles.hintItem}>• 周りの人への影響も含めて考える</Text>
              <Text style={styles.hintItem}>• 定期的に見直し、更新する</Text>
            </View>
          </View>
        </View>
      </View>

      {loading && (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  rightHeader: {
    alignItems: 'flex-end',
    gap: 8,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, color: '#111827', fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  warnText: { color: '#92400E', fontSize: 12 },
  progressRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  progressCell: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  progressPercent: { fontSize: 16, fontWeight: '700', color: '#111827' },
  progressLabel: { fontSize: 12, color: '#6B7280' },
  tabsList: { flexDirection: 'row', gap: 8 },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  tabBtnActive: { backgroundColor: '#111827' },
  tabText: { fontWeight: '700', color: '#111827' },
  tabTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  subSectionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  hintItem: { fontSize: 12, color: '#374151' },
  grid2Cols: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 },
  fieldBlock: { width: '48%', gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 12, color: '#111827', fontWeight: '600' },
  textarea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    minHeight: 96,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#F0F6FF',
    borderColor: '#BFDBFE',
    marginTop: 12,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6 },
  summaryText: { fontSize: 12, color: '#374151' },
  summaryStrong: { fontWeight: '700', color: '#111827' },
});

export default FutureVision;
