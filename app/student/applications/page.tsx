"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
import { LazyImage } from "@/components/ui/lazy-image"
import Link from "next/link"
import {
  ArrowUpDown,
  Building,
  Calendar,
  Clock,
  MapPin,
  Search,
  Briefcase,
  Filter,
  MessageCircle,
  ExternalLink,
  ChevronDown,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"


type Application = {
  id: string;  // uuid
  companyName: string;
  companyLogo: string | null;
  jobTitle: string;
  jobId: string;  // uuid
  appliedDate: string;
  status: "未対応" | "書類選考中" | "選考中" | "書類通過" | "最終選考" | "内定" | "不通過";
  category: "イベント" | "本選考" | "インターン" | null;
  location: string | null;
  workStyle: string | null;
  nextStep?: string | null;
  hasUnreadMessages: boolean;
  messageCount: number;
};


// ステータスに応じた色を返す関数
const getStatusColor = (status: string) => {
  switch (status) {
    case "未対応":
    case "選考中":
    case "書類選考中":
      return "bg-blue-100 text-blue-800";
    case "書類通過":
      return "bg-emerald-100 text-emerald-800";
    case "最終選考":
      return "bg-purple-100 text-purple-800";
    case "内定":
      return "bg-green-100 text-green-800";
    case "不通過":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case "イベント":
      return "bg-yellow-100 text-yellow-800";
    case "インターン":
      return "bg-indigo-100 text-indigo-800";
    case "本選考":
      return "bg-teal-100 text-teal-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // ---------- fetch helper ----------
  const fetchApplications = async (userId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("student_applications_view")
      .select("*")
      .eq("student_id", userId)
      .order("applied_date", { ascending: false });

    if (error) {
      console.error("applications fetch error", error);
      setApplications([]);
    } else {
      const normalised: Application[] = (data || []).map((row: any) => ({
        id: row.id ?? "",
        companyName: row.company_name ?? "",
        companyLogo: row.company_logo,
        jobTitle: row.title ?? "",
        jobId: row.job_id ?? "",
        appliedDate: row.applied_date ?? "",
        status: (row.status ?? "未対応") as Application["status"],
        category: (row.category ?? row.job_type ?? null) as Application["category"],
        location: row.location,
        workStyle: row.work_style,
        nextStep: null, // 列が無いので固定
        hasUnreadMessages: row.has_unread_messages ?? false,
        messageCount: row.unread_count ?? 0,
      }));
      setApplications(normalised);
    }
    setLoading(false);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const userId = (session as Session).user.id;

      // initial fetch
      await fetchApplications(userId);

      // --- realtime listener ---
      channel = supabase
        .channel("student_applications_realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "applications",
            filter: `student_id=eq.${userId}`,
          },
          () => {
            // Re‑fetch list when a new application row is inserted
            fetchApplications(userId);
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // 検索とフィルタリング
  const filteredApplications = applications
    .filter((app) => {
      // 検索クエリでフィルタリング
      const matchesQuery =
        searchQuery === "" ||
        app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())

      // ステータスでフィルタリング
      const matchesStatus = statusFilter === "all" || app.status === statusFilter

      // 時期でフィルタリング (簡易的な実装)
      let matchesTime = true
      if (timeFilter === "1month") {
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
        const appDate = new Date(app.appliedDate.replace(/年|月|日/g, ""))
        matchesTime = appDate >= oneMonthAgo
      }

      return matchesQuery && matchesStatus && matchesTime
    })
    .sort((a, b) => {
      // 日付でソート（簡易的な実装）
      const dateA = new Date(a.appliedDate.replace(/年|月|日/g, ""))
      const dateB = new Date(b.appliedDate.replace(/年|月|日/g, ""))
      return sortOrder === "newest" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
    })

  // ステータスの種類を抽出
  const statusOptions = ["all", ...new Set(applications.map((app) => app.status))];

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">応募履歴</h1>
        <p className="mt-1 text-sm text-gray-500 md:text-base">過去に応募した求人一覧です</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="企業名・求人名で検索"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  フィルター
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">ステータス</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions
                        .filter((status) => status !== "all")
                        .map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${status}`}
                              checked={statusFilter === status}
                              onCheckedChange={() => setStatusFilter(statusFilter === status ? "all" : status)}
                            />
                            <label
                              htmlFor={`status-${status}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {status}
                            </label>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">期間</h4>
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="期間を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべての期間</SelectItem>
                        <SelectItem value="1month">過去1ヶ月</SelectItem>
                        <SelectItem value="3months">過去3ヶ月</SelectItem>
                        <SelectItem value="6months">過去6ヶ月</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusFilter("all")
                        setTimeFilter("all")
                      }}
                    >
                      リセット
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      適用する
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              className="h-10 w-10"
              title={sortOrder === "newest" ? "古い順に並べ替え" : "新しい順に並べ替え"}
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="sr-only">並べ替え</span>
            </Button>
          </div>
        </div>

        
      </div>

      {loading && (
        <div className="py-10 text-center text-sm text-gray-500">読み込み中…</div>
      )}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="active">選考中</TabsTrigger>
          <TabsTrigger value="completed">完了</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          {filteredApplications.length > 0 ? (
            <div className="grid gap-4 md:gap-6">
              {filteredApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-0">
          {filteredApplications.filter((app) => !["内定", "不通過"].includes(app.status)).length > 0 ? (
            <div className="grid gap-4 md:gap-6">
              {filteredApplications
                .filter((app) => !["内定", "不通過"].includes(app.status))
                .map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))}
            </div>
          ) : (
            <EmptyState message="選考中の応募はありません" />
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          {filteredApplications.filter((app) => ["内定", "不通過"].includes(app.status)).length > 0 ? (
            <div className="grid gap-4 md:gap-6">
              {filteredApplications
                .filter((app) => ["内定", "不通過"].includes(app.status))
                .map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))}
            </div>
          ) : (
            <EmptyState message="完了した応募はありません" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 応募カードコンポーネント
function ApplicationCard({ application }: { application: any }) {
  const displayStatus = application.status === "未対応" ? "選考中" : application.status;
  // 応募日を「YYYY年MM月DD日」形式で日本時間表示
  const formattedDate = (() => {
    const d = new Date(application.appliedDate);
    if (isNaN(d.getTime())) return application.appliedDate; // 取得失敗時はそのまま表示
    const [y, m, dd] = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Tokyo",
    })
      .format(d)
      .split("/");
    return `${y}年${m}月${dd}日`;
  })();
  return (
    <Card className="overflow-hidden border border-gray-200 transition-all duration-200 hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        <div className="flex items-center gap-4 border-b bg-gray-50 p-4 sm:w-64 sm:flex-col sm:items-start sm:border-b-0 sm:border-r">
          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-white sm:h-16 sm:w-16">
            <LazyImage
              src={application.companyLogo || "/placeholder.svg"}
              alt={`${application.companyName}のロゴ`}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 sm:w-full">
            <h3 className="font-medium text-gray-900 line-clamp-1">{application.companyName}</h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={12} />
              <span>{application.location}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <Building size={12} />
              <span>{application.workStyle}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link href={`/jobs/${application.jobId}`} className="group">
                <h4 className="text-lg font-bold text-gray-900 group-hover:text-red-600 group-hover:underline">
                  {application.jobTitle}
                </h4>
                {application.category && (
                  <Badge className={`${getCategoryColor(application.category)} ml-2`}>{application.category}</Badge>
                )}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar size={14} className="text-gray-400" />
                  <span>応募日: {formattedDate}</span>
                </div>
              </div>
            </div>

            <Badge className={getStatusColor(displayStatus)}>{displayStatus}</Badge>
          </div>

          {application.nextStep && (
            <div className="mb-4 rounded-md bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock size={16} className="text-gray-500" />
                <span>次のステップ:</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{application.nextStep}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {application.hasUnreadMessages && (
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600">
                <MessageCircle size={14} className="mr-1" />
                未読メッセージ {application.messageCount}件
              </Badge>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href={`/jobs/${application.jobId}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <ExternalLink size={14} />
                  求人を見る
                </Button>
              </Link>
              <Link href={`/chat/${application.id}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <MessageCircle size={14} />
                  チャット
                </Button>
              </Link>
              <Link href={`/jobs/${application.jobId}`}>
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  詳細を見る
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// 空の状態コンポーネント
function EmptyState({ message = "まだ応募履歴がありません" }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 py-12 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-3">
        <Briefcase className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-900">{message}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">
        新しい求人に応募して、あなたのキャリアをスタートさせましょう。
      </p>
      <Link href="/jobs">
        <Button className="bg-red-600 hover:bg-red-700">求人を探す</Button>
      </Link>
    </div>
  )
}
