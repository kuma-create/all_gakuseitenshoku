import { Check, CheckCheck, Clock } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

interface MessageStatusProps {
  status: "sent" | "delivered" | "read"
  timestamp: string
  className?: string
}

export function MessageStatus({ status, timestamp, className = "" }: MessageStatusProps) {
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, "M月d日 HH:mm", { locale: ja })
  }

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      <span>{formatMessageDate(timestamp)}</span>
      {status === "sent" && <Clock className="h-3 w-3" />}
      {status === "delivered" && <Check className="h-3 w-3" />}
      {status === "read" && <CheckCheck className="h-3 w-3" />}
    </div>
  )
}
