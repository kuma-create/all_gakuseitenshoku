import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchUnreadCount } from 'src/features/notifications/api';
import { onUnreadCountUpdate } from 'src/features/notifications/unreadEvents';
import { Bell, BellRing } from 'lucide-react-native';

export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  // 一覧側の既読操作・Realtime更新を即時反映
  useEffect(() => {
    const off = onUnreadCountUpdate((u) => setUnread(u));
    return off;
  }, []);

  // 軽量: 画面マウント時と一定間隔で未読数のみ取得（多重Realtime購読を避ける）
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const count = await fetchUnreadCount();
        if (mounted) setUnread(count);
      } catch {}
    };
    load();

    const id = setInterval(load, 20000); // 20秒毎に同期（必要に応じて調整）
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <TouchableOpacity
      onPress={() => router.push('/(student)/notifications')}
      style={{ padding: 8 }}
      accessibilityRole="button"
      accessibilityLabel="通知を開く"
    >
      {/* ベルアイコン（未読ありならベルリング） */}
      {unread > 0 ? (
        <BellRing size={24} color="#111827" />
      ) : (
        <Bell size={24} color="#111827" />
      )}

      {unread > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            backgroundColor: '#ef4444',
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}