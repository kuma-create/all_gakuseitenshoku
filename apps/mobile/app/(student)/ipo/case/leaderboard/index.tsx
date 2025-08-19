import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
// Use the mobile Supabase client
import { supabase } from 'src/lib/supabase';

/* ---------- 型 ---------- */
type LeaderboardRow = {
  rank: number;
  total_score: number;
  student_profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type RawRow = {
  rank: number;
  total_score: number;
  student_profiles:
    | { full_name: string | null; avatar_url: string | null }
    | { full_name: string | null; avatar_url: string | null }[]
    | null;
};

function ymKeyOf(y: number, m1to12: number) {
  return `${y}-${String(m1to12).padStart(2, '0')}-01`;
}

export default function LeaderboardMobilePage() {
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const ymKey = useMemo(() => ymKeyOf(year, month), [year, month]);

  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('gp_rank')
        .select(
          `rank,total_score,student_profiles:student_id(full_name,avatar_url)`
        )
        .eq('month', ymKey)
        .order('rank', { ascending: true })
        .limit(100);

      if (!isMounted) return;
      if (error) {
        console.error('gp_rank fetch error:', error.message);
        setError(error.message);
        setRows([]);
      } else {
        const normalized: LeaderboardRow[] = ((data ?? []) as RawRow[]).map((r) => {
          const pAny = r.student_profiles as any;
          const p = Array.isArray(pAny) ? (pAny[0] ?? null) : (pAny ?? null);
          return {
            rank: Number(r.rank) || 0,
            total_score: Number(r.total_score) || 0,
            student_profiles: p
              ? {
                  full_name: p.full_name ?? null,
                  avatar_url: p.avatar_url ?? null,
                }
              : null,
          };
        });
        setRows(normalized);
      }
      setLoading(false);
    }
    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [ymKey]);

  const monthOptions = useMemo(() => {
    const arr: { label: string; value: string; y: number; m: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      arr.push({ label: `${y}年${m}月`, value: ymKeyOf(y, m), y, m });
    }
    return arr;
  }, []);

  const onSelectMonth = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.containerCenter}> 
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}> 
      <View style={styles.headerRow}>
        <Text style={styles.title}>リーダーボード</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthScrollContent}
        style={styles.monthScroll}
      >
        {monthOptions.map((opt) => {
          const selected = opt.value === ymKey;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelectMonth(opt.y, opt.m)}
              style={[styles.monthChip, selected && styles.monthChipSelected]}
            >
              <Text style={[styles.monthChipText, selected && styles.monthChipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏆 ランキング</Text>

        {error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>読み込みエラー: {error}</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>データがありません</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.rank)}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rank}>{item.rank}</Text>
                <View style={styles.userArea}>
                  {item.student_profiles?.avatar_url ? (
                    <Image
                      source={{ uri: item.student_profiles.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]} />
                  )}
                  <Text style={styles.name} numberOfLines={1}>
                    {item.student_profiles?.full_name ?? 'Anonymous'}
                  </Text>
                </View>
                <Text style={styles.score}>{item.total_score}</Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  containerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  monthScroll: {
    marginBottom: 8,
  },
  monthScrollContent: {
    paddingVertical: 4,
  },
  monthChip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  monthChipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  monthChipText: {
    fontSize: 12,
    color: '#111827',
  },
  monthChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rank: {
    width: 36,
    fontSize: 16,
    fontWeight: '600',
  },
  userArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarPlaceholder: {
    backgroundColor: '#e5e7eb',
  },
  name: {
    flexShrink: 1,
    fontSize: 14,
  },
  score: {
    width: 60,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
});