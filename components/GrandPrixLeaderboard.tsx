"use client"

import { useState } from "react"
import { Medal, Trophy, User } from "lucide-react"
import { motion } from "framer-motion"

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/* -------------------------------------------------------------------------- */
/*                                    型定義                                   */
/* -------------------------------------------------------------------------- */
type BadgeType = "gold" | "silver" | "bronze" | null

interface LeaderboardEntry {
  id: number
  rank: number
  name: string
  university: string
  score: number
  badge: BadgeType
  isCurrentUser: boolean
}

interface UserRank {
  rank: number
  score: number
}

/* -------------------------------------------------------------------------- */
/*                               モックデータ定義                               */
/* -------------------------------------------------------------------------- */
const leaderboardData: Record<string, LeaderboardEntry[]> = {
  "2025-05": [
    { id: 1, rank: 1, name: "佐藤 健太", university: "東京大学", score: 98, badge: "gold", isCurrentUser: false },
    { id: 2, rank: 2, name: "田中 美咲", university: "慶應義塾大学", score: 95, badge: "silver", isCurrentUser: false },
    { id: 3, rank: 3, name: "鈴木 大輔", university: "早稲田大学", score: 93, badge: "bronze", isCurrentUser: false },
    { id: 4, rank: 4, name: "高橋 優子", university: "京都大学", score: 91, badge: null, isCurrentUser: false },
    { id: 5, rank: 5, name: "伊藤 健", university: "大阪大学", score: 89, badge: null, isCurrentUser: false },
    { id: 6, rank: 6, name: "渡辺 真由", university: "名古屋大学", score: 87, badge: null, isCurrentUser: false },
    { id: 7, rank: 7, name: "山本 拓也", university: "東北大学", score: 85, badge: null, isCurrentUser: false },
    { id: 8, rank: 8, name: "中村 悠馬", university: "九州大学", score: 84, badge: null, isCurrentUser: false },
    { id: 9, rank: 9, name: "小林 さくら", university: "一橋大学", score: 82, badge: null, isCurrentUser: false },
    { id: 10, rank: 10, name: "加藤 隆", university: "神戸大学", score: 80, badge: null, isCurrentUser: false },
  ],
  "2025-04": [
    { id: 11, rank: 1, name: "山田 太郎", university: "東京大学", score: 97, badge: "gold", isCurrentUser: false },
    { id: 12, rank: 2, name: "佐藤 健太", university: "東京大学", score: 94, badge: "silver", isCurrentUser: false },
    { id: 13, rank: 3, name: "鈴木 大輔", university: "早稲田大学", score: 92, badge: "bronze", isCurrentUser: false },
    { id: 14, rank: 4, name: "田中 美咲", university: "慶應義塾大学", score: 90, badge: null, isCurrentUser: false },
    { id: 15, rank: 5, name: "伊藤 健", university: "大阪大学", score: 88, badge: null, isCurrentUser: false },
    { id: 16, rank: 6, name: "渡辺 真由", university: "名古屋大学", score: 86, badge: null, isCurrentUser: false },
    { id: 17, rank: 7, name: "高橋 優子", university: "京都大学", score: 84, badge: null, isCurrentUser: false },
    { id: 18, rank: 8, name: "中村 悠馬", university: "九州大学", score: 82, badge: null, isCurrentUser: true },
    { id: 19, rank: 9, name: "小林 さくら", university: "一橋大学", score: 80, badge: null, isCurrentUser: false },
    { id: 20, rank: 10, name: "加藤 隆", university: "神戸大学", score: 79, badge: null, isCurrentUser: false },
  ],
  "2025-03": [
    { id: 21, rank: 1, name: "田中 美咲", university: "慶應義塾大学", score: 99, badge: "gold", isCurrentUser: false },
    { id: 22, rank: 2, name: "山田 太郎", university: "東京大学", score: 96, badge: "silver", isCurrentUser: false },
    { id: 23, rank: 3, name: "高橋 優子", university: "京都大学", score: 94, badge: "bronze", isCurrentUser: false },
    { id: 24, rank: 4, name: "佐藤 健太", university: "東京大学", score: 92, badge: null, isCurrentUser: false },
    { id: 25, rank: 5, name: "伊藤 健", university: "大阪大学", score: 90, badge: null, isCurrentUser: false },
    { id: 26, rank: 6, name: "鈴木 大輔", university: "早稲田大学", score: 88, badge: null, isCurrentUser: false },
    { id: 27, rank: 7, name: "渡辺 真由", university: "名古屋大学", score: 86, badge: null, isCurrentUser: false },
    { id: 28, rank: 8, name: "山本 拓也", university: "東北大学", score: 84, badge: null, isCurrentUser: false },
    { id: 29, rank: 9, name: "中村 悠馬", university: "九州大学", score: 82, badge: null, isCurrentUser: false },
    { id: 30, rank: 10, name: "小林 さくら", university: "一橋大学", score: 80, badge: null, isCurrentUser: false },
  ],
}

const currentUserRank: Record<string, UserRank | null> = {
  "2025-05": { rank: 23, score: 78 },
  "2025-04": null,
  "2025-03": { rank: 15, score: 85 },
}

const monthOptions = [
  { value: "2025-05", label: "2025年5月" },
  { value: "2025-04", label: "2025年4月" },
  { value: "2025-03", label: "2025年3月" },
] as const

type MonthKey = typeof monthOptions[number]["value"]

/* -------------------------------------------------------------------------- */
/*                            GrandPrixLeaderboard                             */
/* -------------------------------------------------------------------------- */
export const GrandPrixLeaderboard = () => {
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>("2025-05")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value as MonthKey)
  }

  const getBadgeIcon = (badge: BadgeType) => {
    if (badge === "gold") return <Medal className="h-5 w-5 text-yellow-500" />
    if (badge === "silver") return <Medal className="h-5 w-5 text-gray-400" />
    if (badge === "bronze") return <Medal className="h-5 w-5 text-amber-700" />
    return null
  }

  const getBadgeTooltip = (badge: BadgeType) => {
    if (badge === "gold") return "1位 - トップスコア獲得者"
    if (badge === "silver") return "2位 - 優秀回答者"
    if (badge === "bronze") return "3位 - 優秀回答者"
    return ""
  }

  const viewAnswer = (id: number) => {
    setSelectedAnswer(
      `これは${id}番の回答です。実際のアプリケーションでは、このユーザーの実際の回答が表示されます。チームでの成果を出した経験について、私は大学のプロジェクトで5人チームのリーダーを務めました。メンバーそれぞれの強みを活かすために、定期的な進捗確認ミーティングを設け、問題点を早期に発見・解決することで、最終的にプロジェクトを成功させることができました。特に、意見の対立があった際には、各メンバーの視点を尊重しながら、プロジェクトのゴールを明確にすることで合意形成を図りました。`,
    )
    setIsDialogOpen(true)
  }

  /* ------------------------------- JSX ------------------------------- */
  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        {/* Header */}
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
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* --------------------------- Desktop table --------------------------- */}
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
                {leaderboardData[selectedMonth].map((entry) => (
                  <TableRow
                    key={entry.id}
                    className={cn(
                      entry.isCurrentUser && "bg-blue-50",
                      entry.rank <= 3 && "bg-amber-50/50",
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {entry.rank}
                        {entry.badge && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{getBadgeIcon(entry.badge)}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{getBadgeTooltip(entry.badge)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {entry.rank === 1 && (
                          <motion.span
                            initial={{ rotate: -10 }}
                            animate={{ rotate: 10 }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              repeatType: "reverse",
                              duration: 0.5,
                            }}
                          >
                            🏆
                          </motion.span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.name}
                        {entry.isCurrentUser && (
                          <Badge variant="outline" className="ml-2">
                            あなた
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{entry.university}</TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.score}/100
                    </TableCell>
                    <TableCell>
                      {entry.isCurrentUser && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewAnswer(entry.id)}
                        >
                          回答を見る
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* current user rank (desktop) */}
          {currentUserRank[selectedMonth] && (
            <div className="mt-4 rounded-lg border bg-blue-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">
                    あなたの順位：
                    {currentUserRank[selectedMonth]!.rank}位（
                    {currentUserRank[selectedMonth]!.score}点）
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewAnswer(0)}
                >
                  回答を見る
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* --------------------------- Mobile cards --------------------------- */}
        <div className="space-y-4 md:hidden">
          {leaderboardData[selectedMonth].map((entry) => (
            <Card
              key={entry.id}
              className={cn(
                entry.isCurrentUser && "border-blue-200 bg-blue-50",
                entry.rank <= 3 && "border-amber-200 bg-amber-50/50",
              )}
            >
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium">
                    {entry.rank}
                  </span>
                  {entry.badge && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{getBadgeIcon(entry.badge)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getBadgeTooltip(entry.badge)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="text-right font-medium">{entry.score}/100</div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.name}</span>
                    {entry.isCurrentUser && (
                      <Badge variant="outline" className="ml-1">
                        あなた
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {entry.university}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {currentUserRank[selectedMonth] && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">あなたの順位</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">
                      {currentUserRank[selectedMonth]!.rank}位（
                      {currentUserRank[selectedMonth]!.score}点）
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* --------------------------- Answer dialog --------------------------- */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>あなたの回答</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <p className="whitespace-pre-wrap text-sm">{selectedAnswer}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">スコア: 82/100</span>
                </div>
                <Badge variant="outline">採点済</Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
