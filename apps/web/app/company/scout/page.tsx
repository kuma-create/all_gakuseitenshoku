"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Database } from "@/lib/supabase/types"

import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/lib/hooks/use-toast"
import { supabase as sb } from "@/lib/supabase/client"

import StudentList from "./StudentList"
import ScoutDrawer from "./ScoutDrawer"

import clsx from "clsx"

import { Checkbox } from "@/components/ui/checkbox"
import SkillPicker from "@/components/SkillPicker"
import QualificationPicker from "@/components/QualificationPicker"

/* ──────────────── 定数: ステータス日本語ラベル ──────────────── */
const STATUS_LABEL: Record<string, string> = {
  sent:     "送信済み",
  opened:   "開封済み",
  viewed:   "開封済み",
  replied:  "返信あり",
  accepted: "承諾",
  declined: "辞退",
  pending:  "未対応",
}

/* ──────────────── 定数: フィルタ固定リスト ──────────────── */
/** 47 都道府県 + 海外 + リモート */
const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
  "海外","リモート"
] as const

/** 性別の選択肢 */
const GENDER_OPTIONS = ["男性", "女性"] as const

/** 固定の役職リスト */
const POSITION_OPTIONS = ["メンバー","リーダー","マネージャー","責任者","役員","代表"] as const



/** 固定の希望職種リスト */
const JOB_POSITIONS = [
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
] as const

// 希望フェーズ選択肢（mapping object）
const PHASE_OPTIONS: Record<string, string> = {
  newgrad: "新卒",
  intern: "インターン探し中",
}

/* ──────────────── 型定義 ──────────────── */
type StudentRow = Database["public"]["Tables"]["student_profiles"]["Row"]
type ScoutRow   = Database["public"]["Tables"]["scouts"]["Row"]
type TemplateRow = Database["public"]["Tables"]["scout_templates"]["Row"]

/**
 * 学生データ型
 * - Supabase の `student_profiles` 行に独自の画面用プロパティを足したもの
 * - 既存列はそのまま保持するため `StudentRow & { ... }` の交差型で定義
 */
type Student = StudentRow & {
  /** レジュメ(work_experiences) のネストデータ */
  resumes?: {
    work_experiences: any[] | null
    form_data?: any | null
  }[]

  /** 一覧用: 履歴書＋職務経歴書入力率（0‑100） */
  match_score?: number

  /** 一覧用: 「◯分前」など表示用の文字列 */
  last_active?: string

  /* ──────── 追加: 型ジェネレーター未更新列を補完 ──────── */
  major?: string | null
  location?: string | null
  skills?: string[] | null
  qualifications?: string[] | null
  /** タグ（例: "オファー済み" など）*/
  tags?: string[] | null
  /** 経験職種（student_resume_jobtypes.job_types）*/
  job_types?: string[] | null
  has_internship_experience?: boolean | null
  graduation_year?: number | null
  status?: string | null
  /** 卒業月（日付型で管理）*/
  graduation_month?: string | null
}

/* ──────────────── ページ本体 ──────────────── */
export default function ScoutPage() {
  const router = useRouter()
  const { toast } = useToast()

  /* ── state ───────────────────────────── */
  const [loading, setLoading] = useState(true)

  const [companyId, setCompanyId] = useState<string | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [sentScouts, setSentScouts] = useState<ScoutRow[]>([])
  const [templates, setTemplates] = useState<TemplateRow[]>([])

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [drawerOpen, setDrawerOpen]         = useState(false)
  /** Drawer が「送信済み」モードかどうか */
  const [selectedAlreadySent, setSelectedAlreadySent] = useState(false)

  const [search, setSearch] = useState("")

  /* ── フィルタ state ───────────────────── */
  const [genders, setGenders] = useState<string[]>([])
  const [gradYears, setGradYears]         = useState<number[]>([])
  const [statuses, setStatuses]           = useState<string[]>([])
  const [selectedMajor, setSelectedMajor] = useState<string>("all")
  const [hasInternship, setHasInternship] = useState<boolean>(false)
  const [skills, setSkills]               = useState<string[]>([])
  const [qualificationsFilter, setQualificationsFilter] = useState<string[]>([])
  /** 希望職種（ドロップダウン：all or specific） */
  const [desiredPosition, setDesiredPosition] = useState<string>("all")
  /** 希望勤務地（ドロップダウン：all or specific） */
  const [desiredWorkLocation, setDesiredWorkLocation] = useState<string>("all")
  /** オファー済み除外フラグ */
  const [excludeOffer, setExcludeOffer] = useState<boolean>(false)
  /** 並び替え: score = マッチ度 / recent = 登録が新しい順 / name = 氏名順 / lastLogin = 最終ログイン日順 */
  const [sortBy, setSortBy] = useState<"score" | "recent" | "name" | "lastLogin">("score")

  /** 履歴書の経験職種(jobType)フィルタ */
  const [experienceJobTypes, setExperienceJobTypes] = useState<string[]>([])
  /** 職務経歴書の役職フィルタ (複数選択) */
  const [positionFilters, setPositionFilters] = useState<string[]>([])
  /** 就活フェーズフィルタ */
  const [phaseFilter, setPhaseFilter] = useState<string>("all")

  /* ── 初期ロード ───────────────────────── */
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      /* 認証 */
      const { data: { session }, error: authErr } = await sb.auth.getSession()
      if (authErr || !session) {
        router.push("/auth/signin")
        return
      }
      /* 会社 ID (owner / recruiter 共通) */
      const { data: member, error: memErr } = await sb
        .from("company_members")
        .select("company_id")
        .eq("user_id", session.user.id)
        .maybeSingle()
      if (memErr || !member) {
        toast({ title: "会社プロフィールが見つかりません", variant: "destructive" })
        return
      }
      const cid = member.company_id
      setCompanyId(cid)
      /* 学生一覧 */
      // 🔽 page.tsx の学生取得クエリをこれに置き換え
      const { data: stuRows, error: stuErr } = await sb
        .from("student_profiles")
        // ← レジュメのみを JOIN。経験職種は別クエリで取得する
        .select(`
          *,
          resumes!left(
            id,
            form_data,
            work_experiences
          )
        `)
      // ───────── 経験職種ビュー ─────────
      const { data: jtRows, error: jtErr } = await sb
        .from("student_resume_jobtypes")
        .select("student_id, job_types")
      if (jtErr) console.error("student_resume_jobtypes fetch error:", jtErr)
      const jobTypesMap = new Map<string, string[]>()
      ;(jtRows ?? []).forEach((r) => {
        if (r.student_id) {
          jobTypesMap.set(r.student_id, r.job_types ?? [])
        }
      })
      if (stuErr) {
        toast({ title: "学生取得エラー", description: stuErr.message, variant: "destructive" })
      } else {
        const now = Date.now()
        // 重複する id の学生は、resumes を持っている方を優先して deduplicate
        const mergedById: Map<string, Student> = new Map()
        for (const row of (stuRows ?? []) as any as Student[]) {
          /* ---------- completion helpers ---------- */
          const filled = (v: any) =>
            Array.isArray(v) ? v.length > 0 : v != null && v !== ""
          const pct = (arr: any[]) =>
            arr.length === 0 ? 0 : Math.round((arr.filter(filled).length / arr.length) * 100)
          /* ---------- 入力率（カテゴリ別） ---------- */
          const pBasic = [
            row.last_name, row.first_name,
            row.last_name_kana, row.first_name_kana,
            row.birth_date, row.gender, row.address_line,
          ]
          // 自己 PR はタイトルと本文の 2 項目を必須評価とする
          const pPR = [row.pr_title, row.pr_text]
          /* ---------- 希望条件 ---------- */
          const resume = Array.isArray(row.resumes) && row.resumes.length
            ? row.resumes[0]
            : null
          const cond = (resume?.form_data as any)?.conditions ?? {}
          const pPref = [
            // 希望職種
            (Array.isArray(row.desired_positions) && row.desired_positions.length)
              ? row.desired_positions
              : (cond.jobTypes ?? []),

            // 働き方オプション
            (Array.isArray(row.work_style_options) && row.work_style_options.length)
              ? row.work_style_options
              : (cond.workPreferences ?? cond.workStyle ?? null),

            // 希望業界
            (Array.isArray(row.preferred_industries) && row.preferred_industries.length)
              ? row.preferred_industries
              : (cond.industries ?? []),

            // 希望勤務地
            (Array.isArray(row.desired_locations) && row.desired_locations.length)
              ? row.desired_locations
              : (cond.locations ?? []),
          ]

          // 個別カテゴリの入力率
          const basicPct = pct(pBasic)   // 基本情報
          const prPct    = pct(pPR)      // 自己 PR
          const prefPct  = pct(pPref)    // 希望条件
          /* ---------- 職務経歴書入力率 ---------- */
          // ---------- work_experiences ---------- //
          // ソース: ① resumes.work_experiences と ② resumes.form_data.work_experiences
          // 両方をマージして評価する。必須 3 項目 (company, position, description)
          let worksRaw: unknown[] = []

          if (resume) {
            // ① 直下の work_experiences
            const direct = resume.work_experiences
            if (Array.isArray(direct)) {
              worksRaw.push(...direct)
            } else if (typeof direct === "string") {
              try { worksRaw.push(...JSON.parse(direct)) } catch {/* ignore */}
            }

            // ② form_data.work_experiences
            const nested = (resume.form_data as any)?.work_experiences
            if (Array.isArray(nested)) {
              worksRaw.push(...nested)
            } else if (typeof nested === "string") {
              try { worksRaw.push(...JSON.parse(nested)) } catch {/* ignore */}
            }
          }

          const works = worksRaw.filter(Boolean) as any[]  // null/undefined guard
          let totalReq = 0, totalFilled = 0
          works.forEach((w) => {
            totalReq += 3
            if (filled(w.company))                  totalFilled++
            // position (typo guard: positon)
            if (filled(w.position ?? w.positon))    totalFilled++
            if (filled(w.description))              totalFilled++
          })
          const workPct = totalReq ? Math.round((totalFilled / totalReq) * 100) : 0
          /* ---------- 総合入力率 ---------- */
          // ❶ 仕様変更: 職務経歴書スコアは work_experiences の充足率(workPct)のみで評価する
          //    フォーム(form_data.*) は寄与しない
          const resumeOverall = works.length === 0 ? 0 : workPct

          // ---- 総合入力率 ----
          // 基本情報 50% / 自己 PR 20% / 希望条件 15% / 職経歴書 15%
          const completionPct = Math.round(
            basicPct * 0.50 +
            prPct    * 0.30 +
            prefPct  * 0.20 +
            resumeOverall * 0
          )
          const normalized: Student = {
            ...row,
            match_score: completionPct,                       // ← match_score を入力率に置換
            last_active: row.created_at
              ? `${Math.round((now - new Date(row.created_at).getTime()) / 60000)}分前`
              : "",
          }
          // 経験職種をビューから付与
          if (normalized.job_types == null) {
            normalized.job_types = jobTypesMap.get(normalized.id) ?? null
          }
          // grad_year という列名で来るケースを補完
          if (
            normalized.graduation_year == null &&
            (row as any).grad_year != null
          ) {
            normalized.graduation_year = (row as any).grad_year
          }
          else if (
            normalized.graduation_year == null &&
            row.graduation_month != null
          ) {
            normalized.graduation_year = new Date(row.graduation_month).getFullYear()
          }
          const existed = mergedById.get(normalized.id)
          // 既に同じ id があれば、resumes を持っている方を優先（常に履歴を持つ行を優先）
          if (!existed) {
            mergedById.set(normalized.id, normalized)
          } else {
            const pick =
              Array.isArray(normalized.resumes) && normalized.resumes.length
                ? normalized
                : existed
            mergedById.set(normalized.id, pick)
          }
        }
        setStudents(Array.from(mergedById.values()))
      }
      /* スカウト履歴 */
      const { data: scoutRows } = await sb
        .from("scouts")
        .select("*")
        .eq("company_id", cid)
        .order("created_at", { ascending: false })
      setSentScouts(scoutRows ?? [])
      /* テンプレート */
      const { data: tplRows } = await sb
        .from("scout_templates")
        .select("*")
        .eq("company_id", cid)
        .order("created_at")
      setTemplates(tplRows ?? [])
      setLoading(false)
    }
    init()
    // Subscribe to profile updates to auto-refresh list
    const channel = sb
      .channel('student_profiles_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_profiles' },
        () => { init() }
      )
      .subscribe()
    return () => {
      sb.removeChannel(channel)
    }
  }, [router, toast])

  /** 学生データからユニークな卒業年リストを生成（昇順） */
  const availableGradYears = useMemo(() => {
    return [...new Set(
      students
        .map((s) =>
          s.graduation_year ??
          (s.graduation_month
            ? new Date(s.graduation_month).getFullYear()
            : null),
        )
        .filter((y): y is number => y != null && y >= 2026),  // ★ 2026 年以上のみ
    )].sort((a, b) => a - b)
  }, [students])

  /** 希望職種リスト（固定） */
  const availableDesiredPositions = JOB_POSITIONS
  /** 希望勤務地リスト（固定） */
  const availableDesiredWorkLocations = PREFECTURES

  /** オファー済み学生の id 一覧（scouts.offer_amount または offer_position が入っている学生を対象） */
  const offeredIds = useMemo<Set<string>>(() => {
    return new Set(
      sentScouts
        .filter((sc) => sc.offer_amount != null || sc.offer_position != null)
        .map((sc) => sc.student_id)
    )
  }, [sentScouts])

  /* ── フィルタリング ───────────── */
  const filtered = useMemo(() => {
    let list = students
    // [DEBUG] total students
    console.log("[DEBUG] total students:", students.length)
    // ★ 25 卒以下は非表示
    list = list.filter((s) => {
      const yr =
        s.graduation_year ??
        (s.graduation_month
          ? new Date(s.graduation_month).getFullYear()
          : null)
      return yr != null && yr >= 2026
    })

    /* 0) フリーワード */
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((s) => {
        const resume = s.resumes?.[0]
        const workTexts = Array.isArray(resume?.work_experiences)
          ? resume.work_experiences.map((w) =>
              [w.company, w.position, w.description, w.achievements]
                .filter(Boolean)
                .join(" ")
            ).join(" ")
          : ""

        return [s.university, s.major, workTexts]
          .join(" ")
          .toLowerCase()
          .includes(term)
      })
    }

    /* 1) 卒業年 */
    if (gradYears.length) {
      list = list.filter((s) => {
        const yr =
          s.graduation_year ??
          (s.graduation_month
            ? new Date(s.graduation_month).getFullYear()
            : null)
        return yr != null && gradYears.includes(yr)
      })
    }

    /* 2) ステータス（送信済み vs 未スカウト） */
    if (statuses.length) {
      list = list.filter((s) => {
        const sent = sentScouts.some((sc) => sc.student_id === s.id)
        return (
          (sent && statuses.includes("送信済み")) ||
          (!sent && statuses.includes("未スカウト"))
        )
      })
    }

    /* 2.5) フェーズ */
    if (phaseFilter !== "all") {
      const NEWGRAD_SET = new Set(["job_hunting", "both"]) // 新卒
      const INTERN_SET  = new Set(["want_intern", "intern_after_jobhunt", "both"]) // インターン探し中
      list = list.filter((s) => {
        const v = s.phase_status as string | null
        if (!v) return false
        return phaseFilter === "newgrad" ? NEWGRAD_SET.has(v) : INTERN_SET.has(v)
      })
    }

    /* -1) オファー済み除外 */
    if (excludeOffer) {
      list = list.filter((s) => !offeredIds.has(s.id))
    }

    /* 3) 専攻 */
    if (selectedMajor !== "all") {
      list = list.filter((s) => (s.major ?? "") === selectedMajor)
    }

    // 4) 地域フィルタ削除

    /* 5) インターン経験 */
    if (hasInternship) {
      list = list.filter((s) => s.has_internship_experience)
      console.log("[DEBUG] after internship filter:", list.length)
    }

    /* 6) 経験職種(jobType) */
    if (experienceJobTypes.length) {
      list = list.filter((s) =>
        (s.job_types ?? []).some((jt) => experienceJobTypes.includes(jt)),
      )
    }

    /* 6) スキル */
    if (skills.length) {
      list = list.filter((s) =>
        skills.every((sk) => (s.skills ?? []).includes(sk)),
      )
      console.log("[DEBUG] after skills filter:", list.length)
    }

    /* 7) 資格 */
    if (qualificationsFilter.length) {
      list = list.filter((s) =>
        qualificationsFilter.every((q) =>
          (s.qualifications ?? []).includes(q),
        ),
      )
    }

    /* 8) 希望職種 */
    if (desiredPosition !== "all") {
      list = list.filter((s) =>
        (s.desired_positions ?? []).includes(desiredPosition),
      )
    }

    /* -0) 性別フィルタ */
    if (genders.length) {
      list = list.filter((s) =>
        s.gender != null && genders.includes(s.gender)
      )
    }

    /* 役職・ポジション */
    if (positionFilters.length) {
      list = list.filter((s) => {
        // Ensure resumes is an array
        const resumesArr = Array.isArray(s.resumes) ? s.resumes : []
        // Flatten work_experiences entries from both direct and form_data
        const works: any[] = resumesArr.flatMap((r: any) => [
          ...(Array.isArray(r.work_experiences) ? r.work_experiences : []),
          ...(Array.isArray(r.form_data?.work_experiences) ? r.form_data.work_experiences : []),
        ])
        // Normalize each position
        const allPositions: string[] = works.map((w: any) => {
          const raw = typeof w.position === 'string'
            ? w.position
            : typeof w.positon === 'string'
            ? w.positon
            : ''
          return raw.replace(/\u3000/g, "").trim()
        })
        // Allow partial match of the filter value within the normalized positions
        return positionFilters.some(filter =>
          allPositions.some((p) => p.includes(filter))      
        )
      })
    }

    /* 9) 希望勤務地 */
    if (desiredWorkLocation !== "all") {
      list = list.filter((s) =>
        (s.desired_locations ?? []).includes(desiredWorkLocation),
      )
    }

    /* ── 並び替え ───────────────────── */
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "score":
          return (b.match_score ?? 0) - (a.match_score ?? 0)
        case "recent":
          return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        case "name":
          return (a.full_name ?? "").localeCompare(b.full_name ?? "", "ja")
        case "lastLogin":
          return new Date(b.last_sign_in_at ?? 0).getTime() - new Date(a.last_sign_in_at ?? 0).getTime()
        default:
          return 0
      }
    })

    return list
  }, [
    students,
    sentScouts,
    search,
    gradYears,
    statuses,
    excludeOffer,
    selectedMajor,
    hasInternship,
    experienceJobTypes,
    skills,
    qualificationsFilter,
    desiredPosition,
    desiredWorkLocation,
    genders, // 性別フィルタも依存に追加
    sortBy,
    offeredIds,
    positionFilters,
    phaseFilter,
  ])

  /* ── 送信処理（Drawer 経由） ───────────── */
  const handleSent = useCallback(
    (row: ScoutRow) => setSentScouts((prev) => [row, ...prev]),
    [],
  )

  /** 学生カードクリック時 */
  const handleSelect = useCallback((stu: Student) => {
    setSelectedStudent(stu)
    setSelectedAlreadySent(
      sentScouts.some((sc) => sc.student_id === stu.id)
    )
    setDrawerOpen(true)
  }, [sentScouts])

  /* ── UI ─────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">Loading...</div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <header className="shrink-0 border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">スカウト管理</h1>
      </header>

      <Tabs defaultValue="candidates" className="flex-1 overflow-hidden">
        <TabsList>
          <TabsTrigger value="candidates">候補学生</TabsTrigger>
          <TabsTrigger value="sent">送信済みスカウト</TabsTrigger>
        </TabsList>

        {/* ───────── 候補学生タブ ───────── */}
        <TabsContent
          value="candidates"
          className="h-[calc(100%-40px)] overflow-hidden"
        >
          <div className="flex h-full overflow-hidden">
            {/* ── Sidebar ───────────────────────────── */}
            <aside
              className="w-80 shrink-0 border-r px-4 py-4 overflow-y-auto sticky top-0 self-start h-[calc(100vh-120px)]"
            >
              {/* Sidebar Title */}
              <div className="mb-3">
                <h3 className="text-base font-semibold">絞り込み</h3>
                <p className="text-xs text-muted-foreground">条件を選んで学生一覧を絞り込めます</p>
              </div>

              {/* Reset (top quick) */}
              <div className="mb-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setExcludeOffer(false)
                    setSearch("")
                    setGradYears([])
                    setStatuses([])
                    setSelectedMajor("all")
                    setHasInternship(false)
                    setSkills([])
                    setQualificationsFilter([])
                    setDesiredPosition("all")
                    setDesiredWorkLocation("all")
                    setGenders([])
                    setPositionFilters([])
                    setPhaseFilter("all")
                    setSortBy("score")
                  }}
                >
                  すべてリセット
                </Button>
              </div>

              {/* フリーワード検索 */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="フリーワード検索"
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* 並び替え */}
              <details className="group mb-3" open>
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">並び替え</summary>
                <div className="pl-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "score" | "recent" | "name" | "lastLogin")}
                  >
                    <option value="score">入力率順</option>
                    <option value="recent">新着順</option>
                    <option value="lastLogin">最終ログイン日順</option>
                  </select>
                </div>
              </details>

              {/* オファー済み */}
              <details className="group mb-3" open>
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">オファー</summary>
                <div className="pl-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exclude-offer"
                      checked={excludeOffer}
                      onCheckedChange={(v) => setExcludeOffer(!!v)}
                    />
                    <label htmlFor="exclude-offer" className="text-sm">
                      オファー済を除く
                    </label>
                  </div>
                </div>
              </details>

              {/* フェーズ */}
              <details className="group mb-3" open>
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">フェーズ</summary>
                <div className="pl-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={phaseFilter}
                    onChange={(e) => setPhaseFilter(e.target.value)}
                  >
                    <option value="all">全て</option>
                    {Object.entries(PHASE_OPTIONS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </details>

              {/* 卒業年 */}
              <details className="group mb-3" open>
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">卒業年</summary>
                <div className="pl-1 space-y-1">
                  {availableGradYears.map((yr) => (
                    <div key={yr} className="flex items-center space-x-2 mb-1">
                      <Checkbox
                        id={`yr-${yr}`}
                        checked={gradYears.includes(yr)}
                        onCheckedChange={(v) =>
                          setGradYears((prev) =>
                            v ? [...prev, yr] : prev.filter((y) => y !== yr),
                          )
                        }
                      />
                      <label htmlFor={`yr-${yr}`} className="text-sm">
                        {yr}卒
                      </label>
                    </div>
                  ))}
                </div>
              </details>

              {/* 性別 */}
              <details className="group mb-3">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">性別</summary>
                <div className="pl-1">
                  {GENDER_OPTIONS.map((g) => (
                    <div key={g} className="flex items-center mb-1">
                      <Checkbox
                        id={`gender-${g}`}
                        checked={genders.includes(g)}
                        onCheckedChange={(v) =>
                          setGenders((prev) =>
                            v ? Array.from(new Set([...prev, g])) : prev.filter(x => x !== g)
                          )
                        }
                      />
                      <label htmlFor={`gender-${g}`} className="ml-2 text-sm">{g}</label>
                    </div>
                  ))}
                </div>
              </details>

              {/* 専攻 */}
              <details className="group mb-3">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">専攻</summary>
                <div className="pl-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={selectedMajor}
                    onChange={(e) => setSelectedMajor(e.target.value)}
                  >
                    <option value="all">全て</option>
                    {[...new Set(
                      students
                        .map((s) => s.major)
                        .filter((m): m is string => m != null),
                    )].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </details>

              {/* インターン経験 */}
              <details className="group mb-3">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">経験</summary>
                <div className="pl-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="intern"
                      checked={hasInternship}
                      onCheckedChange={(v) => setHasInternship(!!v)}
                    />
                    <label htmlFor="intern" className="text-sm">
                      インターン経験あり
                    </label>
                  </div>
                </div>
              </details>

              {/* 経験職種 */}
              <details className="group mb-3">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">経験職種</summary>
                <div className="pl-1">
                  {[
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
                  ].map((jt) => (
                    <div key={jt} className="flex items-center mb-1">
                      <Checkbox
                        id={`jobType-${jt}`}
                        checked={experienceJobTypes.includes(jt)}
                        onCheckedChange={(v) => {
                          setExperienceJobTypes((prev) =>
                            v ? [...prev, jt] : prev.filter((x) => x !== jt)
                          )
                        }}
                      />
                      <label htmlFor={`jobType-${jt}`} className="ml-2 text-sm">
                        {jt}
                      </label>
                    </div>
                  ))}
                </div>
              </details>

              {/* 役職・ポジション */}
              <details className="group mb-3">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">役職・ポジション</summary>
                <div className="pl-1">
                  {POSITION_OPTIONS.map((pos) => (
                    <div key={pos} className="flex items-center mb-1">
                      <Checkbox
                        id={`position-${pos}`}
                        checked={positionFilters.includes(pos)}
                        onCheckedChange={(v) =>
                          setPositionFilters(prev =>
                            v ? [...prev, pos] : prev.filter(x => x !== pos)
                          )
                        }
                      />
                      <label htmlFor={`position-${pos}`} className="ml-2 text-sm">
                        {pos}
                      </label>
                    </div>
                  ))}
                </div>
              </details>

              {/* ステータス */}
              <details className="group mb-3">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">スカウト状況</summary>
                <div className="pl-1">
                  {["未スカウト", "送信済み"].map((st) => (
                    <div key={st} className="flex items-center space-x-2 mb-1">
                      <Checkbox
                        id={`st-${st}`}
                        checked={statuses.includes(st)}
                        onCheckedChange={(v) =>
                          setStatuses((prev) =>
                            v ? [...prev, st] : prev.filter((s) => s !== st),
                          )
                        }
                      />
                      <label htmlFor={`st-${st}`} className="text-sm">{st}</label>
                    </div>
                  ))}
                </div>
              </details>

              {/* スキル */}
              <details className="group mb-3">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">スキル</summary>
                <div className="pl-1">
                  <SkillPicker
                    values={skills}
                    onChange={setSkills}
                  />
                </div>
              </details>

              {/* 資格 */}
              <details className="group mb-6">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">資格</summary>
                <div className="pl-1">
                  <QualificationPicker
                    values={qualificationsFilter}
                    onChange={setQualificationsFilter}
                  />
                </div>
              </details>

              {/* 希望職種 */}
              <details className="group mb-3">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">希望職種</summary>
                <div className="pl-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={desiredPosition}
                    onChange={(e) => setDesiredPosition(e.target.value)}
                  >
                    <option value="all">全て</option>
                    {availableDesiredPositions.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </details>

              {/* 希望勤務地 */}
              <details className="group mb-6">
                <summary className="cursor-pointer text-sm font-semibold select-none py-2">希望勤務地</summary>
                <div className="pl-1">
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={desiredWorkLocation}
                    onChange={(e) => setDesiredWorkLocation(e.target.value)}
                  >
                    <option value="all">全て</option>
                    {availableDesiredWorkLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </details>

              {/* Reset (bottom) */}
              <div className="mt-auto sticky bottom-0 bg-white pt-3 pb-2 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setExcludeOffer(false)
                    setSearch("")
                    setGradYears([])
                    setStatuses([])
                    setSelectedMajor("all")
                    setHasInternship(false)
                    setSkills([])
                    setQualificationsFilter([])
                    setDesiredPosition("all")
                    setDesiredWorkLocation("all")
                    setGenders([])
                    setPositionFilters([])
                    setPhaseFilter("all")
                    setSortBy("score")
                  }}
                >
                  リセット
                </Button>
              </div>
            </aside>

            {/* ── 学生リスト ─────────────────── */}
            <div className="flex-1 overflow-hidden">
              <StudentList
                companyId={companyId ?? undefined}
                students={filtered}
                selectedId={selectedStudent?.id ?? null}
                onSelect={handleSelect}
              />
            </div>
          </div>
        </TabsContent>

        {/* ───────── 送信済みタブ ───────── */}
        <TabsContent value="sent" className="p-6 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>送信済みスカウト</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">学生</th>
                    <th className="py-2">メッセージ</th>
                    <th className="py-2">送信日時</th>
                    <th className="py-2">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {sentScouts.map((row) => {
                    const stu = students.find((s) => s.id === row.student_id)
                    return (
                      <tr
                        key={row.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          if (stu) {
                            setSelectedStudent(stu)
                            setSelectedAlreadySent(true) // 送信履歴タブなので必ず true
                            setDrawerOpen(true)
                          }
                        }}
                      >
                        <td className="py-2">{stu?.full_name ?? "―"}</td>
                        <td className="py-2 line-clamp-1">{row.message}</td>
                        <td className="py-2">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString("ja-JP")
                            : ""}
                        </td>
                        <td className="py-2">
                          <Badge variant="outline">
                            {row.status
                              ? STATUS_LABEL[row.status as keyof typeof STATUS_LABEL] ??
                                row.status
                              : "—"}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                  {sentScouts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        まだスカウトを送信していません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ───────── Drawer : スカウト送信 ───────── */}
      <ScoutDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        student={selectedStudent}
        templates={templates}
        companyId={companyId ?? ""}
        readOnly={false}
        /* 送信完了後 callback */
        onSent={handleSent}
      />
    </div>
  )
}
