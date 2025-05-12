/* --------------------------------------------------------------------------
   app/admin/page.tsx  –  管理者ダッシュボード  _fixed_
--------------------------------------------------------------------------- */
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Building2,
  Briefcase,
  Bell,
  BarChart3,
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
    companies: { company_name: string }[] | null;
  }[] | null;
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

  const [studentPage, setStudentPage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const [jobPage, setJobPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);

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

  /* ---------- fetchData ---------- */
  const fetchData = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      try {
        // 概要カウント
        const [
          { count: sCount },
          { count: cCount },
          { count: aCount },
          { count: scCount },
        ] = await Promise.all([
          supabase.from("student_profiles").select("*", { count: "exact" }),
          supabase.from("companies").select("*", { count: "exact" }),
          supabase.from("applications").select("*", { count: "exact" }),
          supabase.from("scouts").select("*", { count: "exact" }),
        ]);
        setOverview({
          students: sCount || 0,
          companies: cCount || 0,
          applications: aCount || 0,
          scouts: scCount || 0,
        });

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
              companies!jobs_company_id_fkey(company_name)
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
    ]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const openModal = (type: string, id: string) =>
    setModalState({ type, id });
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
            <Button>
              <Building2 className="mr-2 h-4 w-4" />
              企業を追加
            </Button>
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
                            onClick={() =>
                              openModal(
                                "suspend-company",
                                c.id
                              )
                            }
                          >
                            <Ban /> 停止
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              openModal(
                                "approve-company",
                                c.id
                              )
                            }
                          >
                            <CheckCircle /> 承認
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            openModal(
                              "delete-company",
                              c.id
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
                      ?.company_name ?? "—"}
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
    </div>
  );
}
