// app/onboarding/goals.tsx
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, SafeAreaView, Platform, Image } from 'react-native';
import { GOALS, GoalKey } from 'src/constants/goals';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from 'src/lib/supabase';

// ログイン後の遷移先を型で固定（union）
type PostLoginPath = '/' | '/ipo';

export default function OnboardingGoals() {
  const [selected, setSelected] = useState<Set<GoalKey>>(new Set());
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const toggle = (key: GoalKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const canSubmit = useMemo(() => selected.size > 0, [selected]);

  const onSkip = () => router.replace('/');

  const onSubmit = async () => {
    if (!canSubmit || loading) return;
    try {
      setLoading(true);
      // 決定したログイン後の遷移先（選択に応じて保存は今は行わない）
      const postLoginPath: PostLoginPath = selected.has('headhunting') ? '/' : '/ipo';

      if (selected.has('headhunting')) {
        // 外部遷移は行わず、選択に応じたアプリ内遷移のみ実行
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (userId) {
          await supabase
            .from('student_profiles')
            .update({ post_login_path: postLoginPath })
            .eq('user_id', userId);
        }
        router.replace(postLoginPath as unknown as Href); // フォールバック（'/'）
      } else {
        router.replace(postLoginPath as unknown as Href); // '/ipo'
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, flex: 1 }}>
        {/* タイトル */}
        <View style={{ marginBottom: 12, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'black', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
            あなたがやりたいことは？
          </Text>
        </View>
        <FlatList
          data={GOALS}
          keyExtractor={(i) => i.key}
          renderItem={({ item }) => {
            const accent = (item as any).accent ?? '#e5e7eb';
            return (
              <Pressable
                onPress={() => toggle(item.key)}
                style={{
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  backgroundColor: 'white',
                  borderWidth: selected.has(item.key) ? 3 : 1,
                  borderColor: selected.has(item.key) ? accent : '#e5e7eb',
                  // shadow (iOS) / elevation (Android)
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Left: title + bullets */}
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: accent, marginRight: 8 }} />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: accent }}>{item.title}</Text>
                    </View>
                    {item.bullets.map((b, i) => (
                      <Text key={i} style={{ marginTop: 4, opacity: 0.85 }}>・{b}</Text>
                    ))}
                  </View>
                  {/* Right: icon */}
                  <Image
                    source={item.icon}
                    style={{ width: 75, height: 75, marginRight: 25 }}
                    resizeMode="contain"
                  />
                </View>
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit || loading}
        style={{
          height: 52,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: 16,
          // Keep the button above the tab bar (approx 64) + safe area
          marginBottom: (insets?.bottom ?? 16) + 64,
          backgroundColor: canSubmit ? '#1D65B8' : '#CBD5E1',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>完了</Text>
      </Pressable>
    </SafeAreaView>
  );
}