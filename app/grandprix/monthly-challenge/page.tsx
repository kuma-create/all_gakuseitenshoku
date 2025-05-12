// app/grandprix/monthly-challenge/page.tsx
"use client"

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react"
import {
  ArrowDown,
  Calendar,
  FileText,
  Clock,
  Send,
} from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { useAuth } from "@/lib/auth-context"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert"
import { GrandPrixLeaderboard } from "@/components/grandprix-leaderboard"

// ───────────────────────────────────────────────────────────
// Supabase 型
// ───────────────────────────────────────────────────────────
type ChallengeRow =
  Database["public"]["Tables"]["challenges"]["Row"]
type SubmissionRow =
  Database["public"]["Tables"]["challenge_submissions"]["Row"]

/** チャレンジ + 自分の提出情報をマージした構造 */
type ChallengeWithSubmission = ChallengeRow & {
  status : SubmissionRow["status"] | "not_submitted"
  score? : SubmissionRow["score"]
  answer?: SubmissionRow["answer"]
  comment?: SubmissionRow["comment"]
}

type ChallengeWithRelations = ChallengeRow & {
  challenge_submissions: SubmissionRow[]        // ← 必ず配列になる
}

export default function MonthlyChallengePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const challengeRef = useRef<HTMLDivElement>(null)

  // ──────────────── state ────────────────
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeWithSubmission | null>(null)
  const [pastChallenges,  setPastChallenges]    = useState<ChallengeWithSubmission[]>([])
  const [answer,          setAnswer]            = useState("")
  const [loading,         setLoading]           = useState(false)
  const [submitLoading,   setSubmitLoading]     = useState(false)
  const [error,           setError]             = useState<string | null>(null)
  const [showReviewDialog,setShowReviewDialog]  = useState(false)
  const [selectedChallenge,setSelectedChallenge]= useState<ChallengeWithSubmission | null>(null)

  // ──────────────── fetch ────────────────
  const fetchChallenges = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("challenges")
        .select(`
          *,
          challenge_submissions (
            status,
            score,
            answer,
            comment,
            student_id
          )
        `)
        .order("created_at", { ascending: false })
        .returns<ChallengeWithRelations[]>()

      if (error) throw error
      if (!data)  throw new Error("データがありません")

      const now = new Date()

      const all: ChallengeWithSubmission[] = data.map((c) => {
        const sub = (c.challenge_submissions ?? []).find(
          (s) => s.student_id === user?.id
        )

        return {
          ...c,
          status : sub?.status  ?? "not_submitted",
          score  : sub?.score   ?? undefined,
          answer : sub?.answer  ?? undefined,
          comment: sub?.comment ?? undefined,
        }
      })

      setCurrentChallenge(
        all.find((c) => new Date(c.deadline) >= now) || null
      )
      setPastChallenges(
        all.filter((c) => new Date(c.deadline) < now)
      )
    } catch (e: any) {
      console.error(e)
      setError(e.message)
      toast({
        title: "データの取得に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, user?.id])

  useEffect(() => {
    fetchChallenges()
  }, [fetchChallenges])

  // ──────────────── submit ────────────────
  const handleSubmit = async () => {
    if (!currentChallenge || !user) return

    if (answer.trim() === "") {
      toast({
        title: "入力エラー",
        description: "回答を入力してください。",
        variant: "destructive",
      })
      return
    }

    if (answer.length > currentChallenge.word_limit) {
      toast({
        title: "文字数制限エラー",
        description: `${answer.length - currentChallenge.word_limit}文字オーバーしています。`,
        variant: "destructive",
      })
      return
    }

    setSubmitLoading(true)
    try {
      const { error } = await supabase
        .from("challenge_submissions")
        .insert({
          challenge_id: currentChallenge.id,
          student_id  : user.id,
          answer,
          // status は DB の DEFAULT ('submitted') に任せる
        })

      if (error) throw error

      toast({
        title: "提出が完了しました！",
        description: "採点結果は後日ご確認ください。",
      })
      setAnswer("")
      fetchChallenges()
    } catch (e: any) {
      console.error(e)
      toast({
        title: "提出に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  // ──────────────── helpers ────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scored":
        return <Badge className="bg-green-100 text-green-800">採点済</Badge>
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800">提出済</Badge>
      case "not_submitted":
      default:
        return <Badge variant="outline" className="text-gray-500">未提出</Badge>
    }
  }

  const scrollToChallenge = () => {
    challengeRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const openReviewDialog = (c: ChallengeWithSubmission) => {
    setSelectedChallenge(c)
    setShowReviewDialog(true)
  }

  // ──────────────── UI ────────────────
  if (loading) {
    return (
      <div className="space-y-8 p-4">
        {/* Skeletons */}
        <div className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 py-16 text-white">
          <Skeleton className="h-8 w-1/3 mx-auto" />
        </div>
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-8 w-1/4" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>エラーが発生しました</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button onClick={fetchChallenges}>再読み込み</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 py-16 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full bg-[url('/abstract-pattern.png')] bg-cover bg-center" />
        </div>
        <div className="container relative z-10 px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-bold">
              就活<span className="text-yellow-300">グランプリ</span>
            </h1>
            <p className="mb-10 text-lg text-white/90">
              毎月の就活力チェック。成長を可視化しよう。
            </p>
            <Button size="lg" className="bg-white px-8 text-red-600" onClick={scrollToChallenge}>
              今月のお題に挑戦する <ArrowDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ───────── Current Challenge ───────── */}
      <section ref={challengeRef} className="py-12">
        <div className="container px-4">
          <h2 className="mb-8 text-2xl font-bold">今月のお題</h2>

          {currentChallenge ? (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{currentChallenge.title}</CardTitle>
                    <CardDescription className="mt-2">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>
                            {format(new Date(currentChallenge.created_at), "yyyy年MM月", { locale: ja })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span>{currentChallenge.word_limit}文字以内</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span>
                            締切:{" "}
                            {format(new Date(currentChallenge.deadline), "yyyy/MM/dd HH:mm", {
                              locale: ja,
                            })}
                          </span>
                        </div>
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="あなたの回答を入力してください..."
                    className="min-h-[200px] resize-none"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {answer.length}/{currentChallenge.word_limit}文字
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-end">
                <Button onClick={handleSubmit} disabled={submitLoading || answer.trim() === ""}>
                  {submitLoading ? (
                    <>
                      <span className="mr-2">提出中...</span>
                      <span className="animate-spin">⏳</span>
                    </>
                  ) : (
                    <>
                      回答を提出する <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Alert>
              <AlertTitle>今月のお題が見つかりません</AlertTitle>
              <AlertDescription>締切前のお題がまだ登録されていません。</AlertDescription>
            </Alert>
          )}
        </div>
      </section>

      {/* ───────── Leaderboard ───────── */}
      <GrandPrixLeaderboard />

      {/* ───────── Past Challenges ───────── */}
      <section className="py-12">
        <div className="container px-4">
          <h2 className="mb-8 text-2xl font-bold">過去のお題と成績</h2>

          {/* Desktop */}
          <div className="hidden md:block">
            <div className="rounded-lg border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>発行月</TableHead>
                    <TableHead>お題</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">スコア</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastChallenges.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {format(new Date(c.created_at), "yyyy年M月", { locale: ja })}
                      </TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell>{getStatusBadge(c.status)}</TableCell>
                      <TableCell className="text-right">
                        {c.status === "scored" ? `${c.score}/100` : "-"}
                      </TableCell>
                      <TableCell>
                        {c.status !== "not_submitted" ? (
                          <Button variant="outline" size="sm" onClick={() => openReviewDialog(c)}>
                            回答を見る
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            未提出
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            <Accordion type="single" collapsible className="w-full">
              {pastChallenges.map((c) => (
                <AccordionItem key={c.id} value={c.id}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {format(new Date(c.created_at), "yyyy年M月", { locale: ja })}
                        </span>
                        {getStatusBadge(c.status)}
                      </div>
                      {c.status === "scored" && <span className="text-sm font-medium">{c.score}/100</span>}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2 pb-4">
                      <h4 className="font-medium">{c.title}</h4>
                      {c.status !== "not_submitted" ? (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => openReviewDialog(c)}>
                          回答を見る
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          未提出
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ───────── Review Dialog ───────── */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedChallenge?.title}</DialogTitle>
            <DialogDescription>
              {selectedChallenge && format(new Date(selectedChallenge.created_at), "yyyy年M月", { locale: ja })} の回答
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="whitespace-pre-wrap text-sm">{selectedChallenge?.answer}</p>
            </div>
            <div className="flex items-center justify-between">
              {selectedChallenge?.status === "scored" && (
                <span className="font-medium">
                  スコア: {selectedChallenge?.score}/100
                </span>
              )}
              {getStatusBadge(selectedChallenge?.status || "")}
            </div>
            {selectedChallenge?.comment && (
              <div className="rounded-md border p-3">
                <p className="text-sm font-medium">フィードバック:</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedChallenge.comment}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
