"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  Building,
  Calendar,
  ChevronDown,
  Clock,
  Code,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Star,
  User,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Mock data for the applicant
const getApplicantData = (id: string) => {
  return {
    id,
    name: "田中 太郎",
    nameEn: "Taro Tanaka",
    profileImage: "/young-man-profile.png",
    university: "東京大学",
    faculty: "工学部",
    department: "情報工学科",
    grade: "学部3年",
    graduationYear: "2026年3月",
    gpa: "3.8/4.0",
    hometown: "東京都渋谷区",
    contact: {
      email: "tanaka.taro@example.com",
      phone: "090-1234-5678",
    },
    appliedJob: "フロントエンドエンジニア（インターン）",
    applicationDate: "2025年4月15日",
    status: "書類選考中",
    selfIntroduction: `
      私は現在、東京大学工学部情報工学科の3年生です。大学では主にウェブ開発とUI/UXデザインを学んでおり、特にReactとTypeScriptを用いたフロントエンド開発に興味を持っています。

      昨年の夏には、テックスタートアップでインターンシップを経験し、実際のプロダクト開発に携わりました。そこでは新機能の実装からバグ修正まで幅広いタスクを担当し、チームでの開発プロセスを学びました。

      貴社のインターンシッププログラムに参加することで、より実践的なスキルを身につけるとともに、プロフェッショナルな環境で自分の能力を高めたいと考えています。特に、ユーザー体験を向上させるための技術的な課題に取り組むことに興味があります。
    `,
    skills: [
      { name: "JavaScript", level: 4 },
      { name: "TypeScript", level: 3 },
      { name: "React", level: 4 },
      { name: "HTML/CSS", level: 5 },
      { name: "Git", level: 3 },
      { name: "Figma", level: 4 },
      { name: "Node.js", level: 2 },
      { name: "Python", level: 3 },
    ],
    languages: [
      { name: "日本語", level: "ネイティブ" },
      { name: "英語", level: "ビジネスレベル (TOEIC 850)" },
    ],
    interests: ["Web開発", "UI/UX", "モバイルアプリ開発", "データ可視化"],
    preferredIndustries: ["IT", "テクノロジー", "スタートアップ"],
    workExperience: [
      {
        company: "テックスタートアップ株式会社",
        position: "フロントエンドエンジニア（インターン）",
        period: "2024年7月 - 2024年9月",
        description: "Reactを用いたWebアプリケーションの開発。新機能の実装とバグ修正を担当。",
      },
      {
        company: "デザインエージェンシー",
        position: "UIデザイナー（アルバイト）",
        period: "2023年10月 - 2024年3月",
        description: "Webサイトのデザインとプロトタイピング。Figmaを使用したUI/UXデザイン。",
      },
    ],
    education: [
      {
        school: "東京大学",
        degree: "工学部情報工学科",
        period: "2022年4月 - 現在",
        description: "GPA: 3.8/4.0。プログラミング、アルゴリズム、データ構造、ウェブ開発を専攻。",
      },
      {
        school: "東京都立青山高等学校",
        degree: "普通科",
        period: "2019年4月 - 2022年3月",
        description: "情報処理部に所属。全国高校プログラミングコンテストで準優勝。",
      },
    ],
    projects: [
      {
        name: "大学祭Webアプリ",
        period: "2023年5月 - 2023年11月",
        description: "大学祭の情報を提供するWebアプリケーションを開発。React、TypeScript、Firebase を使用。",
        url: "https://example.com/project1",
      },
      {
        name: "天気予報LINE Bot",
        period: "2022年12月 - 2023年2月",
        description: "位置情報に基づいて天気予報を提供するLINE Botを開発。Node.js、LINE Messaging APIを使用。",
        url: "https://example.com/project2",
      },
    ],
    motivationLetter: `
      私は貴社の革新的な製品開発と、ユーザー体験を重視する企業文化に強く惹かれています。特に、最近リリースされた○○アプリは、そのシンプルながらも直感的なUIデザインに感銘を受けました。

      私のフロントエンド開発のスキルと、UIデザインへの情熱を活かして、貴社の製品開発に貢献したいと考えています。インターンシップを通じて、実際のプロダクト開発の現場で学び、同時に自分のスキルを活かして価値を提供したいと思っています。

      また、貴社が推進している「ユーザーファースト」の理念に共感しており、技術だけでなくユーザーのニーズを理解し、それに応えるソリューションを提供することに興味があります。
    `,
    resumeUrl: "/resume-sample.pdf",
    portfolioUrl: "https://portfolio.example.com",
    githubUrl: "https://github.com/tanaka-taro",
    interviewAvailability: [
      { date: "2025年5月10日", time: "13:00 - 18:00" },
      { date: "2025年5月11日", time: "10:00 - 15:00" },
      { date: "2025年5月12日", time: "終日可能" },
    ],
    chatId: "chat-123",
  }
}

// Status options
const statusOptions = [
  { value: "未対応", label: "未対応", color: "bg-gray-500" },
  { value: "書類選考中", label: "書類選考中", color: "bg-blue-500" },
  { value: "一次面接調整中", label: "一次面接調整中", color: "bg-purple-500" },
  { value: "一次面接済み", label: "一次面接済み", color: "bg-indigo-500" },
  { value: "二次面接調整中", label: "二次面接調整中", color: "bg-purple-500" },
  { value: "二次面接済み", label: "二次面接済み", color: "bg-indigo-500" },
  { value: "内定", label: "内定", color: "bg-green-500" },
  { value: "不採用", label: "不採用", color: "bg-red-500" },
]

export default function ApplicantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const applicantId = params.id as string
  const applicant = getApplicantData(applicantId)

  const [status, setStatus] = useState(applicant.status)
  const [isScoutDialogOpen, setIsScoutDialogOpen] = useState(false)
  const [scoutMessage, setScoutMessage] = useState("")

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    // Here you would typically call an API to update the status
    console.log(`Status updated to: ${newStatus}`)
  }

  const navigateToChat = () => {
    router.push(`/company/chat/${applicant.chatId}`)
  }

  const sendScout = () => {
    // Here you would typically call an API to send a scout
    console.log(`Scout sent to ${applicant.name} with message: ${scoutMessage}`)
    setIsScoutDialogOpen(false)
    setScoutMessage("")
  }

  // Find the color for the current status
  const statusColor = statusOptions.find((option) => option.value === status)?.color || "bg-gray-500"

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 pb-24 md:pb-6">
      {/* Back button */}
      <Link
        href="/company/applicants"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        応募者一覧に戻る
      </Link>

      {/* Header Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-sm">
              <Image
                src={applicant.profileImage || "/placeholder.svg"}
                alt={applicant.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 96px, 96px"
              />
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h1 className="text-2xl font-bold">{applicant.name}</h1>
                <Badge className={`${statusColor} text-white px-3 py-1`}>{status}</Badge>
              </div>
              <div className="mt-2 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-gray-600">
                <div className="flex items-center">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  <span>
                    {applicant.university} {applicant.faculty}
                  </span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span>{applicant.grade}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>応募日: {applicant.applicationDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs for different sections */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="profile">プロフィール</TabsTrigger>
              <TabsTrigger value="experience">職務経験</TabsTrigger>
              <TabsTrigger value="education">学歴・スキル</TabsTrigger>
              <TabsTrigger value="motivation">志望動機</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    自己PR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-line text-gray-700">{applicant.selfIntroduction}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-blue-500" />
                    基本情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">氏名（英語表記）</p>
                      <p>{applicant.nameEn}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">出身地</p>
                      <p className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {applicant.hometown}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">メールアドレス</p>
                      <p className="flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-gray-400" />
                        {applicant.contact.email}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">電話番号</p>
                      <p className="flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-gray-400" />
                        {applicant.contact.phone}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">卒業予定年月</p>
                      <p className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {applicant.graduationYear}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">応募職種</p>
                      <p className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                        {applicant.appliedJob}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2 text-blue-500" />
                    興味・関心
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">興味のある分野</h3>
                      <div className="flex flex-wrap gap-2">
                        {applicant.interests.map((interest, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">志望業界</h3>
                      <div className="flex flex-wrap gap-2">
                        {applicant.preferredIndustries.map((industry, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-purple-50 text-purple-700 border-purple-200"
                          >
                            {industry}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Experience Tab */}
            <TabsContent value="experience" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-blue-500" />
                    職務経験
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {applicant.workExperience.map((experience, index) => (
                      <div key={index} className="relative pl-6 border-l-2 border-gray-200 pb-6 last:pb-0">
                        <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500"></div>
                        <h3 className="font-medium text-lg">{experience.position}</h3>
                        <p className="text-gray-600 flex items-center mt-1">
                          <Building className="h-4 w-4 mr-1" />
                          {experience.company}
                        </p>
                        <p className="text-gray-500 flex items-center mt-1 text-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          {experience.period}
                        </p>
                        <p className="mt-2 text-gray-700">{experience.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="h-5 w-5 mr-2 text-blue-500" />
                    プロジェクト
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {applicant.projects.map((project, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-medium text-lg">{project.name}</h3>
                        <p className="text-gray-500 flex items-center mt-1 text-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          {project.period}
                        </p>
                        <p className="mt-2 text-gray-700">{project.description}</p>
                        {project.url && (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                          >
                            プロジェクトを見る
                            <ChevronDown className="h-3 w-3 ml-1 rotate-270" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2 text-blue-500" />
                    学歴
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {applicant.education.map((edu, index) => (
                      <div key={index} className="relative pl-6 border-l-2 border-gray-200 pb-6 last:pb-0">
                        <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500"></div>
                        <h3 className="font-medium text-lg">{edu.school}</h3>
                        <p className="text-gray-600">{edu.degree}</p>
                        <p className="text-gray-500 flex items-center mt-1 text-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          {edu.period}
                        </p>
                        <p className="mt-2 text-gray-700">{edu.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="h-5 w-5 mr-2 text-blue-500" />
                    スキル
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">技術スキル</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {applicant.skills.map((skill, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span>{skill.name}</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < skill.level ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">言語スキル</h3>
                      <div className="space-y-2">
                        {applicant.languages.map((language, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span>{language.name}</span>
                            <Badge variant="outline" className="bg-gray-50">
                              {language.level}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Motivation Tab */}
            <TabsContent value="motivation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    志望動機
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-line text-gray-700">{applicant.motivationLetter}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    面接可能日時
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {applicant.interviewAvailability.map((availability, index) => (
                      <div key={index} className="flex items-center p-2 bg-gray-50 rounded-md">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium mr-2">{availability.date}:</span>
                        <span className="text-gray-600">{availability.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 border-t">
                  <Button variant="outline" className="w-full" onClick={navigateToChat}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    面接日程を調整する
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column - 1/3 width on desktop */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle>アクション</CardTitle>
              <CardDescription>応募者のステータスを更新したり、コミュニケーションを取ったりできます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">選考ステータスを変更</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center">
                        <Badge className={`${statusColor} text-white mr-2 px-2 py-0.5`}>{status}</Badge>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    {statusOptions.map((option) => (
                      <DropdownMenuItem key={option.value} onClick={() => handleStatusChange(option.value)}>
                        <Badge className={`${option.color} text-white mr-2 px-2 py-0.5`}>{option.label}</Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button className="w-full" onClick={navigateToChat}>
                <MessageSquare className="h-4 w-4 mr-2" />
                チャットを開始
              </Button>

              <Dialog open={isScoutDialogOpen} onOpenChange={setIsScoutDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    この学生にスカウトを送る
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>スカウトを送信</DialogTitle>
                    <DialogDescription>
                      {applicant.name}
                      さんにスカウトメッセージを送信します。興味を持ってもらえるようなメッセージを書きましょう。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label htmlFor="scout-message" className="text-sm font-medium">
                        スカウトメッセージ
                      </label>
                      <textarea
                        id="scout-message"
                        className="w-full min-h-[150px] p-3 border rounded-md"
                        placeholder="例：田中さん、あなたのスキルと経験に興味を持ちました。弊社では現在、フロントエンドエンジニアを募集しており..."
                        value={scoutMessage}
                        onChange={(e) => setScoutMessage(e.target.value)}
                      />
                      <p className="text-sm text-gray-500">
                        学生の興味・関心に合わせたパーソナライズされたメッセージを送ることで、返信率が高まります。
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsScoutDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={sendScout} disabled={!scoutMessage.trim()}>
                      送信する
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Resume Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                履歴書・ポートフォリオ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  <span>履歴書.pdf</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">ダウンロード</span>
                        <a href={applicant.resumeUrl} download>
                          <ArrowLeft className="h-4 w-4 rotate-90" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ダウンロード</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">ポートフォリオ</span>
                  <a
                    href={applicant.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    開く
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">GitHub</span>
                  <a
                    href={applicant.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    開く
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                応募タイムライン
              </CardTitle>
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
                  <p className="text-sm font-medium">書類選考開始</p>
                  <p className="text-xs text-gray-500">2025年4月16日 10:15</p>
                </div>

                <div className="relative pl-6 border-l border-gray-200">
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-gray-300"></div>
                  <p className="text-sm font-medium text-gray-500">面接日程調整</p>
                  <p className="text-xs text-gray-500">未定</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile fixed action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:hidden z-10">
        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1" onClick={() => setIsScoutDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            スカウト
          </Button>
          <Button className="flex-1" onClick={navigateToChat}>
            <MessageSquare className="h-4 w-4 mr-2" />
            チャット
          </Button>
        </div>
      </div>
    </div>
  )
}
