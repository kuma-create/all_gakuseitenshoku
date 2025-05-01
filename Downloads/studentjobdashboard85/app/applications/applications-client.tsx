"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Search, CheckCircle, XCircle, Clock, Calendar, MapPin, Briefcase, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

// 応募ステータスの定義
const APPLICATION_STATUS = {
  pending: { label: "審査中", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  interview: { label: "面接調整中", color: "bg-blue-100 text-blue-800", icon: Calendar },
  accepted: { label: "内定", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "不採用", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "キャンセル", color: "bg-gray-100 text-gray-800", icon: XCircle },
}

type Application = {
  id: string
  status: string
  created_at: string
  job_id: string
  job_postings: {
    id: string
    title: string
    location: string | null
    job_type: string | null
    company_id: string
    companies: {
      id: string
      name: string
      logo_url: string | null
    } | null
  } | null
}

interface ApplicationsClientProps {
  applications: Application[]
}

export default function ApplicationsClient({ applications }: ApplicationsClientProps) {
  const { toast } = useToast()
  const supabase = createClient()

  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // 応募をフィルタリングする関数
  const filteredApplications = applications.filter((app) => {
    // 検索語でフィルタリング
    const matchesSearch =
      app.job_postings?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_postings?.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_postings?.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false

    // タブでフィルタリング
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && !["rejected", "cancelled", "accepted"].includes(app.status)) ||
      (activeTab === "completed" && ["rejected", "cancelled", "accepted"].includes(app.status))

    return matchesSearch && matchesTab
  })

  // 応募をキャンセルする関数
  const cancelApplication = async () => {
    if (!selectedApplication) return

    try {
      setIsCancelling(true)

      const { error } = await supabase
        .from("applications")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedApplication.id)

      if (error) throw error

      toast({
        title: "応募をキャンセルしました",
        description: "応募が正常にキャンセルされました",
      })

      // 応募リストを更新（ページをリロード）
      window.location.reload()
    } catch (error) {
      console.error(error)
      toast({
        title: "エラーが発生しました",
        description: "応募のキャンセルに失敗しました。もう一度お試しください。",
        variant: "destructive",
      })
    } finally {
      setIsCancelling(false)
      setIsDialogOpen(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">応募履歴</h1>
        <p className="text-muted-foreground">あなたの応募状況を確認できます</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="企業名・求人名で検索"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="active">進行中</TabsTrigger>
            <TabsTrigger value="completed">完了</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredApplications.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="mb-2 text-lg font-medium">応募が見つかりません</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {searchTerm
              ? "検索条件に一致する応募はありません。検索語を変更してみてください。"
              : "まだ応募履歴がありません。求人に応募してみましょう。"}
          </p>
          {!searchTerm && (
            <Link href="/jobs">
              <Button className="bg-red-600 hover:bg-red-700">求人を探す</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredApplications.map((application) => {
            const statusInfo = APPLICATION_STATUS[application.status as keyof typeof APPLICATION_STATUS] || {
              label: application.status,
              color: "bg-gray-100 text-gray-800",
              icon: Clock,
            }
            const StatusIcon = statusInfo.icon

            return (
              <Card key={application.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md">
                        {application.job_postings?.companies?.logo_url ? (
                          <Image
                            src={application.job_postings.companies.logo_url || "/placeholder.svg"}
                            alt={application.job_postings.companies.name || "企業ロゴ"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-lg font-bold">
                            {application.job_postings?.companies?.name?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {application.job_postings?.companies?.name || "企業名不明"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">応募日: {formatDate(application.created_at)}</p>
                      </div>
                    </div>
                    <Badge className={statusInfo.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pb-2">
                  <h3 className="mb-3 font-semibold">{application.job_postings?.title || "求人タイトル不明"}</h3>
                  <div className="space-y-2 text-sm">
                    {application.job_postings?.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{application.job_postings.location}</span>
                      </div>
                    )}
                    {application.job_postings?.job_type && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{application.job_postings.job_type}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedApplication(application)
                      setIsDialogOpen(true)
                    }}
                    disabled={["cancelled", "rejected"].includes(application.status)}
                  >
                    {application.status === "cancelled"
                      ? "キャンセル済み"
                      : application.status === "rejected"
                        ? "不採用"
                        : "キャンセル"}
                  </Button>
                  <Link href={`/applications/${application.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      詳細を見る
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* 応募キャンセル確認ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>応募をキャンセルしますか？</DialogTitle>
            <DialogDescription>この操作は取り消せません。本当に応募をキャンセルしますか？</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedApplication && (
              <div className="rounded-md border p-4">
                <div className="mb-2 font-medium">{selectedApplication.job_postings?.title || "求人タイトル不明"}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedApplication.job_postings?.companies?.name || "企業名不明"}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={cancelApplication} disabled={isCancelling}>
              {isCancelling ? "処理中..." : "応募をキャンセルする"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
