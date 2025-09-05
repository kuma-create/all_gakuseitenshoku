// apps/mobile/src/features/notifications/useNotifications.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from 'src/lib/supabase';
import { fetchNotifications, fetchUnreadCount, markRead, markAllRead } from './api';
import { NotificationRow } from './types';
import { emitUnreadCountUpdate } from './unreadEvents';

type State = {
  items: NotificationRow[];
  unread: number;
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error?: string | null;
};

export function useNotifications(pageSize = 20) {
  const [state, setState] = useState<State>({
    items: [],
    unread: 0,
    loading: false,
    refreshing: false,
    hasMore: true,
    error: null,
  });
  const offsetRef = useRef(0);
  const idSet = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);

  const loadInitial = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      offsetRef.current = 0;
      idSet.current.clear();
      const [list, unread] = await Promise.all([
        fetchNotifications(0, pageSize),
        fetchUnreadCount(),
      ]);
      list.forEach((n) => idSet.current.add(n.id));
      setState({
        items: list,
        unread,
        loading: false,
        refreshing: false,
        hasMore: list.length === pageSize,
        error: null,
      });
      offsetRef.current = list.length;
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? 'failed' }));
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const more = await fetchNotifications(offsetRef.current, pageSize);
      const deduped = more.filter((n) => !idSet.current.has(n.id));
      deduped.forEach((n) => idSet.current.add(n.id));
      setState((s) => ({
        ...s,
        items: [...s.items, ...deduped],
        loading: false,
        hasMore: more.length === pageSize,
      }));
      offsetRef.current += more.length;
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? 'failed' }));
    }
  }, [state.hasMore, state.loading, pageSize]);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, refreshing: true }));
    await loadInitial();
  }, [loadInitial]);

  // Realtime subscribe (current user only)
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let mounted = true;

    (async () => {
      // Resolve current user id once
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      userIdRef.current = uid;

      const channel = supabase
        .channel('realtime:public:notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            const row = payload.new as NotificationRow;
            if (!mounted) return;
            // Only accept rows for the current user and in-app channels
            if (
              row &&
              uid &&
              row.user_id === uid &&
              (row.channel === 'in_app' || row.channel === 'both') &&
              !idSet.current.has(row.id)
            ) {
              idSet.current.add(row.id);
              setState((s) => ({
                ...s,
                items: [row, ...s.items],
                unread: (s.unread ?? 0) + (row.is_read ? 0 : 1),
              }));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          (payload) => {
            const row = payload.new as NotificationRow;
            if (!mounted) return;
            if (!(row && uid && row.user_id === uid)) return;
            setState((s) => {
              const idx = s.items.findIndex((x) => x.id === row.id);
              if (idx === -1) return s;
              const prev = s.items[idx];
              const nextItems = [...s.items];
              nextItems[idx] = { ...prev, ...row };
              const unreadDelta = prev.is_read === false && row.is_read === true ? -1 : 0;
              return { ...s, items: nextItems, unread: s.unread + unreadDelta };
            });
          }
        )
        .subscribe();

      unsub = () => { supabase.removeChannel(channel); };
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  // Foreground resume → 軽い再同期
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') loadInitial();
    });
    return () => sub.remove();
  }, [loadInitial]);

  const markOneRead = useCallback(async (id: string) => {
    // Optimistic update
    setState((s) => {
      const idx = s.items.findIndex((x) => x.id === id);
      if (idx === -1) return s;
      if (s.items[idx].is_read) return s;
      const copy = [...s.items];
      copy[idx] = { ...copy[idx], is_read: true };
      return { ...s, items: copy, unread: Math.max(0, s.unread - 1) };
    });
    try { await markRead(id); } catch { /* 失敗してもRealtimeが後で正す */ }
  }, []);

  const markAll = useCallback(async () => {
    // Optimistic
    setState((s) => ({
      ...s,
      items: s.items.map((x) => ({ ...x, is_read: true })),
      unread: 0,
    }));
    try { await markAllRead(); } catch { /* noop */ }
  }, []);

  // 未読数の外部連携（ベルへ即時反映）
  useEffect(() => {
    emitUnreadCountUpdate(state.unread);
  }, [state.unread]);

  return {
    ...state,
    loadInitial,
    loadMore,
    refresh,
    markOneRead,
    markAll,
  };
}