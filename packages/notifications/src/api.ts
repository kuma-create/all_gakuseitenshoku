import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationRow, NotificationCursor, NotificationChannel, ListParams, ListResult, Result } from './types';

const TABLE = 'notifications';
const DEFAULT_CHANNELS: NotificationChannel[] = ['in_app', 'both'];

export function createNotificationsApi(client: SupabaseClient) {
  async function list(params: ListParams = {}): Promise<Result<ListResult>> {
    const limit = params.limit ?? 20;
    const channels = params.channels ?? DEFAULT_CHANNELS;

    let q = client
      .from(TABLE)
      .select('*')
      .in('channel', channels)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (params.before) {
      q = q
        .lt('created_at', params.before.createdAt)
        .or(`and(created_at.eq.${params.before.createdAt},id.lt.${params.before.id})`);
    }

    const { data, error } = await q.limit(limit);
    if (error) return { ok: false, error: error.message };

    const items = (data ?? []) as NotificationRow[];
    const last = items[items.length - 1];
    const nextCursor = last ? ({ createdAt: last.created_at, id: last.id }) : undefined;

    return { ok: true, data: { items, nextCursor } };
  }

  async function unreadCount(): Promise<Result<number>> {
    const { count, error } = await client
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .in('channel', DEFAULT_CHANNELS);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: count ?? 0 };
  }

  async function markRead(id: string): Promise<Result<true>> {
    const { error } = await client.from(TABLE).update({ is_read: true }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: true };
  }

  async function markAllRead(): Promise<Result<number>> {
    const { data, error } = await client
      .from(TABLE)
      .update({ is_read: true })
      .eq('is_read', false)
      .select('id');
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: (data ?? []).length };
  }

  return { list, unreadCount, markRead, markAllRead };
}