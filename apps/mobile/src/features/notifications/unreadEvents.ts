// apps/mobile/src/features/notifications/unreadEvents.ts
// 超軽量のイベントバス（Zustand等を使わずに最小で）
export type UnreadHandler = (unread: number) => void;

const handlers = new Set<UnreadHandler>();

// 購読: 未読数が変わったときに呼ばれる
export function onUnreadCountUpdate(handler: UnreadHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

// 発火: 未読数の変化を購読者に通知
export function emitUnreadCountUpdate(unread: number) {
  handlers.forEach((h) => {
    try {
      h(unread);
    } catch (e) {
      console.error('UnreadHandler error', e);
    }
  });
}
