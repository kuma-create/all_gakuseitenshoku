"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send, Star } from "lucide-react"
import { useState } from "react"
import type { Database } from "@/lib/supabase/types"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import StudentDetailTabs from "./StudentDetailTabs"

type Student = Database["public"]["Tables"]["student_profiles"]["Row"] & {
  /** 動的計算されたマッチ度 */
  match_score?: number | null

  /* ──────── 追加: 型ジェネレーター未更新列を補完 ──────── */
  major?: string | null
  location?: string | null
  skills?: string[] | null
  has_internship_experience?: boolean | null
  graduation_year?: number | null
  status?: string | null
}
type ScoutRow = Database["public"]["Tables"]["scouts"]["Row"]

interface Template {
  id: string
  title: string
  content: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  student: Student | null
  templates: Template[]
  companyId: string
  onSent?: (row: ScoutRow) => void
}

export default function ScoutDrawer({
  open,
  onOpenChange,
  student,
  templates,
  companyId,
  onSent,
}: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const MAX_LEN = 1000
  const isDisabled =
    !student || !message.trim() || !companyId || message.length > MAX_LEN

  const handleTemplate = (id: string) => {
    const tmp = templates.find((t) => t.id === id)
    if (!tmp || !student) return
    setSelectedTemplate(id)
    const msg = tmp.content
      .replace("[学生名]", student.full_name ?? "")
      .replace("[スキル]", (student.skills ?? []).join(", "))
    setMessage(msg)
  }

  const handleSend = async () => {
    if (!student) return

    const payload: Database["public"]["Tables"]["scouts"]["Insert"] = {
      company_id: companyId,
      student_id: student.id,
      message,
      status: "sent",
    }

    const { data, error } = await supabase
      .from("scouts")
      .insert(payload)
      .select()
      .single()

    if (error) {
      toast.error("送信に失敗しました")
    } else {
      toast.success("スカウトを送信しました")
      if (data && onSent) onSent(data)
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[80vw] p-0">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <Send className="h-5 w-5 mr-2" />
            スカウト送信
          </SheetTitle>
        </SheetHeader>

        {student && (
          <div className="grid grid-cols-3 h-full">
            {/* ── 左 2/3：プロフィール詳細 ─────────────────── */}
            <div className="col-span-2 overflow-y-auto p-6">
              <StudentDetailTabs student={student} />
            </div>

            {/* ── 右 1/3：スカウト送信フォーム ───────────────── */}
            <div className="border-l p-6 flex flex-col space-y-6">
              {/* 学生サマリー */}
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={student.avatar_url ?? "/placeholder.svg"}
                      alt={student.full_name ?? ""}
                    />
                    <AvatarFallback>
                      {student.full_name?.slice(0, 2) ?? "👤"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{student.full_name}</h3>
                    <p className="text-sm text-gray-500 truncate">
                      {student.university}
                    </p>
                    <div className="flex items-center mt-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                      <span className="text-sm">
                        マッチ度 {student.match_score ?? "--"}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* テンプレート選択 */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  テンプレート
                </label>
                <Select value={selectedTemplate} onValueChange={handleTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="テンプレートを選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* メッセージ */}
              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium mb-2 block">本文</label>
                <Textarea
                  rows={10}
                  value={message}
                  onChange={(e) => {
                    const txt = e.target.value
                    if (txt.length <= MAX_LEN) setMessage(txt)
                  }}
                  className="flex-1 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/{MAX_LEN} 文字
                </p>
              </div>

              {/* ボタン */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  キャンセル
                </Button>
                <Button
                  className="flex-1"
                  disabled={isDisabled}
                  onClick={handleSend}
                >
                  <Send className="h-4 w-4 mr-2" /> 送信
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}