import { Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface EmptyStateProps {
  hasConfirmed: boolean
}

export function EmptyState({ hasConfirmed }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-center text-muted-foreground">
          {hasConfirmed ? "他の候補日はありません" : "候補日が登録されていません"}
        </p>
      </CardContent>
    </Card>
  )
}

export function NoConfirmedState() {
  return (
    <Card className="border-yellow-200 bg-yellow-50 md:col-span-2">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Calendar className="h-12 w-12 text-yellow-600" />
          <h3 className="text-lg font-medium">面接日程が確定していません</h3>
          <p className="text-muted-foreground">候補日から面接日程を確定するか、新しい候補日を提案してください。</p>
        </div>
      </CardContent>
    </Card>
  )
}
