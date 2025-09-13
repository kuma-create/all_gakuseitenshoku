import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import {
  Award,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react-native';

// ------- Types -------
export interface AnalysisOverviewProps {
  progress: {
    aiChat: number;
    lifeChart: number;
    futureVision: number;
    strengthAnalysis?: number; // not used in actionable list but kept for parity
    experienceReflection: number;
  };
  onNavigateToTool: (toolId: string) => void;
}

// ------- Small UI primitives (Card/Badge/Progress) -------
const Card: React.FC<{ style?: any; children?: React.ReactNode }> = ({ style, children }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const Badge: React.FC<{ label: string; variant?: 'default' | 'outline' | 'success' | 'warning'; style?: any }>
  = ({ label, variant = 'outline', style }) => (
  <View
    style={[styles.badge,
      variant === 'default' && styles.badgeDefault,
      variant === 'success' && styles.badgeSuccess,
      variant === 'warning' && styles.badgeWarning,
      style,
    ]}
  >
    <Text style={[styles.badgeText,
      (variant === 'default' || variant === 'success' || variant === 'warning') && { color: '#0f172a' }
    ]}>{label}</Text>
  </View>
);

const ProgressBar: React.FC<{ value: number }>= ({ value }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${Math.min(Math.max(value, 0), 100)}%` }]} />
  </View>
);

// ------- Helpers -------
const colorTokens = {
  blue:   { bg: '#DBEAFE', text: '#1D4ED8', accent: '#3B82F6', ring: '#93C5FD' },
  green:  { bg: '#DCFCE7', text: '#15803D', accent: '#22C55E', ring: '#86EFAC' },
  purple: { bg: '#F3E8FF', text: '#6D28D9', accent: '#A855F7', ring: '#D8B4FE' },
  pink:   { bg: '#FCE7F3', text: '#BE185D', accent: '#EC4899', ring: '#F9A8D4' },
  orange: { bg: '#FFEDD5', text: '#C2410C', accent: '#F59E0B', ring: '#FCD34D' },
} as const;

const difficultyVariant = (d?: string): 'success' | 'warning' | 'outline' | 'default' => {
  switch (d) {
    case '簡単': return 'success';
    case '普通': return 'warning';
    case '上級': return 'default';
    default: return 'outline';
  }
};

// ------- Main -------
export const AnalysisOverview: React.FC<AnalysisOverviewProps> = ({ progress, onNavigateToTool }) => {
  const tools = useMemo(() => ([
    {
      id: 'aiChat',
      title: 'AI対話分析',
      description: 'AIとの対話を通じて自分自身を深く理解する',
      icon: Brain,
      progress: progress.aiChat,
      color: 'blue' as const,
      insights: ['深い自己洞察', '感情の理解', '価値観の明確化'],
      estimatedTime: '15-30分',
      difficulty: '簡単',
      badge: 'AI'
    },
    {
      id: 'lifeChart',
      title: 'ライフチャート',
      description: '人生の重要な出来事を時系列で振り返る',
      icon: TrendingUp,
      progress: progress.lifeChart,
      color: 'green' as const,
      insights: ['成長パターン分析', 'ターニングポイント発見', '経験の価値理解'],
      estimatedTime: '20-40分',
      difficulty: '普通'
    },
    {
      id: 'futureVision',
      title: '将来ビジョン',
      description: '5年後、10年後、20年後の理想の姿を描く',
      icon: Target,
      progress: progress.futureVision,
      color: 'purple' as const,
      insights: ['目標の明確化', '価値観の整理', 'キャリアパス設計'],
      estimatedTime: '25-45分',
      difficulty: '普通',
      badge: 'HOT'
    },
    {
      id: 'experienceReflection',
      title: '経験の整理',
      description: '学生時代の経験をシンプルに整理して活用',
      icon: Award,
      progress: progress.experienceReflection,
      color: 'pink' as const,
      insights: ['経験の体系化', 'スキルの発見', '就活準備'],
      estimatedTime: '15-25分',
      difficulty: '簡単'
    },
  ]), [progress]);

  const actionableTools = useMemo(() => tools.filter(t => t.id !== 'aiChat'), [tools]);

  const overallProgress = useMemo(() => {
    const vals = Object.values(progress);
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [progress]);

  const completedTools = useMemo(() => actionableTools.filter(t => (progress as any)[t.id] >= 100).length, [actionableTools, progress]);
  const inProgressTools = useMemo(() => actionableTools.filter(t => {
    const v = (progress as any)[t.id];
    return v > 0 && v < 100;
  }).length, [actionableTools, progress]);

  const nextTool = useMemo(() => {
    const unfinished = actionableTools.filter(t => (progress as any)[t.id] < 100);
    const working = unfinished.filter(t => (progress as any)[t.id] > 0);
    if (working.length > 0) return working[0];
    const easy = unfinished.filter(t => t.difficulty === '簡単');
    if (easy.length > 0) return easy[0];
    return unfinished[0] || null;
  }, [actionableTools, progress]);

  // subtle pulse for the overall %
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
        {/* Overall Progress */}
        <Card style={{ padding: 16 }}>
          <View style={{ gap: 16 }}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.h2}>自己分析の進捗</Text>
                <Text style={styles.muted}>あなたの自己理解度を可視化します</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Animated.Text style={[styles.kpi, { transform: [{ scale: pulse }] }]}>{overallProgress}%</Animated.Text>
                <Text style={styles.caption}>総合完了率</Text>
              </View>
            </View>

            <View>
              <ProgressBar value={overallProgress} />
              <View style={styles.rowBetween}>
                <Text style={styles.caption}>開始</Text>
                <Text style={styles.caption}>完了</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colorTokens.green.bg, borderColor: colorTokens.green.ring }] }>
                <View style={[styles.iconBubble, { backgroundColor: colorTokens.green.accent }]}>
                  <Award size={18} color={'#fff'} />
                </View>
                <Text style={[styles.statNumber, { color: colorTokens.green.text }]}>{completedTools}</Text>
                <Text style={[styles.caption, { color: '#166534' }]}>完了したツール</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colorTokens.blue.bg, borderColor: colorTokens.blue.ring }] }>
                <View style={[styles.iconBubble, { backgroundColor: colorTokens.blue.accent }]}>
                  <Clock size={18} color={'#fff'} />
                </View>
                <Text style={[styles.statNumber, { color: colorTokens.blue.text }]}>{inProgressTools}</Text>
                <Text style={[styles.caption, { color: '#1e40af' }]}>進行中のツール</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colorTokens.purple.bg, borderColor: colorTokens.purple.ring }] }>
                <View style={[styles.iconBubble, { backgroundColor: colorTokens.purple.accent }]}>
                  <Target size={18} color={'#fff'} />
                </View>
                <Text style={[styles.statNumber, { color: colorTokens.purple.text }]}>{Math.max(actionableTools.length - completedTools, 0)}</Text>
                <Text style={[styles.caption, { color: '#6b21a8' }]}>残りのツール</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Next Recommended Action */}
        {nextTool && (
          <Card style={[styles.recoCard] }>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ padding: 6, backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 8, marginRight: 8 }}>
                <Zap size={16} color={'#2563eb'} />
              </View>
              <View>
                <Text style={styles.h3}>次におすすめのアクション</Text>
                <Text style={styles.mutedSmall}>継続は力なり - 少しずつでも進めていきましょう</Text>
              </View>
            </View>

            <Pressable onPress={() => onNavigateToTool(nextTool.id)} style={styles.recoRow}>
              <View style={[styles.toolIconWrap, { backgroundColor: (colorTokens as any)[nextTool.color].bg, borderColor: (colorTokens as any)[nextTool.color].ring }] }>
                <nextTool.icon size={22} color={(colorTokens as any)[nextTool.color].accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolTitle}>{nextTool.title}</Text>
                <Text style={styles.toolDesc}>{nextTool.description}</Text>
                <View style={styles.badgeRow}>
                  <Badge label={`⏱ ${nextTool.estimatedTime}`} />
                  <Badge label={nextTool.difficulty} variant={difficultyVariant(nextTool.difficulty)} />
                  {nextTool.badge && <Badge label={nextTool.badge} variant={'default'} />}
                  <Text style={styles.progressInline}>進捗: {(progress as any)[nextTool.id]}%</Text>
                </View>
              </View>
            </Pressable>
          </Card>
        )}

        {/* Tools Grid */}
        <View style={styles.toolsGrid}>
          {actionableTools.map((tool) => {
            const colors = (colorTokens as any)[tool.color];
            const toolProgress = (progress as any)[tool.id] || 0;
            const isCompleted = toolProgress >= 100;
            const isInProgress = toolProgress > 0 && toolProgress < 100;

            return (
              <Pressable key={tool.id} onPress={() => onNavigateToTool(tool.id)} style={[styles.toolCard, isInProgress && { borderColor: '#93C5FD' }, isCompleted && { backgroundColor: '#F0FDF4' }]}>
                <View style={styles.toolHeader}>
                  <View style={[styles.toolIconWrap, { backgroundColor: colors.bg, borderColor: colors.ring }] }>
                    <tool.icon size={22} color={colors.accent} />
                    {isCompleted && (
                      <View style={styles.completedMark}>
                        <CheckCircle2 size={14} color={'#fff'} />
                      </View>
                    )}
                  </View>
                  <View style={styles.badgeRow}>
                    <Badge label={isCompleted ? '完了' : isInProgress ? '進行中' : '未開始'} variant={isCompleted ? 'success' : isInProgress ? 'default' : 'outline'} />
                    <Badge label={tool.difficulty} variant={difficultyVariant(tool.difficulty)} />
                    {tool.badge && <Badge label={tool.badge} variant={'default'} />}
                  </View>
                </View>

                <Text style={styles.toolTitleLarge}>{tool.title}</Text>
                <Text style={styles.toolDesc}>{tool.description}</Text>

                <View style={{ marginTop: 8 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>進捗</Text>
                    <Text style={[styles.label, { color: colors.text }]}>{toolProgress}%</Text>
                  </View>
                  <ProgressBar value={toolProgress} />
                </View>

                <View style={styles.rowBetween}> 
                  <View style={styles.rowCenter}>
                    <Calendar size={16} color={'#64748b'} />
                    <Text style={styles.mutedSmall}> {tool.estimatedTime}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.mutedSmall}>期待できる成果:</Text>
                  <View style={styles.badgeRowWrap}>
                    {tool.insights.slice(0, 2).map((txt, i) => (
                      <Badge key={i} label={txt} />
                    ))}
                    {tool.insights.length > 2 && <Badge label={`+${tool.insights.length - 2}`} />}
                  </View>
                </View>

                <Pressable onPress={() => onNavigateToTool(tool.id)} style={[styles.primaryBtn, isCompleted && styles.secondaryBtn] }>
                  <Text style={[styles.primaryBtnText, isCompleted && styles.secondaryBtnText]}>
                    {isCompleted ? '結果を確認' : isInProgress ? '続きから始める' : '始める'}
                  </Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating AI button */}
      <Pressable onPress={() => onNavigateToTool('aiChat')} style={styles.fab} accessibilityLabel="AIに相談する">
        <Brain size={20} color={'#fff'} />
        <Text style={styles.fabText}>AIに相談する</Text>
      </Pressable>
    </View>
  );
};

// ------- Styles -------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollPad: { padding: 12, paddingBottom: 96 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderColor: '#E5E7EB', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, marginBottom: 12 },

  h2: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  h3: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  kpi: { fontSize: 26, fontWeight: '800', color: '#1d4ed8' },
  caption: { fontSize: 12, color: '#64748b', marginTop: 2 },
  muted: { fontSize: 13, color: '#64748b' },
  mutedSmall: { fontSize: 12, color: '#64748b' },
  label: { fontSize: 13, color: '#0f172a', fontWeight: '600' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },

  statsGrid: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  iconBubble: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statNumber: { fontSize: 22, fontWeight: '800' },

  progressTrack: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 999, overflow: 'hidden', marginVertical: 8 },
  progressFill: { height: '100%', backgroundColor: '#2563eb' },

  recoCard: { padding: 12, borderWidth: 2, borderColor: 'rgba(37,99,235,0.3)', backgroundColor: 'rgba(37,99,235,0.06)' },
  recoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  toolIconWrap: { padding: 10, borderRadius: 12, borderWidth: 1, marginRight: 6 },
  toolTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  toolTitleLarge: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  toolDesc: { fontSize: 12, color: '#64748b', marginTop: 4 },
  progressInline: { fontSize: 12, color: '#64748b' },

  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toolCard: { width: '100%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },
  toolHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completedMark: {
    position: 'absolute', right: -6, top: -6,
    width: 20, height: 20, borderRadius: 999, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center'
  },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderColor: '#CBD5E1', borderWidth: 1, marginRight: 6, marginTop: 4, backgroundColor: '#fff' },
  badgeDefault: { backgroundColor: '#E5E7EB' },
  badgeSuccess: { backgroundColor: '#BBF7D0' },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  badgeRowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },

  primaryBtn: { marginTop: 12, backgroundColor: '#2563eb', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  secondaryBtnText: { color: '#166534' },

  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 3 },
  fabText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
});

export default AnalysisOverview;
