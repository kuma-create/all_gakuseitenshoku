"use client"

import { useEffect, useState } from "react"
import { Medal, Trophy, User } from "lucide-react"
import { motion } from "framer-motion"
import dayjs from "dayjs"

import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

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

/* -------------------------------------------------------------------------- */
/*                                   型定義                                    */
/* -------------------------------------------------------------------------- */
type BadgeType = "gold" | "silver" | "bronze" | null

interface LeaderboardEntry {
  student_id: string
  full_name: string | null
  university: string | null
  score: number
  rank: number
  badge: BadgeType
  isCurrentUser: boolean
}

/* -------------------------------------------------------------------------- */
/*                          月ドロップダウン用オプション生成                    */
/* -------------------------------------------------------------------------- */
const monthOptions: { value: string; label: string }[] = Array.from({ length: 12 }, (_, i) => {
  const d = dayjs().subtract(i, "month")
  return {
    value: d.format("YYYY-MM"),
    label: d.format("YYYY年M月"),
  }
})
type MonthKey = (typeof monthOptions)[number]["value"]


/* -------------------------------------------------------------------------- */
/*                             GrandPrixLeaderboard                            */
/* -------------------------------------------------------------------------- */
export const GrandPrixLeaderboard = () => {

  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(
    monthOptions[0].value,
  )
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  /* 認証ユーザー ID を取得 */
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [supabase])

  /* 月 or ユーザーが変わるたびにランキングを取得 */
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)

      /* 1) 月に対応する grandprix_events を取得 */
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

      /* 2) 参加者 + プロフィールを結合してスコア順取得 */
      const { data, error } = await supabase
        .from("grandprix_participants")
        .select(
          "student_id, score, student_profiles(full_name, university)",
        )
        .eq("event_id", event.id)
        .order("score", { ascending: false })

      if (error) {
        console.error(error)
        setEntries([])
        setLoading(false)
        return
      }

      /* 3) rank・badge を付与して上位 10 件に絞る */
      const ranked: LeaderboardEntry[] = data
        .map((row, idx) => {
          const profile = row.student_profiles  // ← ここ

          return {
            student_id: row.student_id,
            full_name : profile?.full_name   ?? "匿名",
            university: profile?.university ?? "",
            score     : row.score ?? 0,
            rank      : idx + 1,
            badge     :
              idx === 0 ? "gold"  :
              idx === 1 ? "silver":
              idx === 2 ? "bronze":
              null as BadgeType,
            isCurrentUser: row.student_id === currentUserId,
          }
        })
        .slice(0, 10)


      setEntries(ranked)
      setLoading(false)
    }

    fetchLeaderboard()
  }, [selectedMonth, currentUserId, supabase])

  /* 月変更ハンドラ */
  const handleMonthChange = (v: string) =>
    setSelectedMonth(v as MonthKey)

  /* 回答プレビュー (必要に応じて submissions から取得) */
  const viewAnswer = (studentId: string) => {
    setSelectedAnswer("回答プレビュー（実装は任意です）")
    setIsDialogOpen(true)
  }

  /* バッジ表示ユーティリティ */
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
      ? "1位 - トップスコア獲得者"
      : b === "silver"
        ? "2位 - 優秀回答者"
        : b === "bronze"
          ? "3位 - 優秀回答者"
          : ""

  /* ---------------------------------------------------------------------- */
  /*                                    JSX                                 */
  /* ---------------------------------------------------------------------- */
  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        {/* ヘッダー */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              ランキング
            </h2>
            <p className="mt-1 text-muted-foreground">
              今月の上位スコアを獲得した学生たち
            </p>
          </div>
          <div className="w-full md:w-auto">
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
        </div>

        {/* デスクトップテーブル */}
        <div className="hidden md:block">
          <div className="rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">順位</TableHead>
                  <TableHead>氏名</TableHead>
                  <TableHead>大学</TableHead>
                  <TableHead className="text-right">スコア</TableHead>
                  <TableHead className="w-[100px]" />
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
                        e.isCurrentUser && "bg-blue-50",
                        e.rank <= 3 && "bg-amber-50/50",
                      )}
                    >
                      {/* 順位 + バッジ */}
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
                                  <p>{badgeTooltip(e.badge)}</p>
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
                            <Badge variant="outline" className="ml-2">
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

                      {/* ボタン */}
                      <TableCell>
                        {e.isCurrentUser && (
                          <Button
                            variant="outline"
                            size="sm"
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
        </div>

        {/* モバイル表示は必要に応じて省略 or 追加 */}

        {/* 回答プレビューダイアログ */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>あなたの回答</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <p className="whitespace-pre-wrap text-sm">{selectedAnswer}</p>
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
