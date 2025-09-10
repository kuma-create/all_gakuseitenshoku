/* eslint-disable */
"use client"

import React, { Dispatch, SetStateAction, useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building,
  Clock,
  Send,
  Star,
  Check,
  ListFilter,
  Users,
  ExternalLink,
  ChevronRight,
  ImageIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client"
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

// Prefer a job image when available (fallback to company's cover or logo)
function getPrimaryImage(job: any, company: Company): string | null {
  const j = job || {};
  const candidates = [
    j.cover_image_url,
    j.cover_image,
    j.thumbnail_url,
    j.image_url,
    j.photo_url,
    Array.isArray(j.photos) && j.photos.length ? j.photos[0] : null,
    (j.event && (j.event.cover_image_url || j.event.image_url)) || null,
    (j.event_details && (j.event_details.cover_image_url || j.event_details.image_url)) || null,
    company.cover_image_url,
    company.logo,
  ].filter(Boolean) as string[];
  return candidates.length ? candidates[0] : null;
}

// Prefer a job/event image for related items (fallbacks included)
function getRelatedImage(r: any): string | null {
  const candidates = [
    r.cover_image_url,
    r.cover_image,
    r.thumbnail_url,
    r.image_url,
    Array.isArray(r.photos) && r.photos.length ? r.photos[0] : null,
    (r.event && (r.event.cover_image_url || r.event.image_url)) || null,
    (r.event_details && (r.event_details.cover_image_url || r.event_details.image_url)) || null,
    r.company?.cover_image_url,
    r.company?.logo,
  ].filter(Boolean) as string[];
  return candidates.length ? candidates[0] : null;
}

// Format a time string from the DB and a range label
function formatTimeHHmm(t: any): string | null {
  if (!t) return null;
  // Accept: "11:00:00", "11:00", Date, or ISO string
  if (t instanceof Date) {
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  const s = String(t).trim();
  // If ISO-like, parse
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return formatTimeHHmm(d);
  }
  // keep only HH:MM
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return null;
}

function buildEventTimeLabel(ev: any): string {
  const start = formatTimeHHmm(ev.event_time);
  const end   = formatTimeHHmm(ev.event_end_time);
  if (start && end) return `${start}〜${end}`;
  if (start) return `${start}〜`;
  if (end) return `〜${end}`;
  return "-";
}

function formatDateJP(d: any): string {
  if (!d) return "調整中";
  try {
    return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return String(d);
  }
}

function dateFromAny(d: any): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10); // ISO -> date part
  return null;
}

// ---------- utility functions ----------
function pick<T = any>(...vals: any[]): T | null {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
  return null;
}

function readEventMeta(src: any) {
  const e = src?.event ?? src?.event_details ?? src ?? {};
  // date candidates
  let date = pick(
    e.event_date, e.date, e.start_date,
    src?.event_date, src?.date, src?.start_date,
  );
  // start/end candidates (accept ISO datetime keys as well)
  let start = pick(
    e.event_time, e.start_time, e.starts_at, e.start_at, e.begin_time,
    src?.event_time, src?.start_time, src?.starts_at, src?.start_at, src?.begin_time,
  );
  let end = pick(
    e.event_end_time, e.end_time, e.ends_at, e.end_at, e.finish_time,
    src?.event_end_time, src?.end_time, src?.ends_at, src?.end_at, src?.finish_time,
  );
  // venue/location
  const venue = pick(
    e.venue, e.place, e.address, e.location,
    src?.venue, src?.place, src?.address, src?.location,
    src?.company?.location,
  );
  // online flag + format
  const rawMode = pick(e.format, src?.format, e.mode, src?.mode);
  const isOnline = (pick(e.is_online, e.online, src?.is_online, src?.online) === true)
    || (typeof rawMode === 'string' && /online|webinar|zoom|teams/i.test(String(rawMode)));

  // description candidates
  const description = pick(
    e.description, e.detail, e.details, e.summary, e.note, e.notes,
    src?.description, src?.schedule, src?.summary, src?.note, src?.notes,
  );

  // capacity
  const capacity = pick(
    e.capacity, e.limit, e.quota, e.max_participants,
    src?.capacity, src?.limit, src?.quota, src?.max_participants,
  );

  // derive date from ISO datetime if missing
  if (!date) date = dateFromAny(start) || dateFromAny(end);

  return { date, start, end, venue, isOnline, description, capacity };
}

function excerpt(text: string | null, len = 60): string | null {
  if (!text) return null;
  const s = String(text).replace(/\n+/g, " ").trim();
  if (s.length <= len) return s;
  return s.slice(0, len) + "…";
}

// Normalize event mode/format display
function formatEventMode(ev: any): string {
  const raw = (ev?.format ?? "").toString().trim().toLowerCase();
  const map: Record<string, string> = {
    online: "オンライン開催",
    offline: "対面開催",
    onsite: "対面開催",
    hybrid: "ハイブリッド開催",
    webinar: "オンライン開催",
  };
  if (raw && map[raw]) return map[raw];
  if (ev?.is_online === true) return "オンライン開催";
  if (ev?.is_online === false && raw === "") return "対面開催"; // 明示的にオフラインで format 未設定
  return "未定";
}

/* ---------- types ---------- */
type Company = {
  id: string
  name: string | null
  logo: string | null
  cover_image_url: string | null
  industry: string | null
  founded_year: number | null
  employee_count: number | null
  location: string | null
  description: string | null
}

type Props = {
  job: any
  company: Company
  tags: string[]
  related: any[]
  apply: () => void
  hasApplied: boolean
  showForm: boolean
  setShowForm: Dispatch<SetStateAction<boolean>>
}

export default function EventInfo({
  job,
  company,
  tags,
  related,
  apply,
  hasApplied,
  showForm,
  setShowForm,
}: Props) {
  const [isInterested, setIsInterested] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Normalize event detail (joined as `event` or legacy `event_details`)
  const ev = (job?.event ?? job?.event_details) || {};
  const mainMeta = readEventMeta(job);
  const primaryImage = getPrimaryImage(job, company);

  const handleApplyClick = async () => {
    // 1) Check login state
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/login")
      return
    }

    // 2) Check if the user has finished account registration (i.e., has a student profile)
    const { data: profile, error } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (error || !profile) {
      router.push("/signup")
      return
    }

    // 3) All good – show the application confirm dialog
    setShowForm(true)
  }

  useEffect(() => {
    // Get saved list from localStorage (client‑side only)
    const raw = typeof window !== "undefined" ? localStorage.getItem("savedEvents") : null
    const arr: string[] = raw ? JSON.parse(raw) : []
    setIsInterested(arr.includes(job.id))
  }, [job.id])

  /* save toggle */
  const toggleSave = () => {
    const raw = localStorage.getItem("savedEvents")
    let arr: string[] = raw ? JSON.parse(raw) : []
    if (isInterested) arr = arr.filter((id) => id !== job.id)
    else arr.push(job.id)
    localStorage.setItem("savedEvents", JSON.stringify(arr))
    setIsInterested(!isInterested)
  }

  const isNew =
    job?.created_at &&
    new Date(job.created_at).getTime() >
      Date.now() - 7 * 24 * 60 * 60 * 1000


  return (
    <main className="container mx-auto px-4 py-8 pb-24">
      {/* back */}
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-red-600 sm:text-sm"
      >
        <ArrowLeft size={16} />
        イベント一覧に戻る
      </Link>

      <div className="grid gap-6 md:grid-cols-3">
        {/* ------------- 左カラム ------------- */}
        <div className="md:col-span-2">
          {/* header */}
          <Card className="mb-6 overflow-hidden border-0 shadow-md">
            {primaryImage ? (
              <div className="relative w-full aspect-[21/9] sm:aspect-[16/6] overflow-hidden">
                <Image
                  src={primaryImage}
                  alt="求人画像"
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="w-full aspect-[21/9] sm:aspect-[16/6] bg-gradient-to-r from-red-500 to-red-600 opacity-90" />
            )}
            <CardContent className="relative -mt-16 bg-white p-6">
              <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="relative h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-white shadow-md">
                  <Image
                    src={
                      company.logo ??
                      "/placeholder.svg?height=128&width=128&query=company logo"
                    }
                    alt="logo"
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-900 sm:text-2xl md:text-3xl">
                    {job.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/companies/${company.id}`}
                      className="text-base font-medium text-red-600 hover:text-red-700 hover:underline sm:text-lg"
                    >
                      {company.name}
                    </Link>
                    {isNew && (
                      <Badge className="bg-red-500 text-xs font-medium text-white">
                        新着
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((t, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-red-50 text-xs text-red-700"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

            {/* summary */}
              <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-2">
                <SummaryItem
                  icon={<MapPin size={16} />}
                  label="開催地"
                  value={
                    mainMeta.isOnline ? "オンライン開催" : (mainMeta.venue ?? job.location ?? "-")
                  }
                />
                <SummaryItem
                  icon={<Calendar size={16} />}
                  label="開催日"
                  value={
                    mainMeta.date ? new Date(mainMeta.date).toLocaleDateString("ja-JP") : "調整中"
                  }
                />
                <SummaryItem
                  icon={<Clock size={16} />}
                  label="イベント時間"
                  value={buildEventTimeLabel({ event_time: mainMeta.start, event_end_time: mainMeta.end })}
                />
                <SummaryItem
                  icon={<Building size={16} />}
                  label="形式"
                  value={formatEventMode({ is_online: mainMeta.isOnline })}
                />
                <SummaryItem
                  icon={<Users size={16} />}
                  label="定員"
                  value={typeof mainMeta.capacity === "number" ? `${mainMeta.capacity}名` : "-"}
                />
              </div>
            </CardContent>
          </Card>

          {/* description */}
          {job.description && (
            <SectionCard title="イベント概要">
              <p className="whitespace-pre-wrap text-gray-700">
                {job.description}
              </p>
            </SectionCard>
          )}

          {/* schedule / details */}
          {job.schedule && (
            <SectionCard title="スケジュール">
              <p className="whitespace-pre-wrap text-gray-700">
                {job.schedule}
              </p>
            </SectionCard>
          )}
        </div>

        {/* ------------- 右カラム ------------- */}
        <div className="space-y-6">
          {/* apply */}
          <Card className="sticky top-4 z-30 bg-white border-0 shadow-md">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="rounded-lg bg-red-50 p-4 text-center">
                  <h3 className="text-lg font-bold text-red-700">
                    このイベントに参加しますか？
                  </h3>
                  <p className="mt-1 text-sm text-gray-700">
                    申し込みは 1 分で完了します
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {hasApplied ? (
                    <Button disabled className="w-full bg-green-600 hover:bg-green-700">
                      <Check size={16} className="mr-1" />
                      申し込み済み
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={handleApplyClick}
                    >
                      <Send size={16} className="mr-2" />
                      このイベントに申し込む
                    </Button>
                  )}

                  <Button
                    variant={isInterested ? "default" : "outline"}
                    className={`w-full gap-1 ${
                      isInterested ? "bg-yellow-500 hover:bg-yellow-600" : ""
                    }`}
                    onClick={toggleSave}
                  >
                    <Star
                      size={16}
                      className={isInterested ? "fill-current" : ""}
                    />
                    <span>
                      {isInterested ? "興味ありに登録済み" : "興味ありに登録"}
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-center text-gray-800">
                    下記の内容で申し込みを確定しますか？
                  </DialogTitle>
                </DialogHeader>

                <DialogFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={async () => {
                      try {
                        // 1) 応募登録
                        await apply()
                        toast({ title: "応募が完了しました 🎉" })

                        // 2) 学生プロフィールIDを取得
                        const {
                          data: { session },
                        } = await supabase.auth.getSession()
                        const { data: profileData, error: profileErr } = await supabase
                          .from("student_profiles")
                          .select("id")
                          .eq("user_id", session!.user.id)
                          .maybeSingle()
                        if (profileErr || !profileData) {
                          throw profileErr || new Error("プロフィール取得エラー")
                        }

                        // 3) chat_rooms テーブルに upsert して単一レコードを取得
                        const { data: room, error: roomErr } = await supabase
                          .from("chat_rooms")
                          .upsert(
                            {
                              company_id: company.id,
                              student_id: profileData.id,
                              job_id: job.id,
                            },
                            { onConflict: "company_id,student_id" } // company_id × student_id で一意
                          )
                          .select()
                          .single()
                        if (roomErr) throw roomErr

                        // 4) 応募メッセージを自動送信
                        const { error: msgErr } = await supabase
                          .from("messages")
                          .insert({
                            chat_room_id: room.id,
                            sender_id:    profileData.id,      // 学生を送信者として記録
                            content:      "イベント/説明会に応募しました！！",
                          })
                        if (msgErr) console.error("auto-message error", msgErr)

                        // 5) チャットルームへ遷移
                        router.push(`/chat/${room.id}`)
                        setShowForm(false)
                      } catch (err: any) {
                        console.error("apply error", err)
                        toast({
                          title: "応募またはチャットルーム作成に失敗しました",
                          description:
                            typeof err?.message === "string"
                              ? err.message
                              : "ネットワークまたはサーバーエラーが発生しました",
                          variant: "destructive",
                        })
                      }
                    }}
                  >
                    <Check size={16} className="mr-2" />
                    応募を確定する
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowForm(false)}
                  >
                    キャンセル
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>

          {/* company info */}
          <SectionCard title="企業情報">
            <CompanyInfo company={company} />
          </SectionCard>

          {/* related */}
          <Card className="border-0 shadow-md">
            <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <ListFilter className="h-5 w-5 text-red-600" />
                関連イベント
                {Array.isArray(related) && related.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{related.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {Array.isArray(related) && related.length ? (
                <ul className="divide-y divide-gray-100">
                  {related.map((r: any) => {
                    const meta = readEventMeta(r);
                    return (
                      <li key={r.id} className="hover:bg-gray-50 transition-colors">
                        {/* local computed meta */}
                        <Link href={`/jobs/${r.id}`} className="flex items-stretch gap-3 p-4">
                          {/* thumbnail */}
                          <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                            {getRelatedImage(r) ? (
                              <Image
                                src={getRelatedImage(r)!}
                                alt={r.title ?? "related image"}
                                fill
                                sizes="160px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <ImageIcon className="h-6 w-6" />
                              </div>
                            )}
                          </div>

                          {/* body */}
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 font-medium text-gray-900">{r.title ?? "タイトル未設定"}</p>
                            {excerpt(meta.description) && (
                              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{excerpt(meta.description, 70)}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {typeof meta.capacity === "number" && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                  定員 {meta.capacity}名
                                </Badge>
                              )}
                            </div>
                          </div>
                          {/* affordance */}
                          <div className="flex items-center pl-2">
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-6 text-center text-sm text-gray-500">
                  関連するイベントはありません
                  <div className="mt-3">
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <Link href="/jobs">
                        <ExternalLink className="h-4 w-4" />
                        イベント一覧へ
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

/* ---------- sub components ---------- */
function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="mb-6 border-0 shadow-md">
      <CardHeader className="border-b border-gray-100 bg-gray-50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  )
}

function CompanyInfo({ company }: { company: Company }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-gray-200">
          <Image
            src={
              company.logo ??
              "/placeholder.svg?height=56&width=56&query=company logo"
            }
            alt="logo"
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-bold">{company.name}</h3>
          <p className="text-sm text-gray-500">{company.industry}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <InfoLine icon={<MapPin size={16} />} text={company.location} />
        <InfoLine
          icon={<Users size={16} />}
          text={`社員数：${company.employee_count ?? "非公開"}名`}
        />
        <InfoLine
          icon={<Calendar size={16} />}
          text={`設立：${company.founded_year ?? "非公開"}年`}
        />
      </div>

      {company.description && (
        <p className="whitespace-pre-wrap text-sm text-gray-700">
          {company.description}
        </p>
      )}

      <div className="flex justify-center">
        <Button variant="outline" size="sm" asChild className="gap-1">
          <Link href={`/companies/${company.id}`}>
            <ExternalLink size={14} />
            企業詳細を見る
          </Link>
        </Button>
      </div>
    </div>
  )
}

function InfoLine({
  icon,
  text,
}: {
  icon: React.ReactNode
  text: string | null
}) {
  if (!text) return null
  return (
    <div className="flex items-center gap-2 text-gray-600">
      {icon}
      <span className="text-sm">{text}</span>
    </div>
  )
}