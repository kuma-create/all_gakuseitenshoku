// apps/mobile/src/features/notifications/types.ts
export type NotificationChannel = 'in_app' | 'email' | 'both';

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  related_id: string;
  is_read: boolean | null; // DBはnull許容だが実質boolean
  created_at: string;      // ISO
  channel: NotificationChannel | null;
  send_status: string | null;
  send_after: string | null;
  error_reason: string | null;
  url: string | null;
}