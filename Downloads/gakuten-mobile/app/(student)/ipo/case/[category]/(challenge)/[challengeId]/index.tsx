import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// --- Minimal types ---
type ChallengeCard = {
  id: string;
  title: string | null;
  description: string | null;
  company: string | null;
  time_limit_min: number | null;
  question_count: number | null;
  deadline: string | null;
  category?: string | null;
};

type SessionRow = {
  id: string;
  challenge_id: string | null;
  score: number | null;
  elapsed_sec: number | null;
  started_at: string | null;
  student_id?: string | null;
};

// --- Simple Badge component ---
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }}>
      <Text style={{ fontSize: 12, color: '#111827' }}>{children}</Text>
    </View>
  );
}

export default function ChallengeOverviewScreen() {
  const router = useRouter();
  const { category, challengeId } = useLocalSearchParams<{ category: string; challengeId: string }>();

  const dbCategory = useMemo(() => ({ webtest: 'webtest', business: 'bizscore', case: 'case' } as const)[String(category)] ?? String(category), [category]);

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<ChallengeCard | null>(null);
  const [results, setResults] = useState<SessionRow[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'results'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const id = String(challengeId);

    // 1) challenge detail
    const { data: cData, error: cErr } = await supabase
      .from('challenges')
      .select('id, title, description, company, time_limit_min, question_count, deadline, category')
      .eq('id', id)
      .single();

    if (cErr) {
      console.warn(cErr.message);
    } else {
      // exclude expired
      if (cData?.deadline && new Date(cData.deadline) < new Date()) {
        setChallenge(null);
      } else {
        setChallenge(cData as ChallengeCard);
      }
    }

    // 2) user
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes?.user) {
      const { data: sData, error: sErr } = await supabase
        .from('challenge_sessions')
        .select('id, challenge_id, score, elapsed_sec, started_at')
        .eq('student_id', userRes.user.id)
        .eq('challenge_id', id)
        .order('started_at', { ascending: false })
        .limit(20);
      if (!sErr && Array.isArray(sData)) setResults(sData as SessionRow[]);
    } else {
      setResults([]);
    }

    setLoading(false);
  }, [challengeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const headerTitle = useMemo(() => ({ webtest: 'Web テスト', business: 'ビジネス診断', case: 'ケース診断' } as const)[String(category)] ?? String(category), [category]);

  const timeBadge = () => {
    const isCaseOrBiz = dbCategory === 'case' || dbCategory === 'bizscore';
    const timeLabel = isCaseOrBiz ? '30分' : `${challenge?.time_limit_min ?? 40}分`;
    return (
      <Badge>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Clock size={14} style={{ marginRight: 4 }} />
          <Text>{timeLabel}</Text>
        </View>
      </Badge>
    );
  };

  const countBadge = () => {
    const isCaseOrBiz = dbCategory === 'case' || dbCategory === 'bizscore';
    const countLabel = isCaseOrBiz ? '3〜5問' : `${challenge?.question_count ?? 40}問`;
    return <Badge>問題数: {countLabel}</Badge>;
  };

  const onPressBack = () => {
    router.back();
  };

  const onPressStart = () => {
    const id = String(challengeId);
    const cat = String(category);
    // navigate to confirm screen
    router.push(`/ipo/case/${cat}/challenge/${id}/confirm` as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
        <Pressable onPress={onPressBack} style={{ padding: 6, marginRight: 8 }}>
          <ArrowLeft size={20} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>{headerTitle}</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : !challenge ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#6B7280' }}>このチャレンジは現在利用できません。</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Tabs header */}
          <View style={{ flexDirection: 'row', padding: 8, backgroundColor: 'white', gap: 8 }}>
            <Pressable onPress={() => setActiveTab('overview')} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: activeTab === 'overview' ? '#10B981' : '#F3F4F6' }}>
              <Text style={{ textAlign: 'center', color: activeTab === 'overview' ? 'white' : '#111827', fontWeight: '600' }}>概要</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('results')} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: activeTab === 'results' ? '#10B981' : '#F3F4F6' }}>
              <Text style={{ textAlign: 'center', color: activeTab === 'results' ? 'white' : '#111827', fontWeight: '600' }}>過去の結果</Text>
            </Pressable>
          </View>

          {activeTab === 'overview' ? (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>{challenge.title ?? 'タイトル未設定'}</Text>
                {!!challenge.company && (
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>{challenge.company}</Text>
                )}

                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {timeBadge()}
                  {countBadge()}
                </View>

                {!!challenge.description && (
                  <Text style={{ fontSize: 14, color: '#374151' }}>{challenge.description}</Text>
                )}

                <Pressable onPress={onPressStart} style={{ marginTop: 16, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 10 }}>
                  <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>挑戦する</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {results.length === 0 ? (
                <View style={{ padding: 24, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <Text style={{ textAlign: 'center', color: '#6B7280' }}>まだ結果がありません</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {results.map((r) => (
                    <View key={r.id} style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontWeight: '600' }}>{challenge.title ?? '（タイトル不明）'}</Text>
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>
                          {r.started_at ? new Date(r.started_at).toLocaleDateString() : '-'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#10B981' }}>{
                          typeof r.score === 'number' ? r.score.toFixed(1) : '-'
                        }</Text>
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>{Math.round((r.elapsed_sec ?? 0) / 60)}分</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
