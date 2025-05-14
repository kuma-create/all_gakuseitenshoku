// components/grandprix-leaderboard.tsx
"use client"

/* ------------------------------------------------------------------
   Grand Prix – 月次リーダーボード
------------------------------------------------------------------- */

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Medal, Trophy } from "lucide-react"
import { motion } from "framer-motion"
import dayjs from "dayjs"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/* ------------------------------------------------------------------ */
/*                               型定義                                */
/* ------------------------------------------------------------------ */
/**
 * スキーマ型が見当たらない場合でもビルド出来るよう
 * 必要最小限の列だけ手書き定義（後で types.ts を再生成したら削除して OK）
 */
interface GrandprixParticipantRow {
  student_id: string
  score: number | null
  event_id: string
}

interface StudentProfileRow {
  student_id: string
  full_name: string | null
  university: string | null
}

type ParticipantWithProfile = GrandprixParticipantRow & {
  student_profiles: Pick<StudentProfileRow, "full_name" | "university"> | null
}

/** リテラル union でバッジ種別を厳密化 */
type BadgeType = "gold" | "silver" | "bronze" | null

interface LeaderboardEntry {
  student_id: string
  full_name: string
  university: string
  score: number
  rank: number
  badge: BadgeType
  isCurrentUser: boolean
}

/* ------------------------------------------------------------------ */
/*                       月プルダウンオプション                       */
/* ------------------------------------------------------------------ */
const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const d = dayjs().subtract(i, "month")
  return { value: d.format("YYYY-MM"), label: d.format("YYYY年M月") }
})
type MonthKey = (typeof monthOptions)[number]["value"]

/* ------------------------------------------------------------------ */
/*                     GrandPrixLeaderboard コンポーネント            */
/* ------------------------------------------------------------------ */
export const GrandPrixLeaderboard = () => {
  const supabase = createClientComponentClient()

  const [selectedMonth, setSelectedMonth] =
    useState<MonthKey>(monthOptions[0].value)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  /* ---------------- 認証ユーザー取得 ---------------- */
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      setCurrentUserId(data.user?.id ?? null)
    })()
  }, [supabase])

  /* ---------------- ランキング取得 ---------------- */
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)

      /* 1) 対象月イベント ID */
      const monthStart = dayjs(`${selectedMonth}-01`)
        .startOf("month")
        .toISOString()
      const monthEnd = dayjs(`${selectedMonth}-01`)
        .endOf("month")
        .toISOString()

      const { data: event } = await supabase
        .from("grandprix_events")
        .select("id")
        .gte("start_date", monthStart)
        .lte("start_date", monthEnd)
        .maybeSingle<{ id: string }>()

      if (!event) {
        setEntries([])
        setLoading(false)
        return
      }

      /* 2) 参加者 + プロフィール */
      const { data, error } = await supabase
        .from("grandprix_participants")
        .select(
          `
            student_id,
            score,
            student_profiles (
              full_name,
              university
            )
          `,
        )
        .eq("event_id", event.id)
        .order("score", { ascending: false })
        .returns<ParticipantWithProfile[]>()

      if (error) {
        console.error(error)
        setEntries([])
        setLoading(false)
        return
      }

      /* 3) rank / badge 付与 & 上位 10 名 */
      const ranked: LeaderboardEntry[] = data.slice(0, 10).map((row, idx) => {
        const badge: BadgeType =
          idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : null

        return {
          student_id: row.student_id,
          full_name: row.student_profiles?.full_name ?? "匿名",
          university: row.student_profiles?.university ?? "",
          score: row.score ?? 0,
          rank: idx + 1,
          badge,
          isCurrentUser: row.student_id === currentUserId,
        }
      })

      setEntries(ranked)
      setLoading(false)
    }

    fetchLeaderboard()
  }, [selectedMonth, currentUserId, supabase])

  /* ---------------- ハンドラ ---------------- */
  const handleMonthChange = (v: string) => setSelectedMonth(v as MonthKey)

  const viewAnswer = (studentId: string) => {
    /* TODO: 回答取得処理 */
    setSelectedAnswer("回答プレビュー（ここに提出内容を表示します）")
    setIsDialogOpen(true)
  }

  /* ---------------- バッジ util ---------------- */
  const badgeIcon = (b: BadgeType) =>
    b === "gold" ? (
      <Medal className="h-5 w-5 text-yellow-500" />
    ) : b === "silver" ? (
      <Medal className="h-5 w-5 text-gray-400" />
    ) : b === "bronze" ? (
      <Medal className="h-5 w-5 text-amber-700" />
    ) : null

  const badgeTooltip = (b: BadgeType) =>
    b === "gold"
      ? "1位 - トップスコア"
      : b === "silver"
      ? "2位 - 優秀回答者"
      : b === "bronze"
      ? "3位 - 優秀回答者"
      : ""

  /* ------------------------------------------------------------------ */
  /*                                 JSX                                */
  /* ------------------------------------------------------------------ */
  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        {/* ヘッダー */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">ランキング</h2>
            <p className="mt-1 text-muted-foreground">
              今月のトップスコア学生
            </p>
          </div>

          {/* 月プルダウン */}
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="月を選択" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* テーブル */}
        <div className="overflow-hidden rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">順位</TableHead>
                <TableHead>氏名</TableHead>
                <TableHead>大学</TableHead>
                <TableHead className="text-right">スコア</TableHead>
                <TableHead className="w-[110px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((e) => (
                  <TableRow
                    key={e.student_id}
                    className={cn(
                      e.isCurrentUser &&
                        "bg-blue-50/60 dark:bg-blue-900/20",
                      e.rank <= 3 &&
                        "bg-amber-50/50 dark:bg-amber-900/10",
                    )}
                  >
                    {/* 順位 */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {e.rank}
                        {e.badge && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{badgeIcon(e.badge)}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {badgeTooltip(e.badge)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {e.rank === 1 && (
                          <motion.span
                            initial={{ rotate: -10 }}
                            animate={{ rotate: 10 }}
                            transition={{
                              repeat: Infinity,
                              repeatType: "reverse",
                              duration: 0.5,
                            }}
                          >
                            🏆
                          </motion.span>
                        )}
                      </div>
                    </TableCell>

                    {/* 氏名 */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {e.full_name}
                        {e.isCurrentUser && (
                          <Badge variant="outline" className="ml-1">
                            あなた
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* 大学 */}
                    <TableCell>{e.university}</TableCell>

                    {/* スコア */}
                    <TableCell className="text-right font-medium">
                      {e.score}/100
                    </TableCell>

                    {/* 回答ボタン */}
                    <TableCell>
                      {e.isCurrentUser && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewAnswer(e.student_id)}
                        >
                          回答を見る
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 回答プレビュー */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>あなたの回答</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <p className="whitespace-pre-wrap text-sm">
                  {selectedAnswer}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <span className="font-medium">採点済</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}