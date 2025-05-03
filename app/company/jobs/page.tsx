"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Briefcase,
  Calendar,
  Clock,
  Edit,
  Eye,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

// ダミーデータ
const jobs = [
  {
    id: 1,
    title: "フロントエンドエンジニア",
    department: "開発部",
    location: "東京",
    type: "正社員",
    status: "公開中",
    applicants: 12,
    views: 145,
    postedDate: "2023-04-15",
    expiryDate: "2023-06-15",
  },
  {
    id: 2,
    title: "バックエンドエンジニア",
    department: "開発部",
    location: "大阪",
    type: "正社員",
    status: "公開中",
    applicants: 8,
    views: 98,
    postedDate: "2023-04-10",
    expiryDate: "2023-06-10",
  },
  {
    id: 3,
    title: "UIデザイナー",
    department: "デザイン部",
    location: "リモート",
    type: "契約社員",
    status: "下書き",
    applicants: 0,
    views: 0,
    postedDate: "",
    expiryDate: "",
  },
  {
    id: 4,
    title: "プロジェクトマネージャー",
    department: "プロジェクト管理部",
    location: "東京",
    type: "正社員",
    status: "締切済",
    applicants: 15,
    views: 203,
    postedDate: "2023-02-01",
    expiryDate: "2023-04-01",
  },
  {
    id: 5,
    title: "データサイエンティスト",
    department: "分析部",
    location: "東京",
    type: "正社員",
    status: "公開中",
    applicants: 6,
    views: 87,
    postedDate: "2023-04-20",
    expiryDate: "2023-06-20",
  },
  {
    id: 6,
    title: "マーケティングスペシャリスト",
    department: "マーケティング部",
    location: "大阪",
    type: "正社員",
    status: "下書き",
    applicants: 0,
    views: 0,
    postedDate: "",
    expiryDate: "",
  },
]

export default function JobsListingPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOption, setSortOption] = useState("posted")
  const router = useRouter()

  // ステータスに基づくフィルタリング
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // ソートオプションに基づくソート
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortOption) {
      case "posted":
        return new Date(b.postedDate || "1900-01-01").getTime() - new Date(a.postedDate || "1900-01-01").getTime()
      case "applicants":
        return b.applicants - a.applicants
      case "expiry":
        return new Date(a.expiryDate || "2099-12-31").getTime() - new Date(b.expiryDate || "2099-12-31").getTime()
      default:
        return 0
    }
  })

  // ステータスに応じたバッジの色を返す関数
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "公開中":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "下書き":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
      case "締切済":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      default:
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    }
  }

  // 残り日数を計算する関数
  const calculateRemainingDays = (expiryDate: string) => {
    if (!expiryDate) return "-"
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  // 削除確認モーダルを表示する関数（実際の実装はここでは省略）
  const handleDeleteClick = (jobId: number) => {
    if (window.confirm("この求人を削除してもよろしいですか？")) {
      console.log(`求人ID: ${jobId} を削除しました`)
      // 実際の削除処理はここに実装
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">求人一覧</h1>
          <p className="text-gray-500">登録済みの求人を管理・編集できます</p>
        </div>
        <Link href="/company/jobs/new" className="mt-4 md:mt-0">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> 新しい求人を作成
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="求人名、部署、勤務地などで検索..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[140px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="並び替え" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="posted">公開順</SelectItem>
                <SelectItem value="applicants">応募数順</SelectItem>
                <SelectItem value="expiry">締切日順</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="all" className="mb-6" onValueChange={setStatusFilter}>
          <TabsList className="grid grid-cols-4 mb-2">
            <TabsTrigger value="all">すべて ({jobs.length})</TabsTrigger>
            <TabsTrigger value="公開中">公開中 ({jobs.filter((job) => job.status === "公開中").length})</TabsTrigger>
            <TabsTrigger value="下書き">下書き ({jobs.filter((job) => job.status === "下書き").length})</TabsTrigger>
            <TabsTrigger value="締切済">締切済 ({jobs.filter((job) => job.status === "締切済").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onDelete={() => handleDeleteClick(job.id)}
                  onEdit={() => router.push(`/company/jobs/${job.id}`)}
                  onViewApplicants={() => router.push(`/company/applicants?jobId=${job.id}`)}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  calculateRemainingDays={calculateRemainingDays}
                />
              ))}
            </div>

            {sortedJobs.length === 0 && <EmptyState searchTerm={searchTerm} />}
          </TabsContent>

          <TabsContent value="公開中" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onDelete={() => handleDeleteClick(job.id)}
                  onEdit={() => router.push(`/company/jobs/${job.id}`)}
                  onViewApplicants={() => router.push(`/company/applicants?jobId=${job.id}`)}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  calculateRemainingDays={calculateRemainingDays}
                />
              ))}
            </div>

            {sortedJobs.length === 0 && <EmptyState searchTerm={searchTerm} />}
          </TabsContent>

          <TabsContent value="下書き" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onDelete={() => handleDeleteClick(job.id)}
                  onEdit={() => router.push(`/company/jobs/${job.id}`)}
                  onViewApplicants={() => router.push(`/company/applicants?jobId=${job.id}`)}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  calculateRemainingDays={calculateRemainingDays}
                />
              ))}
            </div>

            {sortedJobs.length === 0 && <EmptyState searchTerm={searchTerm} />}
          </TabsContent>

          <TabsContent value="締切済" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onDelete={() => handleDeleteClick(job.id)}
                  onEdit={() => router.push(`/company/jobs/${job.id}`)}
                  onViewApplicants={() => router.push(`/company/applicants?jobId=${job.id}`)}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  calculateRemainingDays={calculateRemainingDays}
                />
              ))}
            </div>

            {sortedJobs.length === 0 && <EmptyState searchTerm={searchTerm} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// 求人カードコンポーネント
interface JobCardProps {
  job: {
    id: number
    title: string
    department: string
    location: string
    type: string
    status: string
    applicants: number
    views: number
    postedDate: string
    expiryDate: string
  }
  onDelete: () => void
  onEdit: () => void
  onViewApplicants: () => void
  getStatusBadgeVariant: (status: string) => string
  calculateRemainingDays: (expiryDate: string) => number | string
}

function JobCard({
  job,
  onDelete,
  onEdit,
  onViewApplicants,
  getStatusBadgeVariant,
  calculateRemainingDays,
}: JobCardProps) {
  return (
    <Card className="overflow-hidden border border-gray-200 transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <Badge className={getStatusBadgeVariant(job.status)}>{job.status}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" /> 編集する
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewApplicants} disabled={job.applicants === 0}>
                <Users className="mr-2 h-4 w-4" /> 応募者を見る
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> 削除する
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="text-xl font-semibold mb-2 line-clamp-2">{job.title}</h3>

        <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Briefcase className="h-4 w-4 mr-1.5 text-gray-500" />
            <span>{job.department}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1.5 text-gray-500" />
            <span>{job.type}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1.5 text-gray-500" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1.5 text-gray-500" />
            <span>{job.expiryDate ? `残り${calculateRemainingDays(job.expiryDate)}日` : "期限なし"}</span>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">応募者数</div>
            <div className="font-semibold flex items-center">
              <Users className="h-4 w-4 mr-1.5 text-blue-500" />
              {job.applicants}名
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">閲覧数</div>
            <div className="font-semibold flex items-center">
              <Eye className="h-4 w-4 mr-1.5 text-blue-500" />
              {job.views}回
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-gray-50 px-5 py-3 flex justify-between">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-1.5" /> 編集
        </Button>
        <Button
          variant={job.applicants > 0 ? "default" : "outline"}
          size="sm"
          onClick={onViewApplicants}
          disabled={job.applicants === 0}
          className={job.applicants > 0 ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          <Users className="h-4 w-4 mr-1.5" />
          {job.applicants > 0 ? `応募者を見る (${job.applicants})` : "応募者なし"}
        </Button>
      </CardFooter>
    </Card>
  )
}

// 空の状態コンポーネント
function EmptyState({ searchTerm }: { searchTerm: string }) {
  return (
    <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
      <div className="text-gray-400 mb-4">
        {searchTerm ? <Search className="h-12 w-12 mx-auto" /> : <Briefcase className="h-12 w-12 mx-auto" />}
      </div>
      <h3 className="text-lg font-medium mb-2">
        {searchTerm ? "検索条件に一致する求人はありません" : "まだ求人が登録されていません"}
      </h3>
      <p className="text-gray-500 mb-4">
        {searchTerm
          ? "検索条件を変更するか、新しい求人を作成してください"
          : "新しい求人を作成して、優秀な人材を募集しましょう"}
      </p>
      <Link href="/company/jobs/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" /> 新しい求人を作成
        </Button>
      </Link>
    </div>
  )
}
