import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchUnreadCount } from 'src/features/notifications/api';
import { onUnreadCountUpdate } from 'src/features/notifications/unreadEvents';
import { Bell, BellRing } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from 'src/features/notifications/useNotifications';

const isChatNotif = (n: any) => {
  const t = (n?.notification_type || '').toString().toLowerCase();
  if (n?.chat_room_id) return true;
  if (n?.url && /\/chat\//.test(n.url)) return true;
  return (
    t === 'message' || t === 'chat' || t === 'dm' ||
    t.includes('chat') || t.includes('message')
  );
};

const resolveNotificationPath = (n: any): string | null => {
  if (n?.url) return n.url;
  const chatId = n?.chat_room_id ?? n?.related_id ?? n?.id;
  return isChatNotif(n) ? `/(student)/chat/${chatId}` : `/notifications/${n?.id}`;
};

export function NotificationBell() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { items, loadInitial } = useNotifications();

  useEffect(() => {
    try { loadInitial && loadInitial(); } catch {}
  }, [loadInitial]);

  const unreadChats = useMemo(
    () => items.filter((n: any) => !n.is_read && isChatNotif(n)).slice(0, 5),
    [items]
  );

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

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // ヘッダー下に少し余白を足して表示位置を調整
  const panelTop = useMemo(() => Math.max(insets.top, 12) + 56 + 8, [insets.top]);

  return (
    <>
      <TouchableOpacity
        onPress={toggle}
        style={{ padding: 8 }}
        accessibilityRole="button"
        accessibilityLabel={open ? '通知を閉じる' : '通知を開く'}
      >
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

      <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
        {/* 背景（押下で閉じる） */}
        <Pressable style={{ flex: 1, backgroundColor: 'transparent' }} onPress={close} />

        {/* ドロップダウンパネル */}
        <View
          style={{
            position: 'absolute',
            right: 12,
            top: panelTop,
            width: 280,
            backgroundColor: '#fff',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>通知</Text>
            <TouchableOpacity onPress={() => { close(); router.push('/(student)/notifications'); }}>
              <Text style={{ color: '#2563eb', fontWeight: '600' }}>すべて見る</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            {unreadChats.length === 0 ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: '#6b7280' }}>未読のメッセージはありません</Text>
              </View>
            ) : (
              unreadChats.map((item: any, idx: number) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    close();
                    const path = resolveNotificationPath(item);
                    if (path) router.push(path as any);
                  }}
                  style={{ paddingVertical: 10 }}
                >
                  <Text style={{ fontWeight: '700', color: '#111827' }} numberOfLines={1}>{item.title}</Text>
                  <Text style={{ color: '#374151' }} numberOfLines={2}>{item.message}</Text>
                  {idx !== unreadChats.length - 1 && (
                    <View style={{ height: 1, backgroundColor: '#f3f4f6', marginTop: 8 }} />
                  )}
                </TouchableOpacity>
              ))
            )}
            <View style={{ marginTop: 6, alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={() => { close(); router.push('/(student)/notifications'); }}>
                <Text style={{ color: '#2563eb', fontWeight: '600' }}>通知一覧へ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default NotificationBell;