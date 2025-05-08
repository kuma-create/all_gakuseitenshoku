// app/admin/scoring/page.tsx
"use client"

import React, { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

// Supabase の submissions テーブルに対応する型定義
type SubmissionRow = Database["public"]["Tables"]["grandprix_submissions"]["Row"] & {
  student_profiles: {
    full_name: string | null
  } | null
  grandprix_challenges: {
    title: string | null
  } | null
}

// クエリ結果の型定義
type QueryResult = {
  id: string
  student_id: string
  challenge_id: string
  answer: string
  score: number | null
  feedback: string | null
  status: string
  submitted_at: string
  created_at: string | null
  updated_at: string | null
  student_profiles: {
    full_name: string | null
  } | null
  grandprix_challenges: {
    title: string | null
  } | null
}

export default function ScoringPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<SubmissionRow | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [scoreInput, setScoreInput] = useState("")
  const [feedbackInput, setFeedbackInput] = useState("")

  const { toast } = useToast()

  // データ取得
  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from("grandprix_submissions")
        .select(`
          *,
          student_profiles!student_id ( full_name ),
          grandprix_challenges!challenge_id ( title )
        `)
        .order("submitted_at", { ascending: false })

      if (fetchError) throw fetchError
      
      // 型安全なデータ変換
      const typedData = (data as QueryResult[] ?? []).map(submission => ({
        ...submission,
        student_profiles: submission.student_profiles,
        grandprix_challenges: submission.grandprix_challenges
      }))

      setSubmissions(typedData)
    } catch (e: any) {
      console.error(e)
      setError(e.message)
      toast({
        title: "提出一覧の取得に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  // 採点ダイアログ表示
  const openDialog = (row: SubmissionRow) => {
    setSelected(row)
    setScoreInput(row.status === "scored" && row.score != null ? String(row.score) : "")
    setFeedbackInput(row.status === "scored" && row.feedback != null ? row.feedback : "")
    setIsDialogOpen(true)
  }

  // 採点送信
  const handleSubmitScore = async () => {
    if (!selected || scoreInput === "") return

    setLoading(true)
    try {
      const { error: updateError } = await supabase
        .from("grandprix_submissions")
        .update({
          status: "scored",
          score: Number(scoreInput),
          feedback: feedbackInput,
        })
        .eq("id", selected.id)

      if (updateError) throw updateError

      toast({ title: "採点を保存しました" })
      setIsDialogOpen(false)
      fetchSubmissions() // 再取得して最新状態に
    } catch (e: any) {
      console.error(e)
      toast({
        title: "採点の保存に失敗しました",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // 日付フォーマット
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  // — Loading State —
  if (loading && submissions.length === 0) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // — Error State —
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>エラーが発生しました</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button onClick={fetchSubmissions}>再読み込み</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // — Main Render —
  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">グランプリ提出採点</h1>

      <Card>
        <CardHeader>
          <CardTitle>提出一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>学生名</TableHead>
                <TableHead>チャレンジ</TableHead>
                <TableHead>提出日時</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>スコア</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.student_profiles?.full_name}</TableCell>
                  <TableCell>{row.grandprix_challenges?.title}</TableCell>
                  <TableCell>{formatDate(row.submitted_at ?? "")}</TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === "pending" ? "outline" : "default"}
                    >
                      {row.status === "pending" ? "未採点" : "採点済み"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.status === "scored" ? row.score : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      onClick={() => openDialog(row)}
                    >
                      {row.status === "pending" ? "採点する" : "編集"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {submissions.length === 0 && (
            <Alert className="mt-4">
              <AlertTitle>提出がまだありません</AlertTitle>
              <AlertDescription>
                学生の提出が集まり次第、ここに表示されます。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 採点ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.student_profiles?.full_name} さんの採点
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <h3 className="font-medium mb-2">回答内容</h3>
              <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                {selected?.answer}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="score">スコア (0〜100)</Label>
                <Input
                  id="score"
                  type="number"
                  min={0}
                  max={100}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="feedback">フィードバック</Label>
                <Textarea
                  id="feedback"
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitScore}
              disabled={loading || scoreInput === ""}
            >
              {loading ? "保存中…" : "採点を保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
