"use client"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, BuildingIcon, BriefcaseIcon } from "lucide-react"

type Scout = {
  id: string
  companyName: string
  position: string
  message: string
  createdAt: string
  status: "pending" | "accepted" | "declined"
  companyLogo?: string
}

type ScoutNotificationProps = {
  scout: Scout
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  isLoading?: boolean
}

export function ScoutNotification({ scout, onAccept, onDecline, isLoading = false }: ScoutNotificationProps) {
  const formattedDate = new Date(scout.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-4">
          {scout.companyLogo ? (
            <img
              src={scout.companyLogo || "/placeholder.svg"}
              alt={`${scout.companyName} logo`}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <BuildingIcon className="h-6 w-6 text-gray-500" />
            </div>
          )}
          <CardTitle className="text-lg">{scout.companyName}</CardTitle>
        </div>
        <Badge
          variant={scout.status === "pending" ? "outline" : scout.status === "accepted" ? "success" : "destructive"}
        >
          {scout.status === "pending" ? "検討中" : scout.status === "accepted" ? "承認済み" : "辞退済み"}
        </Badge>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          <div className="flex items-center text-sm text-muted-foreground">
            <BriefcaseIcon className="mr-2 h-4 w-4" />
            <span>{scout.position}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <p className="mt-2 text-sm">{scout.message}</p>
        </div>
      </CardContent>
      {scout.status === "pending" && (
        <CardFooter className="flex justify-end space-x-2 pt-0">
          <Button variant="outline" onClick={() => onDecline(scout.id)} disabled={isLoading}>
            辞退する
          </Button>
          <Button onClick={() => onAccept(scout.id)} disabled={isLoading}>
            詳細を見る
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
