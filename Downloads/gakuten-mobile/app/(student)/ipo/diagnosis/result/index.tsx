/* ------------------------------------------------------------------
   app/(student)/ipo/diagnosis/result/index.tsx (Mobile)
   - 過去の診断結果一覧（モバイル最適化）
------------------------------------------------------------------- */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "expo-router";
import { supabase } from "src/lib/supabase";

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ArrowLeft, Clock, Brain, Heart, Target, Award, ChevronRight } from "lucide-react-native";
// Workaround for type mismatch when multiple @types/react versions are present
// Cast lucide icon to a generic React component type to avoid TS2786
type SvgIconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;
const ArrowLeftIcon = ArrowLeft as unknown as SvgIconComponent;
const ChevronRightIcon = ChevronRight as unknown as SvgIconComponent;
const ClockIcon = Clock as unknown as SvgIconComponent;

// --- Local minimal UI components (self-contained, RN) ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  appBar: {
    position: 'relative',
    top: 0,
    zIndex: 20,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'rgba(255,255,255,0.95)'
  },
  appBarRow: { maxWidth: 640, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  appBarTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginLeft: 8 },
  appBarMeta: { marginLeft: 'auto', fontSize: 12, color: '#6b7280' },

  tabsWrap: { width: '100%' },
  tabsScroll: { paddingHorizontal: 12, paddingBottom: 8 },
  tabsRow: { flexDirection: 'row', marginRight: 8 /* fallback spacing for RN */ },
  tabBtn: { borderWidth: 1, borderColor: '#111827', borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 6 },
  tabBtnActive: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, color: '#111827' },
  tabTextActive: { color: '#fff' },

  container: { maxWidth: 640, alignSelf: 'center', paddingHorizontal: 12, paddingBottom: 96, paddingTop: 12 },

  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', marginBottom: 12, overflow: 'hidden', width: '100%' },
  listItem: { width: '100%', alignSelf: 'stretch' },
  cardContent: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  iconCircle: { padding: 8, borderRadius: 9999 },
  timeText: { fontSize: 12, color: '#6b7280' },
  title: { marginTop: 2, fontSize: 16, fontWeight: '700', color: '#111827' },
  badgesRow: { 
    marginTop: 4, 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    alignItems: 'center',
    marginRight: -6, 
    marginBottom: -6 
  },
  badgesScroll: {
    height: 32,            // fixed height for chip row
    marginTop: 6,
  },
  badge: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: { fontSize: 12, color: '#111827' },

  loadMoreWrap: { paddingTop: 8, paddingBottom: 32, alignItems: 'center' },
  loadMoreBtn: { width: '100%', maxWidth: 320, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  loadMoreText: { fontSize: 14, color: '#111827' },

  errorCard: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff', borderRadius: 12 },
  errorContent: { padding: 12 },
  errorText: { fontSize: 13, color: '#dc2626' },

  emptyCard: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', borderRadius: 12 },
  emptyContent: { padding: 16 },
  emptyText: { fontSize: 13, color: '#6b7280' },
});

const Card = ({ children }: { children?: React.ReactNode }) => <View style={styles.card}>{children}</View>;
const CardContent = ({ children, style }: { children?: React.ReactNode; style?: any }) => (
  <View style={[styles.cardContent, { width: '100%' }, style]}>{children}</View>
);

const Button = ({ children, onPress, disabled }: { children?: React.ReactNode; onPress?: () => void; disabled?: boolean }) => (
  <Pressable style={[styles.loadMoreBtn, disabled ? { opacity: 0.5 } : null]} onPress={onPress} disabled={disabled}>
    <Text style={styles.loadMoreText}>{children as any}</Text>
  </Pressable>
);

const Chip = ({ label, active, onPress, style }: { label: string; active?: boolean; onPress?: () => void; style?: any }) => (
  <Pressable onPress={onPress} style={[styles.tabBtn, active ? styles.tabBtnActive : null, style]}>
    <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{label}</Text>
  </Pressable>
);

const Badge = ({ children }: { children?: React.ReactNode }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText} numberOfLines={1} ellipsizeMode="tail">
      {children as any}
    </Text>
  </View>
);

type DiagnosisType = "personality" | "values" | "career" | "skills";

interface DiagnosisResultRow {
  id: string;
  session_id: string;
  type: DiagnosisType;
  scores: Record<string, number>;
  strengths: string[];
  growth_areas: string[];
  recommendations: any[];
  insights: string[];
  created_at: string;
}

const TYPE_LABELS: Record<
  DiagnosisType,
  { title: string; icon: any; bg: string }
> = {
  // purple
  personality: { title: "性格診断", icon: Brain, bg: "#8B5CF6" },
  // pink
  values: { title: "価値観診断", icon: Heart, bg: "#F472B6" },
  // blue
  career: { title: "キャリア適性診断", icon: Target, bg: "#60A5FA" },
  // green
  skills: { title: "スキル診断", icon: Award, bg: "#22C55E" },
};

const PAGE_SIZE = 20;

const TABS: { key: "all" | DiagnosisType; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "personality", label: "性格" },
  { key: "values", label: "価値観" },
  { key: "career", label: "キャリア適性" },
  { key: "skills", label: "スキル" },
];

function toJSTString(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

export default function DiagnosisResultsListMobilePage() {
  const router = useRouter();
  const [rows, setRows] = useState<DiagnosisResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeType, setActiveType] = useState<"all" | DiagnosisType>("all");

  const load = useCallback(
    async (opts?: { reset?: boolean; type?: "all" | DiagnosisType }) => {
      const reset = !!opts?.reset;
      const type = opts?.type ?? activeType;

      setLoading(true);
      setError(null);

      try {
        const from = reset ? 0 : page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("diagnosis_results")
          .select(
            "id, session_id, type, scores, strengths, growth_areas, recommendations, insights, created_at"
          )
          .order("created_at", { ascending: false })
          .range(from, to);

        if (type !== "all") {
          query = query.eq("type", type);
        }

        const { data, error } = await query.returns<DiagnosisResultRow[]>();
        if (error) throw error;

        const newRows = data ?? [];
        setRows((prev) => (reset ? newRows : [...prev, ...newRows]));
        setHasMore(newRows.length === PAGE_SIZE);
        setPage((prev) => (reset ? 1 : prev + 1));
      } catch (e: any) {
        setError("一覧の取得に失敗しました。権限・接続をご確認ください。");
      } finally {
        setLoading(false);
      }
    },
    [page, activeType]
  );

  // 初回ロード
  useEffect(() => {
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeType = (next: "all" | DiagnosisType) => {
    setActiveType(next);
    setPage(0);
    setHasMore(true);
    load({ reset: true, type: next });
  };

  const list = useMemo(() => rows, [rows]);

  return (
    <View style={styles.screen}>
      <View style={styles.appBar}>
        <View style={styles.appBarRow}>
          <Pressable onPress={() => router.push("/ipo/diagnosis")} accessibilityLabel="戻る">
            <ArrowLeftIcon width={20} height={20} />
          </Pressable>
          <Text style={styles.appBarTitle}>診断結果一覧</Text>
        </View>
        <View style={styles.tabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            <View style={styles.tabsRow}>
              {TABS.map((t, idx) => (
                <Chip
                  key={t.key}
                  label={t.label}
                  active={activeType === t.key}
                  onPress={() => onChangeType(t.key)}
                  style={{ marginRight: idx === TABS.length - 1 ? 0 : 8 }}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {!!error && (
          <Card><CardContent style={styles.errorContent}><Text style={styles.errorText}>{error}</Text></CardContent></Card>
        )}

        {list.length === 0 && !loading && !error && (
          <Card><CardContent style={styles.emptyContent}><Text style={styles.emptyText}>過去の診断結果はまだありません。</Text></CardContent></Card>
        )}

        {list.map((row) => {
          const label = TYPE_LABELS[row.type];
          const topScores = Object.entries(row.scores || {})
            .map(([k, v]) => [k, Number(v)] as [string, number])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          const Icon = label.icon as any;

          return (
            <Pressable
              key={row.id}
              onPress={() => router.push(`/ipo/diagnosis/result/${row.id}`)}
              style={[styles.listItem, { marginBottom: 12 }]}
            >
              <Card>
                <CardContent>
                  <View style={styles.row}>
                    <View style={[styles.iconCircle, { backgroundColor: label.bg }]}>
                      <Icon width={18} height={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.timeText}>{toJSTString(row.created_at)}</Text>
                      <Text style={[styles.title, { marginBottom: 4 }]}>{label.title}</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.badgesRow}
                        style={[{ flexGrow: 0 }, styles.badgesScroll]}
                      >
                        {topScores.map(([k, v]) => (
                          <Badge key={k}>{`${k}: ${Math.round(v)}%`}</Badge>
                        ))}
                      </ScrollView>
                    </View>
                    <ChevronRightIcon width={20} height={20} />
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          );
        })}

        <View style={styles.loadMoreWrap}>
          <Button onPress={() => load()} disabled={loading || !hasMore}>
            {loading ? '読み込み中…' : hasMore ? 'もっと見る' : 'これ以上はありません'}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
