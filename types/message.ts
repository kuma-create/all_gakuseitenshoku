// src/types/message.ts

/** フロントで扱うチャットメッセージの型定義 */
export type Message = {
  /** messages.id は UUID（文字列）なので string に */
  id: string;

  /** 送信者: "company"（企業側）か "student"（学生側） */
  sender: "company" | "student";

  /** 本文 */
  content: string;

  /** ISO 文字列 */
  timestamp: string;

  /** 状態: 送信直後 "sent", DB上では "delivered"/"read" */
  status: "sent" | "delivered" | "read";

  /** 添付があれば */
  attachment?: {
    url: string;
    name: string;
    type: string;
  };
};
