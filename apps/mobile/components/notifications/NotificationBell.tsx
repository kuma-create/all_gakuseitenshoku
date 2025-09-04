// apps/mobile/components/NotificationBell.tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNotifications } from 'src/features/notifications/useNotifications';
import { useRouter } from 'expo-router';

export function NotificationBell() {
  const { unread, loadInitial } = useNotifications(); // 画面外でも共有したい場合は zustand 等に移行可
  const router = useRouter();

  useEffect(() => { loadInitial(); }, [loadInitial]);

  return (
    <TouchableOpacity onPress={() => router.push('/(student)/notifications')} style={{ padding: 8 }}>
      <View style={{ width: 24, height: 24, backgroundColor: '#111827', borderRadius: 12 }} />
      {unread > 0 && (
        <View style={{
          position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16,
          backgroundColor: '#ef4444', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}