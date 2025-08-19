"use client"

import { useState } from "react"
import { CalendarIcon, Clock, MapPin, Video } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface CalendarIntegrationProps {
  onSchedule: (details: {
    date: Date
    time: string
    duration: string
    type: "オンライン" | "対面"
    location: string
  }) => void
}

export function CalendarIntegration({ onSchedule }: CalendarIntegrationProps) {
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState<string>("14:00")
  const [duration, setDuration] = useState<string>("60分")
  const [interviewType, setInterviewType] = useState<"オンライン" | "対面">("オンライン")
  const [location, setLocation] = useState<string>("https://meet.google.com/abc-defg-hij")

  const availableTimes = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
  ]

  const durations = ["30分", "45分", "60分", "90分", "120分"]

  const handleSchedule = () => {
    if (!date) return

    onSchedule({
      date,
      time,
      duration,
      type: interviewType,
      location,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">面接日程を設定</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          候補者との面接日程を調整し、カレンダーに予定を追加します。
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="date">日付</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: ja }) : "日付を選択"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={ja} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="time">時間</Label>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger id="time" className="w-full">
              <SelectValue placeholder="時間を選択" />
            </SelectTrigger>
            <SelectContent>
              {availableTimes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="duration">所要時間</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger id="duration" className="w-full">
              <SelectValue placeholder="所要時間を選択" />
            </SelectTrigger>
            <SelectContent>
              {durations.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>面接タイプ</Label>
          <RadioGroup value={interviewType} onValueChange={(value) => setInterviewType(value as "オンライン" | "対面")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="オンライン" id="online" />
              <Label htmlFor="online" className="flex items-center">
                <Video className="mr-2 h-4 w-4" />
                オンライン面接
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="対面" id="inperson" />
              <Label htmlFor="inperson" className="flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                対面面接
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="location">{interviewType === "オンライン" ? "ミーティングURL" : "面接場所"}</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={interviewType === "オンライン" ? "https://meet.google.com/..." : "東京都渋谷区..."}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSchedule} disabled={!date}>
          <Clock className="mr-2 h-4 w-4" />
          日程を設定して送信
        </Button>
      </div>
    </div>
  )
}
