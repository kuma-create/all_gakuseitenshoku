"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  FileText,
  MapPin,
  Briefcase,
  ChevronRight,
  Search,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Application, CompanyApplicationsClientProps } from "@/types/application"

// 応募ステータスの定義
const APPLICATION_STATUS = {
  pending: { label: "審査中", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  document_screening: { label: "書類選考中", color: "bg-blue-100 text-blue-800", icon: FileText },
  interview_adjustment: { label: "面接調整中", color: "bg-purple-100 text-purple-800", icon: Calendar },
  interview_scheduled: { label: "面接予定", color: "bg-indigo-100 text-indigo-800", icon: Calendar },
  interview_completed: { label: "面接完了", color: "bg-cyan-100 text-cyan-800", icon: CheckCircle2 },
  offer: { label: "内定", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  rejected: { label: "不採用", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-800", icon: XCircle },
}

export default function CompanyApplicationsClient({ applications = [] }: CompanyApplicationsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // 応募をフィルタリングする関数
  const filteredApplications = applications.filter((app) => {
    // 検索語でフィルタリング
    const matchesSearch =
      (app.jobs?.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (app.jobs?.companies?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (app.students?.first_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (app.students?.last_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())

    // タブでフィルタリング
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && !["rejected", "cancelled", "offer"].includes(app.status)) ||
      (activeTab === "completed" && ["rejected", "cancelled", "offer"].includes(app.status))

    return matchesSearch && matchesTab
  })

  // 応募ステータスを更新する関数
  const updateApplicationStatus = async (newStatus: string) => {
    if (!selectedApplication) return

    try {
      setIsUpdating(true)

      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", selectedApplication.id)

      if (error) throw error

      toast({
        title: "ステータスを更新しました",
        description: `応募のステータスが「${APPLICATION_STATUS[newStatus as keyof typeof APPLICATION_STATUS]?.label || newStatus}」に更新されました`,
      })

      // 応募リストを更新
      router.refresh()
      setIsDialogOpen(false)
    } catch (error) {
      console.error(error)
      toast({
        title: "エラーが発生しました",
        description: "ステータスの更新に失敗しました。もう一度お試しください。",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // 応募ステータスに応じたバッジを表示する関数
  const StatusBadge = ({ status }: { status: string }) => {
    const statusInfo = APPLICATION_STATUS[status as keyof typeof APPLICATION_STATUS] || {
      label: status,
      color: "bg-gray-100 text-gray-800",
      icon: AlertCircle,
    }
    const Icon = statusInfo.icon

    return (
      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
        <Icon className="mr-1 h-3 w-3" />
        {statusInfo.label}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">応募管理</h1>
        <p className="text-sm text-gray-500">学生からの応募を確認・管理できます</p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="学生名・求人名で検索"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="active">進行中</TabsTrigger>
            <TabsTrigger value="completed">完了</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-gray-100 p-3">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mb-1 text-lg font-medium">応募が見つかりません</h3>
            <p className="text-center text-sm text-gray-500">
              {searchTerm
                ? "検索条件に一致する応募はありません。検索語を変更してみてください。"
                : "まだ応募はありません。"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredApplications.map((application) => (
            <Card key={application.id} className="overflow-hidden">
              <CardHeader className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        src={application.students?.avatar_url || "/placeholder.svg?height=40&width=40&query=student"}
                        alt={`${application.students?.first_name || ""} ${application.students?.last_name || ""}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {application.students?.first_name || ""} {application.students?.last_name || ""}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        応募日: {format(new Date(application.created_at), "yyyy年MM月dd日", { locale: ja })}
                      </CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={application.status} />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <h3 className="mb-3 font-semibold">{application.jobs?.title}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{application.jobs?.location || "場所未設定"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <span>{application.jobs?.job_type || "雇用形態未設定"}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t p-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedApplication(application)
                    setIsDialogOpen(true)
                  }}
                >
                  ステータス変更
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => router.push(`/company/applications/${application.id}`)}
                >
                  詳細を見る
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* ステータス変更ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>応募ステータスの変更</DialogTitle>
            <DialogDescription>この応募の現在のステータスを変更します</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedApplication && (
              <div className="rounded-md border p-4">
                <div className="mb-2 font-medium">{selectedApplication.jobs?.title}</div>
                <div className="text-sm text-gray-500">
                  応募者: {selectedApplication.students?.first_name} {selectedApplication.students?.last_name}
                </div>
                <div className="mt-2">
                  <StatusBadge status={selectedApplication.status} />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(APPLICATION_STATUS).map(([status, info]) => (
              <Button
                key={status}
                variant="outline"
                className={`justify-start ${selectedApplication?.status === status ? "border-2 border-primary" : ""}`}
                onClick={() => updateApplicationStatus(status)}
                disabled={isUpdating}
              >
                <info.icon className={`mr-2 h-4 w-4 ${info.color.replace("bg-", "text-").replace("-100", "-600")}`} />
                {info.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
