"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Calendar, ChevronRight, Download, Mail, MapPin, MessageSquare, Phone, School, Star, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock data for the applicant
const getApplicantData = (id: string) => {
  return {
    id,
    name: "田中 太郎",
    university: "東京大学",
    faculty: "工学部情報工学科",
    grade: "学部3年",
    graduationYear: "2026年",
    hometown: "東京都渋谷区",
    contact: {
      email: "tanaka.taro@example.com",
      phone: "090-1234-5678",
    },
    appliedJob: "フロントエンドエンジニア（インターン）",
    applicationDate: "2025年4月15日",
    status: "対応中",
    selfIntroduction: `
      私は現在、東京大学工学部情報工学科の3年生です。大学では主にウェブ開発とUI/UXデザインを学んでおり、特にReactとTypeScriptを用いたフロントエンド開発に興味を持っています。

      昨年の夏には、テックスタートアップでインターンシップを経験し、実際のプロダクト開発に携わりました。そこでは新機能の実装からバグ修正まで幅広いタスクを担当し、チームでの開発プロセスを学びました。

      貴社のインターンシッププログラムに参加することで、より実践的なスキルを身につけるとともに、プロフェッショナルな環境で自分の能力を高めたいと考えています。特に、ユーザー体験を向上させるための技術的な課題に取り組むことに興味があります。
    `,
    skills: ["JavaScript", "TypeScript", "React", "HTML/CSS", "Git", "Figma"],
    interests: ["Web開発", "UI/UX", "モバイルアプリ開発"],
    preferredIndustries: ["IT", "テクノロジー", "スタートアップ"],
    resumeUrl: "/resume-sample.pdf",
    isFavorite: false,
    chatId: "1", // Added chatId for navigation
  }
}

// Status options
const statusOptions = [
  { value: "未対応", label: "未対応" },
  { value: "書類選考中", label: "書類選考中" },
  { value: "対応中", label: "対応中" },
  { value: "面談調整中", label: "面談調整中" },
  { value: "面談済み", label: "面談済み" },
  { value: "内定", label: "内定" },
  { value: "不採用", label: "不採用" },
]

// Status color mapping
const statusColorMap: Record<string, string> = {
  未対応: "bg-gray-500",
  書類選考中: "bg-blue-500",
  対応中: "bg-yellow-500",
  面談調整中: "bg-purple-500",
  面談済み: "bg-indigo-500",
  内定: "bg-green-500",
  不採用: "bg-red-500",
}

export default function ApplicantProfilePage() {
  const params = useParams()
  const router = useRouter()
  const applicantId = params.applicantId as string
  const applicant = getApplicantData(applicantId)

  const [status, setStatus] = useState(applicant.status)
  const [isFavorite, setIsFavorite] = useState(applicant.isFavorite)

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    // Here you would typically call an API to update the status
    console.log(`Status updated to: ${newStatus}`)
  }

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite)
    // Here you would typically call an API to update the favorite status
    console.log(`Favorite status toggled to: ${!isFavorite}`)
  }

  const navigateToChat = () => {
    router.push(`/company/chat/${applicant.chatId}`)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <Link href="/company/applicants" className="hover:text-gray-700">
          応募者一覧
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-gray-900">{applicant.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area - 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold">{applicant.name}</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <School className="h-4 w-4 mr-1" />
                    {applicant.university} {applicant.faculty}
                  </CardDescription>
                </div>
                <Badge className={`${statusColorMap[status] || "bg-gray-500"} text-white px-3 py-1 text-sm`}>
                  {status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500">
                <div className="flex items-center mb-2 sm:mb-0">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>応募日: {applicant.applicationDate}</span>
                </div>
                <div>
                  <span>応募職種: {applicant.appliedJob}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different sections */}
          <Tabs defaultValue="basic-info" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="basic-info">基本情報</TabsTrigger>
              <TabsTrigger value="self-intro">自己PR・職務経歴</TabsTrigger>
              <TabsTrigger value="skills">スキル・志望業界</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic-info">
              <Card>
                <CardHeader>
                  <CardTitle>基本情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <User className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">学年</p>
                        <p>{applicant.grade}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">卒業予定年</p>
                        <p>{applicant.graduationYear}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">出身地</p>
                        <p>{applicant.hometown}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">メールアドレス</p>
                        <p>{applicant.contact.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 mr-2 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">電話番号</p>
                        <p>{applicant.contact.phone}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Self Introduction Tab */}
            <TabsContent value="self-intro">
              <Card>
                <CardHeader>
                  <CardTitle>自己PR・職務経歴</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">自己PR</h3>
                    <div className="whitespace-pre-line text-gray-700">{applicant.selfIntroduction}</div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">職務経歴書</h3>
                    <Button variant="outline" className="flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      職務経歴書をダウンロード
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills">
              <Card>
                <CardHeader>
                  <CardTitle>スキル・志望業界</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">スキル</h3>
                    <div className="flex flex-wrap gap-2">
                      {applicant.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">興味・関心</h3>
                    <div className="flex flex-wrap gap-2">
                      {applicant.interests.map((interest, index) => (
                        <Badge key={index} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          #{interest}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">志望業界</h3>
                    <div className="flex flex-wrap gap-2">
                      {applicant.preferredIndustries.map((industry, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - 1/3 width on desktop */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle>アクション</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full flex items-center justify-center" size="lg" onClick={navigateToChat}>
                <MessageSquare className="h-4 w-4 mr-2" />
                チャットを開始
              </Button>

              <div className="space-y-2">
                <label className="text-sm font-medium">ステータスを変更</label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant={isFavorite ? "default" : "outline"}
                className="w-full flex items-center justify-center"
                onClick={toggleFavorite}
              >
                {isFavorite ? (
                  <>
                    <Star className="h-4 w-4 mr-2 fill-current" />
                    お気に入りから削除
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    お気に入りに追加
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Application Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle>応募タイムライン</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative pl-6 pb-4 border-l border-gray-200">
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-green-500"></div>
                  <p className="text-sm font-medium">応募受付</p>
                  <p className="text-xs text-gray-500">2025年4月15日 14:30</p>
                </div>

                <div className="relative pl-6 pb-4 border-l border-gray-200">
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500"></div>
                  <p className="text-sm font-medium">書類選考通過</p>
                  <p className="text-xs text-gray-500">2025年4月18日 10:15</p>
                </div>

                <div className="relative pl-6 border-l border-gray-200">
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-yellow-500"></div>
                  <p className="text-sm font-medium">面談日程調整中</p>
                  <p className="text-xs text-gray-500">2025年4月20日 09:45</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle>メモ</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[120px] p-3 border rounded-md text-sm"
                placeholder="応募者に関するメモを残す..."
              ></textarea>
              <Button className="mt-2 w-full">保存</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
