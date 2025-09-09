import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// 共有の Supabase クライアントを想定（必要に応じてパスを調整）
import { supabase } from "src/lib/supabase";

type ReferralUse = {
  id: string;
  status: 'pending' | 'completed';
};

type ReferralData = {
  code: string;
  referral_uses: ReferralUse[];
};

export default function ReferralScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState<ReferralData | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchReferral = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace('/auth/login');
          return;
        }

        // ① 紹介コード＆利用状況を取得
        const { data, error } = await supabase
          .from('referral_codes')
          .select('code, referral_uses ( id, status )')
          .eq('user_id', session.user.id)
          .single();

        if (error && (error as any).code !== 'PGRST116') {
          console.error('Fetch referral error', error);
        }

        let current: ReferralData | null = (data as ReferralData) ?? null;

        // ② なければ RPC で発行
        if (!current) {
          const { data: newCode, error: rpcErr } = await supabase.rpc('create_referral_code');
          if (rpcErr) {
            console.error('RPC create_referral_code error', rpcErr);
          }
          current = { code: (newCode as string) ?? '', referral_uses: [] };
        }

        if (mounted) setReferral(current);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchReferral();
    return () => { mounted = false; };
  }, [router]);

  const completedCount = useMemo(
    () => referral?.referral_uses.filter(u => u.status === 'completed').length ?? 0,
    [referral]
  );
  const rewardYen = useMemo(() => completedCount * 2000, [completedCount]);

  const handleCopyAndShare = async () => {
    try {
      if (!referral?.code) return;
      await Clipboard.setStringAsync(referral.code);

      // iOS/Android ネイティブの共有
      await Share.share({
        title: '学生転職 招待コード',
        message: `学生転職の招待コード: ${referral.code}\nアプリ/WEBの登録画面で入力してください。`,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '共有に失敗しました。');
    }
  };

  if (loading || !referral) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* ヒーロー */}
      <LinearGradient
        colors={['#ef4444', '#8b5cf6']}
        start={{ x: -0.3, y: 0 }}
        end={{ x: 1.3, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroIconRow}>
          <Feather name="users" size={28} color="#fff" />
          <Text style={styles.heroTitle}>友達紹介キャンペーン</Text>
        </View>
        <Text style={styles.heroDesc}>
          友達を紹介して、お互いに特典をゲットしよう！
        </Text>
      </LinearGradient>

      {/* 紹介コード */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>あなたの招待コード</Text>
        <View style={styles.codeRow}>
          <Text selectable style={styles.codeText}>{referral.code}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAndShare}>
            <Feather name="share-2" size={16} color="#ef4444" />
            <Text style={styles.copyBtnText}>コピー & 共有</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.note}>※ 登録画面の「招待コード」欄にこのコードを入力してください。</Text>
      </View>

      {/* 特典 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>特典</Text>
        <View style={styles.perksRow}>
          {['紹介する側の特典', '紹介される側の特典'].map((title) => (
            <View key={title} style={styles.perkBox}>
              <View style={styles.perkHeader}>
                <Feather name="gift" size={16} color="#ef4444" />
                <Text style={styles.perkTitle}>{title}</Text>
              </View>
              <Text style={styles.perkDesc}>
                登録・プロフィール完成で{'\n'}
                <Text style={styles.perkEm}>Amazonギフト券2,000円分</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 紹介状況 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>紹介状況</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>紹介した友達</Text>
            <Text style={styles.statValue}>
              {referral.referral_uses.length}
              <Text style={styles.statUnit}>人</Text>
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>獲得した特典</Text>
            <Text style={styles.statValue}>
              {rewardYen.toLocaleString()}
              <Text style={styles.statUnit}>円分</Text>
            </Text>
          </View>
        </View>

        <View style={styles.listBox}>
          {referral.referral_uses.length === 0 ? (
            <Text style={styles.mutedCenter}>まだ紹介はありません</Text>
          ) : (
            referral.referral_uses.map((u) => (
              <View key={u.id} style={styles.useRow}>
                <Text style={styles.useId}>ユーザーID: {u.id.slice(0, 8)}…</Text>
                <View
                  style={[
                    styles.badge,
                    u.status === 'completed' ? styles.badgeGreen : styles.badgeYellow,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      u.status === 'completed' ? styles.badgeTextGreen : styles.badgeTextYellow,
                    ]}
                  >
                    {u.status === 'completed' ? '特典獲得済み' : '確認待ち'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* 手順 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>友達紹介の手順（3ステップ）</Text>
        {[
          {
            step: 1,
            title: 'あなた専用の招待コードを取得',
            desc: 'このページに表示されている招待コードをコピーします。',
          },
          {
            step: 2,
            title: '友達に招待コードを送る',
            desc: 'SNS、メール、メッセージアプリなどで招待コードを送ります。',
          },
          {
            step: 3,
            title: '友達が登録時にコードを入力',
            desc: '友達が学生転職に登録時に招待コードを入力し、プロフィールを完成させると、お互いに特典がもらえます。',
          },
        ].map((item) => (
          <View key={item.step} style={styles.stepRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNum}>{item.step}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{item.title}</Text>
              <Text style={styles.stepDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  muted: { marginTop: 8, color: '#6B7280' },
  hero: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  heroIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 8 },
  heroDesc: { color: '#fff', marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeText: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Menlo',
    letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: '#ef4444',
    backgroundColor: '#fff',
  },
  copyBtnText: { color: '#ef4444', fontWeight: '600' },
  note: { color: '#6B7280', fontSize: 12, marginTop: 6 },
  perksRow: { flexDirection: 'row', gap: 12 },
  perkBox: { flex: 1, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12 },
  perkHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  perkTitle: { fontWeight: '600', color: '#111827' },
  perkDesc: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  perkEm: { color: '#ef4444', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  statBox: {
    flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8,
    borderColor: '#E5E7EB', borderWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { color: '#6B7280', fontSize: 12 },
  statValue: { marginTop: 4, fontSize: 20, fontWeight: '800', color: '#ef4444' },
  statUnit: { color: '#6B7280', fontSize: 12, fontWeight: '400' },
  listBox: {
    marginTop: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
  useRow: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  useId: { fontSize: 12, color: '#111827' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeGreen: { backgroundColor: '#DCFCE7' },
  badgeYellow: { backgroundColor: '#FEF9C3' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextGreen: { color: '#166534' },
  badgeTextYellow: { color: '#854D0E' },
  mutedCenter: { textAlign: 'center', color: '#6B7280', padding: 12 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 8 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: '#DC2626', fontWeight: '800' },
  stepTitle: { fontWeight: '600', color: '#111827' },
  stepDesc: { color: '#6B7280', marginTop: 2, lineHeight: 18 },
});