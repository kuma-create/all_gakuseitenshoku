"use client"

import type React from "react"

import { ArrowLeft, Calendar, Check, Clock, Mail, MapPin, Briefcase, DollarSign, Send, AlertCircle } from "lucide-react"
import { LazyImage } from "@/components/ui/lazy-image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState, use } from "react";

export default function JobApplyPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  // Mock data for the job
  const job = {
    id: params.id,
    title: "フロントエンドエンジニア",
    company: "株式会社テクノロジー",
    logo: "/abstract-geometric-logo.png",
    location: "東京都渋谷区",
    type: "正社員",
    salary: "年収450万円〜650万円",
    description:
      "当社では、ユーザー体験を向上させるWebアプリケーションの開発に携わるフロントエンドエンジニアを募集しています。",
    requirements: [
      "HTML, CSS, JavaScriptの基本的な知識",
      "React, Vue, Angularなどのフレームワークの使用経験",
      "GitHubを用いたバージョン管理の経験",
      "チームでの開発経験",
    ],
    interviewDates: [
      { id: 1, date: "2023年6月1日", time: "10:00〜11:00", available: true },
      { id: 2, date: "2023年6月1日", time: "14:00〜15:00", available: true },
      { id: 3, date: "2023年6月2日", time: "10:00〜11:00", available: true },
      { id: 4, date: "2023年6月2日", time: "14:00〜15:00", available: true },
      { id: 5, date: "2023年6月5日", time: "10:00〜11:00", available: true },
    ],
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href={`/jobs/${params.id}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">求人詳細に戻る</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          {/* Two column layout for desktop */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Left column: Job info */}
            <div className="space-y-6">
              {/* Job info card */}
              <Card className="overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-red-500 to-red-600"></div>
                <CardHeader className="relative pb-3">
                  <div className="absolute -top-12 left-4 h-16 w-16 overflow-hidden rounded-md border-4 border-white bg-white shadow-sm">
                    <LazyImage
                      src={job.logo || "/placeholder.svg"}
                      alt={`${job.company}のロゴ`}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-4 pt-2">
                    <CardTitle className="text-xl font-bold">{job.title}</CardTitle>
                    <CardDescription className="text-base font-medium text-gray-700">{job.company}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <span>{job.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>{job.salary}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Application steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">応募ステップ</CardTitle>
                  <CardDescription>応募から内定までの流れ</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white">
                        <span className="text-xs font-medium">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium">応募</h4>
                        <p className="text-sm text-gray-500">応募情報を送信</p>
                      </div>
                    </div>
                    <div className="ml-3 h-6 w-0.5 bg-gray-200"></div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                        <span className="text-xs font-medium">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium">書類選考</h4>
                        <p className="text-sm text-gray-500">1〜3営業日以内に結果連絡</p>
                      </div>
                    </div>
                    <div className="ml-3 h-6 w-0.5 bg-gray-200"></div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                        <span className="text-xs font-medium">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium">面接</h4>
                        <p className="text-sm text-gray-500">オンラインまたは対面</p>
                      </div>
                    </div>
                    <div className="ml-3 h-6 w-0.5 bg-gray-200"></div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                        <span className="text-xs font-medium">4</span>
                      </div>
                      <div>
                        <h4 className="font-medium">内定</h4>
                        <p className="text-sm text-gray-500">最終結果のご連絡</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">お問い合わせ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>recruit@example.com</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    応募に関するご質問は、上記メールアドレスまでお気軽にお問い合わせください。
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right column: Application form */}
            <div>
              <ApplicationForm job={job} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApplicationForm({ job }: { job: any }) {
  const [agreed, setAgreed] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [applicationReason, setApplicationReason] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setShowSuccess(true)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">応募フォーム</CardTitle>
          <CardDescription>以下のフォームに必要事項を入力して応募してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                応募理由（任意）
              </Label>
              <Textarea
                id="reason"
                placeholder="この職種に興味を持った理由や、あなたの強みをお書きください。"
                className="min-h-[150px] resize-none"
                value={applicationReason}
                onChange={(e) => setApplicationReason(e.target.value)}
              />
              <p className="text-xs text-gray-500">0/1000文字</p>
            </div>

            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">応募前の確認事項</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      応募すると、企業側にあなたのプロフィール情報が共有されます。
                      応募後は企業からのメッセージをチャットで受け取ることができます。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  利用規約に同意します
                </Label>
                <p className="text-sm text-gray-500">
                  <Link href="#" className="text-red-600 hover:underline">
                    利用規約
                  </Link>
                  と
                  <Link href="#" className="text-red-600 hover:underline">
                    プライバシーポリシー
                  </Link>
                  に同意の上、応募してください。
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 bg-red-600 hover:bg-red-700"
              disabled={!agreed || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  送信中...
                </>
              ) : (
                <>
                  応募を送信
                  <Send className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Interview dates card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">面接希望日程</CardTitle>
          <CardDescription>以下の候補日から面接希望日を選択してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {job.interviewDates.slice(0, 3).map((date: any) => (
              <div key={date.id} className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
                <Checkbox id={`date-${date.id}`} />
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Label htmlFor={`date-${date.id}`} className="text-sm font-normal">
                      {date.date}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{date.time}</span>
                  </div>
                </div>
                <div className="text-xs text-green-600">{date.available ? "予約可能" : "予約不可"}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">応募が完了しました</DialogTitle>
            <DialogDescription className="text-center">
              応募情報が正常に送信されました。企業からの連絡をお待ちください。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <Button className="w-full gap-2">
              チャットを確認する
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link href="/jobs">
                他の求人を見る
                <Briefcase className="h-4 w-4" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
