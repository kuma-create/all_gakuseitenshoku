// app/admin/grandprix/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/lib/hooks/use-toast"

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"]
type SubmissionRow = Database["public"]["Tables"]["challenge_submissions"]["Row"] & {
  student_profiles: {
    full_name: string
    university: string
  }
}

export default function AdminGrandPrixPage() {
  const { toast } = useToast()
  const router = useRouter()

  // Data state
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeRow | null>(null)
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    description: "",
    word_limit: 0,
    deadline: new Date(),
  })
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [pastChallenges, setPastChallenges] = useState<(ChallengeRow & {
    submissionsCount: number
    avgScore: number
  })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [filters, setFilters] = useState({
    status: "all",
    scoreRange: "all",
    search: "",
  })
  const [scoringModalOpen, setScoringModalOpen] = useState(false)
  const [scoringSubmission, setScoringSubmission] = useState<SubmissionRow | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [selectedTime, setSelectedTime] = useState("23:59")

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nowIso = new Date().toISOString()

      // 1) 現在のお題を取得
      const { data: current, error: err1 } = await supabase
        .from("challenges")
        .select("*")
        .gt("deadline", nowIso)
        .order("deadline", { ascending: true })
        .limit(1)
        .single()
      if (err1) throw err1

      setCurrentChallenge(current)
      setChallengeForm({
        title: current.title ?? "",
        description: current.description ?? "",
        word_limit: current.word_limit ?? 0,
        deadline: current.deadline ? new Date(current.deadline) : new Date(),
      })

      // current.deadline が null の場合はデフォルトで 23:59 を設定
      setSelectedTime(
        current.deadline
          ? format(new Date(current.deadline), "HH:mm", { locale: ja })
          : "23:59"
      )

      // 2) 提出された回答を取得
      const { data: subs, error: err2 } = await supabase
        .from("challenge_submissions")
        .select("*, student_profiles(full_name, university)")
        .eq("challenge_id", current.id)
        .order("submission_date", { ascending: false })
      if (err2) throw err2
      setSubmissions((subs ?? []) as SubmissionRow[])

      // 3) 過去のお題を取得
      const { data: past, error: err3 } = await supabase
        .from("challenges")
        .select("*")
        .lt("deadline", nowIso)
        .order("deadline", { ascending: false })
      if (err3) throw err3

      // 各過去お題について提出数と平均スコアを計算
      const pastWithStats = await Promise.all(
        (past || []).map(async (ch) => {
          const { count } = await supabase
            .from("challenge_submissions")
            .select("*", { count: "exact", head: true })
            .eq("challenge_id", ch.id)
          const { data: scoreData } = await supabase
            .from("challenge_submissions")
            .select("score")
            .eq("challenge_id", ch.id)
            .not("score", "is", null)
          const avg =
            scoreData && scoreData.length > 0
              ? scoreData.reduce((sum, r) => sum + (r.score || 0), 0) / scoreData.length
              : 0
          return {
            ...ch,
            submissionsCount: count || 0,
            avgScore: Math.round(avg),
          }
        })
      )
      setPastChallenges(pastWithStats)
    } catch (e: any) {
      console.error(e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // フォーム送信：お題更新
  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentChallenge) return

    try {
      const dateTime = new Date(challengeForm.deadline)
      const [h, m] = selectedTime.split(":").map(Number)
      dateTime.setHours(h, m)

      const { error: err } = await supabase
        .from("challenges")
        .update({
          title: challengeForm.title,
          description: challengeForm.description,
          word_limit: challengeForm.word_limit,
          deadline: dateTime.toISOString(),
        })
        .eq("id", currentChallenge.id)
      if (err) throw err

      toast({
        title: "お題が更新されました",
        description: "新しいお題が学生に公開されました。",
      })
      fetchData()
    } catch (e: any) {
      console.error(e)
      toast({
        title: "お題の更新に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    }
  }

  // 採点保存
  const handleScoreSubmit = async () => {
    if (!scoringSubmission) return
    if (score === null || score < 0 || score > 100) {
      toast({
        title: "エラー",
        description: "スコアは0から100の間で入力してください。",
        variant: "destructive",
      })
      return
    }

    try {
      const { error: err } = await supabase
        .from("challenge_submissions")
        .update({ score, status: "採点済", feedback })
        .eq("id", scoringSubmission.id)
      if (err) throw err

      toast({
        title: "採点が完了しました",
        description: `${scoringSubmission.student_profiles.full_name} の回答を採点しました。`,
      })
      setScoringModalOpen(false)
      fetchData()
    } catch (e: any) {
      console.error(e)
      toast({
        title: "採点に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    }
  }

  // モーダルオープン
  const openScoringModal = (sub: SubmissionRow) => {
    setScoringSubmission(sub)
    setScore(sub.score)
    setFeedback(sub.comment || "")
    setScoringModalOpen(true)
  }

  // フィルタリング
  const filteredSubmissions = submissions.filter((sub) => {
    if (filters.status !== "all" && sub.status !== filters.status) return false

    if (filters.scoreRange !== "all" && sub.score !== null) {
      if (filters.scoreRange === "90-100" && sub.score < 90) return false
      if (filters.scoreRange === "70-89" && (sub.score < 70 || sub.score >= 90)) return false
      if (filters.scoreRange === "0-69" && sub.score >= 70) return false
    }

    if (
      filters.search &&
      !sub.student_profiles.full_name.toLowerCase().includes(filters.search.toLowerCase()) &&
      !sub.answer.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false
    }
    return true
  })

  // Loading Skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-1/3" />
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton className="h-6 mb-4" />
              <Skeleton className="h-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>読み込みエラー</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button onClick={fetchData}>再読み込み</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">グランプリ管理</h1>

      <Tabs defaultValue="challenge" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="challenge">お題の管理</TabsTrigger>
          <TabsTrigger value="submissions">提出された回答</TabsTrigger>
          <TabsTrigger value="past">過去のお題</TabsTrigger>
        </TabsList>

        {/* Challenge 管理 */}
        <TabsContent value="challenge">
          <Card>
            <CardHeader>
              <CardTitle>今月のお題の管理</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChallengeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">お題のタイトル</Label>
                  <Input
                    id="title"
                    value={challengeForm.title}
                    onChange={(e) =>
                      setChallengeForm((p) => ({ ...p, title: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">質問文</Label>
                  <Textarea
                    id="description"
                    value={challengeForm.description}
                    onChange={(e) =>
                      setChallengeForm((p) => ({ ...p, description: e.target.value }))
                    }
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wordLimit">文字数制限</Label>
                  <Input
                    id="wordLimit"
                    type="number"
                    value={challengeForm.word_limit}
                    onChange={(e) =>
                      setChallengeForm((p) => ({ ...p, word_limit: +e.target.value }))
                    }
                    min={100}
                    max={1000}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>締切日時</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {format(challengeForm.deadline, "PPP", { locale: ja })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={challengeForm.deadline}
                          onSelect={(d) => {
                            if (d) {
                              setChallengeForm((p) => ({ ...p, deadline: d }))
                              setIsDatePickerOpen(false)
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full sm:w-auto">
                  お題を公開する
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>提出された回答一覧</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="学生名または回答内容で検索"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((p) => ({ ...p, search: e.target.value }))
                    }
                    className="pl-8"
                  />
                </div>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="ステータス" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="未採点">未採点</SelectItem>
                    <SelectItem value="採点済">採点済</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.scoreRange}
                  onValueChange={(v) =>
                    setFilters((p) => ({ ...p, scoreRange: v }))
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="スコア範囲" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="90-100">90–100点</SelectItem>
                    <SelectItem value="70-89">70–89点</SelectItem>
                    <SelectItem value="0-69">0–69点</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-2 text-left">学生</th>
                      <th className="py-3 px-2 text-left">提出日時</th>
                      <th className="py-3 px-2 text-left">回答抜粋</th>
                      <th className="py-3 px-2 text-center">ステータス</th>
                      <th className="py-3 px-2 text-center">スコア</th>
                      <th className="py-3 px-2 text-right">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4">
                          該当する回答がありません
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub) => (
                        <tr
                          key={sub.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="py-3 px-2">
                            <div className="font-medium">
                              {sub.student_profiles.full_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sub.student_profiles.university}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {format(
                              new Date(sub.created_at!),
                              "yyyy/MM/dd HH:mm"
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-sm line-clamp-2">
                              {sub.answer.substring(0, 100)}…
                            </p>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge
                              variant={
                                sub.status === "採点済" ? "default" : "secondary"
                              }
                            >
                              {sub.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {sub.score ?? "-"}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openScoringModal(sub)}
                            >
                              {sub.status === "採点済" ? "編集" : "採点する"}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-4">
                    該当する回答がありません
                  </div>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <Card key={sub.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">
                              {sub.student_profiles.full_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {sub.student_profiles.university}
                            </p>
                          </div>
                          <Badge
                            variant={
                              sub.status === "採点済" ? "default" : "secondary"
                            }
                          >
                            {sub.status}
                          </Badge>
                        </div>
                        <div className="text-sm mb-2">
                          提出日時:{" "}
                          {format(
                            new Date(sub.created_at!),
                            "yyyy/MM/dd HH:mm"
                          )}
                        </div>
                        <p className="text-sm line-clamp-3 mb-3">
                          {sub.answer.substring(0, 100)}…
                        </p>
                        <div className="flex justify-between items-center">
                          {sub.score !== null ? (
                            <div className="font-medium">スコア: {sub.score}</div>
                          ) : (
                            <div className="text-muted-foreground">未採点</div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openScoringModal(sub)}
                          >
                            {sub.status === "採点済" ? "編集" : "採点する"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Past Challenges */}
        <TabsContent value="past">
          <Card>
            <CardHeader>
              <CardTitle>過去のお題一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-2 text-left">月</th>
                      <th className="py-3 px-2 text-left">お題</th>
                      <th className="py-3 px-2 text-center">提出数</th>
                      <th className="py-3 px-2 text-center">平均スコア</th>
                      <th className="py-3 px-2 text-right">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastChallenges.map((ch) => (
                      <tr
                        key={ch.id}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-2">
                          {ch.deadline
                            ? format(new Date(ch.deadline), "yyyy年M月", { locale: ja })
                            : "－"}
                        </td>
                        <td className="py-3 px-2">{ch.title}</td>
                        <td className="py-3 px-2 text-center">
                          {ch.submissionsCount}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {ch.avgScore}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              router.push(`/admin/grandprix/${ch.id}`)
                            }
                          >
                            詳細
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-4">
                {pastChallenges.map((ch) => (
                  <Card key={ch.id}>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <div className="text-sm text-muted-foreground">
                          {ch.deadline
                            ? format(new Date(ch.deadline), "yyyy年M月", { locale: ja })
                            : "－"}
                        </div>
                        <h3 className="font-medium">{ch.title}</h3>
                      </div>
                      <div className="flex justify-between text-sm mb-3">
                        <div>提出数: {ch.submissionsCount}</div>
                        <div>平均スコア: {ch.avgScore}</div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/admin/grandprix/${ch.id}`)
                          }
                        >
                          詳細
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 採点モーダル */}
      <Dialog open={scoringModalOpen} onOpenChange={setScoringModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>回答の採点</DialogTitle>
            <DialogDescription>
              {scoringSubmission && (
                <div className="flex flex-col sm:flex-row justify-between text-sm mt-2">
                  <div>
                    <span className="font-medium">
                      {scoringSubmission.student_profiles.full_name}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      ({scoringSubmission.student_profiles.university})
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    提出日時:{" "}
                    {format(
                      new Date(scoringSubmission.created_at!),
                      "yyyy/MM/dd HH:mm"
                    )}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {scoringSubmission && (
            <>
              <div className="border rounded-md p-4 my-4 bg-muted/30">
                <h3 className="font-medium mb-2">回答内容:</h3>
                <p className="whitespace-pre-line">
                  {scoringSubmission.answer}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="score">スコア (0–100)</Label>
                    <Input
                      id="score"
                      type="number"
                      value={score ?? ""}
                      onChange={(e) =>
                        setScore(e.target.value ? +e.target.value : null)
                      }
                      min={0}
                      max={100}
                      required
                    />
                  </div>
                  <div className="flex-1 flex items-end">
                    <div className="text-sm text-muted-foreground">
                      <div>評価基準:</div>
                      <div>90–100: 優れた回答</div>
                      <div>70–89: 良い回答</div>
                      <div>0–69: 改善が必要</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="feedback">フィードバック</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setScoringModalOpen(false)}
                >
                  キャンセル
                </Button>
                <Button onClick={handleScoreSubmit}>採点結果を保存</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
