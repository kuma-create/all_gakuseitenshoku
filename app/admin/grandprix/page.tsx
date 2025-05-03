"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Edit, Eye, Search, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// Mock data for student submissions
const mockSubmissions = [
  {
    id: "sub1",
    studentName: "田中 健太",
    university: "東京大学",
    submissionDate: "2025-05-10T14:30:00",
    answer:
      "私はマーケティングプロジェクトでチームリーダーを務めました。最初はメンバー間の意見の相違がありましたが、全員の強みを活かす役割分担を提案し、週次の進捗確認ミーティングを導入しました。その結果、予定より2週間早くプロジェクトを完了し、クライアントから高い評価を得ることができました。この経験から、多様な意見を尊重しながらも、明確な目標設定と進捗管理の重要性を学びました。",
    status: "未採点",
    score: null,
    feedback: null,
  },
  {
    id: "sub2",
    studentName: "佐藤 美咲",
    university: "慶應義塾大学",
    submissionDate: "2025-05-09T09:15:00",
    answer:
      "学園祭の実行委員会で予算管理を担当した際、前年比30%の予算削減という課題に直面しました。私はチーム全体に状況を共有し、各部門からコスト削減アイデアを募りました。特に広告費を見直し、SNSを活用した無料宣伝方法を提案。結果として予算内で過去最高の来場者数を達成できました。この経験から、透明性のある情報共有と集合知の活用がチームの成功に不可欠だと学びました。",
    status: "採点済",
    score: 92,
    feedback:
      "具体的な数字を用いた説明が説得力を持たせています。課題に対する解決策の提案から実行、結果までのプロセスが明確に示されており、非常に優れた回答です。今後はさらに自身の役割と貢献をより具体的に述べると、より良い回答になるでしょう。",
  },
  {
    id: "sub3",
    studentName: "鈴木 大輔",
    university: "早稲田大学",
    submissionDate: "2025-05-11T18:45:00",
    answer:
      "ゼミのグループ研究で、メンバー5人と共に地域経済活性化の提案を行いました。初めは各自が異なる方向性を持っていましたが、私はオンラインホワイトボードを活用したブレインストーミングセッションを提案。全員の意見を可視化し、共通点を見出すことで一貫性のある提案を構築できました。最終的に地元企業からの実現可能性について高評価を得て、実際に一部施策が採用されました。この経験から、デジタルツールを活用した効率的な合意形成の重要性を学びました。",
    status: "未採点",
    score: null,
    feedback: null,
  },
  {
    id: "sub4",
    studentName: "山田 花子",
    university: "一橋大学",
    submissionDate: "2025-05-08T11:20:00",
    answer:
      "インターンシップ先でのマーケティングプロジェクトで、新商品のターゲット層分析を担当しました。チームメンバーとのコミュニケーション不足から、当初は分析方向にズレが生じていましたが、私から定期的な15分のチェックインミーティングを提案。各自の進捗と課題を共有する場を設けたことで、情報の透明性が高まり、最終的に統一感のある分析結果を提出できました。この経験から、小さな調整を定期的に行うことの重要性を学びました。",
    status: "採点済",
    score: 78,
    feedback:
      "問題点の認識と解決策の提案が明確です。ただ、具体的な成果や数値的な結果についての言及がもう少しあると良かったでしょう。また、チームメンバーの反応や、提案したミーティングがどのように受け入れられたかの描写があるとより説得力が増します。",
  },
  {
    id: "sub5",
    studentName: "伊藤 拓也",
    university: "大阪大学",
    submissionDate: "2025-05-10T16:05:00",
    answer:
      "ボランティア団体でのイベント企画において、メンバー10人のチームリーダーを務めました。限られた予算と人員で地域清掃イベントを成功させるため、私はタスク管理ツールを導入し、各メンバーの得意分野に合わせた役割分担を行いました。特に意見が分かれた広報戦略については、小規模テストを実施してデータに基づく意思決定を促進。結果として前回比150%の参加者を集めることができました。この経験から、チームの多様性を強みに変える重要性と、データに基づく意思決定の有効性を学びました。",
    status: "採点済",
    score: 95,
    feedback:
      "非常に優れた回答です。具体的な数字、導入したツール、直面した課題とその解決策が明確に述べられています。特に「小規模テスト」という実験的アプローチを取り入れた点が高く評価できます。リーダーシップの発揮と具体的成果の因果関係が明確で、学びの深さも感じられます。",
  },
]

// Mock data for past challenges
const pastChallenges = [
  {
    id: "ch1",
    month: "2025年4月",
    title: "あなたの長所と短所について教えてください",
    wordLimit: 400,
    deadline: "2025-04-30T23:59:00",
    submissionsCount: 128,
    avgScore: 76,
  },
  {
    id: "ch2",
    month: "2025年3月",
    title: "最近読んだ本から学んだことは何ですか",
    wordLimit: 300,
    deadline: "2025-03-31T23:59:00",
    submissionsCount: 143,
    avgScore: 82,
  },
  {
    id: "ch3",
    month: "2025年2月",
    title: "あなたが解決した難しい問題について教えてください",
    wordLimit: 500,
    deadline: "2025-02-28T23:59:00",
    submissionsCount: 115,
    avgScore: 79,
  },
]

// Current challenge data
const currentChallenge = {
  title: "あなたがチームで成果を出した経験を教えてください",
  description: "チームでの役割、直面した課題、解決策、結果について具体的に説明してください。",
  wordLimit: 400,
  deadline: "2025-05-31T23:59:00",
}

export default function AdminGrandPrixPage() {
  const { toast } = useToast()
  const router = useRouter()

  // State for challenge form
  const [challenge, setChallenge] = useState({
    title: currentChallenge.title,
    description: currentChallenge.description,
    wordLimit: currentChallenge.wordLimit,
    deadline: new Date(currentChallenge.deadline),
  })

  // State for filters
  const [filters, setFilters] = useState({
    status: "all",
    scoreRange: "all",
    search: "",
  })

  // State for scoring modal
  const [scoringSubmission, setScoringSubmission] = useState<any>(null)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState("")
  const [scoringModalOpen, setScoringModalOpen] = useState(false)

  // State for date picker
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false)
  const [selectedTime, setSelectedTime] = useState("23:59")

  // Filtered submissions based on filters
  const filteredSubmissions = mockSubmissions.filter((submission) => {
    // Filter by status
    if (filters.status !== "all" && submission.status !== filters.status) {
      return false
    }

    // Filter by score range
    if (filters.scoreRange !== "all") {
      if (filters.scoreRange === "90-100" && (submission.score === null || submission.score < 90)) {
        return false
      } else if (
        filters.scoreRange === "70-89" &&
        (submission.score === null || submission.score < 70 || submission.score >= 90)
      ) {
        return false
      } else if (filters.scoreRange === "0-69" && (submission.score === null || submission.score >= 70)) {
        return false
      }
    }

    // Filter by search term
    if (
      filters.search &&
      !submission.studentName.toLowerCase().includes(filters.search.toLowerCase()) &&
      !submission.answer.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false
    }

    return true
  })

  // Handle challenge form submission
  const handleChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Combine date and time
    const dateTime = new Date(challenge.deadline)
    const [hours, minutes] = selectedTime.split(":").map(Number)
    dateTime.setHours(hours, minutes)

    // Update challenge with the new deadline
    setChallenge((prev) => ({
      ...prev,
      deadline: dateTime,
    }))

    // Show success toast
    toast({
      title: "お題が更新されました",
      description: "新しいお題が学生に公開されました。",
    })
  }

  // Handle scoring submission
  const handleScoreSubmit = () => {
    if (score === null || score < 0 || score > 100) {
      toast({
        title: "エラー",
        description: "スコアは0から100の間で入力してください。",
        variant: "destructive",
      })
      return
    }

    // Update the submission with score and feedback
    const updatedSubmissions = mockSubmissions.map((sub) => {
      if (sub.id === scoringSubmission.id) {
        return {
          ...sub,
          status: "採点済",
          score,
          feedback,
        }
      }
      return sub
    })

    // Close modal and show success toast
    setScoringModalOpen(false)
    toast({
      title: "採点が完了しました",
      description: `${scoringSubmission.studentName}の回答を採点しました。`,
    })
  }

  // Open scoring modal for a submission
  const openScoringModal = (submission: any) => {
    setScoringSubmission(submission)
    setScore(submission.score || null)
    setFeedback(submission.feedback || "")
    setScoringModalOpen(true)
  }

  // Handle time selection
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(e.target.value)
  }

  // 採点機能を追加
  const scoreSubmission = async (submissionId: string, score: number, comment: string) => {
    // Mock implementation for demonstration purposes
    console.log(`Scoring submission ${submissionId} with score ${score} and comment: ${comment}`)
    toast({
      title: "採点が完了しました",
      description: "提出物の採点が正常に保存されました。",
    })
    setScoringModalOpen(false)
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

        {/* Challenge Management Tab */}
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
                    value={challenge.title}
                    onChange={(e) => setChallenge((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="例：あなたの強みについて教えてください"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">質問文</Label>
                  <Textarea
                    id="description"
                    value={challenge.description}
                    onChange={(e) => setChallenge((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="質問の詳細や回答のポイントなどを記入してください"
                    className="min-h-[100px]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wordLimit">文字数制限</Label>
                  <Input
                    id="wordLimit"
                    type="number"
                    value={challenge.wordLimit}
                    onChange={(e) => setChallenge((prev) => ({ ...prev, wordLimit: Number.parseInt(e.target.value) }))}
                    min={100}
                    max={1000}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>締切日時</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {challenge.deadline ? format(challenge.deadline, "PPP", { locale: ja }) : "日付を選択"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={challenge.deadline}
                            onSelect={(date) => {
                              if (date) {
                                setChallenge((prev) => ({ ...prev, deadline: date }))
                                setIsDatePickerOpen(false)
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="relative flex-1">
                      <Input type="time" value={selectedTime} onChange={handleTimeChange} className="w-full" />
                    </div>
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
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="学生名または回答内容で検索"
                      className="pl-8"
                      value={filters.search}
                      onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
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
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, scoreRange: value }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="スコア範囲" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="90-100">90-100点</SelectItem>
                      <SelectItem value="70-89">70-89点</SelectItem>
                      <SelectItem value="0-69">0-69点</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Desktop View */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">学生</th>
                      <th className="text-left py-3 px-2">提出日時</th>
                      <th className="text-left py-3 px-2">回答抜粋</th>
                      <th className="text-center py-3 px-2">ステータス</th>
                      <th className="text-center py-3 px-2">スコア</th>
                      <th className="text-right py-3 px-2">アクション</th>
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
                      filteredSubmissions.map((submission) => (
                        <tr key={submission.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <div className="font-medium">{submission.studentName}</div>
                            <div className="text-sm text-muted-foreground">{submission.university}</div>
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {format(new Date(submission.submissionDate), "yyyy/MM/dd HH:mm")}
                          </td>
                          <td className="py-3 px-2">
                            <p className="text-sm line-clamp-2">{submission.answer.substring(0, 100)}...</p>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge variant={submission.status === "採点済" ? "default" : "secondary"}>
                              {submission.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {submission.score !== null ? submission.score : "-"}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Button variant="outline" size="sm" onClick={() => openScoringModal(submission)}>
                              {submission.status === "採点済" ? "編集" : "採点する"}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-4">該当する回答がありません</div>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <Card key={submission.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{submission.studentName}</h3>
                            <p className="text-sm text-muted-foreground">{submission.university}</p>
                          </div>
                          <Badge variant={submission.status === "採点済" ? "default" : "secondary"}>
                            {submission.status}
                          </Badge>
                        </div>
                        <div className="text-sm mb-2">
                          提出日時: {format(new Date(submission.submissionDate), "yyyy/MM/dd HH:mm")}
                        </div>
                        <p className="text-sm line-clamp-3 mb-3">{submission.answer.substring(0, 100)}...</p>
                        <div className="flex justify-between items-center">
                          {submission.score !== null ? (
                            <div className="font-medium">スコア: {submission.score}</div>
                          ) : (
                            <div className="text-muted-foreground">未採点</div>
                          )}
                          <Button variant="outline" size="sm" onClick={() => openScoringModal(submission)}>
                            {submission.status === "採点済" ? "編集" : "採点する"}
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

        {/* Past Challenges Tab */}
        <TabsContent value="past">
          <Card>
            <CardHeader>
              <CardTitle>過去のお題一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop View */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">月</th>
                      <th className="text-left py-3 px-2">お題</th>
                      <th className="text-center py-3 px-2">提出数</th>
                      <th className="text-center py-3 px-2">平均スコア</th>
                      <th className="text-right py-3 px-2">アクション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastChallenges.map((challenge) => (
                      <tr key={challenge.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">{challenge.month}</td>
                        <td className="py-3 px-2">{challenge.title}</td>
                        <td className="py-3 px-2 text-center">{challenge.submissionsCount}</td>
                        <td className="py-3 px-2 text-center">{challenge.avgScore}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">詳細を見る</span>
                            </Button>
                            <Button variant="outline" size="icon">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">編集する</span>
                            </Button>
                            <Button variant="outline" size="icon">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">削除する</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {pastChallenges.map((challenge) => (
                  <Card key={challenge.id}>
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <div className="text-sm text-muted-foreground">{challenge.month}</div>
                        <h3 className="font-medium">{challenge.title}</h3>
                      </div>
                      <div className="flex justify-between text-sm mb-3">
                        <div>提出数: {challenge.submissionsCount}</div>
                        <div>平均スコア: {challenge.avgScore}</div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          詳細
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-1" />
                          削除
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

      {/* Scoring Modal */}
      <Dialog open={scoringModalOpen} onOpenChange={setScoringModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>回答の採点</DialogTitle>
            <DialogDescription>
              {scoringSubmission && (
                <div className="flex flex-col sm:flex-row justify-between text-sm mt-2">
                  <div>
                    <span className="font-medium">{scoringSubmission.studentName}</span>
                    <span className="text-muted-foreground ml-2">({scoringSubmission.university})</span>
                  </div>
                  <div className="text-muted-foreground">
                    提出日時: {format(new Date(scoringSubmission.submissionDate), "yyyy/MM/dd HH:mm")}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {scoringSubmission && (
            <>
              <div className="border rounded-md p-4 my-4 bg-muted/30">
                <h3 className="font-medium mb-2">回答内容:</h3>
                <p className="whitespace-pre-line">{scoringSubmission.answer}</p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="score">スコア (0-100)</Label>
                    <Input
                      id="score"
                      type="number"
                      value={score !== null ? score : ""}
                      onChange={(e) => setScore(e.target.value ? Number.parseInt(e.target.value) : null)}
                      min={0}
                      max={100}
                      required
                    />
                  </div>
                  <div className="flex-1 flex items-end">
                    <div className="text-sm text-muted-foreground">
                      <div>評価基準:</div>
                      <div>90-100: 優れた回答</div>
                      <div>70-89: 良い回答</div>
                      <div>0-69: 改善が必要</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="feedback">フィードバック</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="学生へのフィードバックを入力してください"
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setScoringModalOpen(false)}>
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
