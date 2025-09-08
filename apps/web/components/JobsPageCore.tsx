"use client"

import type React from "react"

import { Briefcase, Calendar, ChevronRight, ChevronDown, Filter, Heart, MapPin, Search, Star, ClipboardList, Clock, Mic, GraduationCap } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
// （Tabs 依存を削除したため、インポートも削除）
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import Head from "next/head"

/** UI helpers (step1: sort only) */
type SortKey = "newest" | "deadline";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "deadline", label: "締切が近い順" },
];

// Date formatter used for deadlines & event dates
const formatDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = iso.length === 7 ? new Date(iso + "-01") : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Props */
export interface JobsPageProps {
  /** 検索パネルの初期「選考種類」タブ (例: "intern_long") */
  defaultSelectionType?: string;
}

/* ---------- Selection type → JP label ---------- */
const SELECTION_LABELS = {
  fulltime:         "本選考",
  internship_short: "インターン（短期）",
  intern_long:      "インターン(長期)", // legacy key
  event:            "説明会／イベント",
} as const;


const SELECTION_ICONS: Record<string, JSX.Element> = {
  fulltime: <Briefcase size={12} />,
  internship_short: <ClipboardList size={12} />,
  internship_long: <Clock size={12} />,
  intern_long: <Clock size={12} />,
  event: <Mic size={12} />,
};

// Badge color map for selection types
const badgeColorMap: Record<string, string> = {
  fulltime: "bg-blue-100 text-blue-800",
  internship_short: "bg-green-100 text-green-800",
  internship_long: "bg-orange-100 text-orange-800",
  intern_long: "bg-orange-100 text-orange-800",
  event: "bg-purple-100 text-purple-800",
};

const getSelectionLabel = (type?: string | null) => {
  const key = (type ?? "fulltime").trim() as keyof typeof SELECTION_LABELS;
  const colorClass = badgeColorMap[key] ?? "bg-gray-100 text-gray-800";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass} w-fit`}
    >
      {SELECTION_ICONS[key]}
      {SELECTION_LABELS[key] ?? SELECTION_LABELS.fulltime}
    </span>
  );
};

// Helper function to get just the badge classes for selection type
const getSelectionLabelClass = (type?: string | null) => {
  const key = (type ?? "fulltime").trim() as keyof typeof SELECTION_LABELS;
  return `inline-flex w-fit items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${badgeColorMap[key]}`;
};

/** Supabase 型を拡張 */
type JobRow = Database["public"]["Tables"]["jobs"]["Row"] & {
  companies: { name: string; logo: string | null; industry?: string | null } | null
  industry?: string | null
  job_type?: string | null
  selection_type?: string | null
  is_featured?: boolean | null
  salary_range?: string | null
  application_deadline?: string | null
  salary_min?: number | null
  salary_max?: number | null
  tags?: string[] | null
  cover_image_url?: string | null
  job_tags?: { tag: string }[] | null
  event_date?: string | null
  event_format?: string | null
  member_only?: boolean | null
}

const SALARY_MAX = 1200

/* 選考種類フィルター */
const SELECTION_TYPES = [
  { value: "all", label: "すべての選考" },
  { value: "fulltime", label: "本選考" },
  { value: "internship_short", label: "インターン（短期）" },
  { value: "intern_long", label: "インターン（長期）" },
  { value: "event", label: "説明会／イベント" },
] as const


/* 業種（複数選択可・固定リスト） */
const INDUSTRY_OPTIONS = [
  'IT・通信',
  'メーカー',
  '商社',
  '金融',
  'コンサルティング',
  'マスコミ',
  '広告・マーケティング',
  "人材",
  "不動産",
  'サービス',
  '小売・流通',
  '医療・福祉',
  '教育',
  '公務員',
] as const;

/* 職種（複数選択可・固定リスト） */
const JOB_TYPE_OPTIONS = [
  "エンジニア",
  "営業",
  "コンサルタント",
  "経営・経営企画",
  "総務・人事",
  "経理・財務",
  "企画",
  "マーケティング",
  "デザイナー",
  "広報",
  "その他",
] as const;

/* 年収フィルターの選択肢 */
const SALARY_OPTIONS = [
  { value: "all", label: "すべての年収" },
  { value: "200", label: "200万以上" },
  { value: "400", label: "400万以上" },
  { value: "600", label: "600万以上" },
  { value: "800", label: "800万以上" },
  { value: "1000", label: "1000万以上" },
] as const;

/* 開催形式フィルターの選択肢 */
const EVENT_FORMAT_OPTIONS = [
  { value: "all",     label: "すべての形式" },
  { value: "online",  label: "オンライン" },
  { value: "onsite", label: "対面" },
  { value: "hybrid",  label: "ハイブリッド" },
] as const;

/* 特集バナー */
const FEATURED_BANNERS = [
  {
    id: 1,
    title: "日系大手",
    subtitle: "インターン特集",
    color: "bg-blue-500",
    textColor: "text-white",
    image: "/placeholder.svg?height=300&width=600",
    companies: [
      { name: "Sony", logo: "/placeholder.svg?height=60&width=60" },
      { name: "Bandai", logo: "/placeholder.svg?height=60&width=60" },
      { name: "JR", logo: "/placeholder.svg?height=60&width=60" },
      { name: "Hitachi", logo: "/placeholder.svg?height=60&width=60" },
    ],
  },
  {
    id: 2,
    title: "選考優遇",
    subtitle: "が狙える企業特集",
    color: "bg-yellow-400",
    textColor: "text-blue-600",
    image: "/placeholder.svg?height=300&width=600",
    companies: [
      { name: "JAL", logo: "/placeholder.svg?height=60&width=60" },
      { name: "ADK", logo: "/placeholder.svg?height=60&width=60" },
      { name: "三井不動産", logo: "/placeholder.svg?height=60&width=60" },
      { name: "Benesse", logo: "/placeholder.svg?height=60&width=60" },
    ],
  },
]


/** イベント用型  */
type EventRow = {
  id: string;
  title: string;
  cover_image: string | null;
  event_type: string | null;
  event_date: string;          // ISO (YYYY‑MM‑DD)
};

/* 注目キーワード */
const FEATURED_KEYWORDS = ["IT", "コンサル", "金融", "メーカー", "商社"] as const;

/* ────────────────────────────────────────── */
export default function JobsPage({
  defaultSelectionType = "all",
}: JobsPageProps) {
  /* ---------------- state ---------------- */
  const searchParams = useSearchParams()
  const qParam = searchParams.get("q") ?? ""
  const tabParam = (searchParams.get("tab") ?? "company") as "company" | "fulltime" | "intern" | "event"
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null);
  const [interestsLoaded, setInterestsLoaded] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);

  /* UI filter states */
  // --- initialize filters from URL query parameters ---
  const industryParam      = searchParams.get("industry")      ?? "";
  const jobTypeParam       = searchParams.get("jobType")       ?? "all";
  // Accept both ?selectionType= and legacy ?type=
  const selectionTypeParam =
    searchParams.get("selectionType") ??
    searchParams.get("type") ??
    "all";
  const salaryMinParam     = searchParams.get("salaryMin")     ?? "all";
  // イベント系フィルター（開催日・開催形式）
  // 後方互換: eventDate があれば from に流し込む
  const eventFromParam   = searchParams.get("eventFrom")   ?? (searchParams.get("eventDate") ?? "");
  const eventToParam     = searchParams.get("eventTo")     ?? "";
  const eventFormatParam = searchParams.get("eventFormat") ?? "all";
  // `search` is the committed keyword that triggers filtering.
  // `query` is the text the user is currently typing.
  const [search, setSearch] = useState(qParam);
  const [query, setQuery] = useState(qParam);
  const [industriesSelected, setIndustriesSelected] = useState<string[]>(industryParam ? industryParam.split(",").filter(Boolean) : []);
  const [jobTypesSelected, setJobTypesSelected] = useState<string[]>(
    jobTypeParam && jobTypeParam !== "all"
      ? jobTypeParam.split(",").filter(Boolean)
      : []
  );
  const [selectionType, setSelectionType] = useState(selectionTypeParam);
  const [salaryMin, setSalaryMin] = useState<string>(salaryMinParam);
  const [eventFrom, setEventFrom] = useState<string>(eventFromParam);
  const [eventTo, setEventTo] = useState<string>(eventToParam);
  const [eventFormat, setEventFormat] = useState<string>(eventFormatParam);
  // 本選考以外を選んだら年収フィルターはリセット
  useEffect(() => {
    if (selectionType !== "fulltime" && salaryMin !== "all") {
      setSalaryMin("all");
    }
  }, [selectionType]);
  // 説明会／イベント と インターン（短期）以外ではイベント系フィルターをリセット
  useEffect(() => {
    if (!["event", "internship_short"].includes(selectionType)) {
      if (eventFrom !== "") setEventFrom("");
      if (eventTo !== "") setEventTo("");
      if (eventFormat !== "all") setEventFormat("all");
    }
  }, [selectionType]);
  const [saved, setSaved] = useState<Set<string>>(new Set())
  // ※ ログイン済みの場合は後続の Supabase 同期で上書きします
  // 最初に localStorage から読み取って saved セットを初期化
  useEffect(() => {
    if (typeof window === "undefined") return
    const raw = localStorage.getItem("savedJobs")
    if (raw) {
      try {
        const arr: string[] = JSON.parse(raw)
        setSaved(new Set(arr))
      } catch {
        /* ignore malformed JSON */
      }
    }
  }, [])
  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session ?? null;
      if (active) setIsLoggedIn(!!session);

      // 取得できたら student_profiles.id を特定
      if (session) {
        const { data: sp, error: spErr } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!spErr && sp?.id) {
          if (active) setStudentId(sp.id);
          // 学生IDが取れたら、お気に入り(job_interests) を読み込み
          const { data: ji, error: jiErr } = await supabase
            .from("job_interests")
            .select("job_id")
            .eq("student_id", sp.id);
          if (!jiErr && ji) {
            const ids = ji.map((r) => r.job_id as string).filter(Boolean);
            if (active) setSaved(new Set(ids));
          }
          if (active) setInterestsLoaded(true);
        } else {
          // student_profiles が無い等の場合も読み込み完了フラグだけは立てておく
          if (active) setInterestsLoaded(true);
        }
      } else {
        // 未ログイン
        if (active) {
          setStudentId(null);
          setInterestsLoaded(true);
        }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        const { data: sp, error: spErr } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (!spErr && sp?.id) {
          setStudentId(sp.id);
          const { data: ji, error: jiErr } = await supabase
            .from("job_interests")
            .select("job_id")
            .eq("student_id", sp.id);
          if (!jiErr && ji) setSaved(new Set(ji.map((r) => r.job_id as string)));
        } else {
          setStudentId(null);
        }
        setInterestsLoaded(true);
      } else {
        setStudentId(null);
        setInterestsLoaded(true);
      }
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  const [view, setView] = useState<"grid" | "list">("grid")
  const [filterOpen, setFilterOpen] = useState(false)
  const [category, setCategory] = useState<"company" | "fulltime" | "intern" | "event">(tabParam)
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  /**
   * ------------------------------------------------------------
   * Keep local filter / query / category states aligned with the
   * current URL.  When the user lands on a link that already has
   * ?industry=...&jobType=... etc., or navigates with <Link>,
   * this effect updates all relevant React states so the UI and
   * displayed results always reflect the URL.
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const currentIndustry       = searchParams.get("industry")      ?? "";
    const currentJobType        = searchParams.get("jobType")       ?? "all";
    const currentSelectionType =
      searchParams.get("selectionType") ??
      searchParams.get("type") ??
      "all";
    const currentSalaryMin      = searchParams.get("salaryMin")     ?? "all";
    const currentEventFrom      = searchParams.get("eventFrom")     ?? (searchParams.get("eventDate") ?? "");
    const currentEventTo        = searchParams.get("eventTo")       ?? "";
    const currentEventFormat    = searchParams.get("eventFormat")   ?? "all";
    const currentQuery          = searchParams.get("q")             ?? "";
    const currentTab = (searchParams.get("tab") ?? "company") as
      | "company"
      | "fulltime"
      | "intern"
      | "event";

    setIndustriesSelected(currentIndustry ? currentIndustry.split(",").filter(Boolean) : []);
    setJobTypesSelected(
      currentJobType && currentJobType !== "all"
        ? currentJobType.split(",").filter(Boolean)
        : []
    );
    setSelectionType(currentSelectionType);
    setSalaryMin(currentSalaryMin);
    setEventFrom(currentEventFrom);
    setEventTo(currentEventTo);
    setEventFormat(currentEventFormat);
    setSearch(currentQuery);
    setQuery(currentQuery);
    setCategory(currentTab);
  }, [searchParams]);

  // --- build a query‑string that reflects current filter states ---
  const buildParams = (qValue: string = search.trim()) => {
    const params = new URLSearchParams();
    if (qValue) params.set("q", qValue);
    params.set("tab", category);
    if (industriesSelected.length > 0) params.set("industry", industriesSelected.join(","));
    if (jobTypesSelected.length > 0) {
      params.set("jobType", jobTypesSelected.join(","));
    }
    if (selectionType !== "all") {
      params.set("selectionType", selectionType);
      params.set("type", selectionType);          // legacy alias
    }
    if (selectionType === "fulltime" && salaryMin !== "all") {
      params.set("salaryMin", salaryMin);
    }
    // 説明会／イベント と インターン（短期）のときのみ 開催日（開始）・形式を含める
    // 終了日はインターン（短期）のときだけ含める
    if (["event", "internship_short"].includes(selectionType)) {
      if (eventFrom) params.set("eventFrom", eventFrom);
      if (selectionType === "internship_short" && eventTo) {
        params.set("eventTo", eventTo);
      }
      if (eventFormat !== "all") params.set("eventFormat", eventFormat);
    }
    return params.toString();
  };


  /* ---------------- fetch ----------------- */
  useEffect(() => {
    setLoading(true)
    ;(async () => {
      let query = supabase
        .from("jobs")
        .select(
          `
id,
title,
description,
created_at,
work_type,
selection_type,
is_recommended,
salary_range,
application_deadline,
location,
cover_image_url,
member_only,
companies!jobs_company_id_fkey (
  name,
  industry,
  logo
),
job_tags!job_tags_job_id_fkey (
  tag
)
`,
        )
        .eq("published", true)
        // 会員限定（member_only=true）の求人は、ログインユーザーのみに表示
        // 未ログインの場合は member_only=false のみ取得
        // （最終的にはRLSでの制御推奨）
      if (!isLoggedIn) {
        // Not logged in: only show public jobs (member_only=false)
        // @ts-ignore – query is typed above
        query = query.eq('member_only', false)
      }

      const { data, error } = await query.returns<JobRow[]>()

      if (error) {
        console.error("jobs fetch error", error)
        setError("選考情報取得に失敗しました")
      } else {
        const normalized = (data ?? []).map((row): JobRow => {
          // selection_type は DB カラムをそのまま使用。未設定の場合は "fulltime" を既定値にする
          const sel: JobRow["selection_type"] = row.selection_type ?? "fulltime";

          return {
            ...row,
            selection_type: sel,
            industry: row.companies?.industry ?? null,
            tags: (row.job_tags ?? []).map((t) => t.tag),
            ...(() => {
              const rgx = /^(\d+)[^\d]+(\d+)?/
              const m = (row.salary_range ?? "").match(rgx)
              const min = m ? Number(m[1]) : null
              const max = m && m[2] ? Number(m[2]) : null
              return { salary_min: min, salary_max: max }
            })(),
            salary_range: row.salary_range ?? null,
            application_deadline: row.application_deadline ?? null,
          }
        })
        setJobs(normalized)
      }
      // イベント取得
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const { data: evData, error: evErr } = await supabase
        .from("events")
        .select("id,title,cover_image,event_type,event_date")
        .eq("status", "published")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(4)
        .returns<EventRow[]>();

      if (evErr) {
        console.error("events fetch error", evErr);
      } else {
        setEvents(evData ?? []);
      }
      setLoading(false)
    })()
  }, [isLoggedIn])

  /* ------------- derived options ---------- */
  // industries computed from jobs is no longer needed; use INDUSTRY_OPTIONS for options

  /* ------------- filter logic ------------- */
  const displayedUnsorted = useMemo(() => {
    return jobs.filter((j) => {
      const q = search.toLowerCase()
      const matchesQ =
        q === "" ||
        j.title?.toLowerCase().includes(q) ||
        j.companies?.name?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q)

      const matchesInd =
        industriesSelected.length === 0 ||
        industriesSelected.some((opt) => (j.industry ?? "").toLowerCase().includes(opt.toLowerCase()));

      const matchesJob =
        jobTypesSelected.length === 0 ||
        jobTypesSelected.some((opt) => (j.job_type ?? "").toLowerCase().includes(opt.toLowerCase()));

      // 開催形式・開催日（説明会／イベント・インターン（短期）のときのみ適用）
      const eventLike = ["event", "internship_short"].includes(selectionType);
      const matchesEventFormat = eventLike
        ? (eventFormat === "all" || (j.event_format ?? "") === eventFormat)
        : true;

      // 開催日: 期間指定（YYYY-MM）の文字列比較で範囲判定
      // イベントは event_date(月)を単一点で判定
      // インターン（短期）は start_date〜end_date の「期間」とユーザー指定範囲の重なりで判定
      const effectiveEventTo = selectionType === "internship_short" ? eventTo : "";

      // 文字列比較のため YYYY-MM に正規化するヘルパ
      const toMonth = (v?: string | null) => (v ? v.slice(0, 7) : "");

      // 各タイプごとの基準フィールド
      const eventMonth = selectionType === "event" ? toMonth(j.event_date) : "";
      const internStartMonth =
        selectionType === "internship_short" ? toMonth((j as any).start_date) : "";
      const internEndMonth =
        selectionType === "internship_short"
          ? toMonth((j as any).end_date || (j as any).start_date)
          : "";

      // 重なり判定（[aStart,aEnd] と [bStart,bEnd] が1日でも重なれば true）
      // ここでは月単位なので文字列比較でOK（YYYY-MM フォーマット）
      const rangesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
        // 空値を含む場合の安全側ロジック
        if (!aStart && !aEnd) return true; // ユーザー側未指定
        if (!bStart && !bEnd) return false; // 求人側未設定
        const effAStart = aStart || "0000-00";
        const effAEnd   = aEnd   || "9999-99";
        const effBStart = bStart || "0000-00";
        const effBEnd   = bEnd   || "9999-99";
        return !(effBEnd < effAStart || effBStart > effAEnd);
      };

      const matchesEventDate = eventLike
        ? (
            // イベント: event_date が from〜to(※toはイベントでは無視される)の範囲に入るか
            selectionType === "event"
              ? (
                  (!eventFrom ? true : (!!eventMonth && eventMonth === eventFrom))
                )
              : (
                  // インターン（短期）: 期間重なりで判定
                  rangesOverlap(
                    eventFrom || "",                // ユーザー開始月
                    effectiveEventTo || "",         // ユーザー終了月
                    internStartMonth,               // 求人開始月
                    internEndMonth                  // 求人終了月(なければ開始月で代替)
                  )
                )
          )
        : true;

      // 年収フィルターは本選考のときのみ適用
      const matchesSalary =
        selectionType === "fulltime"
          ? (salaryMin === "all" || (j.salary_max ?? j.salary_min ?? 0) >= Number(salaryMin))
          : true;

      // treat legacy & canonical keys as identical
      const isSameSelection = (
        selFilter: string,
        selJob: string | null | undefined,
      ) => {
        if (selFilter === "all") return true;
        const f = selFilter ?? "";
        const jv = selJob ?? "";
        // canonicalise legacy alias
        const canon = (v: string) =>
          v === "intern_long" ? "internship_long" : v;
        return canon(f) === canon(jv);
      };

      const matchesCategory = isSameSelection(selectionType, j.selection_type);

      return (
        matchesQ &&
        matchesInd &&
        matchesJob &&
        matchesSalary &&
        matchesEventFormat &&
        matchesEventDate &&
        matchesCategory
      );
    })
  }, [jobs, search, industriesSelected, jobTypesSelected, salaryMin, selectionType, eventFrom, eventTo, eventFormat])

  const displayed = useMemo(() => {
    const arr = [...displayedUnsorted];
    if (sortKey === "deadline") {
      return arr.sort((a, b) => {
        const da = a.application_deadline ? new Date(a.application_deadline).getTime() : Infinity;
        const db = b.application_deadline ? new Date(b.application_deadline).getTime() : Infinity;
        return da - db;
      });
    }
    // newest
    return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [displayedUnsorted, sortKey]);

  const closingSoon = useMemo(() => {
    return jobs.filter((j) => {
      if (j.selection_type !== "internship_short" || !j.application_deadline) return false
      const daysLeft =
        (new Date(j.application_deadline).getTime() - Date.now()) / 86400000
      return daysLeft >= 0 && daysLeft <= 7 // 7日以内に締切
    })
  }, [jobs])

  /* ----- category lists for grouped view ----- */
  const fulltimeJobs = displayed.filter(
    (j) => j.selection_type === "fulltime",
  );

  const internJobs = displayed.filter((j) =>
    ["internship_short", "internship_long", "intern_long"].includes(
      j.selection_type ?? "",
    ),
  );

  const eventJobs = displayed.filter((j) => j.selection_type === "event");

  /* ------------- helpers ------------------ */
  // --- job_interests helpers ---
  const addInterest = async (jobId: string) => {
    if (!studentId) return;
    const { error } = await supabase
      .from("job_interests")
      .insert({ student_id: studentId, job_id: jobId });
    if (error) {
      console.error("addInterest error", error);
      // 失敗したらロールバック
      setSaved((prev) => {
        const next = new Set(prev); next.delete(jobId); return next;
      });
    }
  };

  const removeInterest = async (jobId: string) => {
    if (!studentId) return;
    const { error } = await supabase
      .from("job_interests")
      .delete()
      .eq("student_id", studentId)
      .eq("job_id", jobId);
    if (error) {
      console.error("removeInterest error", error);
      // 失敗したらロールバック
      setSaved((prev) => {
        const next = new Set(prev); next.add(jobId); return next;
      });
    }
  };

  const toggleSave = async (id: string) => {
    // ローカル即時反映（楽観的更新）
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

    if (studentId) {
      // サーバ同期
      if (saved.has(id)) {
        // 直前の状態を参照すると競合するため、存在チェックではなく try-delete/insert に寄せる
        await removeInterest(id);
      } else {
        await addInterest(id);
      }
    } else {
      // 未ログインは従来通り localStorage を使用
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("savedJobs");
        let arr: string[] = [];
        try { arr = raw ? JSON.parse(raw) : []; } catch { arr = []; }
        const set = new Set(arr);
        set.has(id) ? set.delete(id) : set.add(id);
        localStorage.setItem("savedJobs", JSON.stringify(Array.from(set)));
      }
    }
  };

  const tagColor = () => "bg-gray-100 text-gray-800"

  /* ------------- UI ----------------------- */
  const router = useRouter()
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const committed = query.trim();
    setSearch(committed);                 // update filter keyword
    router.push(`/jobs/list?${buildParams(committed)}`);
  };
  const applyFilters = () => {
    const path = typeof window !== "undefined" ? window.location.pathname : "/jobs/list";
    router.push(`${path}?${buildParams()}`);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setIndustriesSelected([]);
    setJobTypesSelected([]);
    setSelectionType("all");
    setSalaryMin("all");
    setEventFrom("");
    setEventTo("");
    setEventFormat("all");
    setQuery("");
    setSearch("");
    const path = typeof window !== "undefined" ? window.location.pathname : "/jobs/list";
    router.push(path);
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 h-10 w-72 animate-pulse rounded-full bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border-0 shadow-md">
              <div className="h-32 w-full animate-pulse bg-gray-200" />
              <div className="space-y-2 p-4">
                <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <main className="container py-8">
        <p className="text-destructive">{error}</p>
      </main>
    )
  }

  return (
    <>
      <Head>
        <title>学生転職 | インターン・本選考求人一覧</title>
        <meta
          name="description"
          content="学生転職であなたに合ったインターンや本選考求人を見つけましょう。業界・職種・年収など多彩なフィルターで簡単検索。締切間近の求人も見逃さずチェック！"
        />
        <meta property="og:title" content="学生転職 | インターン・本選考求人一覧" />
        <meta
          property="og:description"
          content="学生向けインターン・本選考求人を多数掲載。あなたにぴったりのキャリアを探すなら学生転職。"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://culture.gakuten.co.jp/jobs" />
        <meta property="og:image" content="/ogp/jobs.png" />
        <link rel="canonical" href="https://culture.gakuten.co.jp/jobs" />
      </Head>
      <div className="min-h-screen bg-gray-50 pb-20">
      {/* Featured Banners Carousel */}

      {/* Featured Banners Carousel */}
      <section className="py-6 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {FEATURED_BANNERS.map((banner) => (
              <div key={banner.id} className={`${banner.color} rounded-xl overflow-hidden shadow-lg relative`}>
                <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between">
                  <div>
                    <h2 className={`text-3xl font-bold ${banner.textColor}`}>{banner.title}</h2>
                    <div
                      className={`inline-block ${banner.textColor} border-2 border-white px-4 py-1 rounded-full mt-2`}
                    >
                      {banner.subtitle}
                    </div>
                  </div>
                  <div>
                    <div className="flex gap-2 mt-4">
                      {banner.companies.map((company, idx) => (
                        <div key={idx} className="bg-white rounded-md p-1 w-16 h-16 flex items-center justify-center">
                          <Image
                            src={company.logo || "/placeholder.svg"}
                            alt={company.name}
                            width={60}
                            height={60}
                            className="object-contain"
                          />
                        </div>
                      ))}
                    </div>
                    <Button className="mt-4 bg-amber-400 hover:bg-amber-500 text-gray-800 font-bold" aria-label="この特集を今すぐチェック">
                      今すぐチェック
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/2 opacity-20">
                  <Image src={banner.image || "/placeholder.svg"} alt={banner.title} fill className="object-cover" />
                </div>
                <div className="absolute top-0 right-0 bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium rounded-bl-lg">
                  2025.06.02 更新
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 bg-gradient-to-r from-red-500 to-red-600">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">選考一覧</h1>
            <p className="text-sm text-gray-500 mb-6">インターン・本選考・イベントをまとめて検索できます</p>

            {/* search & toggles */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Input
                  placeholder="職種、キーワード、会社名で検索"
                  className="pr-24 pl-4 py-3 rounded-full border-gray-300 text-base"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button
                  type="submit"
                  className="absolute right-0 top-0 h-full rounded-l-none rounded-r-full bg-red-600 hover:bg-red-700 shadow px-6 flex items-center gap-2"
                >
                  <Search size={16} />
                  検索
                </Button>
              </div>

              {/* filter toggle (mobile) */}
              <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 md:hidden rounded-full font-medium">
                    <Filter size={16} />
                    条件を絞り込む
                  </Button>
                </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                <FilterPanel
                  jobTypeOptions={JOB_TYPE_OPTIONS as unknown as string[]}
                  industriesSelected={industriesSelected}
                  setIndustriesSelected={setIndustriesSelected}
                  jobTypesSelected={jobTypesSelected}
                  setJobTypesSelected={setJobTypesSelected}
                  selectionType={selectionType}
                  setSelectionType={setSelectionType}
                  salaryMin={salaryMin}
                  setSalaryMin={setSalaryMin}
                  eventFrom={eventFrom}
                  setEventFrom={setEventFrom}
                  eventTo={eventTo}
                  setEventTo={setEventTo}
                  eventFormat={eventFormat}
                  setEventFormat={setEventFormat}
                />
                <div className="mt-4 space-y-3 pb-24">
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="w-full rounded-full">
                      <SelectValue placeholder="並び替え" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white p-3">
                  <div className="container mx-auto flex max-w-4xl gap-2">
                    <Button variant="outline" className="w-1/3 rounded-full" onClick={clearFilters}>
                      リセット
                    </Button>
                    <Button className="w-2/3 rounded-full" onClick={applyFilters}>
                      この条件で検索
                    </Button>
                  </div>
                </div>
              </SheetContent>
              </Sheet>

              {/* grid/list toggle */}
              <div className="flex gap-2">
                <Button
                  variant={view === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setView("grid")}
                  className="rounded-full"
                  aria-label="グリッド表示に切り替え"
                  title="グリッド表示に切り替え"
                >
                  <svg width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                    <rect x="1" y="1" width="6" height="6" />
                    <rect x="9" y="1" width="6" height="6" />
                    <rect x="1" y="9" width="6" height="6" />
                    <rect x="9" y="9" width="6" height="6" />
                  </svg>
                </Button>
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setView("list")}
                  className="rounded-full"
                  aria-label="リスト表示に切り替え"
                  title="リスト表示に切り替え"
                >
                  <svg width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="4" y1="4" x2="15" y2="4" />
                    <line x1="4" y1="8" x2="15" y2="8" />
                    <line x1="4" y1="12" x2="15" y2="12" />
                    <circle cx="2" cy="4" r="1" />
                    <circle cx="2" cy="8" r="1" />
                    <circle cx="2" cy="12" r="1" />
                  </svg>
                </Button>
              </div>
            </form>

            {/* desktop inline filters */}
            <div className="mt-4 hidden flex-wrap gap-3 md:flex">
              <IndustryMultiSelect
                selected={industriesSelected}
                onChange={setIndustriesSelected}
                options={INDUSTRY_OPTIONS as unknown as string[]}
              />

              <JobTypeMultiSelect
                selected={jobTypesSelected}
                onChange={setJobTypesSelected}
                options={JOB_TYPE_OPTIONS as unknown as string[]}
              />

              <Select value={selectionType} onValueChange={setSelectionType}>
                <SelectTrigger className="w-48 rounded-full">
                  <SelectValue placeholder="選考種類" />
                </SelectTrigger>
                <SelectContent>
                  {SELECTION_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectionType === "fulltime" && (
                <Select value={salaryMin} onValueChange={setSalaryMin}>
                  <SelectTrigger className="w-40 rounded-full">
                    <SelectValue placeholder="年収" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALARY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {["event", "internship_short"].includes(selectionType) && (
                <>
                  <DateInputWithPlaceholder
                    value={eventFrom}
                    onChange={setEventFrom}
                    placeholder="開始日"
                    className="w-44"
                  />
                  {selectionType === "internship_short" && (
                    <DateInputWithPlaceholder
                      value={eventTo}
                      onChange={setEventTo}
                      placeholder="終了日"
                      className="w-44"
                    />
                  )}
                  <Select value={eventFormat} onValueChange={setEventFormat}>
                    <SelectTrigger className="w-44 rounded-full">
                      <SelectValue placeholder="開催形式" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_FORMAT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Button className="rounded-full" onClick={applyFilters}>
                この条件で検索
              </Button>
              <Button variant="ghost" className="rounded-full" onClick={clearFilters}>
                条件をリセット
              </Button>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-40 rounded-full">
                  <SelectValue placeholder="並び替え" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 hidden items-center justify-between md:flex">
              <p className="text-sm text-gray-600">該当件数：<span className="font-semibold">{displayed.length}</span> 件</p>
            </div>
           

            {/* 注目のキーワード (Featured Keywords) — 一時停止中
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">注目キーワード</h3>
              <div className="flex flex-wrap gap-2">
                {FEATURED_KEYWORDS.map((kw) => (
                  <Badge
                    key={kw}
                    className="bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer rounded-full px-3"
                    onClick={() => {
                      setQuery(kw);
                      setSearch(kw);
                      router.push(`/jobs/list?${buildParams(kw)}`);
                    }}
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
            */}
          </div>
        </div>
      </section>

      {/* Events Section */}
      {events.length > 0 && (
        <section className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">学生転職主催イベント</h2>
            <Link
              href="/events"
              className="text-red-600 hover:underline flex items-center"
            >
              すべて見る
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {events.map((ev) => {
              const daysLeft = Math.ceil(
                (new Date(ev.event_date).getTime() - Date.now()) / 86400000,
              );
              const badge =
                daysLeft <= 4 && daysLeft >= 0
                  ? `締切${daysLeft}日前!`
                  : "PickUp!";
              const badgeColor =
                daysLeft <= 4 && daysLeft >= 0 ? "bg-red-500" : "bg-blue-600";
              return (
                <Card key={ev.id} className="overflow-hidden border-0 shadow-lg">
                  <div className="relative">
                    <Image
                      src={ev.cover_image || "/placeholder.svg"}
                      alt={ev.title}
                      width={600}
                      height={200}
                      className="w-full h-48 object-cover"
                    />
                    <div
                      className={`absolute top-4 left-0 ${badgeColor} text-white px-4 py-1 font-bold`}
                    >
                      {badge}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg line-clamp-2 mb-2">
                      {ev.title}
                    </h3>
                    <div className="flex gap-2 mt-4">
                      {ev.event_type && (
                        <Badge variant="outline" className="rounded-full">
                          {ev.event_type}
                        </Badge>
                      )}
                      <span className="text-sm text-gray-500">
                        {formatDate(ev.event_date)}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* content */}
      <main className="container mx-auto max-w-6xl px-4 py-8">
        {/* ---------- 求人カテゴリごとの表示 ---------- */}
        <section className="space-y-10">
          {/* 本選考 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <CategoryHeader
                icon={<Briefcase size={16} />}
                label="本選考"
                colorClass="bg-gradient-to-br from-indigo-500 to-indigo-700"
              />
              <Link
                href="/jobs/list?tab=fulltime&selectionType=fulltime"
                className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
              >
                もっと見る（{fulltimeJobs.length}） <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <JobGrid
              jobs={fulltimeJobs}
              view={view}
              saved={saved}
              toggleSave={toggleSave}
              tagColor={tagColor}
              isLoggedIn={isLoggedIn}
              singleRow
            />
          </div>

          {/* インターンシップ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <CategoryHeader
                icon={<GraduationCap size={16} />}
                label="インターンシップ"
                colorClass="bg-gradient-to-br from-pink-500 to-pink-700"
              />
              <Link
                href="/jobs/list?tab=intern&selectionType=intern_long"
                className="text-sm text-pink-600 hover:underline flex items-center gap-1"
              >
                もっと見る（{internJobs.length}） <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <JobGrid
              jobs={internJobs}
              view={view}
              saved={saved}
              toggleSave={toggleSave}
              tagColor={tagColor}
              isLoggedIn={isLoggedIn}
              singleRow
            />
          </div>

          {/* 説明会／イベント */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <CategoryHeader
                icon={<Mic size={16} />}
                label="説明会／イベント"
                colorClass="bg-gradient-to-br from-purple-500 to-purple-700"
              />
              <Link
                href="/jobs/list?tab=event&selectionType=event"
                className="text-sm text-purple-600 hover:underline flex items-center gap-1"
              >
                もっと見る（{eventJobs.length}） <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <JobGrid
              jobs={eventJobs}
              view={view}
              saved={saved}
              toggleSave={toggleSave}
              tagColor={tagColor}
              isLoggedIn={isLoggedIn}
              singleRow
            />
          </div>
        </section>
      </main>

      {/* "締め切り間近なインターン" Section */}
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">締め切り間近なインターン</h2>
          <Link
            href="/jobs/list?tab=intern&selectionType=intern_long"
            className="flex items-center gap-1 text-red-600 hover:underline"
          >
            すべて見る
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 期限が迫っているインターンをグリッド表示（既存の JobGrid を再利用） */}
        <JobGrid
          jobs={closingSoon}
          view={view}
          saved={saved}
          toggleSave={toggleSave}
          tagColor={tagColor}
          isLoggedIn={isLoggedIn}
        />
      </section>

    </div>
    </>
  )
}


/** ── 求人カテゴリ見出し ─────────────────────────── */
function CategoryHeader({
  icon,
  label,
  colorClass,
}: {
  icon: JSX.Element
  label: string
  colorClass: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4 md:mb-6">
      <div className={`${colorClass} rounded-md p-2 text-white flex items-center justify-center`}>
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-gray-800">{label}</h2>
    </div>
  )
}

/* =============== components ================ */
/** Date input that shows a visible placeholder until focused/filled */
function DateInputWithPlaceholder({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  className?: string
}) {
  const [isDateMode, setIsDateMode] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <Input
        type={isDateMode ? "month" : "text"}
        value={value}
        onFocus={() => setIsDateMode(true)}
        onBlur={(e) => {
          if (!e.currentTarget.value) setIsDateMode(false);
        }}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full pr-16 pl-4"
        placeholder={isDateMode ? "" : placeholder}
        aria-label={placeholder}
        title={placeholder}
      />
      {/* Calendar icon */}
      <div className="pointer-events-none absolute inset-y-0 right-8 flex items-center text-muted-foreground">
        <Calendar size={16} />
      </div>
      {/* Clear button when value is present */}
      {value && (
        <button
          type="button"
          className="absolute inset-y-0 right-2 my-auto h-7 w-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center"
          aria-label={`${placeholder} をクリア`}
          title={`${placeholder} をクリア`}
          onClick={() => {
            onChange("");
            // restore placeholder mode when cleared
            setIsDateMode(false);
          }}
        >
          <span aria-hidden>×</span>
        </button>
      )}
    </div>
  );
}

function FilterPanel({
  jobTypeOptions,
  industriesSelected,
  setIndustriesSelected,
  jobTypesSelected,
  setJobTypesSelected,
  selectionType,
  setSelectionType,
  salaryMin,
  setSalaryMin,
  eventFrom,
  setEventFrom,
  eventTo,
  setEventTo,
  eventFormat,
  setEventFormat,
}: {
  jobTypeOptions: string[]
  industriesSelected: string[]
  setIndustriesSelected: (v: string[]) => void
  jobTypesSelected: string[]
  setJobTypesSelected: (v: string[]) => void
  selectionType: string
  setSelectionType: (v: string) => void
  salaryMin: string
  setSalaryMin: (v: string) => void
  eventFrom: string
  setEventFrom: (v: string) => void
  eventTo: string
  setEventTo: (v: string) => void
  eventFormat: string
  setEventFormat: (v: string) => void
}) {
  return (
    <div className="space-y-4 py-4">
      <IndustryMultiSelect
        selected={industriesSelected}
        onChange={setIndustriesSelected}
        options={INDUSTRY_OPTIONS as unknown as string[]}
      />

      <JobTypeMultiSelect
        selected={jobTypesSelected}
        onChange={setJobTypesSelected}
        options={jobTypeOptions}
      />

      <Select value={selectionType} onValueChange={setSelectionType}>
        <SelectTrigger className="rounded-full">
          <SelectValue placeholder="選考種類" />
        </SelectTrigger>
        <SelectContent>
          {SELECTION_TYPES.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectionType === "fulltime" && (
        <Select value={salaryMin} onValueChange={setSalaryMin}>
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="年収" />
          </SelectTrigger>
          <SelectContent>
            {SALARY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {["event", "internship_short"].includes(selectionType) && (
        <>
          <DateInputWithPlaceholder
            value={eventFrom}
            onChange={setEventFrom}
            placeholder="開始日"
          />
          {selectionType === "internship_short" && (
            <DateInputWithPlaceholder
              value={eventTo}
              onChange={setEventTo}
              placeholder="終了日"
            />
          )}
          <Select value={eventFormat} onValueChange={setEventFormat}>
            <SelectTrigger className="rounded-full">
              <SelectValue placeholder="開催形式" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_FORMAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  )
}

function IndustryMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="rounded-full min-w-[10rem] justify-between">
          <span>業種{selected.length > 0 ? `（${selected.length}）` : ""}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">業種（複数選択可）</span>
          {selected.length > 0 && (
            <button
              type="button"
              className="text-xs text-red-600 hover:underline"
              onClick={() => onChange([])}
            >
              クリア
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function JobGrid({
  jobs,
  view,
  saved,
  toggleSave,
  tagColor,
  isLoggedIn,
  singleRow = false,
}: {
  jobs: JobRow[];
  view: "grid" | "list";
  saved: Set<string>;
  toggleSave: (id: string) => void;
  tagColor: (t: string) => string;
  isLoggedIn: boolean;
  singleRow?: boolean;
}) {
  if (!jobs.length)
    return (
      <Card className="border-dashed p-8 text-center">
        <p className="mb-3 text-gray-600">該当する選考情報がありません。</p>
        <div className="flex items-center justify-center gap-2">
          <Link href="/jobs/list">
            <Button variant="outline" className="rounded-full">全件を見る</Button>
          </Link>
          <Link href="/jobs/list">
            <Button variant="ghost" className="rounded-full">条件をリセット</Button>
          </Link>
        </div>
      </Card>
    )

  /* ----- list view ----- */
  if (view === "list") {
    return (
      <div className="flex flex-col gap-4">
        {jobs.map((j) => (
          <Card key={j.id} className="flex overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow transition-transform hover:-translate-y-0.5">
            <Link
              href={`/jobs/${j.id}`}
              className="flex flex-1 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              <div className="relative hidden sm:block">
                {j.cover_image_url ? (
                  <Image
                    src={j.cover_image_url}
                    alt="cover"
                    width={160}
                    height={120}
                    className="h-[120px] w-40 object-cover"
                  />
                ) : (
                  <div className="h-[120px] w-40 bg-gradient-to-br from-gray-100 to-gray-200" />
                )}
                {j.companies?.logo && (
                  <Image
                    src={j.companies.logo || "/placeholder.svg"}
                    alt={j.companies?.name ?? "logo"}
                    width={48}
                    height={48}
                    className="absolute bottom-2 left-2 rounded-full border-2 border-white bg-white object-contain"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4 py-3 group">
                <span className={getSelectionLabelClass(j.selection_type)}>
                  {SELECTION_ICONS[j.selection_type ?? "fulltime"]}
                  {SELECTION_LABELS[j.selection_type ?? "fulltime"]}
                </span>
                <h3 className="text-lg font-bold leading-snug line-clamp-2 group-hover:underline">{j.title}</h3>
                <p className="text-sm text-gray-600">
                  {j.companies?.name ?? "-"} / {j.location}
                </p>
                <p className="text-sm text-gray-700 line-clamp-1">{j.description ?? ""}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(j.tags ?? []).slice(0, 3).map((t) => (
                    <Badge key={t} className="bg-red-100 text-red-700 rounded-full">
                      {t}
                    </Badge>
                  ))}
                  {Array.isArray(j.tags) && j.tags.length > 3 && (
                    <Badge variant="outline" className="rounded-full">+{j.tags.length - 3}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {/* Location removed as meta row */}
                  {(j.salary_min || j.salary_max) && (
                    <>
                      <Briefcase size={12} />
                      <span>
                        {j.salary_min && j.salary_max
                          ? `${j.salary_min}万 – ${j.salary_max}万`
                          : j.salary_min
                          ? `${j.salary_min}万〜`
                          : `${j.salary_max}万以下`}
                      </span>
                    </>
                  )}
                  {j.application_deadline && (
                    <>
                      <Calendar size={12} />
                      <span>締切 {formatDate(j.application_deadline)}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-pressed={saved.has(j.id)}
              aria-label={saved.has(j.id) ? "保存済み" : "保存する"}
              title={isLoggedIn ? "保存/解除" : "ログインすると端末間で同期されます"}
              onClick={async (e) => {
                e.stopPropagation();
                await toggleSave(j.id);
              }}
            >
              <Heart className={saved.has(j.id) ? "fill-red-500 text-red-500" : ""} />
            </Button>
          </Card>
        ))}
      </div>
    )
  }

  /* ----- grid view ----- */
  return (
    <div
      className={
        singleRow
          ? "grid grid-flow-col auto-cols-[minmax(250px,1fr)] gap-4 overflow-x-auto"
          : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      }
    >
      {jobs.map((j) => (
        <Card
          key={j.id}
          className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow rounded-xl"
        >
          <Link
            href={`/jobs/${j.id}`}
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <div className="relative h-32 w-full overflow-hidden">
              {j.cover_image_url ? (
                <Image
                  src={j.cover_image_url}
                  alt="cover"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {j.companies?.logo && (
                <Image
                  src={j.companies.logo || "/placeholder.svg"}
                  alt={j.companies?.name ?? "logo"}
                  width={64}
                  height={64}
                  className="absolute bottom-2 left-2 rounded-full border-2 border-white bg-white object-contain"
                />
              )}
              {j.is_featured && (
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-xs font-medium text-yellow-900">
                  <Star size={12} />
                  おすすめ
                </div>
              )}
            </div>
            <div className="p-4 py-3 group">
              <span className={getSelectionLabelClass(j.selection_type)}>
                {SELECTION_ICONS[j.selection_type ?? "fulltime"]}
                {SELECTION_LABELS[j.selection_type ?? "fulltime"]}
              </span>
              <h3 className="mb-1 font-bold leading-snug line-clamp-2 group-hover:underline">{j.title}</h3>
              <p className="line-clamp-1 text-sm text-gray-600">
                {j.companies?.name ?? "-"}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-gray-600">{j.description ?? ""}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(j.tags ?? []).slice(0, 3).map((t) => (
                  <Badge key={t} className="bg-red-100 text-red-700 rounded-full">
                    {t}
                  </Badge>
                ))}
                {Array.isArray(j.tags) && j.tags.length > 3 && (
                  <Badge variant="outline" className="rounded-full">+{j.tags.length - 3}</Badge>
                )}
              </div>
              {(j.salary_min || j.salary_max || j.application_deadline) && (
                <div className="mt-3 text-xs text-gray-500 flex gap-1 items-center">
                  {(j.salary_min || j.salary_max) && (
                    <span>
                      {j.salary_min && j.salary_max
                        ? `${j.salary_min}万 – ${j.salary_max}万`
                        : j.salary_min
                        ? `${j.salary_min}万〜`
                        : `${j.salary_max}万以下`}
                    </span>
                  )}
                  {j.application_deadline && (
                    <>
                      <Calendar size={12} />
                      <span>締切 {formatDate(j.application_deadline)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 bg-white/80 hover:bg-white rounded-full"
            aria-pressed={saved.has(j.id)}
            aria-label={saved.has(j.id) ? "保存済み" : "保存する"}
            title={isLoggedIn ? "保存/解除" : "ログインすると端末間で同期されます"}
            onClick={async (e) => {
              e.stopPropagation();
              await toggleSave(j.id);
            }}
          >
            <Heart size={18} className={saved.has(j.id) ? "fill-red-500 text-red-500" : ""} />
          </Button>
        </Card>
      ))}
    </div>
  )
}

function JobTypeMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="rounded-full min-w-[10rem] justify-between">
          <span>職種{selected.length > 0 ? `（${selected.length}）` : ""}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">職種（複数選択可）</span>
          {selected.length > 0 && (
            <button
              type="button"
              className="text-xs text-red-600 hover:underline"
              onClick={() => onChange([])}
            >
              クリア
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(opt)} onCheckedChange={() => toggle(opt)} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}