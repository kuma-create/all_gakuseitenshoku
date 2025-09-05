// apps/mobile/src/features/notifications/api.ts
import { supabase } from 'src/lib/supabase';
import { NotificationRow } from './types';
import { emitUnreadCountUpdate } from './unreadEvents';

const BASE = 'notifications';

export async function fetchNotifications(offset = 0, limit = 20) {
  const { data, error } = await supabase
    .from<NotificationRow>(BASE)
    .select('*')
    .in('channel', ['in_app', 'both'])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnreadCount() {
  const { count, error } = await supabase
    .from<NotificationRow>(BASE)
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
    .in('channel', ['in_app', 'both']);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(id: string) {
  const { error } = await supabase
    .from<NotificationRow>(BASE)
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;

  const unread = await fetchUnreadCount();
  emitUnreadCountUpdate(unread);
}

export async function markAllRead() {
  const { error } = await supabase
    .from<NotificationRow>(BASE)
    .update({ is_read: true })
    .eq('is_read', false);
  if (error) throw error;

  const unread = await fetchUnreadCount();
  emitUnreadCountUpdate(unread);
}