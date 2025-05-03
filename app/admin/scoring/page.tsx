"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// 仮の提出データ
const mockSubmissions = [
  {
    id: "1",
    studentName: "山田太郎",
    challengeTitle: "5月のグランプリチャレンジ",
    submittedAt: "2023-05-15T09:30:00Z",
    status: "pending",
    answer: "マーケティング戦略の分析結果と提案...",
  },
  {
    id: "2",
    studentName: "佐藤花子",
    challengeTitle: "5月のグランプリチャレンジ",
    submittedAt: "2023-05-14T14:20:00Z",
    status: "scored",
    score: 85,
    feedback: "素晴らしい分析です。もう少し具体的な実装方法があるとより良かったでしょう。",
    answer: "マーケティング戦略の分析結果と提案...",
  },
  {
    id: "3",
    studentName: "鈴木一郎",
    challengeTitle: "5月のグランプリチャレンジ",
    submittedAt: "2023-05-13T11:45:00Z",
    status: "pending",
    answer: "マーケティング戦略の分析結果と提案...",
  },
]

export default function ScoringPage() {
  const [submissions, setSubmissions] = React.useState(mockSubmissions)
  const [selectedSubmission, setSelectedSubmission] = React.useState<(typeof mockSubmissions)[0] | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [score, setScore] = React.useState("")
  const [feedback, setFeedback] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleOpenScoring = (submission: (typeof mockSubmissions)[0]) => {
    setSelectedSubmission(submission)
    setScore(submission.status === "scored" ? submission.score?.toString() ?? "" : "")
    setFeedback(submission.status === "scored" ? submission.feedback ?? "" : "")
    setIsDialogOpen(true)
  }

  const handleSubmitScore = async () => {
    if (!selectedSubmission || !score) return

    setLoading(true)
    // 実際の実装ではAPIリクエストを行う
    try {
      // await scoreSubmission(selectedSubmission.id, parseInt(score), feedback);

      // 仮の更新処理
      setSubmissions(
        submissions.map((sub) =>
          sub.id === selectedSubmission.id
            ? {
                ...sub,
                status: "scored" as const,
                score: Number.parseInt(score),
                feedback,
              }
            : sub,
        ),
      )

      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error scoring submission:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">グランプリ採点</h1>

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
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.studentName}</TableCell>
                  <TableCell>{submission.challengeTitle}</TableCell>
                  <TableCell>{formatDate(submission.submittedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={submission.status === "pending" ? "outline" : "default"}>
                      {submission.status === "pending" ? "未採点" : "採点済み"}
                    </Badge>
                  </TableCell>
                  <TableCell>{submission.status === "scored" ? submission.score : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" onClick={() => handleOpenScoring(submission)}>
                      {submission.status === "pending" ? "採点する" : "採点を編集"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedSubmission?.studentName}の回答を採点</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div>
              <h3 className="font-medium mb-2">学生の回答:</h3>
              <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">{selectedSubmission?.answer}</div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="score">スコア (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="feedback">フィードバック</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="mt-1"
                  rows={5}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmitScore} disabled={!score || loading}>
              {loading ? "保存中..." : "採点を保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
