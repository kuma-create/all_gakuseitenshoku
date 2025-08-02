"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  FileText,
  Users,
  MessageSquare,
  PlusCircle,
  Bell,
  Clock,
} from "lucide-react"

import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

/* ---------- 型 ---------- */
type ApplicationRow = {
  id          : string
  student_name: string
  job_title   : string | null
  created_at  : string
  status      : string | null
}

type JobRow = {
  id        : string
  title     : string
  applicants: number
  views     : number | null
  days_left : number
}

type MessageRow = {
  id          : string
  student_name: string
  content     : string
  created_at  : string
  is_read     : boolean
}

/* ───────────────────────────────────────────── */
export default function CompanyDashboard() {
  const router                       = useRouter()
  const { isLoggedIn, userType, user } = useAuth()
  const isCompanySide = userType === "company" || userType === "company_admin"

  /* --- state -------------------------------------------------------- */
  const [loading     , setLoading    ] = useState(true)
  const [pubJobs     , setPubJobs     ] = useState(0)
  const [draftJobs   , setDraftJobs   ] = useState(0)
  const [applicants, setApplicants] = useState<ApplicationRow[]>([])
  const [jobs        , setJobs        ] = useState<JobRow[]>([])
  const [messages    , setMessages    ] = useState<MessageRow[]>([])
  const [unreadCnt   , setUnreadCnt   ] = useState(0)
  const [scoutCount  , setScoutCount  ] = useState(0)

  /* --- 認証 --------------------------------------------------------- */
  useEffect(() => {
    if (!loading) {
      if (!isLoggedIn) {
        router.push("/login")
      } else if (!isCompanySide) {
        router.push("/")
      }
    }
  }, [loading, isLoggedIn, userType, router])

  /* --- Supabase 取得 ------------------------------------------------- */
  useEffect(() => {
    if (!isLoggedIn || !isCompanySide || !user?.id) return

    ;(async () => {
      /* ① 企業レコード取得 (owner / recruiter 共通) */
      const { data: member, error: memErr } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle()

      if (memErr) { console.error(memErr); setLoading(false); return }

      const companyId = member?.company_id
      if (!companyId) { setLoading(false); return }

      /* ② 並列で必要データ取得 */
      const [
        { data: publishedJobs },
        { data: draftJobsRows },
        { data: applRows },
      ] = await Promise.all([
        supabase
          .from("jobs")
          .select("id")
          .eq("company_id", companyId)
          .eq("published", true),
        supabase
          .from("jobs")
          .select("id")
          .eq("company_id", companyId)
          .eq("published", false),
        supabase
          .from("applications")
          .select(`
            id,
            status,
            created_at,
            student_profiles:student_profiles!applications_student_id_fkey ( full_name ),
            jobs ( title )
          `)
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      // ②‑A まず会社のチャットルーム ID 一覧を取得
      const { data: roomRows } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("company_id", companyId)
        .limit(50); // 上限 50

      const roomIds = (roomRows ?? []).map((r) => r.id);
      let msgRows: any[] = [];

      // ②‑B ルームがあるときだけメッセージ取得
      if (roomIds.length > 0) {
        const { data: msgs } = await supabase
          .from("messages")
          .select(`
            id,
            content,
            is_read,
            created_at,
            sender_profiles:student_profiles!messages_sender_id_fkey ( full_name )
          `)
          .in("chat_room_id", roomIds)
          .order("created_at", { ascending: false })
          .limit(5);

        msgRows = msgs ?? [];
      }

      /* ③ スカウト件数取得 */
      const { count: scoutCnt } = await supabase
        .from("scouts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)

      setScoutCount(scoutCnt ?? 0)
      setPubJobs(publishedJobs?.length ?? 0)
      setDraftJobs(draftJobsRows?.length ?? 0)

      setApplicants(
        (applRows ?? []).map((a) => ({
          id          : a.id,
          student_name: (a as any).student_profiles?.full_name ?? "不明",
          job_title   : a.jobs?.title ?? "―",
          created_at  : (a.created_at ?? "").slice(0, 10),
          status      : a.status,
        })),
      )

      setMessages(
        (msgRows ?? []).map((m) => ({
          id          : m.id,
          student_name:
            (m as any).sender_profiles?.full_name ??
            (m as any).sender_id?.slice(0, 8) ??
            "不明",
          content    : m.content,
          created_at : m.created_at ?? "",
          is_read    : m.is_read   ?? false,
        })),
      )
      setUnreadCnt((msgRows ?? []).filter((m) => !m.is_read).length)

      /* 求人詳細カード用サブ集計 */
      const { data: jobList } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          views,
          published_until,
          applications:applications(id)
        `)
        .eq("company_id", companyId)
        .eq("published", true)
        .limit(6)

      setJobs(
        (jobList ?? []).map((j) => ({
          id        : j.id,
          title     : j.title,
          views     : j.views,
          applicants: j.applications.length,
          days_left:
            j.published_until
              ? Math.max(
                  0,
                  Math.floor(
                    (new Date(j.published_until).getTime() - Date.now()) /
                      86_400_000,
                  ),
                )
              : 0,
        })),
      )

      setLoading(false)
    })()
  }, [isLoggedIn, userType, user])

  /* --- ローディング -------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6">
      {/* ── ヘッダー ───────────────────────────── */}
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {user?.name || "企業"}ダッシュボード
          </h1>
          <p className="mt-1 text-gray-600">
            採用活動の管理と最新情報を確認できます
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/company/scout">
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Users className="h-4 w-4" />
              スカウト画面へ
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                新規求人作成
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/company/jobs/new?type=fulltime">本選考</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/company/jobs/new?type=internship_short">インターン（短期）</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/company/jobs/new?type=event">説明会/イベント</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            通知
            {unreadCnt > 0 && <Badge className="ml-1 bg-red-500">{unreadCnt}</Badge>}
          </Button>
        </div>
      </header>

      {/* ── サマリー ───────────────────────────── */}
      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <SummaryCard title="求人"      main={pubJobs}     sub={draftJobs}   subLabel="下書き" link="/company/jobs/manage" />
        <SummaryCard title="応募者"    main={applicants.length} link="/company/applicants" />
        <SummaryCard title="メッセージ" main={unreadCnt}    sub={messages.length} subLabel="取得件数" link="/company/chat" />
        <SummaryCard title="スカウト"  main={scoutCount}   link="/company/scout" />
      </section>

      {/* ── タブ ───────────────────────────────── */}
      <Tabs defaultValue="applicants" className="mb-8">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="applicants" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> 応募者
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> 求人
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> チャット
          </TabsTrigger>
        </TabsList>
        <TabsContent value="applicants">
          <ApplicationsTable rows={applicants} />
        </TabsContent>
        <TabsContent value="jobs">
          <JobsCards rows={jobs} />
        </TabsContent>
        <TabsContent value="messages">
          <MessagesList rows={messages} />
        </TabsContent>
      </Tabs>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-yellow-600" />
              メンバー管理
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">この企業に所属するメンバーの追加・削除を行えます。</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-yellow-600 hover:bg-yellow-700" asChild>
              <Link href="/company/members">メンバー一覧を見る</Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  )
}

/* ===================================================================== */
/* サマリーカード -------------------------------------------------------- */
function SummaryCard({
  title,
  main,
  sub,
  subLabel = "サブ",
  link,
}: {
  title   : string
  main    : number
  sub?    : number
  subLabel?: string
  link    : string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold">{main}</p>
            <p className="text-sm text-gray-500">件</p>
          </div>

          {sub !== undefined && (
            <div className="text-right">
              <p className="text-xl font-semibold text-gray-600">{sub}</p>
              <p className="text-sm text-gray-500">{subLabel}</p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Link href={link} className="text-sm text-red-600 hover:underline">
          詳細 →
        </Link>
      </CardFooter>
    </Card>
  )
}

/* 応募者テーブル ------------------------------------------------------- */
function ApplicationsTable({ rows }: { rows: ApplicationRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近の応募者</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-500">
                <th className="pb-2">応募者名</th>
                <th className="pb-2">職種</th>
                <th className="pb-2">応募日</th>
                <th className="pb-2">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-3">{r.student_name}</td>
                  <td className="py-3">{r.job_title}</td>
                  <td className="py-3">{r.created_at}</td>
                  <td className="py-3">
                    <Badge variant="secondary">{r.status ?? "―"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/* 求人カードグリッド --------------------------------------------------- */
function JobsCards({ rows }: { rows: JobRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>公開中の求人</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((j) => (
            <Card key={j.id}>
              <CardHeader className="bg-gray-50 pb-2">
                <CardTitle className="text-base">{j.title}</CardTitle>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">応募数</p>
                    <p className="font-medium">{j.applicants}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">閲覧数</p>
                    <p className="font-medium">{j.views ?? "―"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">掲載終了まで</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-600" />
                      <p className="font-medium">{j.days_left}日</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/* メッセージ一覧 ------------------------------------------------------- */
function MessagesList({ rows }: { rows: MessageRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近のメッセージ</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {rows.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-200">
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-medium text-gray-600">
                    {m.student_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{m.student_name}</p>
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {m.content}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(m.created_at).toLocaleString("ja-JP", {
                    month : "numeric",
                    day   : "numeric",
                    hour  : "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {!m.is_read && (
                  <Badge className="mt-1 bg-red-500">未読</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
