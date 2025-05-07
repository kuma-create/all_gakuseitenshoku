// types/message.ts
export type Message = {
    id:       number
    sender:   "student" | "company" | "system"
    content:  string
    timestamp: string
    status:   "sent" | "delivered" | "read"
    attachment?: { type: string; url: string; name: string }
  }
  