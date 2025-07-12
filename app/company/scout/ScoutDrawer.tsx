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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Star } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import type { Database } from "@/lib/supabase/types"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import StudentDetailTabs from "./StudentDetailTabs"

type Student = Database["public"]["Tables"]["student_profiles"]["Row"] & {
  /** 動的計算されたマッチ度 */
  match_score?: number | null

  /** ネスト取得したレジュメ */
  resumes?: {
    work_experiences: any[] | null
  }[]

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
  /** 送信完了後 callback */
  onSent?: (row: ScoutRow) => void
  /** 閲覧専用モード（フォーム非表示） */
  readOnly?: boolean
}

export default function ScoutDrawer({
  open,
  onOpenChange,
  student,
  templates,
  companyId,
  onSent,
  readOnly = false,
}: Props) {

  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const [offerPosition, setOfferPosition] = useState<string>("")
  const [offerAmount, setOfferAmount] = useState<string>("") // 例: "400-600"（万円レンジ）
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>("")
  const MAX_LEN = 1000
  // 400-600 / 400〜600 / 400‐600 などを許可（全角半角数字 & 区切り）
  const isValidRange = (str: string) =>
    /^[0-9 0-9]+\s*[-〜‐‑–—~]\s*[0-9 0-9]+$/.test(str.trim())

  // 企業が持つ求人一覧を取得
  useEffect(() => {
    if (!open) return          // Drawer が開いたときのみ
    if (!companyId) return

    ;(async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })

      if (!error && data) setJobs(data as { id: string; title: string }[])
    })()
  }, [open, companyId])

  /* ------------------ 会社名を取得 ------------------ */
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (!companyId) return;

    (async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .maybeSingle<{ name: string }>();

      if (!error && data?.name) {
        setCompanyName(data.name);
      }
    })();
  }, [open, companyId]);

  /* ------------------ ログイン中メンバーIDを取得 ------------------ */
  const [companyMemberId, setCompanyMemberId] = useState<string | null>(null)

  // ログインユーザーの company_members.id を取得
  useEffect(() => {
    if (!open) return
    if (!companyId) return

    const supabaseClient = createClientComponentClient<Database>()

    ;(async () => {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser()
      if (!user) return

      const { data, error } = await supabaseClient
        .from("company_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .maybeSingle<{ id: string }>()

      if (!error && data?.id) {
        setCompanyMemberId(data.id)
      }
    })()
  }, [open, companyId])

  /**
   * 最新のインターン先会社名を取得
   *
   * - student.resumes が配列でない場合（単一オブジェクト）も考慮
   * - fallback で student.experiences も参照（旧スキーマ）
   * - company_name / company / name のいずれかを優先して返す
   */
  const latestInternCompany = useMemo(() => {
    type RawExp = {
      company_name?: string | null
      company?: string | null
      name?: string | null
      start_date?: string | null
      end_date?: string | null
    }

    // 1) resumes → work_experiences
    const resumesArray =
      Array.isArray(student?.resumes)
        ? student.resumes
        : student?.resumes
        ? [student.resumes]
        : []

    const resumeExps: RawExp[] = resumesArray.flatMap((r) =>
      (r?.work_experiences as RawExp[] | null | undefined) ?? []
    )

    // 2) fallback: student.experiences
    const directExps: RawExp[] = Array.isArray((student as any)?.experiences)
      ? (student as any).experiences
      : []

    const exps: RawExp[] = [...resumeExps, ...directExps]
    if (exps.length === 0) return null

    // ソート: end_date → start_date の降順
    const sortKey = (e: RawExp) => e.end_date ?? e.start_date ?? ""
    exps.sort((a, b) => sortKey(b).localeCompare(sortKey(a)))

    const latest = exps[0]
    return latest.company_name ?? latest.company ?? latest.name ?? null
  }, [student])

  const isDisabled: boolean =
    !student ||
    !message.trim() ||
    !offerPosition.trim() ||
    !offerAmount.trim() ||      // 必須
    !selectedJobId ||           // 紐づけ求人必須
    !companyId ||
    message.length > MAX_LEN ||
    !isValidRange(offerAmount); // レンジ形式が不正

  const handleTemplate = (id: string) => {
    const tmp = templates.find((t) => t.id === id)
    if (!tmp || !student) return
    setSelectedTemplate(id)
    const msg = tmp.content
      .replace("[学生名]", student.full_name ?? "")
      .replace("[スキル]", (student.skills ?? []).join(", "))
    setMessage(msg)
    // reset previous inputs
    setOfferPosition("")
    setOfferAmount("")
  }

  const handleSend = async () => {
    if (readOnly) return
    if (!student) return

    // company_member_id は NOT NULL 制約があるため必須
    if (!companyMemberId) {
      toast.error("ログインユーザーが company_members に登録されていません。スカウトを送信できません。")
      return
    }

    const payload: Database["public"]["Tables"]["scouts"]["Insert"] & {
      company_member_id?: string | null
      offer_amount?: string | null
      offer_position?: string | null
    } = {
      company_id: companyId,
      company_member_id: companyMemberId,
      job_id: selectedJobId,
      student_id: student.id,
      message,
      status: "sent",
      offer_position: offerPosition.trim() || null,
      offer_amount: offerAmount.trim() || null,
    }

    // RLS ポリシーにより自社スカウトは SELECT 可能
    const { data: scoutRow, error: scoutErr } = await supabase
      .from("scouts")
      .insert(payload)
      .select()          // フルカラムを返す
      .single();

    if (scoutErr) {
      toast.error("送信に失敗しました")
    } else {
      toast.success("スカウトを送信しました")
      // 通知レコードは DB トリガー (notify_on_scout_insert) で自動生成される
      const studentAuthUid =
        // auth_user_id があれば優先
        (student as any).auth_user_id ?? (student as any).user_id ?? null;

      // --- 通知メールを送信 ---
      // studentAuthUid is already set above
      if (studentAuthUid) {
        const { error: invokeError } = await supabase.functions.invoke(
          "send-email",
          {
            body: {
              user_id: studentAuthUid, // 学生の Auth UID
              from_role: "company",
              company_name: companyName,
              notification_type: "scout",
              related_id: scoutRow.id,     // 追加: scouts.id を通知に渡す
              message, // スカウト本文
            },
          }
        );

        if (invokeError) {
          console.error("send-email invoke error:", invokeError);
          toast.warning("メール通知の送信に失敗しました");
        }
      } else {
        toast.warning("学生のユーザーIDが取得できず、メール通知をスキップしました");
      }

      if (scoutRow && onSent) onSent(scoutRow)
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[80vw] h-screen p-0">
        {/* hidden title for accessibility */}
        <SheetHeader>
          <SheetTitle className="sr-only">スカウト詳細</SheetTitle>
        </SheetHeader>

        {student && (
          <div className="grid grid-cols-3 h-full">
            {/* ── 左 2/3：プロフィール詳細 ─────────────────── */}
            <div className="col-span-2 overflow-y-auto p-6">
              <StudentDetailTabs student={student} />
            </div>

            {/* ── 右 1/3：スカウト送信フォーム ───────────────── */}
            {!readOnly && (
              <div className="border-l p-6 flex flex-col space-y-6 overflow-y-auto">
                {/* 学生サマリー */}
                <Card>
                  <CardContent className="pt-4 flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={student.avatar_url ?? "/placeholder.svg"}
                        alt="student avatar"
                      />
                      <AvatarFallback>👤</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 min-w-0">
                      {student.university && (
                        <p className="text-base font-semibold text-gray-900 break-words">
                          {student.university}
                        </p>
                      )}
                      {latestInternCompany && (
                        <p className="text-sm text-gray-500 break-words">
                          インターン: {latestInternCompany}
                        </p>
                      )}
                      <div className="flex items-center mt-2">
                        <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                        <span className="text-sm">
                          項目入力率 {student.match_score ?? "--"}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* テンプレート選択 */}
                {/* 求人紐づけ */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    紐づける求人 <span className="text-red-500">*</span>
                  </label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger>
                      <SelectValue placeholder="求人を選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

                {/* オファーポジション */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    オファーポジション <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={offerPosition}
                    onChange={(e) => setOfferPosition(e.target.value)}
                    placeholder="例: フロントエンドエンジニア"
                  />
                </div>

                {/* オファー額 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    オファー額レンジ（万円） <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="例: 400-600"
                  />
                  {!isValidRange(offerAmount) && offerAmount.trim() !== "" && (
                    <p className="text-xs text-red-500 mt-1">
                      「400-600」や「400〜600」の形式で入力してください
                    </p>
                  )}
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
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}