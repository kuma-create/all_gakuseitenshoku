"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Briefcase, CalendarIcon, Clock, Filter, GraduationCap, MapPin, Search, Send, Tag, User, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Sample student data
const sampleStudents = [
  {
    id: 1,
    name: "山田 太郎",
    university: "東京大学",
    major: "情報工学",
    academicYear: 3,
    graduationYear: 2024,
    location: "東京",
    desiredIndustries: ["IT", "コンサルティング"],
    hasInternshipExperience: true,
    skills: ["JavaScript", "React", "Node.js"],
    interests: ["Web開発", "AI", "データ分析"],
    avatar: "/placeholder.svg?height=100&width=100",
    about:
      "プログラミングが好きで、特にフロントエンド開発に興味があります。インターンシップでReactを使った開発経験があります。",
    experience: [
      {
        title: "フロントエンドエンジニアインターン",
        company: "テックスタートアップ株式会社",
        period: "2022年6月 - 2022年9月",
      },
    ],
  },
  {
    id: 2,
    name: "佐藤 花子",
    university: "京都大学",
    major: "コンピュータサイエンス",
    academicYear: 4,
    graduationYear: 2024,
    location: "大阪",
    desiredIndustries: ["AI", "研究開発"],
    hasInternshipExperience: true,
    skills: ["Python", "Machine Learning", "Data Science"],
    interests: ["AI", "データ分析", "自然言語処理"],
    avatar: "/placeholder.svg?height=100&width=100",
    about: "機械学習とデータサイエンスに情熱を持っています。研究室ではPythonを使った自然言語処理の研究をしています。",
    experience: [
      {
        title: "データサイエンスインターン",
        company: "AIソリューションズ株式会社",
        period: "2022年8月 - 2022年12月",
      },
    ],
  },
  {
    id: 3,
    name: "鈴木 一郎",
    university: "大阪大学",
    major: "電子工学",
    academicYear: 3,
    graduationYear: 2024,
    location: "大阪",
    desiredIndustries: ["製造", "IoT"],
    hasInternshipExperience: true,
    skills: ["C++", "Arduino", "IoT"],
    interests: ["組込みシステム", "IoT", "ロボティクス"],
    avatar: "/placeholder.svg?height=100&width=100",
    about:
      "ハードウェアとソフトウェアの両方に興味があります。IoTデバイスの開発経験があり、組込みシステムのエンジニアを目指しています。",
    experience: [
      {
        title: "組込みエンジニアインターン",
        company: "テクノロジーソリューションズ株式会社",
        period: "2023年1月 - 2023年3月",
      },
    ],
  },
]

// Scout message templates
const messageTemplates = [
  {
    id: 1,
    title: "一般的なスカウト",
    content:
      "こんにちは、[学生名]さん。私たちの会社では、あなたのスキルと経験に非常に興味を持っています。ぜひ一度、私たちの求人情報をご覧いただき、興味があればご応募をご検討いただけませんか？",
  },
  {
    id: 2,
    title: "技術職向けスカウト",
    content:
      "こんにちは、[学生名]さん。あなたの[スキル]のスキルに注目しました。現在、私たちのチームでは、これらのスキルを活かせるプロジェクトが進行中です。ぜひ一度、お話しする機会をいただけませんか？",
  },
  {
    id: 3,
    title: "デザイナー向けスカウト",
    content:
      "こんにちは、[学生名]さん。あなたのデザインスキルとポートフォリオに感銘を受けました。私たちは現在、ユーザー体験を重視した新しいプロダクトを開発中で、あなたのような才能あるデザイナーを探しています。",
  },
]

export default function ScoutPage() {
  const { toast } = useToast()
  const [students, setStudents] = useState(sampleStudents)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMajor, setSelectedMajor] = useState("all")
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [hasInternshipFilter, setHasInternshipFilter] = useState(false)
  const [sortOption, setSortOption] = useState("default")

  // Modal states
  const [isScoutModalOpen, setIsScoutModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<(typeof sampleStudents)[0] | null>(null)
  const [profileStudent, setProfileStudent] = useState<(typeof sampleStudents)[0] | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [scoutMessage, setScoutMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  // Filter students based on criteria
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.about.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMajor = selectedMajor === "all" || student.major.includes(selectedMajor)
    const matchesYear = selectedYear === "all" || student.graduationYear.toString() === selectedYear
    const matchesLocation = selectedLocation === "all" || student.location === selectedLocation
    const matchesInternship = !hasInternshipFilter || student.hasInternshipExperience
    const matchesSkills =
      selectedSkills.length === 0 ||
      selectedSkills.every((skill) => student.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase())))

    return matchesSearch && matchesMajor && matchesYear && matchesLocation && matchesInternship && matchesSkills
  })

  // Sort students based on selected option
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortOption) {
      case "nameAsc":
        return a.name.localeCompare(b.name)
      case "nameDesc":
        return b.name.localeCompare(a.name)
      case "universityAsc":
        return a.university.localeCompare(b.university)
      case "universityDesc":
        return b.university.localeCompare(a.university)
      case "graduationAsc":
        return a.graduationYear - b.graduationYear
      case "graduationDesc":
        return b.graduationYear - a.graduationYear
      default:
        return 0
    }
  })

  // Add skill to filter
  const addSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill])
    }
  }

  // Remove skill from filter
  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill))
  }

  // Open scout modal
  const openScoutModal = (student: (typeof sampleStudents)[0]) => {
    setSelectedStudent(student)
    setSelectedTemplate("")
    setScoutMessage("")
    setIsScoutModalOpen(true)
  }

  // Open profile modal
  const openProfileModal = (student: (typeof sampleStudents)[0]) => {
    setProfileStudent(student)
    setIsProfileModalOpen(true)
  }

  // Select message template
  const selectTemplate = (templateId: string) => {
    const template = messageTemplates.find((t) => t.id.toString() === templateId)
    if (template && selectedStudent) {
      let message = template.content
      message = message.replace("[学生名]", selectedStudent.name)
      message = message.replace("[スキル]", selectedStudent.skills.join(", "))
      setScoutMessage(message)
      setSelectedTemplate(templateId)
    }
  }

  // Send scout message
  const sendScout = async () => {
    if (!selectedStudent) return

    try {
      setIsSending(true)

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "スカウトを送信しました",
        description: `${selectedStudent.name}さんにスカウトを送信しました。`,
      })

      setIsScoutModalOpen(false)
    } catch (error) {
      toast({
        title: "エラーが発生しました",
        description: "スカウトの送信に失敗しました。もう一度お試しください。",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("")
    setSelectedMajor("all")
    setSelectedYear("all")
    setSelectedLocation("all")
    setHasInternshipFilter(false)
    setSelectedSkills([])
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">スカウト</h1>
          <p className="text-gray-500">優秀な学生を見つけてスカウトを送信</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="inline-flex bg-gray-100 p-1 rounded-lg">
          <button
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              sortOption === "default" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setSortOption("default")}
          >
            すべて
          </button>
          <button
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              sortOption === "nameAsc" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setSortOption("nameAsc")}
          >
            選考初期
          </button>
          <button
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              sortOption === "nameDesc" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setSortOption("nameDesc")}
          >
            面接中
          </button>
          <button
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              sortOption === "graduationAsc" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setSortOption("graduationAsc")}
          >
            最終段階
          </button>
          <button
            className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
              sortOption === "graduationDesc" ? "bg-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setSortOption("graduationDesc")}
          >
            選考完了
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Filter className="h-5 w-5 mr-2" /> フィルター
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">専攻</label>
                <Select value={selectedMajor} onValueChange={setSelectedMajor}>
                  <SelectTrigger>
                    <SelectValue placeholder="専攻を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての専攻</SelectItem>
                    <SelectItem value="情報工学">情報工学</SelectItem>
                    <SelectItem value="コンピュータサイエンス">コンピュータサイエンス</SelectItem>
                    <SelectItem value="電子工学">電子工学</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">卒業年度</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="卒業年度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての卒業年度</SelectItem>
                    <SelectItem value="2024">2024年</SelectItem>
                    <SelectItem value="2025">2025年</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">地域</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="地域を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての地域</SelectItem>
                    <SelectItem value="東京">東京</SelectItem>
                    <SelectItem value="大阪">大阪</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internship-experience"
                  checked={hasInternshipFilter}
                  onCheckedChange={(checked) => setHasInternshipFilter(checked === true)}
                />
                <label
                  htmlFor="internship-experience"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  インターン経験あり
                </label>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">スキル</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedSkills.map((skill) => (
                    <Badge key={skill} className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-blue-900">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    placeholder="スキルを追加..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value) {
                        addSkill(e.currentTarget.value)
                        e.currentTarget.value = ""
                      }
                    }}
                  />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">おすすめスキル:</p>
                  <div className="flex flex-wrap gap-1">
                    {["JavaScript", "Python", "React", "UI/UX", "データ分析"].map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => addSkill(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={resetFilters}>
                フィルターをリセット
              </Button>
            </div>
          </div>
        </div>

        {/* Student list */}
        <div className="lg:col-span-3">
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="名前、大学、スキルなどで検索..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger>
                  <SelectValue placeholder="並び替え" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">デフォルト</SelectItem>
                  <SelectItem value="nameAsc">名前 (昇順)</SelectItem>
                  <SelectItem value="nameDesc">名前 (降順)</SelectItem>
                  <SelectItem value="universityAsc">大学 (昇順)</SelectItem>
                  <SelectItem value="universityDesc">大学 (降順)</SelectItem>
                  <SelectItem value="graduationAsc">卒業年度 (昇順)</SelectItem>
                  <SelectItem value="graduationDesc">卒業年度 (降順)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedStudents.map((student) => (
              <Card key={student.id} className="overflow-hidden group relative">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={student.avatar || "/placeholder.svg"}
                        alt={student.name}
                        width={100}
                        height={100}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-semibold">{student.name}</h3>
                      <div className="flex items-center text-gray-500 mb-2">
                        <GraduationCap className="h-4 w-4 mr-1" />
                        <span>
                          {student.university} · {student.major} · {student.academicYear}年生
                        </span>
                      </div>
                      <div className="flex items-center text-gray-500 mb-3">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{student.location}</span>
                        <span className="mx-2">•</span>
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>{student.graduationYear}年卒</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {student.desiredIndustries.map((industry) => (
                          <Badge key={industry} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {industry}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {student.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="bg-gray-100">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-600 text-sm line-clamp-2 italic">"{student.about}"</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">興味・関心:</p>
                    <div className="flex flex-wrap gap-1">
                      {student.interests.map((interest) => (
                        <Badge
                          key={interest}
                          className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                        >
                          #{interest}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="mb-4">
                    <AccordionItem value="experience">
                      <AccordionTrigger className="text-sm py-2">
                        <div className="flex items-center">
                          <Briefcase className="h-4 w-4 mr-2" />
                          経験{" "}
                          {student.hasInternshipExperience && (
                            <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                              インターン経験あり
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {student.experience.length > 0 ? (
                          student.experience.map((exp, index) => (
                            <div key={index} className="mb-2 last:mb-0">
                              <div className="font-medium">{exp.title}</div>
                              <div className="text-sm text-gray-500">{exp.company}</div>
                              <div className="text-xs text-gray-400">{exp.period}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">経験情報はありません</div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => openProfileModal(student)}>
                      <User className="h-4 w-4 mr-2" /> プロフィール
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" size="sm" onClick={() => openScoutModal(student)}>
                      <Send className="h-4 w-4 mr-2" /> スカウト送信
                    </Button>
                  </div>

                  <div className="text-xs text-gray-400 mt-3 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    未スカウト
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredStudents.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm">
                <div className="text-gray-400 mb-4">
                  <User className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium mb-2">学生が見つかりません</h3>
                <p className="text-gray-500 mb-4">検索条件に一致する学生はいません。条件を変更してお試しください。</p>
                <Button variant="outline" onClick={resetFilters}>
                  フィルターをリセット
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scout modal */}
      <Dialog open={isScoutModalOpen} onOpenChange={setIsScoutModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>スカウトを送信</DialogTitle>
            <DialogDescription>{selectedStudent?.name}さんにスカウトメッセージを送信します。</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">テンプレートを選択</label>
              <Select value={selectedTemplate} onValueChange={selectTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="テンプレートを選択" />
                </SelectTrigger>
                <SelectContent>
                  {messageTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">メッセージ</label>
              <Textarea
                placeholder="スカウトメッセージを入力..."
                rows={6}
                value={scoutMessage}
                onChange={(e) => setScoutMessage(e.target.value)}
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-500">
              <div className="flex items-center mb-2">
                <Tag className="h-4 w-4 mr-2" />
                <span className="font-medium">ヒント:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>具体的な求人情報や会社の魅力を伝えましょう</li>
                <li>学生のスキルや経験に言及すると返信率が上がります</li>
                <li>質問を含めると会話が始まりやすくなります</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScoutModalOpen(false)}>
              キャンセル
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={sendScout}
              disabled={!scoutMessage.trim() || isSending}
            >
              <Send className="h-4 w-4 mr-2" /> {isSending ? "送信中..." : "送信する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>学生プロフィール</DialogTitle>
          </DialogHeader>

          {profileStudent && (
            <div className="py-4">
              <div className="flex flex-col md:flex-row gap-6 mb-6">
                <div className="flex-shrink-0">
                  <div className="h-32 w-32 rounded-full overflow-hidden mx-auto">
                    <Image
                      src={profileStudent.avatar || "/placeholder.svg"}
                      alt={profileStudent.name}
                      width={128}
                      height={128}
                      className="object-cover"
                    />
                  </div>
                </div>

                <div className="flex-grow">
                  <h2 className="text-2xl font-bold mb-2">{profileStudent.name}</h2>
                  <div className="flex items-center text-gray-600 mb-2">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    <span>
                      {profileStudent.university} · {profileStudent.major} · {profileStudent.academicYear}年生 ・
                      {profileStudent.major}・{profileStudent.academicYear}年生
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600 mb-4">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{profileStudent.location}</span>
                    <span className="mx-2">•</span>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>{profileStudent.graduationYear}年卒</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {profileStudent.desiredIndustries.map((industry) => (
                      <Badge key={industry} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {industry}
                      </Badge>
                    ))}
                    {profileStudent.hasInternshipExperience && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">インターン経験あり</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">自己紹介</h3>
                  <p className="text-gray-700">{profileStudent.about}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">スキル</h3>
                  <div className="flex flex-wrap gap-2">
                    {profileStudent.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-gray-100">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">興味・関心</h3>
                  <div className="flex flex-wrap gap-2">
                    {profileStudent.interests.map((interest) => (
                      <Badge key={interest} className="bg-purple-50 text-purple-700 border-purple-200">
                        #{interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">経験</h3>
                  {profileStudent.experience.length > 0 ? (
                    <div className="space-y-3">
                      {profileStudent.experience.map((exp, index) => (
                        <div key={index} className="border-l-2 border-gray-200 pl-4">
                          <div className="font-medium">{exp.title}</div>
                          <div className="text-gray-600">{exp.company}</div>
                          <div className="text-sm text-gray-500">{exp.period}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">経験情報はありません</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>
              閉じる
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setIsProfileModalOpen(false)
                if (profileStudent) openScoutModal(profileStudent)
              }}
            >
              <Send className="h-4 w-4 mr-2" /> スカウトを送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
