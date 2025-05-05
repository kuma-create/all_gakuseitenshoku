"use client"

import { useState, useRef } from "react"
import { ArrowDown, Calendar, CheckCircle, Clock, FileText, Send } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { grandprix-leaderboard } from "@/components/grandprix-leaderboard"

// Mock data for current challenge
const currentChallenge = {
  id: "may-2025",
  title: "あなたがチームで成果を出した経験を教えてください",
  issueDate: "2025-05-01",
  wordLimit: 400,
  deadline: "2025-05-31T23:59:59",
}

// Mock data for past challenges
const pastChallenges = [
  {
    id: "apr-2025",
    month: "2025年4月",
    title: "あなたの強みと弱みについて教えてください",
    status: "採点済", // Scored
    score: 78,
    answer:
      "私の強みは、物事を論理的に考え、複雑な問題を整理して解決策を見つけることです。大学のゼミでは、データ分析を通じて課題を特定し、効果的な解決策を提案することで評価されました。また、チームでの協働においても、メンバーの意見を尊重しながら議論をまとめる調整力があります。\n\n一方、弱みとしては完璧主義な面があり、時に細部にこだわりすぎて全体の進行が遅れることがあります。また、自分の考えに自信がある反面、異なる意見を受け入れるのに時間がかかることもあります。\n\nこれらの弱みを克服するため、「80%の完成度で一度提出する」というルールを自分に課したり、意識的に異なる視点からの意見を求めるようにしています。結果として、学生プロジェクトではより効率的に成果を出せるようになりました。",
    comment:
      "自己分析が的確で、弱みへの対策も具体的に書かれています。もう少し実際の経験に基づいたエピソードがあるとさらに説得力が増すでしょう。",
  },
  {
    id: "mar-2025",
    month: "2025年3月",
    title: "あなたが最も影響を受けた出来事とその理由を教えてください",
    status: "提出済", // Submitted
    answer:
      "私が最も影響を受けた出来事は、高校2年生の時に参加した海外ボランティアです。開発途上国での2週間の滞在中、現地の子どもたちと交流し、教育の機会格差を目の当たりにしました。\n\n特に印象的だったのは、限られた環境にもかかわらず、子どもたちが学ぶことへの純粋な喜びを持っていたことです。日本では当たり前に受けられる教育が、世界では貴重な機会であることを実感しました。\n\nこの経験から、私は「教育の力」と「機会の平等」について深く考えるようになりました。将来は、テクノロジーを活用して教育格差の解消に貢献できる仕事に就きたいと考えています。このボランティア経験は、私のキャリア選択の軸を形成する重要な出来事となりました。",
  },
  {
    id: "feb-2025",
    month: "2025年2月",
    title: "あなたが志望する業界を選んだ理由を教えてください",
    status: "未提出", // Not submitted
  },
]

export default function MonthlyChallengePage() {
  const [answer, setAnswer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null)
  const challengeRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Calculate remaining characters
  const remainingChars = currentChallenge.wordLimit - answer.length
  const isOverLimit = remainingChars < 0

  // Calculate days until deadline
  const deadlineDate = new Date(currentChallenge.deadline)
  const today = new Date()
  const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const handleSubmit = () => {
    if (answer.trim() === "") {
      toast({
        title: "入力エラー",
        description: "回答を入力してください。",
        variant: "destructive",
      })
      return
    }

    if (isOverLimit) {
      toast({
        title: "文字数制限エラー",
        description: `${Math.abs(remainingChars)}文字オーバーしています。`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setAnswer("")
      toast({
        title: "提出が完了しました！",
        description: "回答の採点結果は後日確認できます。",
      })
    }, 1500)
  }

  const scrollToChallenge = () => {
    challengeRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const openReviewDialog = (challenge: any) => {
    setSelectedChallenge(challenge)
    setShowReviewDialog(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "採点済":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">採点済</Badge>
      case "提出済":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">提出済</Badge>
      case "未提出":
        return (
          <Badge variant="outline" className="text-gray-500">
            未提出
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* ヒーローセクション */}
      <section className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 py-16 text-white md:py-24">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="h-full w-full bg-[url('/abstract-pattern.png')] bg-cover bg-center" />
        </div>
        <div className="container relative z-10 px-4 md:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              就活<span className="text-yellow-300">グランプリ</span>
            </h1>
            <p className="mb-10 text-lg text-white/90 md:text-xl">
              毎月の就活力チェック。スコアで自分の成長を可視化しよう。
            </p>
            <Button size="lg" className="bg-white px-8 text-red-600 hover:bg-red-50" onClick={scrollToChallenge}>
              今月のお題に挑戦する
              <ArrowDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* 今月のお題セクション */}
      <section ref={challengeRef} className="py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <h2 className="mb-8 text-2xl font-bold tracking-tight md:text-3xl">今月のお題</h2>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{currentChallenge.title}</CardTitle>
                  <CardDescription className="mt-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{format(new Date(currentChallenge.issueDate), "yyyy年MM月", { locale: ja })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span>{currentChallenge.wordLimit}文字以内</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>
                          締切: {format(new Date(currentChallenge.deadline), "yyyy/MM/dd HH:mm", { locale: ja })}
                          （あと{daysUntilDeadline}日）
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
                  <span className={`${isOverLimit ? "text-red-500" : "text-gray-500"}`}>
                    {answer.length}/{currentChallenge.wordLimit}文字
                  </span>
                  {isOverLimit && (
                    <span className="text-red-500">{Math.abs(remainingChars)}文字オーバーしています</span>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSubmit} disabled={isSubmitting || answer.trim() === "" || isOverLimit}>
                {isSubmitting ? (
                  <>
                    <span className="mr-2">提出中...</span>
                    <span className="animate-spin">⏳</span>
                  </>
                ) : (
                  <>
                    回答を提出する
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Leaderboard Section */}
      <grandprix-leaderboard />

      {/* 過去のお題セクション */}
      <section className="py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <h2 className="mb-8 text-2xl font-bold tracking-tight md:text-3xl">過去のお題と成績</h2>

          {/* Desktop view - Table */}
          <div className="hidden md:block">
            <div className="rounded-lg border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月</TableHead>
                    <TableHead>お題</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">スコア</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastChallenges.map((challenge) => (
                    <TableRow key={challenge.id}>
                      <TableCell className="font-medium">{challenge.month}</TableCell>
                      <TableCell>{challenge.title}</TableCell>
                      <TableCell>{getStatusBadge(challenge.status)}</TableCell>
                      <TableCell className="text-right">
                        {challenge.status === "採点済" ? `${challenge.score}/100` : "-"}
                      </TableCell>
                      <TableCell>
                        {challenge.status !== "未提出" ? (
                          <Button variant="outline" size="sm" onClick={() => openReviewDialog(challenge)}>
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

          {/* Mobile view - Accordion */}
          <div className="md:hidden">
            <Accordion type="single" collapsible className="w-full">
              {pastChallenges.map((challenge) => (
                <AccordionItem key={challenge.id} value={challenge.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{challenge.month}</span>
                        {getStatusBadge(challenge.status)}
                      </div>
                      {challenge.status === "採点済" && (
                        <span className="text-sm font-medium">{challenge.score}/100</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2 pb-4">
                      <div>
                        <h4 className="font-medium">{challenge.title}</h4>
                      </div>
                      {challenge.status !== "未提出" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => openReviewDialog(challenge)}
                        >
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

      {/* Answer Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedChallenge?.title}</DialogTitle>
            <DialogDescription>{selectedChallenge?.month}のお題への回答</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="whitespace-pre-wrap text-sm">{selectedChallenge?.answer}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedChallenge?.status === "採点済" && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">スコア: {selectedChallenge?.score}/100</span>
                  </>
                )}
              </div>
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
