export type NotificationChannel = 'in_app' | 'email' | 'both';

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  related_id: string;
  is_read: boolean | null;
  created_at: string;
  channel: NotificationChannel | null;
  send_status: string | null;
  send_after: string | null;
  error_reason: string | null;
  url: string | null;
}

export type NotificationCursor = { createdAt: string; id: string; };

export type ListParams = {
  limit?: number;
  before?: NotificationCursor; // 無限スクロール用カーソル
  channels?: NotificationChannel[];
};

export type ListResult = { items: NotificationRow[]; nextCursor?: NotificationCursor; };

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };