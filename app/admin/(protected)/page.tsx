/* --------------------------------------------------------------------------
   app/admin/page.tsx  –  管理者ダッシュボード  _fixed_
--------------------------------------------------------------------------- */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/lib/hooks/use-toast";
import AddCompanyDialog from "@/components/admin/AddCompanyDialog";
import {
  Users,
  Building2,
  Briefcase,
  Bell,
  BarChart3,
  CalendarDays,
  PlusCircle,
  RefreshCcw,
  Settings,
  UserCog,
  ChevronDown,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Trash2,
  UserPlus,
  FileText,
} from "lucide-react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Input,
  Label,
  Pagination,
  PaginationPrevious,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  Switch,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import type { DateRange as DayPickerRange } from "react-day-picker";


/* ---------- 型定義 ---------- */

type Overview = {
  students: number;
  companies: number;
  applications: number;
  scouts: number;
};

// RPC で返ってくる 1 行分
type OverviewRow = {
  students: number;
  companies: number;
  applications: number;
  scouts: number;
};

type Student = {
  id: string;
  full_name: string;
  university: string;
  created_at: string;
  status: string;
};

type Company = {
  id: string;
  name: string 
  created_at: string;
  status: string;
  jobs_count: number;
};

type Job = {
  id: string;
  title: string;
  published_until: string | null;
};

type Application = {
  id: string;
  status: string | null;
  created_at: string | null;
  student_profiles: { full_name: string }[] | null;
  jobs: {
    title: string;
    companies: { name: string }[] | null;
  }[] | null;
};

type Feature = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

type Event = {
  id: string;
  title: string;
  event_date: string;   // ISO date
  status: string;
  updated_at: string;
};

type ActivityLog = {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  ip_address: string;
};


type Notification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  notification_type: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
};

/* ---------- 共通ユーティリティ ---------- */
/**
 * Realtime で受け取った payload を既存リストにマージする関数
 */
function mergeRows<T extends { id: string }>(
  prev: T[],
  payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: T | null;
    old: T | null;
  }
): T[] {
  switch (payload.eventType) {
    case "INSERT":
      return payload.new ? [payload.new, ...prev] : prev;

    case "UPDATE":
      return payload.new
        ? prev.map((r) => (r.id === payload.new!.id ? payload.new! : r))
        : prev;

    case "DELETE":
      return payload.old
        ? prev.filter((r) => r.id !== payload.old!.id)
        : prev;

    default:
      return prev;
  }
}

export default function AdminDashboard() {
  /* ---------- state ---------- */
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<Overview>({
    students: 0,
    companies: 0,
    applications: 0,
    scouts: 0,
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<Application[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  /* ---------- 特集追加用 ---------- */
  const [newFeatureTitle, setNewFeatureTitle] = useState("");
  const [newFeatureStatus, setNewFeatureStatus] = useState<"公開" | "下書き">("下書き");

  const [studentPage, setStudentPage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const [jobPage, setJobPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [featurePage, setFeaturePage] = useState(1);
  const [eventPage, setEventPage] = useState(1);

  const [dateRange, setDateRange] = useState<DayPickerRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [modalState, setModalState] = useState<{
    type: string;
    id: string | null;
  }>({
    type: "",
    id: null,
  });

  /* ---------- toast ---------- */
  const { toast } = useToast();

    /* ---------- 会社詳細 / 編集用 ---------- */
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editCompanyStatus, setEditCompanyStatus] = useState<
    "承認済み" | "承認待ち" | "停止"
  >("承認待ち");

  /* ---------- 会社削除 ---------- */
  async function deleteCompany(companyId: string) {
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabase.from("companies").delete().eq("id", companyId);
    if (error) {
      toast({ description: `削除失敗: ${error.message}`, variant: "destructive" });
    } else {
      toast({ description: "削除しました" });
      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    }
  }

  /* ---------- DB 操作用 ---------- */
  async function updateCompanyStatus(
    companyId: string,
    newStatus: "承認済み" | "承認待ち" | "停止"
  ) {
    const { error } = await supabase
      .from("companies")
      .update({ status: newStatus })
      .eq("id", companyId);

    if (error) {
      toast({
        description: `ステータス更新に失敗しました: ${error.message}`,
        variant: "destructive",
      });
    } else {
      toast({ description: "ステータスを更新しました" });
      // 変更後は realtime で UI に反映される
    }
  }
  /* ---------- fetchData ---------- */
  const fetchData = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      try {
        // --- 概要カウントを RPC で一括取得 -----------------------
        const { data: ov, error: ovErr } = await supabase
          .rpc("dashboard_overview")
          .returns<OverviewRow[]>();
        if (ovErr) throw ovErr;
        const first = ov?.[0];
        setOverview(
          first ?? { students: 0, companies: 0, applications: 0, scouts: 0 }
        );

        // 学生一覧
        const { data: st } = await supabase
          .from("student_profiles")
          .select("id,full_name,university,created_at,status")
          .order("created_at", { ascending: false })
          .range((studentPage - 1) * 5, studentPage * 5 - 1);
        setStudents((st ?? []) as Student[]);

        // 企業一覧
        type RawCompany = {
          id: string;
          name: string | null
          created_at: string | null;
          status: string | null;
          jobs: { count: number | null }[] | null;
        };
        const { data: coData, error: coErr } = await supabase
          .from("companies")
          .select(
            `
            id,
            name,
            created_at,
            status,
            jobs!jobs_company_id_fkey(count)
          `
          )
          .order("created_at", { ascending: false })
          .range((companyPage - 1) * 5, companyPage * 5 - 1);
        if (coErr) throw coErr;
        const rawCompanies = (coData ?? []) as RawCompany[];
        setCompanies(
          rawCompanies.map((c) => ({
            id: c.id,
            name: c.name ?? "—",
            created_at: c.created_at ?? "",
            status: c.status ?? "",
            jobs_count: c.jobs?.[0]?.count ?? 0,
          }))
        );

        // 求人一覧
        const { data: jbData, error: jbErr } = await supabase
          .from("jobs")
          .select("id,title,published_until")
          .order("created_at", { ascending: false })
          .range((jobPage - 1) * 5, jobPage * 5 - 1);
        if (jbErr) {
          console.error("jobs fetch error:", jbErr);
          setJobs([]);
        } else {
          setJobs((jbData ?? []) as Job[]);
        }

        // 特集記事一覧
        const { data: ftData, error: ftErr } = await supabase
          .from("features")
          .select("id,title,status,created_at")
          .order("created_at", { ascending: false })
          .range((featurePage - 1) * 5, featurePage * 5 - 1);

        if (ftErr) {
          console.error("features fetch error:", ftErr);
          setFeatures([]);
        } else {
          setFeatures((ftData ?? []) as Feature[]);
        }

        // --- イベント一覧 ---------------------------
        const { data: evData, error: evErr } = await supabase
          .from("events")
          .select("id,title,event_date,status,updated_at")
          .order("updated_at", { ascending: false })
          .range((eventPage - 1) * 5, eventPage * 5 - 1);

        if (evErr) {
          console.error("events fetch error:", evErr);
          setEvents([]);
        } else {
          setEvents((evData ?? []) as Event[]);
        }

        // 申請一覧
        const { data: appsData, error: appsErr } = await supabase
          .from("applications")
          .select(
            `
            id,
            status,
            created_at,
            student_profiles!applications_student_id_fkey(full_name),
            jobs!applications_job_id_fkey(
              title,
              companies!jobs_company_id_fkey(name)
            )
          `
          )
          .order("created_at", { ascending: false })
          .range((requestPage - 1) * 5, requestPage * 5 - 1);
        if (appsErr) {
          console.error("applications fetch error:", appsErr);
          setRequests([]);
        } else {
          setRequests((appsData ?? []) as Application[]);
        }

        // 活動ログ
        const { data: lgData, error: lgErr } = await supabase
          .from("activity_logs")
          .select("id,timestamp,actor,role,action,target,ip_address")
          .gte("timestamp", dateRange.from!.toISOString())
          .lte("timestamp", dateRange.to!.toISOString())
          .order("timestamp", { ascending: false })
          .range((activityPage - 1) * 5, activityPage * 5 - 1)
        
        if (lgErr) {
          console.error("logs fetch error:", lgErr);
          setLogs([]);
        } else {
          setLogs((lgData ?? []) as ActivityLog[]);
        }

        // 通知一覧
        const {
          data: notificationsData,
          error: notificationsErr,
        } = await supabase
          .from("notifications")
          .select(
            `
            id,
            user_id,
            title,
            message,
            notification_type,
            related_id,
            is_read,
            created_at
          `
          )
          .order("created_at", { ascending: false })
          .range((activityPage - 1) * 5, activityPage * 5 - 1);
        if (notificationsErr) {
          console.error(
            "notifications fetch error:",
            notificationsErr
          );
          setNotifications([]);
        } else {
          setNotifications(
            (notificationsData ?? []) as Notification[]
          );
        }
      } catch (err: any) {
        console.error(err);
        setError(
          err.message ?? "データ取得中にエラーが発生しました"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      studentPage,
      companyPage,
      jobPage,
      requestPage,
      activityPage,
      dateRange,
      featurePage,
      eventPage,
    ]
  );


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- realtime (companies だけ) ---------- */
  useEffect(() => {
    const ch = supabase
      .channel("admin_companies")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "companies" },
        (payload) => {
          setCompanies((prev) => mergeRows(prev, payload as any));

          // 概要カウントを同期 (INSERT +1, DELETE -1)
          setOverview((o) => ({
            ...o,
            companies:
              o.companies +
              (payload.eventType === "INSERT"
                ? 1
                : payload.eventType === "DELETE"
                ? -1
                : 0),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // フィルタ済みログ
  const filteredLogs = logs.filter((l) => {
    if (roleFilter !== "all" && l.role !== roleFilter) return false;
    if (actionFilter !== "all" && l.action !== actionFilter)
      return false;
    if (
      searchQuery &&
      ![l.actor, l.target, l.action].some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
      return false;
    return true;
  });

  const openModal = async (type: string, id: string) => {
    setModalState({ type, id });
  
    if (type === "view-company" || type === "edit-company") {
      const { data } = await supabase
        .from("companies")
        .select("id,name,created_at,status")
        .eq("id", id)
        .single();
      if (data) {
        setSelectedCompany(data as Company);
        setEditCompanyName(data.name ?? "");
        setEditCompanyStatus((data.status as any) ?? "承認待ち");
      }
    }
  };

  const closeModal = () =>
    setModalState({ type: "", id: null });

  if (loading)
    return (
      <div className="p-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={fetchData}>再読み込み</Button>
      </Alert>
    );

  const { from, to } = dateRange;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        管理者ダッシュボード
      </h1>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 /> 概要
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users /> 学生
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building2 /> 企業
          </TabsTrigger>
          <TabsTrigger value="jobs">
            <Briefcase /> 求人
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Bell /> 申請
          </TabsTrigger>
          <TabsTrigger value="features">
            <FileText /> 特集
          </TabsTrigger>
          <TabsTrigger value="events">
            <CalendarDays /> イベント
          </TabsTrigger>
          <TabsTrigger value="activity">
            <RefreshCcw /> ログ
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell /> 通知
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings /> 設定
          </TabsTrigger>
          <TabsTrigger value="admins">
            <UserCog /> 管理者
          </TabsTrigger>
        </TabsList>
        {/* --- 特集 --- */}
        <TabsContent value="features">
          <div className="flex justify-end mb-2">
            <Button onClick={() => openModal("add-feature", "")}>
              <FileText className="mr-2 h-4 w-4" />
              記事を追加
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>登録日</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.id}</TableCell>
                  <TableCell>{f.title}</TableCell>
                  <TableCell><Badge>{f.status}</Badge></TableCell>
                  <TableCell>{format(new Date(f.created_at), "yyyy/MM/dd")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openModal("view-feature", f.id)}>
                          <Eye /> 詳細
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openModal("edit-feature", f.id)}>
                          <Edit /> 編集
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => openModal("delete-feature", f.id)}
                        >
                          <Trash2 /> 削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination className="my-2">
            <PaginationPrevious onClick={() => setFeaturePage((p)=> Math.max(1, p-1))} />
            <PaginationItem><PaginationLink isActive>{featurePage}</PaginationLink></PaginationItem>
            <PaginationNext onClick={() => setFeaturePage((p)=> p+1)} />
          </Pagination>
        </TabsContent>

        {/* --- イベント --- */}
        <TabsContent value="events">
          <div className="flex justify-end mb-2">
            <Button onClick={() => openModal("add-event", "")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              イベントを追加
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>開催日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.id}</TableCell>
                  <TableCell>{e.title}</TableCell>
                  <TableCell>
                    {format(new Date(e.event_date), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    <Badge>{e.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openModal("view-event", e.id)}>
                          <Eye /> 詳細
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openModal("edit-event", e.id)}>
                          <Edit /> 編集
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openModal("delete-event", e.id)}
                          className="text-red-500"
                        >
                          <Trash2 /> 削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination className="my-2">
            <PaginationPrevious onClick={() => setEventPage((p) => Math.max(1, p - 1))} />
            <PaginationItem>
              <PaginationLink isActive>{eventPage}</PaginationLink>
            </PaginationItem>
            <PaginationNext onClick={() => setEventPage((p) => p + 1)} />
          </Pagination>
        </TabsContent>

        {/* --- 概要 --- */}
        <TabsContent value="overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
            {Object.entries(overview).map(([k, v]) => (
              <Card key={k}>
                <CardHeader>
                  <CardTitle className="capitalize">
                    {k}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xl font-bold">
                  {v}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* --- 学生 --- */}
        <TabsContent value="students">
          <div className="flex justify-end mb-2">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              学生を追加
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>大学</TableHead>
                <TableHead>登録日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.id}</TableCell>
                  <TableCell>{s.full_name}</TableCell>
                  <TableCell>{s.university}</TableCell>
                  <TableCell>
                    {format(
                      new Date(s.created_at),
                      "yyyy/MM/dd"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge>{s.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          操作
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "view-student",
                              s.id
                            )
                          }
                        >
                          <Eye /> 詳細
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "edit-student",
                              s.id
                            )
                          }
                        >
                          <Edit /> 編集
                        </DropdownMenuItem>
                        {s.status === "アクティブ" ? (
                          <DropdownMenuItem
                            onClick={() =>
                              openModal(
                                "freeze-student",
                                s.id
                              )
                            }
                          >
                            <Ban /> 凍結
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              openModal(
                                "activate-student",
                                s.id
                              )
                            }
                          >
                            <CheckCircle /> アクティブ化
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "delete-student",
                              s.id
                            )
                          }
                          className="text-red-500"
                        >
                          <Trash2 /> 削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination className="my-2">
            <PaginationPrevious
              onClick={() =>
                setStudentPage((p) =>
                  Math.max(1, p - 1)
                )
              }
            />
            <PaginationItem>
              <PaginationLink isActive>
                {studentPage}
              </PaginationLink>
            </PaginationItem>
            <PaginationNext
              onClick={() =>
                setStudentPage((p) => p + 1)
              }
            />
          </Pagination>
        </TabsContent>

        {/* --- 企業 --- */}
        <TabsContent value="companies">
          <div className="flex justify-end mb-2">
            <AddCompanyDialog onAdded={fetchData} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>企業名</TableHead>
                <TableHead>求人件数</TableHead>
                <TableHead>登録日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell>
                  {c.name ?? c.name ?? "—"}
                  </TableCell>
                  <TableCell>{c.jobs_count}</TableCell>
                  <TableCell>
                    {format(
                      new Date(c.created_at),
                      "yyyy/MM/dd"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge>{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          操作
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "view-company",
                              c.id
                            )
                          }
                        >
                          <Eye /> 詳細
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "edit-company",
                              c.id
                            )
                          }
                        >
                          <Edit /> 編集
                        </DropdownMenuItem>
                        {c.status === "承認済み" ? (
                          <DropdownMenuItem
                            onClick={() => updateCompanyStatus(c.id, "停止")}
                          >
                            <Ban /> 停止
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => updateCompanyStatus(c.id, "承認済み")}
                          >
                            <CheckCircle /> 承認
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteCompany(c.id)}
                          className="text-red-500"
                        >
                          <Trash2 /> 削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination className="my-2">
            <PaginationPrevious
              onClick={() =>
                setCompanyPage((p) =>
                  Math.max(1, p - 1)
                )
              }
            />
            <PaginationItem>
              <PaginationLink isActive>
                {companyPage}
              </PaginationLink>
            </PaginationItem>
            <PaginationNext
              onClick={() =>
                setCompanyPage((p) => p + 1)
              }
            />
          </Pagination>
        </TabsContent>

        {/* --- 求人 --- */}
        <TabsContent value="jobs">
          <div className="flex justify-end mb-2">
            <Button>
              <Briefcase className="mr-2 h-4 w-4" />
              求人を追加
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>公開期限</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell>{j.id}</TableCell>
                  <TableCell>{j.title}</TableCell>
                  <TableCell>
                    {j.published_until
                      ? format(
                          new Date(j.published_until),
                          "yyyy/MM/dd"
                        )
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          操作
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "view-job",
                              j.id
                            )
                          }
                        >
                          <Eye /> 詳細
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "edit-job",
                              j.id
                            )
                          }
                        >
                          <Edit /> 編集
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "delete-job",
                              j.id
                            )
                          }
                          className="text-red-500"
                        >
                          <Trash2 /> 削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination className="my-2">
            <PaginationPrevious
              onClick={() =>
                setJobPage((p) =>
                  Math.max(1, p - 1)
                )
              }
            />
            <PaginationItem>
              <PaginationLink isActive>
                {jobPage}
              </PaginationLink>
            </PaginationItem>
            <PaginationNext
              onClick={() =>
                setJobPage((p) => p + 1)
              }
            />
          </Pagination>
        </TabsContent>

        {/* --- 申請 --- */}
        <TabsContent value="requests">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>求人</TableHead>
                <TableHead>企業</TableHead>
                <TableHead>日付</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>
                    {r.jobs?.[0]?.title ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.jobs?.[0]?.companies?.[0]
                      ?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.created_at
                      ? format(
                          new Date(r.created_at),
                          "yyyy/MM/dd"
                        )
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge>{r.status ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <ChevronDown />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          操作
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "view-request",
                              r.id
                            )
                          }
                        >
                          <Eye /> 詳細
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "toggle-request",
                              r.id
                            )
                          }
                        >
                          {r.status === "未対応" ? (
                            <CheckCircle />
                          ) : (
                            <XCircle />
                          )}{" "}
                          {r.status === "未対応"
                            ? "対応済みに"
                            : "未対応に戻す"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination className="my-2">
            <PaginationPrevious
              onClick={() =>
                setRequestPage((p) =>
                  Math.max(1, p - 1)
                )
              }
            />
            <PaginationItem>
              <PaginationLink isActive>
                {requestPage}
              </PaginationLink>
            </PaginationItem>
            <PaginationNext
              onClick={() =>
                setRequestPage((p) => p + 1)
              }
            />
          </Pagination>
        </TabsContent>

        {/* --- 活動ログ --- */}
        <TabsContent value="activity">
          <div className="mb-4 p-4 rounded-md bg-gray-50">
            <div className="flex items-center justify-between">
              <Label>フィルター</Label>
              <Button variant="ghost" onClick={fetchData}>
                更新
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-left font-normal"
                  >
                    {from && to
                      ? `${format(from, "yyyy/MM/dd")} - ${format(
                          to,
                          "yyyy/MM/dd"
                        )}`
                      : "日付を選択"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="center"
                  side="bottom"
                >
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    required
                    onSelect={setDateRange}
                  />
                </PopoverContent>
              </Popover>
              <Select
                value={roleFilter}
                onValueChange={setRoleFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectContent>
                    <SelectItem value="all">
                      すべてのロール
                    </SelectItem>
                    <SelectItem value="student">
                      学生
                    </SelectItem>
                    <SelectItem value="company">
                      企業
                    </SelectItem>
                    <SelectItem value="admin">
                      管理者
                    </SelectItem>
                  </SelectContent>
                </SelectTrigger>
              </Select>
              <Select
                value={actionFilter}
                onValueChange={setActionFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectContent>
                    <SelectItem value="all">
                      すべてのアクション
                    </SelectItem>
                    <SelectItem value="account">
                      アカウント
                    </SelectItem>
                    <SelectItem value="job">
                      求人
                    </SelectItem>
                    <SelectItem value="application">
                      応募
                    </SelectItem>
                    <SelectItem value="admin">
                      管理者
                    </SelectItem>
                  </SelectContent>
                </SelectTrigger>
              </Select>
            </div>
          </div>
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="mb-4"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>タイムスタンプ</TableHead>
                <TableHead>アクター</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>アクション</TableHead>
                <TableHead>ターゲット</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    {format(
                      new Date(l.timestamp),
                      "yyyy/MM/dd HH:mm"
                    )}
                  </TableCell>
                  <TableCell>{l.actor}</TableCell>
                  <TableCell>{l.role}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell>{l.target}</TableCell>
                  <TableCell>{l.ip_address}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination className="my-2">
            <PaginationPrevious
              onClick={() =>
                setActivityPage((p) =>
                  Math.max(1, p - 1)
                )
              }
            />
            <PaginationItem>
              <PaginationLink isActive>
                {activityPage}
              </PaginationLink>
            </PaginationItem>
            <PaginationNext
              onClick={() =>
                setActivityPage((p) => p + 1)
              }
            />
          </Pagination>
        </TabsContent>

        {/* --- 通知 --- */}
        <TabsContent value="notifications">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>メッセージ</TableHead>
                <TableHead>タイプ</TableHead>
                <TableHead>関連ID</TableHead>
                <TableHead>既読</TableHead>
                <TableHead>作成日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>{n.id}</TableCell>
                  <TableCell>{n.title}</TableCell>
                  <TableCell>{n.message}</TableCell>
                  <TableCell>
                    {n.notification_type}
                  </TableCell>
                  <TableCell>
                    {n.related_id ?? "-"}
                  </TableCell>
                  <TableCell>
                    {n.is_read ? "✓" : ""}
                  </TableCell>
                  <TableCell>
                    {format(
                      new Date(n.created_at),
                      "yyyy/MM/dd HH:mm"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* --- 設定 --- */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* Switch や Input をここに配置 */}
            </CardContent>
            <CardFooter>
              <Button>保存</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- 管理者 --- */}
        <TabsContent value="admins">
          <Button className="mb-4">
            <UserPlus /> 管理者を追加
          </Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メール</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>最終ログイン</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{/* 管理者リスト */}</TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* ----- 会社詳細 ----- */}
<Dialog open={modalState.type === "view-company"} onOpenChange={closeModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>会社詳細</DialogTitle>
    </DialogHeader>
    {selectedCompany ? (
      <div className="space-y-1">
        <p><b>ID:</b> {selectedCompany.id}</p>
        <p><b>企業名:</b> {selectedCompany.name}</p>
        <p><b>登録日:</b> {format(new Date(selectedCompany.created_at),"yyyy/MM/dd")}</p>
        <p><b>ステータス:</b> {selectedCompany.status}</p>
      </div>
    ) : (
      <Skeleton className="h-24 w-full" />
    )}
    <DialogFooter>
      <Button onClick={closeModal}>閉じる</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* ----- 会社編集 ----- */}
      <Dialog open={modalState.type === "edit-company"} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>会社編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>企業名</Label>
              <Input value={editCompanyName} onChange={(e)=>setEditCompanyName(e.target.value)} />
            </div>
            <div>
              <Label>ステータス</Label>
              <Select value={editCompanyStatus} onValueChange={(v)=>setEditCompanyStatus(v as any)}>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem value="承認待ち">承認待ち</SelectItem>
                  <SelectItem value="承認済み">承認済み</SelectItem>
                  <SelectItem value="停止">停止</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={closeModal}>キャンセル</Button>
            <Button
              onClick={async ()=>{
                if(!selectedCompany) return;
                const { error } = await supabase
                  .from("companies")
                  .update({ name: editCompanyName, status: editCompanyStatus })
                  .eq("id", selectedCompany.id);
                if(error){
                  toast({ description:`更新失敗: ${error.message}`, variant:"destructive"});
                }else{
                  toast({ description:"更新しました" });
                  closeModal();
                  setCompanies(prev =>
                    prev.map(c=>c.id===selectedCompany.id?{...c,name:editCompanyName,status:editCompanyStatus}:c)
                  );
                }
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* モーダル例 */}
      <Dialog
        open={modalState.type === "freeze-student"}
        onOpenChange={closeModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>学生凍結</DialogTitle>
            <DialogDescription>
              本当に凍結しますか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={closeModal}
            >
              キャンセル
            </Button>
            <Button onClick={() => { /* 確定処理 */ }}>
              凍結
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----- 特集追加 ----- */}
      <Dialog open={modalState.type === "add-feature"} onOpenChange={closeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>特集記事を追加</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>タイトル</Label>
              <Input
                value={newFeatureTitle}
                onChange={(e) => setNewFeatureTitle(e.target.value)}
                placeholder="記事タイトル"
              />
            </div>
            <div>
              <Label>ステータス</Label>
              <Select
                value={newFeatureStatus}
                onValueChange={(v) => setNewFeatureStatus(v as any)}
              >
                <SelectTrigger />
                <SelectContent>
                  <SelectItem value="公開">公開</SelectItem>
                  <SelectItem value="下書き">下書き</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={closeModal}>
              キャンセル
            </Button>
            <Button
              onClick={async () => {
                if (!newFeatureTitle.trim()) {
                  toast({ description: "タイトルを入力してください", variant: "destructive" });
                  return;
                }
                const { error } = await supabase.from("features").insert({
                  title: newFeatureTitle.trim(),
                  status: newFeatureStatus,
                });
                if (error) {
                  toast({ description: `追加失敗: ${error.message}`, variant: "destructive" });
                } else {
                  toast({ description: "特集を追加しました" });
                  // 即時反映
                  setFeatures((prev) => [
                    { id: crypto.randomUUID(), title: newFeatureTitle, status: newFeatureStatus, created_at: new Date().toISOString() },
                    ...prev,
                  ]);
                  setNewFeatureTitle("");
                  setNewFeatureStatus("下書き");
                  closeModal();
                }
              }}
            >
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
