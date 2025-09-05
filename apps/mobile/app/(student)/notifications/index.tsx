import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { useNotifications } from 'src/features/notifications/useNotifications';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d) / 1000;
  if (diff < 60) return `${Math.floor(diff)}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

// helpers to categorize types
const isScout = (t: string) => ['scout', 'offer', 'reverse_scout'].includes(t);
const isChat  = (t: string) => ['message', 'chat', 'dm'].includes(t);
const isOther = (t: string) => !isScout(t) && !isChat(t);

// Map notification_type -> icon and color (fallback handled in renderItem)
const TYPE_ICON: Record<string, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  // chat-related
  message: { name: 'chatbubble-ellipses-outline', color: '#3b82f6' },
  chat: { name: 'chatbubble-ellipses-outline', color: '#3b82f6' },
  dm: { name: 'chatbubble-ellipses-outline', color: '#3b82f6' },
  // scout-related
  scout: { name: 'ribbon-outline', color: '#f43f5e' },
  offer: { name: 'ribbon-outline', color: '#f43f5e' },
  reverse_scout: { name: 'ribbon-outline', color: '#f43f5e' },
  // common others (keep for compatibility)
  application: { name: 'document-text-outline', color: '#0ea5e9' },
  application_status: { name: 'clipboard-outline', color: '#10b981' },
  interview: { name: 'calendar-outline', color: '#f59e0b' },
  interview_schedule: { name: 'calendar-outline', color: '#f59e0b' },
  profile: { name: 'person-circle-outline', color: '#8b5cf6' },
  feedback: { name: 'star-outline', color: '#f59e0b' },
  system: { name: 'notifications-outline', color: '#6b7280' },
};

// Tabs definition (All / Unread / Scout / Chat / Other)
const TABS = [
  { key: 'all', label: 'すべて',  filter: (_: any) => true },
  { key: 'unread', label: '未読', filter: (n: any) => !n.is_read },
  { key: 'scout', label: 'スカウト', filter: (n: any) => isScout(n.notification_type) },
  { key: 'chat', label: 'チャット', filter: (n: any) => isChat(n.notification_type) },
  { key: 'other', label: 'その他', filter: (n: any) => isOther(n.notification_type) },
] as const;

export default function NotificationsScreen() {
  const { items, unread, loading, refreshing, hasMore, loadInitial, loadMore, refresh, markOneRead, markAll } = useNotifications();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('all');

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const counts = useMemo(() => {
    const base = { all: items.length, unread, scout: 0, chat: 0, other: 0 } as Record<string, number>;
    for (const n of items) {
      if (isScout(n.notification_type)) base.scout++;
      else if (isChat(n.notification_type)) base.chat++;
      else base.other++;
    }
    return base;
  }, [items, unread]);

  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab) ?? TABS[0];
    return items.filter(tab.filter);
  }, [items, activeTab]);

  const renderItem = ({ item }: any) => {
    const iconInfo = TYPE_ICON[item.notification_type] ?? { name: 'notifications-outline' as const, color: '#6b7280' };
    return (
      <TouchableOpacity
        onPress={() => {
          if (!item.is_read) markOneRead(item.id);
          if (item.url) {
            // 内部/外部の遷移はアプリのルールに合わせてここで実装
            // 例: router.push(item.url)
          }
        }}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderColor: '#e5e7eb',
          backgroundColor: item.is_read ? '#fff' : '#f0f9ff',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: '#111827', flex: 1 }}>{item.title}</Text>
              {!item.is_read && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb', marginLeft: 8 }} />
              )}
            </View>
            <Text numberOfLines={2} style={{ color: '#374151', marginTop: 4 }}>{item.message}</Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>お知らせ</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={markAll}>
            <Text style={{ color: '#2563eb' }}>すべて既読</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs (equal width, no horizontal scroll) */}
      <View style={{ borderBottomWidth: 1, borderColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row' }}>
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            const c = counts[t.key] ?? 0;
            const iconName =
              t.key === 'unread' ? 'ellipse-outline' :
              t.key === 'scout'  ? 'ribbon-outline' :
              t.key === 'chat'   ? 'chatbubble-ellipses-outline' :
              t.key === 'other'  ? 'grid-outline' : 'notifications-outline';
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ marginLeft: 6, fontWeight: isActive ? '700' : '500', color: isActive ? '#111827' : '#6b7280' }}>{t.label}</Text>
                  {t.key === 'unread' && counts.unread > 0 && (
                    <View style={{ minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#f3f4f6', borderRadius: 12, alignItems: 'center', marginLeft: 6 }}>
                      <Text style={{ fontSize: 12, color: '#374151' }}>{counts.unread}</Text>
                    </View>
                  )}
                </View>
                <View style={{ height: 2, marginTop: 8, alignSelf: 'stretch', backgroundColor: isActive ? '#2563eb' : 'transparent' }} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        onEndReachedThreshold={0.2}
        onEndReached={() => hasMore && loadMore()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListFooterComponent={loading && hasMore ? (
          <View style={{ padding: 16 }}><ActivityIndicator /></View>
        ) : null}
        ListEmptyComponent={!loading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280' }}>まだ通知はありません</Text>
          </View>
        ) : null}
      />
    </View>
  );
}