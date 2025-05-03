"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Calendar, ChevronDown, Download, Filter, MessageSquare, Search, Star, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// 選考ステータスの定義
const STATUS_OPTIONS = [
  { value: "未対応", color: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
  { value: "書類選考中", color: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  { value: "一次面接調整中", color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100" },
  { value: "一次面接済", color: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
  { value: "二次面接調整中", color: "bg-violet-100 text-violet-800 hover:bg-violet-100" },
  { value: "二次面接済", color: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100" },
  { value: "最終面接調整中", color: "bg-pink-100 text-pink-800 hover:bg-pink-100" },
  { value: "最終面接済", color: "bg-rose-100 text-rose-800 hover:bg-rose-100" },
  { value: "内定", color: "bg-green-100 text-green-800 hover:bg-green-100" },
  { value: "内定辞退", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  { value: "不採用", color: "bg-red-100 text-red-800 hover:bg-red-100" },
]

// ステータスグループの定義
const STATUS_GROUPS = {
  all: "すべて",
  pending: "未対応",
  inProgress: "対応中",
  passed: "通過",
  rejected: "不通過",
}

// ステータスをグループに分類
const getStatusGroup = (status: string) => {
  if (status === "未対応") {
    return "pending"
  } else if (
    [
      "書類選考中",
      "一次面接調整中",
      "一次面接済",
      "二次面接調整中",
      "二次面接済",
      "最終面接調整中",
      "最終面接済",
    ].includes(status)
  ) {
    return "inProgress"
  } else if (status === "内定") {
    return "passed"
  } else if (["不採用", "内定辞退"].includes(status)) {
    return "rejected"
  }
  return "all"
}

// ダミーの求人データ
const jobs = [
  { id: 1, title: "フロントエンドエンジニア" },
  { id: 2, title: "バックエンドエンジニア" },
  { id: 3, title: "UIデザイナー" },
  { id: 4, title: "プロジェクトマネージャー" },
  { id: 5, title: "データサイエンティスト" },
]

// ダミーデータ
const applicants = [
  {
    id: 1,
    name: "山田 太郎",
    university: "東京大学",
    faculty: "工学部",
    appliedDate: "2023-05-10",
    status: "書類選考中",
    jobId: 1,
    jobTitle: "フロントエンドエンジニア",
    avatar: "/abstract-profile.png",
    skills: ["JavaScript", "React", "TypeScript"],
    lastActivity: "2023-05-12",
    selfPR:
      "私はフロントエンド開発に情熱を持っており、特にReactとTypeScriptを使った開発経験があります。大学ではWebアプリケーション開発のプロジェクトに参加し、チームリーダーとして機能実装を担当しました。御社のような革新的な企業で自分のスキルを活かし、成長していきたいと考えています。",
    industry: "IT・通信",
    interestLevel: 85,
  },
  {
    id: 2,
    name: "佐藤 花子",
    university: "慶應義塾大学",
    faculty: "経済学部",
    appliedDate: "2023-05-09",
    status: "一次面接調整中",
    jobId: 1,
    jobTitle: "フロントエンドエンジニア",
    avatar: "/woman-profile.png",
    skills: ["JavaScript", "Vue.js", "CSS"],
    lastActivity: "2023-05-11",
    selfPR:
      "経済学部出身ですが、独学でプログラミングを学び、特にフロントエンド開発に興味を持っています。インターンシップでは実際のプロジェクトに参加し、Vue.jsを使った開発を経験しました。論理的思考力と創造性を活かして、ユーザー体験の向上に貢献したいと考えています。",
    industry: "IT・通信",
    interestLevel: 70,
  },
  {
    id: 3,
    name: "鈴木 一郎",
    university: "早稲田大学",
    faculty: "理工学部",
    appliedDate: "2023-05-08",
    status: "内定",
    jobId: 1,
    jobTitle: "フロントエンドエンジニア",
    avatar: "/man-profile.png",
    skills: ["JavaScript", "React", "Next.js"],
    lastActivity: "2023-05-15",
    selfPR:
      "理工学部でコンピュータサイエンスを専攻し、特にWebフロントエンド技術に興味を持っています。大学の研究室ではReactとNext.jsを使ったプロジェクトに取り組み、パフォーマンス最適化の研究を行いました。技術力と問題解決能力を活かして、御社のプロダクト開発に貢献したいと考えています。",
    industry: "IT・通信",
    interestLevel: 95,
  },
  {
    id: 4,
    name: "高橋 次郎",
    university: "大阪大学",
    faculty: "情報科学部",
    appliedDate: "2023-05-07",
    status: "不採用",
    jobId: 1,
    jobTitle: "フロントエンドエンジニア",
    avatar: "/young-man-profile.png",
    skills: ["JavaScript", "Angular"],
    lastActivity: "2023-05-09",
    selfPR:
      "情報科学部でWebアプリケーション開発を学び、特にAngularを使った開発に強みがあります。大学のプロジェクトでは、チームでECサイトを開発し、フロントエンド部分を担当しました。ユーザー中心の設計と高品質なコード実装を心がけており、御社のチームに参加して価値を提供したいと考えています。",
    industry: "IT・通信",
    interestLevel: 60,
  },
  {
    id: 5,
    name: "田中 三郎",
    university: "名古屋大学",
    faculty: "情報学部",
    appliedDate: "2023-05-06",
    status: "未対応",
    jobId: 1,
    jobTitle: "フロントエンドエンジニア",
    avatar: "/diverse-student-profiles.png",
    skills: ["JavaScript", "React", "Redux"],
    lastActivity: "2023-05-08",
    selfPR:
      "情報学部でユーザーインターフェース設計とフロントエンド開発を学んでいます。ReactとReduxを使った状態管理に関する研究を行っており、効率的なアプリケーション設計に興味があります。御社のような革新的な企業で、最新技術を活用したプロジェクトに携わりたいと考えています。",
    industry: "IT・通信",
    interestLevel: 75,
  },
  {
    id: 6,
    name: "伊藤 四郎",
    university: "京都大学",
    faculty: "情報学部",
    appliedDate: "2023-05-05",
    status: "二次面接済",
    jobId: 1,
    jobTitle: "フロントエンドエンジニア",
    avatar: "/young-professional.png",
    skills: ["JavaScript", "React", "GraphQL"],
    lastActivity: "2023-05-14",
    selfPR:
      "情報学部でデータ駆動型アプリケーション開発を専攻し、特にReactとGraphQLを組み合わせた効率的なフロントエンド開発に興味があります。大学の研究プロジェクトでは、パフォーマンスとユーザビリティを両立させたWebアプリケーションの開発に取り組みました。技術的な挑戦を楽しみながら、ユーザー価値の創出に貢献したいと考えています。",
    industry: "IT・通信",
    interestLevel: 90,
  },
  {
    id: 7,
    name: "渡辺 五郎",
    university: "東北大学",
    faculty: "工学部",
    appliedDate: "2023-05-04",
    status: "最終面接調整中",
    jobId: 2,
    jobTitle: "バックエンドエンジニア",
    avatar: "/placeholder.svg?key=lgao5",
    skills: ["Java", "Spring Boot", "MySQL"],
    lastActivity: "2023-05-13",
    selfPR:
      "工学部でソフトウェア工学を学び、特にバックエンド開発に強みがあります。JavaとSpring Bootを使ったRESTful APIの設計と実装経験があり、大学のプロジェクトではチームリーダーとしてバックエンド部分を担当しました。堅牢で拡張性の高いシステム設計を得意としており、御社のプロダクト開発に貢献したいと考えています。",
    industry: "IT・通信",
    interestLevel: 85,
  },
  {
    id: 8,
    name: "小林 六郎",
    university: "九州大学",
    faculty: "理学部",
    appliedDate: "2023-05-03",
    status: "未対応",
    jobId: 2,
    jobTitle: "バックエンドエンジニア",
    avatar: "/student-male-studying.png",
    skills: ["Python", "Django", "PostgreSQL"],
    lastActivity: "2023-05-03",
    selfPR:
      "理学部で数理情報学を専攻し、論理的思考力とプログラミングスキルを磨いてきました。PythonとDjangoを使ったWebアプリケーション開発の経験があり、特にデータベース設計とAPIの実装に興味があります。効率的で保守性の高いコードを書くことを心がけており、御社のバックエンド開発チームで力を発揮したいと考えています。",
    industry: "IT・通信",
    interestLevel: 65,
  },
]

export default function ApplicantsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortField, setSortField] = useState("appliedDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null)
  const [selectedApplicants, setSelectedApplicants] = useState<number[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [jobFilter, setJobFilter] = useState<string | null>(null)

  // ソート関数
  const sortApplicants = (a: any, b: any) => {
    let comparison = 0

    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "university":
        comparison = a.university.localeCompare(b.university)
        break
      case "appliedDate":
        // 日付文字列を正しく比較するために Date オブジェクトに変換
        const dateA = new Date(a.appliedDate).getTime()
        const dateB = new Date(b.appliedDate).getTime()
        comparison = dateA - dateB
        break
      case "status":
        comparison = a.status.localeCompare(b.status)
        break
      case "interestLevel":
        comparison = a.interestLevel - b.interestLevel
        break
      default:
        comparison = 0
    }

    // ソート方向に基づいて結果を反転
    return sortDirection === "asc" ? comparison : -comparison
  }

  // 検索とフィルタリングを適用
  const filteredApplicants = applicants
    .filter((applicant) => {
      const matchesSearch =
        applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicant.skills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase())) ||
        applicant.selfPR.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && applicant.status === "未対応") ||
        (statusFilter === "inProgress" &&
          [
            "書類選考中",
            "一次面接調整中",
            "一次面接済",
            "二次面接調整中",
            "二次面接済",
            "最終面接調整中",
            "最終面接済",
          ].includes(applicant.status)) ||
        (statusFilter === "passed" && applicant.status === "内定") ||
        (statusFilter === "rejected" && ["不採用", "内定辞退"].includes(applicant.status))

      const matchesJob = !jobFilter || applicant.jobId.toString() === jobFilter

      return matchesSearch && matchesStatus && matchesJob
    })
    .sort(sortApplicants)

  // ステータスに応じたバッジの色を返す関数
  const getStatusBadgeVariant = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((option) => option.value === status)
    return statusOption ? statusOption.color : "bg-gray-100 text-gray-800 hover:bg-gray-100"
  }

  // 興味度に応じた星アイコンを表示する関数
  const renderInterestLevel = (level: number) => {
    if (level >= 90) {
      return (
        <div className="flex items-center text-yellow-500">
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
        </div>
      )
    } else if (level >= 80) {
      return (
        <div className="flex items-center text-yellow-500">
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4" />
        </div>
      )
    } else if (level >= 70) {
      return (
        <div className="flex items-center text-yellow-500">
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
        </div>
      )
    } else if (level >= 60) {
      return (
        <div className="flex items-center text-yellow-500">
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
        </div>
      )
    } else {
      return (
        <div className="flex items-center text-yellow-500">
          <Star className="h-4 w-4 fill-current" />
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
          <Star className="h-4 w-4" />
        </div>
      )
    }
  }

  // 複数選択の切り替え
  const toggleApplicantSelection = (id: number) => {
    setSelectedApplicants((prev) =>
      prev.includes(id) ? prev.filter((applicantId) => applicantId !== id) : [...prev, id],
    )
  }

  // 全選択の切り替え
  const toggleSelectAll = () => {
    if (selectedApplicants.length === filteredApplicants.length) {
      setSelectedApplicants([])
    } else {
      setSelectedApplicants(filteredApplicants.map((a) => a.id))
    }
  }

  // バルク操作（一括ステータス変更）
  const bulkUpdateStatus = (status: string) => {
    // 実際のアプリケーションではここでAPIを呼び出してステータスを更新
    console.log(`選択された応募者(${selectedApplicants.join(", ")})のステータスを${status}に変更`)
    // 更新後に選択をクリア
    setSelectedApplicants([])
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <Button variant="outline" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold mb-2">応募者一覧</h1>
          <p className="text-gray-500">応募者の管理、選考ステータスの更新、コミュニケーションを行います</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-2">
          <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            詳細フィルター
            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="名前・大学・キーワードで検索..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={sortField + "-" + sortDirection}
              onValueChange={(value) => {
                const [field, direction] = value.split("-")
                setSortField(field)
                setSortDirection(direction as "asc" | "desc")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="並び順" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appliedDate-desc">応募日（新しい順）</SelectItem>
                <SelectItem value="appliedDate-asc">応募日（古い順）</SelectItem>
                <SelectItem value="name-asc">名前（昇順）</SelectItem>
                <SelectItem value="name-desc">名前（降順）</SelectItem>
                <SelectItem value="university-asc">大学（昇順）</SelectItem>
                <SelectItem value="university-desc">大学（降順）</SelectItem>
                <SelectItem value="interestLevel-desc">志望度（高い順）</SelectItem>
                <SelectItem value="interestLevel-asc">志望度（低い順）</SelectItem>
                <SelectItem value="status-asc">ステータス（昇順）</SelectItem>
                <SelectItem value="status-desc">ステータス（降順）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium mb-3">詳細フィルター</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">求人</label>
                <Select value={jobFilter || "all"} onValueChange={setJobFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="求人を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての求人</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">志望度</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="志望度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="high">高い（★★★★〜）</SelectItem>
                    <SelectItem value="medium">中程度（★★★〜）</SelectItem>
                    <SelectItem value="low">低い（★★以下）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setJobFilter(null)
                  setSortField("appliedDate")
                  setSortDirection("desc")
                }}
              >
                フィルターをリセット
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="mb-6 w-full md:w-auto flex overflow-x-auto">
            <TabsTrigger value="all" className="flex-1 md:flex-none">
              すべて{" "}
              <Badge variant="secondary" className="ml-2">
                {applicants.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 md:flex-none">
              未対応{" "}
              <Badge variant="secondary" className="ml-2">
                {applicants.filter((a) => a.status === "未対応").length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="inProgress" className="flex-1 md:flex-none">
              対応中{" "}
              <Badge variant="secondary" className="ml-2">
                {
                  applicants.filter((a) =>
                    [
                      "書類選考中",
                      "一次面接調整中",
                      "一次面接済",
                      "二次面接調整中",
                      "二次面接済",
                      "最終面接調整中",
                      "最終面接済",
                    ].includes(a.status),
                  ).length
                }
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="passed" className="flex-1 md:flex-none">
              通過{" "}
              <Badge variant="secondary" className="ml-2">
                {applicants.filter((a) => a.status === "内定").length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1 md:flex-none">
              不通過{" "}
              <Badge variant="secondary" className="ml-2">
                {applicants.filter((a) => ["不採用", "内定辞退"].includes(a.status)).length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {selectedApplicants.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-md mb-4 flex flex-wrap items-center justify-between">
              <div className="flex items-center mb-2 md:mb-0">
                <Checkbox
                  checked={selectedApplicants.length === filteredApplicants.length}
                  onCheckedChange={toggleSelectAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="ml-2 text-sm font-medium">
                  {selectedApplicants.length}名の応募者を選択中
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      ステータス変更
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STATUS_OPTIONS.map((status) => (
                      <DropdownMenuItem
                        key={status.value}
                        onClick={() => bulkUpdateStatus(status.value)}
                        className={status.color}
                      >
                        {status.value}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => setSelectedApplicants([])}>
                  選択解除
                </Button>
              </div>
            </div>
          )}

          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              {filteredApplicants.map((applicant) => (
                <Card key={applicant.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* 左側: チェックボックスと基本情報 */}
                      <div className="p-4 md:p-6 flex-grow">
                        <div className="flex items-start">
                          <Checkbox
                            checked={selectedApplicants.includes(applicant.id)}
                            onCheckedChange={() => toggleApplicantSelection(applicant.id)}
                            className="mr-3 mt-1"
                          />
                          <div className="flex flex-col md:flex-row md:items-center w-full">
                            <div className="flex items-center mb-3 md:mb-0 md:mr-4">
                              <Avatar className="h-12 w-12 mr-3">
                                <AvatarImage src={applicant.avatar || "/placeholder.svg"} alt={applicant.name} />
                                <AvatarFallback>{applicant.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-lg">{applicant.name}</h3>
                                <p className="text-gray-500 text-sm">
                                  {applicant.university} {applicant.faculty}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center md:ml-auto gap-2 md:gap-6">
                              <div>
                                <p className="text-sm text-gray-500">志望業界</p>
                                <p className="font-medium">{applicant.industry}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">志望度</p>
                                <div className="flex items-center">{renderInterestLevel(applicant.interestLevel)}</div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">応募日</p>
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>{applicant.appliedDate}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pl-8">
                          <p className="text-sm text-gray-500 mb-1">自己PR</p>
                          <p className="text-sm">
                            {applicant.selfPR.length > 100
                              ? `${applicant.selfPR.substring(0, 100)}...`
                              : applicant.selfPR}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-1">
                            {applicant.skills.map((skill, index) => (
                              <Badge key={index} variant="secondary" className="bg-gray-100">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 右側: ステータスとアクション */}
                      <div className="bg-gray-50 p-4 md:p-6 md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l">
                        <div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Badge
                                className={`cursor-pointer text-sm px-3 py-1.5 mb-4 ${getStatusBadgeVariant(applicant.status)}`}
                              >
                                {applicant.status}
                              </Badge>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>選考ステータスの変更</DialogTitle>
                                <DialogDescription>{applicant.name}さんの選考ステータスを変更します</DialogDescription>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-2 mt-4">
                                {STATUS_OPTIONS.map((status) => (
                                  <Button
                                    key={status.value}
                                    variant="outline"
                                    className={status.color}
                                    onClick={() => {
                                      // 実際のアプリケーションではここでAPIを呼び出してステータスを更新
                                      console.log(`${applicant.name}のステータスを${status.value}に変更`)
                                    }}
                                  >
                                    {status.value}
                                  </Button>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>

                          <p className="text-sm text-gray-500 mb-1">応募求人</p>
                          <p className="font-medium mb-4">{applicant.jobTitle}</p>
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                          <Button variant="default" onClick={() => router.push(`/company/applicants/${applicant.id}`)}>
                            <User className="h-4 w-4 mr-2" />
                            詳細を見る
                          </Button>
                          <Button variant="outline" onClick={() => router.push(`/company/chat/${applicant.id}`)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            チャットを開始
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredApplicants.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border">
                  <div className="text-gray-400 mb-4">
                    <User className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">応募者が見つかりません</h3>
                  <p className="text-gray-500 mb-4">検索条件に一致する応募者はありません。</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setJobFilter(null)
                    }}
                  >
                    フィルターをリセット
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 他のタブコンテンツも同様の構造 */}
          <TabsContent value="pending" className="mt-0">
            {/* 同様のコンテンツ（フィルタリングはコンポーネント内で処理） */}
          </TabsContent>

          <TabsContent value="inProgress" className="mt-0">
            {/* 同様のコンテンツ（フィルタリングはコンポーネント内で処理） */}
          </TabsContent>

          <TabsContent value="passed" className="mt-0">
            {/* 同様のコンテンツ（フィルタリングはコンポーネント内で処理） */}
          </TabsContent>

          <TabsContent value="rejected" className="mt-0">
            {/* 同様のコンテンツ（フィルタリングはコンポーネント内で処理） */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
