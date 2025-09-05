import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationRow, NotificationChannel } from './types';

type Handlers = { onInsert?: (row: NotificationRow) => void; onUpdate?: (row: NotificationRow) => void; };
const DEFAULT: NotificationChannel[] = ['in_app', 'both'];

export function subscribeNotifications(
  client: SupabaseClient,
  handlers: Handlers,
  channels: NotificationChannel[] = DEFAULT
) {
  const ch = client
    .channel('realtime:public:notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (p) => {
      const row = p.new as NotificationRow;
      if (row && (!row.channel || channels.includes(row.channel))) handlers.onInsert?.(row);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (p) => {
      const row = p.new as NotificationRow;
      if (row && (!row.channel || channels.includes(row.channel))) handlers.onUpdate?.(row);
    })
    .subscribe();
  return () => { client.removeChannel(ch); };
}