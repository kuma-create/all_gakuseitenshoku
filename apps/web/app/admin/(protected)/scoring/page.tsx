// app/admin/scoring/page.tsx
"use client"

import React, { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

/* ------------------------------------------------------------------ */
/*                             型定義                                  */
/* ------------------------------------------------------------------ */
// grandprix_challenges と student_profiles を JOIN しつつ、
// タイトルはエイリアス (challenge_title) として単列に取得
type SubmissionRow = Database["public"]["Tables"]["challenge_submissions"]["Row"] & {
  /** JOIN student_profiles */
  student_profiles: { full_name: string | null } | null
  /** grandprix_challenges.title をエイリアスで展開 */
  challenge_title: string | null
}

export default function ScoringPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const [selected, setSelected]     = useState<SubmissionRow | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [scoreInput, setScoreInput]       = useState("")
  const [commentInput, setCommentInput]   = useState("")

  const { toast } = useToast()

  /* ------------------------------ データ取得 ------------------------------ */
  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from("challenge_submissions")
        .select(`
          *,
          student_profiles(full_name),
          challenge_title:grandprix_challenges(title)
        `)
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError
      setSubmissions((data ?? []) as SubmissionRow[])
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
    void fetchSubmissions()
  }, [fetchSubmissions])

  /* ------------------------------ ダイアログ制御 ------------------------------ */
  const openDialog = (row: SubmissionRow) => {
    setSelected(row)
    setScoreInput(
      row.status === "scored" && row.score != null ? String(row.score) : ""
    )
    setCommentInput(
      row.status === "scored" && row.comment != null ? row.comment : ""
    )
    setIsDialogOpen(true)
  }

  /* ------------------------------ 採点保存 ------------------------------ */
  const handleSubmitScore = async () => {
    if (!selected || scoreInput === "") return

    setLoading(true)
    try {
      const { error: updateError } = await supabase
        .from("challenge_submissions")
        .update({
          status : "scored",
          score  : Number(scoreInput),
          comment: commentInput,
        })
        .eq("id", selected.id)

      if (updateError) throw updateError

      toast({ title: "採点を保存しました" })
      setIsDialogOpen(false)
      void fetchSubmissions()
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

  /* ------------------------------ ヘルパー ------------------------------ */
  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-"

  /* ------------------------------ レンダリング ------------------------------ */
  if (loading && submissions.length === 0) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">グランプリ提出採点</h1>

      {/* 提出一覧 ---------------------------------------------------------- */}
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
                  <TableCell>{row.student_profiles?.full_name ?? "-"}</TableCell>
                  <TableCell>{row.challenge_title ?? "-"}</TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "pending" || row.status === "submitted"
                          ? "outline"
                          : "default"
                      }
                    >
                      {row.status === "scored" ? "採点済み" : "未採点"}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.status === "scored" ? row.score : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" onClick={() => openDialog(row)}>
                      {row.status === "scored" ? "編集" : "採点する"}
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

      {/* 採点ダイアログ ---------------------------------------------------- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selected?.student_profiles?.full_name ?? "-"} さんの採点
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <h3 className="font-medium mb-2">回答内容</h3>
              <div className="bg-muted p-4 rounded-md whitespace-pre-wrap max-h-64 overflow-y-auto">
                {selected?.answer ?? "-"}
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
                <Label htmlFor="comment">フィードバック</Label>
                <Textarea
                  id="comment"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
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
