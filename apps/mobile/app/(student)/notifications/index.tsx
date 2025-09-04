// apps/mobile/app/(student)/notifications/index.tsx
import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useNotifications } from 'src/features/notifications/useNotifications';
import { useRouter } from 'expo-router';

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d) / 1000;
  if (diff < 60) return `${Math.floor(diff)}秒前`;
  if (diff < 3600) return `${Math.floor(diff/60)}分前`;
  if (diff < 86400) return `${Math.floor(diff/3600)}時間前`;
  return `${Math.floor(diff/86400)}日前`;
}

export default function NotificationsScreen() {
  const { items, unread, loading, refreshing, hasMore, loadInitial, loadMore, refresh, markOneRead, markAll } = useNotifications();

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => {
        markOneRead(item.id);
        // urlがあれば遷移（外部/内部をここでハンドル）
        if (item.url) {
          // 例: 内部ディープリンクは "app://" で判定、なければWebBrowser.openBrowserAsync
          // router.push(...) などアプリのルールに合わせて実装
        }
      }}
      style={{
        paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#e5e7eb',
        backgroundColor: item.is_read ? '#fff' : '#f0f9ff'
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {!item.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' }} />}
        <Text style={{ fontWeight: '700', color: '#111827', flex: 1 }}>{item.title}</Text>
      </View>
      <Text numberOfLines={2} style={{ color: '#374151', marginTop: 4 }}>{item.message}</Text>
      <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>{timeAgo(item.created_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* ヘッダー右に「すべて既読」 */}
      <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>お知らせ</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={markAll}><Text style={{ color: '#2563eb' }}>すべて既読</Text></TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
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