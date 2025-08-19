import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, SafeAreaView, ScrollView, FlatList, Modal, TouchableOpacity, TextInput, Switch as RNSwitch, ActivityIndicator, Pressable } from 'react-native';
import { Plus, Edit3, Save, Star, Calendar, CheckCircle, ChevronRight, ChevronDown, Brain, Sparkles, X } from 'lucide-react-native';
import { supabase } from '../../../src/lib/supabase';
// --- Local fallback types (mobile) ---
// If you later add shared types, you can remove these and re-import.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface SimpleExperience {
  id?: string | number;
  title: string;
  description: string;
  category: string; // e.g. 'club' | 'parttime' | ...
  period?: string;
  isJobHuntRelevant: boolean;
  details?: {
    role?: string;
    organization?: string;
    challenge?: string;
    action?: string;
    result?: string;
    skills?: string[];
  };
  completeness: number;
  lastUpdated?: string;
  isPrivate?: boolean;
}

export interface ExperienceTemplate {
  id: string;
  name: string;
  category: string;
  titleTemplate: string;
  descriptionTemplate: string;
  suggestedSkills: string[];
}

export interface SimpleExperienceProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
}
// --- End local fallback types ---
// --- Local fallback constants (mobile) ---
// If you later add shared constants, you can remove these and re-import from ../constants/simpleExperienceConstants
const categoryConfig: Record<string, {
  label: string;
  description: string;
  bgColor?: string;
  tint?: string;
  badgeBg?: string;
  badgeTint?: string;
  iconRN?: any;
}> = {
  club: { label: 'サークル', description: '部活・サークル活動', bgColor: '#eef2ff', tint: '#4338ca', badgeBg: '#eef2ff', badgeTint: '#4338ca' },
  parttime: { label: 'アルバイト', description: 'アルバイト経験', bgColor: '#ecfeff', tint: '#155e75', badgeBg: '#ecfeff', badgeTint: '#155e75' },
  seminar: { label: 'ゼミ', description: 'ゼミ・研究会', bgColor: '#fef9c3', tint: '#92400e', badgeBg: '#fef9c3', badgeTint: '#92400e' },
  volunteer: { label: 'ボランティア', description: '奉仕・社会貢献', bgColor: '#dcfce7', tint: '#166534', badgeBg: '#dcfce7', badgeTint: '#166534' },
  research: { label: '研究', description: '研究・学術活動', bgColor: '#fae8ff', tint: '#6b21a8', badgeBg: '#fae8ff', badgeTint: '#6b21a8' },
  project: { label: 'プロジェクト', description: '個人/チームプロジェクト', bgColor: '#e0f2fe', tint: '#0369a1', badgeBg: '#e0f2fe', badgeTint: '#0369a1' },
  competition: { label: 'コンテスト', description: '大会・ハッカソン', bgColor: '#fee2e2', tint: '#b91c1c', badgeBg: '#fee2e2', badgeTint: '#b91c1c' },
  other: { label: 'その他', description: 'その他の経験', bgColor: '#f3f4f6', tint: '#374151', badgeBg: '#f3f4f6', badgeTint: '#374151' },
};

const experienceTemplates: ExperienceTemplate[] = [
  {
    id: 'club_lead',
    name: 'サークル運営',
    category: 'club',
    titleTemplate: 'サークル代表としての運営',
    descriptionTemplate: '○○サークルで代表として、方針策定・メンバー調整・イベント企画を主導。参加率や満足度の改善に取り組んだ。',
    suggestedSkills: ['リーダーシップ', '調整力', '課題解決'],
  },
  {
    id: 'baito_cs',
    name: '接客アルバイト',
    category: 'parttime',
    titleTemplate: '飲食店での接客アルバイト',
    descriptionTemplate: 'ピーク帯のオペレーション最適化や新人教育を担当。顧客満足と回転率の改善に寄与。',
    suggestedSkills: ['コミュニケーション', '改善提案', '責任感'],
  },
  {
    id: 'seminar_research',
    name: 'ゼミ研究',
    category: 'seminar',
    titleTemplate: 'ゼミでの研究活動',
    descriptionTemplate: '既存研究のレビューから仮説設定・調査設計・データ分析・発表まで一連を経験。',
    suggestedSkills: ['論理的思考', '情報収集', 'プレゼンテーション'],
  },
];

const commonSkills: string[] = [
  'コミュニケーション',
  'チームワーク',
  'リーダーシップ',
  '課題解決',
  '計画力',
  '主体性',
  'データ分析',
  '情報収集',
  '傾聴力',
  '改善提案',
  'プレゼンテーション',
  '粘り強さ',
  '責任感',
];
// --- End local fallback constants ---

// 初期フォーム状態
const initialFormData: Partial<SimpleExperience> = {
  title: '',
  description: '',
  category: 'club',
  period: '',
  isJobHuntRelevant: true,
  details: {},
  isPrivate: false,
};

export function SimpleExperienceReflection({ userId, onProgressUpdate }: SimpleExperienceProps) {
  const [experiences, setExperiences] = useState<SimpleExperience[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingExperience, setEditingExperience] = useState<SimpleExperience | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExperienceTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<SimpleExperience>>(initialFormData);

  // onProgressUpdate の安定参照
  const onProgressUpdateRef = useRef(onProgressUpdate);
  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  const updateProgress = useCallback((list: SimpleExperience[]) => {
    const progress = Math.min(100, list.length * 20 + list.filter(e => e.completeness > 50).length * 10);
    onProgressUpdateRef.current(progress);
  }, []);

  const loadExperiences = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ipo_experiences')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to load experiences:', error?.message || error);
        setExperiences([]);
      } else {
        const rows: SimpleExperience[] = (data || []).map((row: any) => ({
          id: String(row.id),
          title: row.title ?? '',
          description: row.description ?? '',
          category: row.category ?? 'club',
          period: row.period ?? row.period_text ?? '',
          isJobHuntRelevant: (row.is_job_hunt_relevant ?? row.isJobHuntRelevant) ?? true,
          details: row.details ?? {},
          completeness: row.completeness ?? 0,
          lastUpdated: row.last_updated ?? (row.updated_at ? String(row.updated_at).split('T')[0] : ''),
          isPrivate: (row.is_private ?? row.isPrivate) ?? false,
        }));
        setExperiences(rows);
        updateProgress(rows);
      }
    } catch (e: any) {
      console.error('Failed to load experiences (exception):', e?.message || e);
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  }, [userId, updateProgress]);

  useEffect(() => {
    loadExperiences();
  }, [loadExperiences]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setEditingExperience(null);
    setSelectedTemplate(null);
    setShowAdvanced(false);
    setShowDialog(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.title || !formData.description) return;

    const payloadDb: any = {
      user_id: userId,
      title: formData.title!,
      description: formData.description!,
      category: formData.category ?? 'general',
      updated_at: new Date().toISOString(),
    };
    if (Array.isArray(formData.details?.skills)) {
      payloadDb.skills = formData.details!.skills;
    }

    let error: any = null;
    if (editingExperience?.id != null) {
      const idNum = Number(editingExperience.id);
      const { error: e } = await supabase
        .from('ipo_experiences')
        .update(payloadDb)
        .eq('id', idNum)
        .select()
        .single();
      error = e;
    } else {
      const { error: e } = await supabase
        .from('ipo_experiences')
        .insert(payloadDb)
        .select()
        .single();
      error = e;
    }

    if (error) {
      console.error('Failed to save experience:', error);
      return;
    }

    await loadExperiences();
    resetForm();
  }, [formData, editingExperience, userId, loadExperiences, resetForm]);

  const handleTemplateSelect = useCallback((template: ExperienceTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      category: template.category,
      title: template.titleTemplate,
      description: template.descriptionTemplate,
    }));
  }, []);

  const generateSTAR = useCallback(() => {
    if (!formData.description) return;
    const description = formData.description;
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        challenge: `${description}において発生した課題`,
        action: `この課題に対して具体的な取り組みを実施`,
        result: `取り組みの結果、目標を達成することができました`,
      },
    }));
  }, [formData.description]);

  const suggestSkills = useCallback(() => {
    const category = formData.category || 'club';
    const template = experienceTemplates.find(t => t.category === category);
    if (template) {
      setFormData(prev => ({
        ...prev,
        details: { ...prev.details, skills: template.suggestedSkills },
      }));
    }
  }, [formData.category]);

  const updateFormField = useCallback(<T extends keyof SimpleExperience>(field: T, value: SimpleExperience[T]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateDetailField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, details: { ...prev.details, [field]: value } }));
  }, []);

  const statistics = useMemo(() => {
    const jobHuntCount = experiences.filter(e => e.isJobHuntRelevant).length;
    const completedCount = experiences.filter(e => e.completeness > 70).length;
    const averageCompleteness = experiences.length > 0
      ? Math.round(experiences.reduce((sum, e) => sum + e.completeness, 0) / experiences.length)
      : 0;
    return { jobHuntCount, completedCount, averageCompleteness };
  }, [experiences]);

  const StatCard = ({ value, label, colorClass }: { value: string | number; label: string; colorClass?: string }) => (
    <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#fff', shadowOpacity: 0.05, shadowRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colorClass || '#1f2937', marginBottom: 4 }}>{value}</Text>
      <Text style={{ fontSize: 12, color: '#6b7280' }}>{label}</Text>
    </View>
  );

  const renderItem = ({ item, index }: { item: SimpleExperience; index: number }) => {
    const config = categoryConfig[item.category];
    const Icon = config.iconRN || Star; // iconRN をモバイル用に用意している場合

    return (
      <Pressable
        onPress={() => {
          setFormData(item);
          setEditingExperience(item);
          setShowDialog(true);
        }}
        style={({ pressed }) => ({
          opacity: pressed ? 0.9 : 1,
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        })}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: config.bgColor || '#eef2ff', marginRight: 12 }}>
              <Icon size={22} color={config.tint || '#4338ca'} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ backgroundColor: config.badgeBg || '#eef2ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 6 }}>
                  <Text style={{ fontSize: 11, color: config.badgeTint || '#4338ca' }}>{config.label}</Text>
                </View>
                {item.isJobHuntRelevant && (
                  <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: '#166534' }}>就活活用</Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={2} style={{ fontWeight: '700', fontSize: 16, color: '#111827' }}>{item.title}</Text>
            </View>
          </View>
          <Edit3 size={18} color="#6b7280" />
        </View>

        <Text numberOfLines={3} style={{ color: '#4b5563', fontSize: 13, marginTop: 8 }}>{item.description}</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Calendar size={16} color="#6b7280" />
            <Text style={{ marginLeft: 6, color: '#6b7280', fontSize: 12 }}>{item.period}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CheckCircle size={16} color="#6b7280" />
            <Text style={{ marginLeft: 6, color: '#6b7280', fontSize: 12 }}>{item.completeness}%</Text>
          </View>
        </View>

        {item.details?.skills && item.details.skills.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
            {item.details.skills.slice(0, 3).map((skill: string, i: number) => (
              <View key={`${skill}-${i}`} style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 6, marginBottom: 6 }}>
                <Text style={{ fontSize: 12, color: '#374151' }}>{skill}</Text>
              </View>
            ))}
            {item.details.skills.length > 3 && (
              <View style={{ borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: '#374151' }}>+{item.details.skills.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  const Header = () => (
    <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowOpacity: 0.05, shadowRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 }}>経験の整理</Text>
          <Text style={{ color: '#6b7280' }}>学生時代の経験をシンプルに整理して、就活で活用しましょう</Text>
        </View>
        <TouchableOpacity onPress={() => setShowDialog(true)} style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Plus size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>追加</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Star size={28} color="#2563eb" />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>最初の経験を追加しましょう</Text>
      <Text style={{ color: '#6b7280', marginBottom: 14 }}>学生時代に力を入れたことから始めてみてください</Text>
      <TouchableOpacity onPress={() => setShowDialog(true)} style={{ backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Plus size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>経験を追加</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const Stats = () => (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      <StatCard value={experiences.length} label="総経験数" colorClass="#2563eb" />
      <StatCard value={statistics.jobHuntCount} label="就活活用" colorClass="#16a34a" />
      <StatCard value={statistics.completedCount} label="完成度高" colorClass="#7c3aed" />
      <StatCard value={`${statistics.averageCompleteness}%`} label="平均完成度" colorClass="#ea580c" />
    </View>
  );

  const DialogField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );

  const SkillChip = ({ text, onRemove }: { text: string; onRemove?: () => void }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, marginRight: 6, marginBottom: 6 }}>
      <Text style={{ fontSize: 12, color: '#374151' }}>{text}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} style={{ marginLeft: 6 }}>
          <X size={14} color="#6b7280" />
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <Header />

        {loading ? (
          <View style={{ paddingVertical: 30 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <Stats />

            {experiences.length === 0 ? (
              <EmptyState />)
              : (
                <FlatList
                  data={experiences}
                  renderItem={renderItem}
                  keyExtractor={(item) => String(item.id)}
                  scrollEnabled={false}
                />
              )}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Dialog */}
      <Modal visible={showDialog} animationType="slide" onRequestClose={() => setShowDialog(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 }}>
              {editingExperience ? '経験を編集' : '新しい経験を追加'}
            </Text>
            <Text style={{ color: '#6b7280', marginBottom: 14 }}>まずは基本情報から入力してください。詳細は後から追加できます。</Text>

            {!editingExperience && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>テンプレートを選ぶ（任意）</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {experienceTemplates.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => handleTemplateSelect(t)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                        borderWidth: 2,
                        borderColor: selectedTemplate?.id === t.id ? '#3b82f6' : '#e5e7eb',
                        backgroundColor: selectedTemplate?.id === t.id ? '#eff6ff' : '#fff',
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 10,
                        marginRight: 8,
                        marginBottom: 8,
                        maxWidth: '48%',
                      })}
                    >
                      <Text style={{ fontWeight: '600', color: '#111827', marginBottom: 4 }}>{t.name}</Text>
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>{categoryConfig[t.category].description}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <DialogField label="タイトル *">
              <TextInput
                placeholder="例：テニスサークル代表"
                value={formData.title || ''}
                onChangeText={(v) => updateFormField('title', v as any)}
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
              />
            </DialogField>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <DialogField label="カテゴリー">
                  {/* シンプルな選択: ボタンでトグル */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Object.entries(categoryConfig).map(([key, cfg]) => (
                      <Pressable
                        key={key}
                        onPress={() => updateFormField('category', key as any)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 9999,
                          borderWidth: 1,
                          borderColor: formData.category === key ? '#3b82f6' : '#e5e7eb',
                          backgroundColor: formData.category === key ? '#eff6ff' : '#fff',
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ color: formData.category === key ? '#1d4ed8' : '#374151', fontSize: 12 }}>{cfg.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </DialogField>
              </View>
              <View style={{ flex: 1 }}>
                <DialogField label="期間">
                  <TextInput
                    placeholder="例：2022年4月〜2023年3月"
                    value={formData.period || ''}
                    onChangeText={(v) => updateFormField('period', v as any)}
                    style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                  />
                </DialogField>
              </View>
            </View>

            <DialogField label="説明 *">
              <TextInput
                placeholder="この経験について説明してください..."
                value={formData.description || ''}
                onChangeText={(v) => updateFormField('description', v as any)}
                multiline
                numberOfLines={4}
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' }}
              />
              <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>{(formData.description?.length || 0)}/500文字</Text>
            </DialogField>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <RNSwitch
                value={formData.isJobHuntRelevant ?? true}
                onValueChange={(v) => updateFormField('isJobHuntRelevant', v as any)}
              />
              <Text style={{ marginLeft: 8, color: '#374151' }}>就活で活用する</Text>
            </View>

            {/* 詳細 */}
            <Pressable onPress={() => setShowAdvanced(!showAdvanced)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              {showAdvanced ? <ChevronDown size={16} color="#2563eb" /> : <ChevronRight size={16} color="#2563eb" />}
              <Text style={{ color: '#2563eb', fontWeight: '600', marginLeft: 6 }}>詳細情報を追加</Text>
            </Pressable>

            {showAdvanced && (
              <View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <DialogField label="役割">
                      <TextInput
                        placeholder="例：代表"
                        value={formData.details?.role || ''}
                        onChangeText={(v) => updateDetailField('role', v)}
                        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                      />
                    </DialogField>
                  </View>
                  <View style={{ flex: 1 }}>
                    <DialogField label="組織・団体">
                      <TextInput
                        placeholder="例：東京大学テニスサークル"
                        value={formData.details?.organization || ''}
                        onChangeText={(v) => updateDetailField('organization', v)}
                        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                      />
                    </DialogField>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>困難・課題</Text>
                  <Pressable onPress={generateSTAR} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Brain size={14} color="#111827" />
                      <Text style={{ marginLeft: 6, fontSize: 12 }}>AI生成</Text>
                    </View>
                  </Pressable>
                </View>
                <TextInput
                  placeholder="どのような困難や課題がありましたか？"
                  value={formData.details?.challenge || ''}
                  onChangeText={(v) => updateDetailField('challenge', v)}
                  multiline
                  numberOfLines={2}
                  style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top', marginBottom: 10 }}
                />

                <DialogField label="取り組み・行動">
                  <TextInput
                    placeholder="どのような行動や取り組みを行いましたか？"
                    value={formData.details?.action || ''}
                    onChangeText={(v) => updateDetailField('action', v)}
                    multiline
                    numberOfLines={2}
                    style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' }}
                  />
                </DialogField>

                <DialogField label="結果・成果">
                  <TextInput
                    placeholder="どのような結果や成果が得られましたか？"
                    value={formData.details?.result || ''}
                    onChangeText={(v) => updateDetailField('result', v)}
                    multiline
                    numberOfLines={2}
                    style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' }}
                  />
                </DialogField>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: '#374151' }}>身についたスキル</Text>
                  <Pressable onPress={suggestSkills} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Sparkles size={14} color="#111827" />
                      <Text style={{ marginLeft: 6, fontSize: 12 }}>候補表示</Text>
                    </View>
                  </Pressable>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                  {(formData.details?.skills || []).map((skill, idx) => (
                    <SkillChip
                      key={`${skill}-${idx}`}
                      text={skill}
                      onRemove={() => {
                        const newSkills = formData.details?.skills?.filter((_, i) => i !== idx) || [];
                        updateDetailField('skills', newSkills);
                      }}
                    />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {commonSkills
                    .filter((s) => !(formData.details?.skills || []).includes(s))
                    .map((skill) => (
                      <Pressable
                        key={skill}
                        onPress={() => {
                          const newSkills = [ ...(formData.details?.skills || []), skill ];
                          updateDetailField('skills', newSkills);
                        }}
                        style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, marginRight: 6, marginBottom: 6 }}
                      >
                        <Text style={{ fontSize: 12, color: '#374151' }}>{skill}</Text>
                      </Pressable>
                    ))}
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTopWidth: 1, borderColor: '#e5e7eb', marginTop: 16 }}>
              <TouchableOpacity onPress={resetForm} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!formData.title || !formData.description}
                onPress={handleSave}
                style={{ backgroundColor: !formData.title || !formData.description ? '#93c5fd' : '#2563eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Save size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>保存</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default SimpleExperienceReflection;
