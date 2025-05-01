"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { PlusCircle, Search, Edit, Trash2, Eye, EyeOff, Calendar, Users, MapPin, Briefcase } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Job {
  id: string
  title: string
  description: string
  location: string | null
  job_type: string | null
  salary_range: {
    min: number | null
    max: number | null
  } | null
  application_deadline: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CompanyJobsClientProps {
  jobs: Job[]
  applicationCounts: Record<string, number>
  companyId: string
}

export default function CompanyJobsClient({ jobs, applicationCounts, companyId }: CompanyJobsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [jobTypeFilter, setJobTypeFilter] = useState("all")
  const [sortOption, setSortOption] = useState("newest")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // 求人をフィルタリングする関数
  const filteredJobs = jobs.filter((job) => {
    // 検索語でフィルタリング
    const matchesSearch =
      searchTerm === "" ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()))

    // ステータスでフィルタリング
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && job.is_active) ||
      (statusFilter === "inactive" && !job.is_active)

    // 雇用形態でフィルタリング
    const matchesJobType = jobTypeFilter === "all" || job.job_type === jobTypeFilter

    // タブでフィルタリング
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && job.is_active) ||
      (activeTab === "inactive" && !job.is_active) ||
      (activeTab === "deadline" && job.application_deadline && new Date(job.application_deadline) < new Date())

    return matchesSearch && matchesStatus && matchesJobType && matchesTab
  })

  // ソート処理
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortOption) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case "title_asc":
        return a.title.localeCompare(b.title)
      case "title_desc":
        return b.title.localeCompare(a.title)
      case "applications":
        return (applicationCounts[b.id] || 0) - (applicationCounts[a.id] || 0)
      default:
        return 0
    }
  })

  // 求人の公開/非公開を切り替える関数
  const toggleJobStatus = async (jobId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("job_postings")
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", jobId)

      if (error) throw error

      toast({
        title: `求人を${!currentStatus ? "公開" : "非公開"}にしました`,
        description: `求人の公開状態を変更しました`,
      })

      router.refresh()
    } catch (error) {
      console.error("求人ステータス更新エラー:", error)
      toast({
        title: "エラーが発生しました",
        description: "求人の公開状態の更新に失敗しました",
        variant: "destructive",
      })
    }
  }

  // 求人を削除する関数
  const deleteJob = async () => {
    if (!jobToDelete) return

    setIsDeleting(true)

    try {
      // 関連する応募を削除
      await supabase.from("applications").delete().eq("job_id", jobToDelete)

      // 求人を削除
      const { error } = await supabase.from("job_postings").delete().eq("id", jobToDelete)

      if (error) throw error

      toast({
        title: "求人を削除しました",
        description: "求人が正常に削除されました",
      })

      setIsDeleteDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("求人削除エラー:", error)
      toast({
        title: "エラーが発生しました",
        description: "求人の削除に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 日付をフォーマットする関数
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "設定なし"
    return format(new Date(dateString), "yyyy年MM月dd日", { locale: ja })
  }

  // 雇用形態を日本語に変換する関数
  const getJobTypeLabel = (jobType: string | null) => {
    switch (jobType) {
      case "full_time":
        return "正社員"
      case "part_time":
        return "アルバイト・パート"
      case "contract":
        return "契約社員"
      case "internship":
        return "インターンシップ"
      case "other":
        return "その他"
      default:
        return "未設定"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        {/* ヘッダーセクション */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">求人管理</h1>
            <p className="text-muted-foreground">求人の作成、編集、公開状態の管理ができます。</p>
          </div>
          <Link href="/company/jobs/create">
            <Button className="bg-red-600 hover:bg-red-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              新規求人作成
            </Button>
          </Link>
        </div>

        {/* 検索バーとフィルター */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="求人タイトル、説明、勤務地などで検索"
              className="pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="公開状態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての状態</SelectItem>
              <SelectItem value="active">公開中</SelectItem>
              <SelectItem value="inactive">非公開</SelectItem>
            </SelectContent>
          </Select>
          <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="雇用形態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての雇用形態</SelectItem>
              <SelectItem value="full_time">正社員</SelectItem>
              <SelectItem value="part_time">アルバイト・パート</SelectItem>
              <SelectItem value="contract">契約社員</SelectItem>
              <SelectItem value="internship">インターンシップ</SelectItem>
              <SelectItem value="other">その他</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="並び替え" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">新しい順</SelectItem>
              <SelectItem value="oldest">古い順</SelectItem>
              <SelectItem value="title_asc">タイトル (A-Z)</SelectItem>
              <SelectItem value="title_desc">タイトル (Z-A)</SelectItem>
              <SelectItem value="applications">応募数順</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* タブ */}
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="active">公開中</TabsTrigger>
            <TabsTrigger value="inactive">非公開</TabsTrigger>
            <TabsTrigger value="deadline">締切済み</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 求人リスト */}
        {sortedJobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 rounded-full bg-gray-100 p-3">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mb-1 text-lg font-medium">求人が見つかりません</h3>
              <p className="text-center text-sm text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all" || jobTypeFilter !== "all"
                  ? "検索条件に一致する求人はありません。検索条件を変更してみてください。"
                  : "まだ求人がありません。新しい求人を作成してみましょう。"}
              </p>
              {searchTerm || statusFilter !== "all" || jobTypeFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setJobTypeFilter("all")
                  }}
                >
                  フィルターをリセット
                </Button>
              ) : (
                <Link href="/company/jobs/create">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新規求人作成
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedJobs.map((job) => (
              <Card key={job.id} className="overflow-hidden">
                <CardHeader className="p-4 pb-0">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">作成日: {formatDate(job.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.is_active ? "default" : "secondary"}>
                        {job.is_active ? "公開中" : "非公開"}
                      </Badge>
                      {job.application_deadline && new Date(job.application_deadline) < new Date() && (
                        <Badge variant="destructive">締切済み</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4 mr-1" />
                      {getJobTypeLabel(job.job_type)}
                    </div>
                    {job.location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-1" />
                        {job.location}
                      </div>
                    )}
                    {job.application_deadline && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        締切: {formatDate(job.application_deadline)}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      応募数: {applicationCounts[job.id] || 0}
                    </div>
                  </div>
                  <p className="text-sm line-clamp-2">{job.description}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/jobs/${job.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      プレビュー
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/company/jobs/${job.id}/edit`}>
                      <Edit className="h-4 w-4 mr-1" />
                      編集
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleJobStatus(job.id, job.is_active)}>
                    {job.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        非公開にする
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        公開する
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      setJobToDelete(job.id)
                      setIsDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>求人を削除</DialogTitle>
            <DialogDescription>
              この求人を削除してもよろしいですか？この操作は元に戻せません。関連するすべての応募データも削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={deleteJob} disabled={isDeleting}>
              {isDeleting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
