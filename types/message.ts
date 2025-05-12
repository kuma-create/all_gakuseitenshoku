export type Message = {
  id: string
  /** 送信者: 学生 / 企業 / システム */
  sender: "student" | "company" | "system"
  content: string
  timestamp: string
  status: "sent" | "delivered" | "read"
  attachment?: {
    name: string
    url?: string
    type: string
  }
}