"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import Image from "next/image"
import Link from "next/link"
import { Building2, Calendar, ChevronRight, Heart, MapPin, Star, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// — 既存 import 群の末尾に追記 —
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from "@/components/ui/dialog"
  import { Input } from "@/components/ui/input"
  import { Textarea } from "@/components/ui/textarea"
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// 企業データの型定義
interface CompanyData {
  id: string
  name: string
  logo: string
  coverImage: string
  rating: number
  favoriteCount: number
  industry: string
  tagline: string
  description: string
  philosophy: string[]
  details: {
    representative: string
    founded: string
    capital: string
    revenue: string
    employees: string
    headquarters: string
    businessAreas: string[]
  }
  recruitInfo: {
    message: string
    positions: string[]
  },
  videoUrl?: string | null,
}

// 求人データの型定義
interface JobData {
  id: string
  title: string
  category: string  // 例: 本選考 / インターン
  location: string
  startDate: string // YYYY-MM-DD
}

// イベントデータの型定義
interface EventData {
  id: string
  title: string
  type: string       // オンライン / 対面 / 座談会 など
  datetime: string   // ISO 文字列
  location: string
  url: string
}


// 関連企業データの型定義
interface RelatedCompany {
  id: string
  name: string
  logo: string | null
  rating: number | null
}

// 口コミデータの型定義
interface ReviewData {
  id: string
  rating: number
  title: string
  body: string
  role: string | null
  tenureYears: number | null
  postedAt: string
  ratingGrowth?: number
  ratingWorklife?: number
  ratingSelection?: number
  ratingCulture?: number
}

// 面接データの型定義
interface InterviewData {
  id: string
  question: string
  answerHint: string | null
  experienceText: string | null
  graduationYear: number | null
  postedAt: string
  selectionCategory?: "インターン選考" | "本選考" | "説明会"
  phase?: "ES" | "テスト" | "GD" | "面接/面談" | "セミナー" | "OB訪問" | "インターン" | "内定"
}

// 企業ハイライトの型定義
interface HighlightData {
  id: string
  icon: string | null  // 'growth' | 'training' | 'diversified' など
  title: string
  body: string
}

/** YouTube watch / share URL -> embeddable URL */
const toYouTubeEmbed = (url: string): string => {
  try {
    const u = new URL(url);
    // youtu.be/<id>
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    // youtube.com/watch?v=<id>
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    // 既に embed 形式ならそのまま
    if (url.includes("/embed/")) return url;
  } catch (_e) {
    /* ignore */
  }
  return url; // fallback
};

/** Job category -> badge color utility */
const categoryClass = (cat: string): string => {
  switch (cat) {
    case "インターン":
      return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    case "本選考":
      return "bg-green-100 text-green-800 hover:bg-green-200";
    case "アルバイト":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-200";
  }
};


export default function CompanyDetailPage() {
    
      // URL パラメータ取得
      const { id } = useParams<{ id: string }>()  
  const [isFavorite, setIsFavorite] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [favoriteCount, setFavoriteCount] = useState<number>(0)
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<JobData[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [events, setEvents] = useState<EventData[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [related, setRelated] = useState<RelatedCompany[]>([])
  const [relatedLoading, setRelatedLoading] = useState(true)
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [interviews, setInterviews] = useState<InterviewData[]>([])
  const [interviewsLoading, setInterviewsLoading] = useState(true)
  const [highlights, setHighlights] = useState<HighlightData[]>([])
  const [highlightsLoading, setHighlightsLoading] = useState(true)

  // ---- 既存 useState 群の直後に貼り付け ----
  // 面接対策フィルタ
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [selectedPhases, setSelectedPhases] = useState<string[]>([])
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [ratingOverall, setRatingOverall] = useState<number>(0)
  const [ratingGrowth, setRatingGrowth] = useState<number>(0)
  const [ratingWorklife, setRatingWorklife] = useState<number>(0)
  const [ratingSelection, setRatingSelection] = useState<number>(0)
  const [ratingCulture, setRatingCulture] = useState<number>(0)
  const [reviewTitle, setReviewTitle] = useState("")
  const [reviewBody, setReviewBody] = useState("")
  const [submittingReview, setSubmittingReview] = useState(false)

  // 面接投稿用
  const [ivDialogOpen, setIvDialogOpen] = useState(false)
  const [ivCategory, setIvCategory] = useState<"インターン選考" | "本選考" | "説明会" | "">("")
  const [ivPhase, setIvPhase] = useState<"ES" | "テスト" | "GD" | "面接/面談" | "セミナー" | "OB訪問" | "インターン" | "内定" | "">("")
  const [ivGradYear, setIvGradYear] = useState<string>("")
  const [ivQuestion, setIvQuestion] = useState("")
  const [ivAnswerHint, setIvAnswerHint] = useState("")
  const [ivExperience, setIvExperience] = useState("")
  const [submittingIv, setSubmittingIv] = useState(false)

  const StarSelector = ({
    value,
    onChange,
  }: {
    value: number
    onChange: (v: number) => void
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)}>
          <Star size={20} className={n <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
        </button>
      ))}
    </div>
  )

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUserId(data.user.id)
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const fetchCompany = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('companies_view')          // ← 先ほど作ったビュー
        .select('*')
        .eq('id', id)
        .single()

      if (!error && data) {
        const c: any = data           // 型がまだ追いつかない場合は any
        const formatted: CompanyData = {
          id: c.id,
          name: c.name,
          logo: c.logo ?? '/placeholder.svg?height=80&width=80',
          coverImage: c.cover_image ?? c.cover_image_url ?? '/placeholder.svg?height=400&width=1200',
          rating: c.rating ?? 0,
          favoriteCount: c.favorite_count ?? 0,
          industry: c.industry ?? '',
          tagline: c.tagline ?? '',
          description: c.description ?? '',
          philosophy: c.philosophy ?? [],
          details: {
            representative: c.representative ?? '',
            founded: c.founded_on ?? c.founded_year ?? '',
            capital: c.capital_jpy ?? '',
            revenue: c.revenue_jpy ?? '',
            employees: c.employee_count?.toString() ?? '',
            headquarters: c.headquarters ?? c.location ?? '',
            businessAreas: c.business_areas ?? [],
          },
          recruitInfo: {
            message: c.recruit_message ?? '',
            positions: c.positions ?? [],
          },
          videoUrl: c.video_url ?? null,
        }
        setCompany(formatted)
        setFavoriteCount(formatted.favoriteCount)

        // ユーザーのお気に入り状態を確認
        if (userId) {
          const { data: fav } = await supabase
            .from('company_favorites')
            .select('id')
            .eq('company_id', c.id)
            .eq('user_id', userId)
            .maybeSingle()
          setIsFavorite(!!fav)
        }
        // ---- 追加: 会社に紐づく求人取得 ----
        const { data: jobRows, error: jobErr } = await supabase
          .from('jobs')
          .select('*')
          .eq('company_id', c.id)
          .order('start_date')

        if (!jobErr && jobRows) {
          const normalized: JobData[] = jobRows.map((j: any) => ({
            id: j.id,
            title: j.title,
            category: j.category,
            location: j.location,
            startDate: j.start_date,
          }))
          setJobs(normalized)
        }
        setJobsLoading(false)

        // ---- 会社に紐づくイベント取得 ----
        const { data: eventRows, error: eventErr } = await supabase
          .from('company_events')
          .select('*')
          .eq('company_id', c.id)
          .order('datetime')

        if (!eventErr && eventRows) {
          const evts: EventData[] = eventRows.map((e: any) => ({
            id      : e.id,
            title   : e.title,
            type    : e.type,
            datetime: e.datetime,
            location: e.location,
            url     : e.url ?? '#',
          }))
          setEvents(evts)
        }
        // ---- 同業種の関連企業（自社を除く・3件） ----
        const { data: relRows, error: relErr } = await supabase
          .from('companies_view') // rating カラムを持つビュー
          .select('id, name, logo, rating')
          .eq('industry', c.industry)
          .neq('id', c.id)
          .order('rating', { ascending: false })
          .limit(3)

        if (!relErr && relRows) {
          const rel: RelatedCompany[] = relRows.map((r: any) => ({
            id    : r.id,
            name  : r.name,
            logo  : r.logo,
            rating: r.rating,
          }))
          setRelated(rel)
        }
        // ---- 口コミ取得 ----
        const { data: revRows, error: revErr } = await supabase
          .from('company_reviews')
          .select('*')
          .eq('company_id', c.id)
          .order('posted_at', { ascending: false })

        if (!revErr && revRows) {
          const rv: ReviewData[] = revRows.map((r: any) => ({
            id         : r.id,
            rating     : r.rating,
            title      : r.title,
            body       : r.body,
            role       : r.role,
            tenureYears: r.tenure_years,
            postedAt   : r.posted_at,
          }))
          setReviews(rv)
        }
        // ---- 面接対策データ取得 ----
        const { data: intRows, error: intErr } = await supabase
          .from('company_interviews')
          .select('*')
          .eq('company_id', c.id)
          .order('posted_at', { ascending: false })

        if (!intErr && intRows) {
          const ints: InterviewData[] = intRows.map((i: any) => ({
            id            : i.id,
            question      : i.question,
            answerHint    : i.answer_hint,
            experienceText: i.experience_text,
            graduationYear: i.graduation_year,
            selectionCategory: i.selection_category,
            phase           : i.phase,
            postedAt      : i.posted_at,
          }))
          setInterviews(ints)
        }
        setInterviewsLoading(false)

        // ---- 企業ハイライト取得 ----
        const { data: hlRows, error: hlErr } = await supabase
          .from('company_highlights')
          .select('*')
          .eq('company_id', c.id)
          .order('ordinal')

        if (!hlErr && hlRows) {
          const hls: HighlightData[] = hlRows.map((h: any) => ({
            id   : h.id,
            icon : h.icon,
            title: h.title,
            body : h.body,
          }))
          setHighlights(hls)
        }
        setHighlightsLoading(false)
        setReviewsLoading(false)
        setRelatedLoading(false)
        setEventsLoading(false)
      } else {
        setJobsLoading(false)
        setEventsLoading(false)
        setRelatedLoading(false)
        setReviewsLoading(false)
        setInterviewsLoading(false)
        setHighlightsLoading(false)
      }
      setLoading(false)
    }

    fetchCompany()
  }, [id, userId])

  // お気に入りトグルハンドラ
  const handleToggleFavorite = async () => {
    if (!company || !userId) {
      alert('お気に入り機能を使うにはログインが必要です')
      return
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('company_favorites')
        .delete()
        .eq('company_id', company.id)
        .eq('user_id', userId)

      if (!error) {
        setIsFavorite(false)
        setFavoriteCount((prev) => Math.max(prev - 1, 0))
      }
    } else {
      const { error } = await supabase
        .from('company_favorites')
        .insert({ company_id: company.id, user_id: userId })

      if (!error) {
        setIsFavorite(true)
        setFavoriteCount((prev) => prev + 1)
      }
    }
  }

  // 口コミ投稿ハンドラ
  const handleSubmitReview = async () => {
    if (!company || !userId) {
      alert("口コミ投稿にはログインが必要です")
      return
    }
    if (ratingOverall === 0) {
      alert("総合評価を入力してください")
      return
    }

    setSubmittingReview(true)

    const { error, data, status, statusText } = await supabase
      .from("company_reviews")
      .insert(
        {
          company_id     : company.id,
          user_id        : userId,
          rating         : ratingOverall,
          rating_growth  : ratingGrowth,
          rating_worklife: ratingWorklife,
          rating_selection: ratingSelection,
          rating_culture : ratingCulture,
          title          : reviewTitle,
          body           : reviewBody,
        },
        { count: "exact" } // return row count for debugging
      )
    console.log("insert response", { status, statusText, data, error })

    setSubmittingReview(false)

    if (error) {
      alert("投稿に失敗しました")
      console.error(error)
      return
    }

    // 成功 → ダイアログを閉じて最新口コミを再取得 (リロード無し)
    setReviewDialogOpen(false)

    // 最新の口コミをフェッチして state 更新
    const { data: revRows, error: revErr } = await supabase
      .from("company_reviews")
      .select("*")
      .eq("company_id", company.id)
      .order("posted_at", { ascending: false })

    if (!revErr && revRows) {
      const rv: ReviewData[] = revRows.map((r: any) => ({
        id            : r.id,
        rating        : r.rating,
        title         : r.title,
        body          : r.body,
        role          : r.role,
        tenureYears   : r.tenure_years,
        ratingGrowth  : r.rating_growth,
        ratingWorklife: r.rating_worklife,
        ratingSelection: r.rating_selection,
        ratingCulture : r.rating_culture,
        postedAt      : r.posted_at,
      }))
      setReviews(rv)

      // 総合評価も再計算して company に反映（オプション）
      const avgRating =
        rv.length > 0 ? rv.reduce((s, r) => s + (r.rating ?? 0), 0) / rv.length : 0
      setCompany((prev) => (prev ? { ...prev, rating: avgRating } : prev))
    }
  }

  // 面接投稿ハンドラ
  const handleSubmitInterview = async () => {
    if (!company || !userId) {
      alert("投稿にはログインが必要です")
      return
    }
    if (!ivCategory || !ivPhase || !ivQuestion.trim()) {
      alert("必須項目が不足しています")
      return
    }

    setSubmittingIv(true)

    const { error, data, status, statusText } = await supabase
      .from("company_interviews")
      .insert(
        {
          company_id        : company.id,
          user_id           : userId,
          selection_category: ivCategory,
          phase             : ivPhase,
          graduation_year   : ivGradYear ? Number(ivGradYear) : null,
          question          : ivQuestion,
          answer_hint       : ivAnswerHint || null,
          experience_text   : ivExperience || null,
        },
        { count: "exact" }
      )

    console.log("interview insert response", { status, statusText, data, error })

    setSubmittingIv(false)

    if (error) {
      alert("投稿に失敗しました")
      console.error(error)
      return
    }

    // 成功 → ダイアログ閉じる＆再フェッチ
    setIvDialogOpen(false)
    // 再取得
    const { data: intRows } = await supabase
      .from("company_interviews")
      .select("*")
      .eq("company_id", company.id)
      .order("posted_at", { ascending: false })

    if (intRows) {
      const ints: InterviewData[] = intRows.map((i: any) => ({
        id            : i.id,
        question      : i.question,
        answerHint    : i.answer_hint,
        experienceText: i.experience_text,
        graduationYear: i.graduation_year,
        selectionCategory: i.selection_category,
        phase           : i.phase,
        postedAt      : i.posted_at,
      }))
      setInterviews(ints)
    }
  }

  // 星評価を表示するためのヘルパー関数
  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="fill-yellow-400 text-yellow-400" size={20} />)
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star className="text-gray-300" size={20} />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="fill-yellow-400 text-yellow-400" size={20} />
            </div>
          </div>,
        )
      } else {
        stars.push(<Star key={i} className="text-gray-300" size={20} />)
      }
    }
    return stars
  }

  /* ---------- 口コミカテゴリ平均 ---------- */
  const avgGrowth =
    reviews.length
      ? reviews.reduce((s, r) => s + (r.ratingGrowth ?? 0), 0) / reviews.length
      : 0
  const avgWorklife =
    reviews.length
      ? reviews.reduce((s, r) => s + (r.ratingWorklife ?? 0), 0) / reviews.length
      : 0
  const avgSelection =
    reviews.length
      ? reviews.reduce((s, r) => s + (r.ratingSelection ?? 0), 0) / reviews.length
      : 0
  const avgCulture =
    reviews.length
      ? reviews.reduce((s, r) => s + (r.ratingCulture ?? 0), 0) / reviews.length
      : 0

  // 面接リストをフィルタリング
  const filteredInterviews = useMemo(() => {
    return interviews.filter((iv) => {
      // 選考カテゴリ
      if (selectedCategories.length && iv.selectionCategory && !selectedCategories.includes(iv.selectionCategory)) {
        return false
      }
      // 卒年
      if (selectedYears.length) {
        const yr = iv.graduationYear ?? 0
        if (yr && !selectedYears.includes(yr - 2000)) return false // 2027 -> 27
        if (iv.graduationYear === null && !selectedYears.includes(0)) return false // その他扱い
      }
      // フェーズ
      if (selectedPhases.length && iv.phase && !selectedPhases.includes(iv.phase)) {
        return false
      }
      return true
    })
  }, [interviews, selectedCategories, selectedYears, selectedPhases])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }
  if (!company) {
    return <div className="min-h-screen flex items-center justify-center">企業情報が見つかりませんでした</div>
  }
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヒーローセクション */}
      <div
        className={`relative h-[300px] md:h-[400px] w-full overflow-hidden ${
          company.coverImage ? "" : "bg-red-600"
        }`}
      >
        <Image
          src={company.coverImage || "/placeholder.svg"}
          alt={company.name}
          fill
          className={`object-cover ${company.coverImage ? "" : "opacity-90"}`}
          priority
        />
        {/* 赤いグラデーションはカバー画像が無い時だけ表示 */}
        {!company.coverImage && (
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/90 to-red-600/50"></div>
        )}
        {!company.coverImage && (
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4 md:px-8">
              <div className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{company.tagline}</h1>
                <p className="text-xl text-white/90">{company.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ナビゲーションとパンくずリスト */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center text-sm text-gray-500">
            <Link href="/jobs" className="hover:text-red-600">
              就活サイトトップ
            </Link>
            <ChevronRight size={14} className="mx-1" />
            <Link href="/jobs/companies" className="hover:text-red-600">
              企業検索
            </Link>
            <ChevronRight size={14} className="mx-1" />
            <Link href={`/jobs/industry/${encodeURIComponent(company.industry)}`} className="hover:text-red-600">
              {company.industry}
            </Link>
            <ChevronRight size={14} className="mx-1" />
            <span className="text-gray-900">{company.name}</span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左側：企業情報 */}
          <div className="w-full lg:w-2/3">
            {/* 企業ヘッダー */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-shrink-0">
                  <Image
                    src={company.logo || "/placeholder.svg"}
                    alt={company.name}
                    width={80}
                    height={80}
                    className="rounded-md border"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {company.industry}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-bold">{company.name}</h1>
                  {company.coverImage && company.tagline && (
                    <p className="text-sm text-gray-600 mt-1">{company.tagline}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex">{renderStars(company.rating)}</div>
                    <span className="text-lg font-semibold">{company.rating}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <Button
                    variant={isFavorite ? "default" : "outline"}
                    className={`w-full ${isFavorite ? "bg-red-600 hover:bg-red-700" : ""}`}
                    onClick={handleToggleFavorite}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isFavorite ? "fill-white" : ""}`} />
                    お気に入り
                    {isFavorite ? "済" : ""}
                  </Button>
                  <div className="text-center text-xs text-gray-500">{favoriteCount.toLocaleString()}人</div>
                </div>
              </div>
            </div>

            {/* タブナビゲーション */}
            <Tabs defaultValue="overview" className="mb-6">
              <div className="bg-white rounded-xl shadow-sm">
                <TabsList className="w-full justify-start rounded-none border-b p-0">
                  <TabsTrigger
                    value="overview"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                  >
                    企業概要
                  </TabsTrigger>
                  <TabsTrigger
                    value="jobs"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                  >
                    求人情報
                  </TabsTrigger>
                  <TabsTrigger
                    value="reviews"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                  >
                    口コミ・評判
                  </TabsTrigger>
                  <TabsTrigger
                    value="interviews"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3"
                  >
                    面接対策
                  </TabsTrigger>
                </TabsList>

                {/* 企業概要タブ */}
                <TabsContent value="overview" className="p-6">
                  {/* 企業理念 */}
                  <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4">企業理念</h2>
                    <div className="bg-gray-50 p-6 rounded-lg">
                      {company.philosophy.map((paragraph, index) => (
                        <p key={index} className="mb-3 last:mb-0 text-gray-700">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* 採用メッセージ */}
                  <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4">採用メッセージ</h2>
                    <Card className="p-6 border-l-4 border-l-red-600">
                      <p className="text-gray-700">{company.recruitInfo.message}</p>
                    </Card>
                  </div>

                  {/* 企業詳細情報 */}
                  <div>
                    <h2 className="text-xl font-bold mb-4">企業情報</h2>
                    <div className="bg-white border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <tbody className="divide-y">
                          {/* 業種 */}
                          {company.industry && (
                            <tr className="hover:bg-gray-50">
                              <th className="py-4 px-6 text-left bg-gray-50 w-1/3">業種</th>
                              <td className="py-4 px-6">{company.industry}</td>
                            </tr>
                          )}
                          {/* 代表者 */}
                          {company.details.representative && (
                            <tr className="hover:bg-gray-50">
                              <th className="py-4 px-6 text-left bg-gray-50 w-1/3">代表者</th>
                              <td className="py-4 px-6">{company.details.representative}</td>
                            </tr>
                          )}
                          {/* 本社所在地 */}
                          {company.details.headquarters && (
                            <tr className="hover:bg-gray-50">
                              <th className="py-4 px-6 text-left bg-gray-50">所在地</th>
                              <td className="py-4 px-6">{company.details.headquarters}</td>
                            </tr>
                          )}
                          {/* 設立日 */}
                          {company.details.founded && (
                            <tr className="hover:bg-gray-50">
                              <th className="py-4 px-6 text-left bg-gray-50">設立日</th>
                              <td className="py-4 px-6">{company.details.founded}</td>
                            </tr>
                          )}
                          {/* 資本金 */}
                          {company.details.capital && (
                            <tr className="hover:bg-gray-50">
                              <th className="py-4 px-6 text-left bg-gray-50">資本金</th>
                              <td className="py-4 px-6">
                                {Number(company.details.capital).toLocaleString()} 万円
                              </td>
                            </tr>
                          )}
                          {/* 売上高 */}
                          {company.details.revenue && (
                            <tr className="hover:bg-gray-50">
                              <th className="py-4 px-6 text-left bg-gray-50">売上高</th>
                              <td className="py-4 px-6">
                                {Number(company.details.revenue).toLocaleString()} 万円
                              </td>
                            </tr>
                          )}
                          {/* 従業員数 */}
                          {company.details.employees && (
                            <tr className="hover:bg-gray-50">
                              <th className="py-4 px-6 text-left bg-gray-50">従業員数</th>
                              <td className="py-4 px-6">{company.details.employees} 名</td>
                            </tr>
                          )}
                          {/* 事業内容 */}
                          {company.details.businessAreas.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <th className="py-4 px-6 text-left bg-gray-50">事業内容</th>
                              <td className="py-4 px-6">
                                <ul className="list-disc pl-5 space-y-1">
                                  {company.details.businessAreas.map((area, index) => (
                                    <li key={index}>{area}</li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* 求人情報タブ */}
                <TabsContent value="jobs" className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">求人情報</h2>
                    <Button variant="outline">絞り込み</Button>
                  </div>

                  {jobsLoading ? (
                    <p>Loading jobs...</p>
                  ) : jobs.length === 0 ? (
                    <p className="text-sm text-gray-500">現在公開中の求人はありません。</p>
                  ) : (
                    <div className="space-y-4">
                      {jobs.map((job) => (
                        <Card
                          key={job.id}
                          className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <Link href={`/jobs/${job.id}`} className="block p-6 hover:bg-gray-50">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              <Badge
                                className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${categoryClass(
                                  job.category
                                )}`}
                              >
                                {job.category}
                              </Badge>
                              <div className="flex-grow">
                                <h3 className="text-lg font-bold mb-2">{job.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <MapPin size={14} />
                                    <span>{job.location}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    <span>{new Date(job.startDate).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              <Button variant="default" className="shrink-0">
                                詳細を見る
                              </Button>
                            </div>
                          </Link>
                        </Card>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 text-center">
                    <Button variant="outline">もっと見る</Button>
                  </div>
                </TabsContent>

                {/* 口コミ・評判タブ */}
                <TabsContent value="reviews" className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">先輩の口コミ</h2>
                    <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">口コミを投稿</Button>
                      </DialogTrigger>

                      <DialogContent className="space-y-4">
                        <DialogHeader>
                          <DialogTitle>口コミを投稿する</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 text-sm">
                          <div>
                            <label className="block font-medium mb-1">総合評価</label>
                            <StarSelector value={ratingOverall} onChange={setRatingOverall} />
                          </div>
                          <div>
                            <label className="block font-medium mb-1">成長環境</label>
                            <StarSelector value={ratingGrowth} onChange={setRatingGrowth} />
                          </div>
                          <div>
                            <label className="block font-medium mb-1">ワークライフバランス</label>
                            <StarSelector value={ratingWorklife} onChange={setRatingWorklife} />
                          </div>
                          <div>
                            <label className="block font-medium mb-1">選考難易度</label>
                            <StarSelector value={ratingSelection} onChange={setRatingSelection} />
                          </div>
                          <div>
                            <label className="block font-medium mb-1">社風</label>
                            <StarSelector value={ratingCulture} onChange={setRatingCulture} />
                          </div>
                          <Input
                            placeholder="タイトル"
                            value={reviewTitle}
                            onChange={(e) => setReviewTitle(e.target.value)}
                          />
                          <Textarea
                            rows={4}
                            placeholder="口コミ本文（自由記述）"
                            value={reviewBody}
                            onChange={(e) => setReviewBody(e.target.value)}
                          />
                        </div>

                        <DialogFooter>
                          <Button
                            onClick={handleSubmitReview}
                            disabled={submittingReview}
                            className="w-full"
                          >
                            {submittingReview ? "送信中…" : "投稿する"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="bg-white border rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold">{company.rating}</div>
                        <div className="flex justify-center mt-1">{renderStars(company.rating)}</div>
                        <div className="text-sm text-gray-500 mt-1">{reviews.length}件の口コミ</div>
                      </div>
                      <Separator orientation="vertical" className="h-16" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
                        <div>
                            <div className="text-sm text-gray-500">成長環境</div>
                            <div className="flex items-center mt-1">
                            <div className="flex">{renderStars(avgGrowth)}</div>
                            <span className="ml-2 font-semibold">{avgGrowth.toFixed(1)}</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">ワークライフバランス</div>
                            <div className="flex items-center mt-1">
                            <div className="flex">{renderStars(avgWorklife)}</div>
                            <span className="ml-2 font-semibold">{avgWorklife.toFixed(1)}</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">選考難易度</div>
                            <div className="flex items-center mt-1">
                            <div className="flex">{renderStars(avgSelection)}</div>
                            <span className="ml-2 font-semibold">{avgSelection.toFixed(1)}</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">社風</div>
                            <div className="flex items-center mt-1">
                            <div className="flex">{renderStars(avgCulture)}</div>
                            <span className="ml-2 font-semibold">{avgCulture.toFixed(1)}</span>
                            </div>
                        </div>
                        </div>
                    </div>
                  </div>

                  {/* サンプル口コミ */}
                  {reviewsLoading ? (
                    <p>Loading reviews...</p>
                  ) : reviews.length === 0 ? (
                    <p className="text-sm text-gray-500">まだ口コミが投稿されていません。</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((rev) => (
                        <Card key={rev.id} className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex">{renderStars(rev.rating)}</div>
                            <span className="font-semibold">{rev.rating.toFixed(1)}</span>
                          </div>
                          <h3 className="text-lg font-bold mb-2">{rev.title}</h3>
                          <p className="text-gray-700 mb-4 whitespace-pre-line">{rev.body}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            {rev.role && (
                              <Badge variant="outline" className="mr-2">
                                {rev.role}
                              </Badge>
                            )}
                            {rev.tenureYears !== null && <span>{rev.tenureYears}年在籍</span>}
                            <span className="ml-2">{new Date(rev.postedAt).toLocaleDateString()}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 text-center">
                    <Button variant="outline">もっと見る</Button>
                  </div>
                </TabsContent>

                {/* 面接対策タブ */}
                <TabsContent value="interviews" className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">
                      面接対策
                      <span className="ml-2 text-base font-normal text-gray-500">
                        {filteredInterviews.length}/{interviews.length}
                      </span>
                    </h2>
                    <Dialog open={ivDialogOpen} onOpenChange={setIvDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">面接情報を投稿</Button>
                      </DialogTrigger>

                      <DialogContent className="space-y-4">
                        <DialogHeader>
                          <DialogTitle>面接情報を投稿する</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 text-sm">
                          {/* 選考種別 */}
                          <div>
                            <label className="block font-medium mb-1">選考種別</label>
                            <Select value={ivCategory} onValueChange={(v)=>setIvCategory(v as any)}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="選択..." /></SelectTrigger>
                              <SelectContent>
                                {["インターン選考","本選考","説明会"].map(c=>(
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* フェーズ */}
                          <div>
                            <label className="block font-medium mb-1">フェーズ</label>
                            <Select value={ivPhase} onValueChange={(v)=>setIvPhase(v as any)}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="選択..." /></SelectTrigger>
                              <SelectContent>
                                {["ES","テスト","GD","面接/面談","セミナー","OB訪問","インターン","内定"].map(p=>(
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* 卒年 */}
                          <div>
                            <label className="block font-medium mb-1">卒業年度 (任意)</label>
                            <Input
                              type="number"
                              min="2016"
                              max="2030"
                              placeholder="例: 2027"
                              value={ivGradYear}
                              onChange={(e)=>setIvGradYear(e.target.value)}
                            />
                          </div>
                          {/* よく聞かれた質問 */}
                          <div>
                            <label className="block font-medium mb-1">
                              よく聞かれた質問 <span className="text-red-500">(必須)</span>
                            </label>
                            <Textarea
                              rows={2}
                              placeholder="例：志望動機を教えてください など"
                              value={ivQuestion}
                              onChange={(e) => setIvQuestion(e.target.value)}
                            />
                          </div>
                          {/* 回答のポイント */}
                          <div>
                            <label className="block font-medium mb-1">
                              回答のポイント <span className="text-gray-500">(任意)</span>
                            </label>
                            <Textarea
                              rows={3}
                              placeholder="回答のコツや準備したことを入力"
                              value={ivAnswerHint}
                              onChange={(e) => setIvAnswerHint(e.target.value)}
                            />
                          </div>
                          {/* 体験談 */}
                          <div>
                            <label className="block font-medium mb-1">
                              面接体験談 <span className="text-gray-500">(任意)</span>
                            </label>
                            <Textarea
                              rows={4}
                              placeholder="実際のやり取りや感想を入力"
                              value={ivExperience}
                              onChange={(e) => setIvExperience(e.target.value)}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button onClick={handleSubmitInterview} disabled={submittingIv} className="w-full">
                            {submittingIv ? "送信中…" : "投稿する"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* ---- フィルタ UI ---- */}
                  <div className="space-y-4 mb-6">
                    {/* 選考種別 */}
                    <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-lg overflow-x-auto">
                      {["インターン選考","本選考","説明会"].map((cat)=>(
                        <label key={cat} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat)}
                            onChange={()=>{
                              setSelectedCategories((prev)=>
                                prev.includes(cat) ? prev.filter(c=>c!==cat) : [...prev,cat]
                              )
                            }}
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                    {/* 卒年 */}
                    <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-lg overflow-x-auto">
                      {[27,26,25].map((yr)=>(
                        <label key={yr} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedYears.includes(yr)}
                            onChange={()=>{
                              setSelectedYears((prev)=>
                                prev.includes(yr) ? prev.filter(y=>y!==yr) : [...prev,yr]
                              )
                            }}
                          />
                          {`${yr}年卒`}
                        </label>
                      ))}
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedYears.includes(0)}
                          onChange={()=>{
                            setSelectedYears((prev)=>
                              prev.includes(0) ? prev.filter(y=>y!==0) : [...prev,0]
                            )
                          }}
                        />
                        その他
                      </label>
                    </div>
                    {/* フェーズ */}
                    <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-lg overflow-x-auto">
                      {["ES","テスト","GD","面接/面談","セミナー","OB訪問","インターン","内定"].map((ph)=>(
                        <label key={ph} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPhases.includes(ph)}
                            onChange={()=>{
                              setSelectedPhases((prev)=>
                                prev.includes(ph) ? prev.filter(p=>p!==ph) : [...prev,ph]
                              )
                            }}
                          />
                          {ph}
                        </label>
                      ))}
                    </div>
                  </div>

                  {interviewsLoading ? (
                    <p>Loading interview data...</p>
                  ) : filteredInterviews.length === 0 ? (
                    <p className="text-sm text-gray-500">まだ面接情報が投稿されていません。</p>
                  ) : (
                    <div className="space-y-6">
                      {filteredInterviews.map((iv) => (
                        <div className="overflow-x-auto" key={iv.id}>
                          <Card className="p-6 space-y-4">
                            <div>
                              <h3 className="font-semibold mb-2">よく聞かれた質問</h3>
                              <p className="text-gray-700">{iv.question}</p>
                              {iv.answerHint && (
                                <div className="bg-gray-50 p-4 rounded-lg mt-2">
                                  <p className="text-gray-700 whitespace-pre-line">{iv.answerHint}</p>
                                </div>
                              )}
                            </div>
                            {iv.experienceText && (
                              <div>
                                <h3 className="font-semibold mb-2">面接体験談</h3>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <p className="text-gray-700 whitespace-pre-line">{iv.experienceText}</p>
                                </div>
                              </div>
                            )}
                            <div className="text-sm text-gray-500">
                              {iv.graduationYear && `${iv.graduationYear}年卒 / `}投稿:
                              {` ${new Date(iv.postedAt).toLocaleDateString()}`}
                            </div>  
                          </Card>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* 右側：サイドバー */}
          <div className="w-full lg:w-1/3 space-y-6">
            {/* 企業ハイライト */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">企業の魅力</h2>

              {highlightsLoading ? (
                <p>Loading highlights...</p>
              ) : highlights.length === 0 ? (
                <p className="text-sm text-gray-500">魅力情報はまだ登録されていません。</p>
              ) : (
                <div className="space-y-4">
                  {highlights.map((hl) => (
                    <div key={hl.id} className="flex items-start gap-3">
                      {/* アイコン判定 */}
                      <div className="bg-red-100 p-2 rounded-full text-red-600">
                        {hl.icon === 'training' ? (
                          <Users size={20} />
                        ) : hl.icon === 'diversified' ? (
                          <Building2 size={20} />
                        ) : (
                          <Star size={20} /> /* default => growth/star */
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{hl.title}</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{hl.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {company.videoUrl && (
              <Card className="overflow-hidden">
                <div className="aspect-video relative">
                  <iframe
                    src={toYouTubeEmbed(company.videoUrl)}
                    className="absolute inset-0 w-full h-full"
                    frameBorder={0}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">企業紹介ムービー</h3>
                  <p className="text-sm text-gray-600">動画で企業の雰囲気をご覧ください</p>
                </div>
              </Card>
            )}

            {/* イベント情報 */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">今後のイベント</h2>

              {eventsLoading ? (
                <p>Loading events...</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-gray-500">現在予定されているイベントはありません。</p>
              ) : (
                <div className="space-y-4">
                  {events.map((evt, idx) => (
                    <div key={evt.id} className={`pb-4 ${idx !== events.length - 1 ? "border-b" : ""}`}>
                      <Badge
                        className={`mb-2 ${
                          evt.type.includes("オンライン")
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            : evt.type.includes("対面")
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                        }`}
                      >
                        {evt.type}
                      </Badge>
                      <h3 className="font-semibold mb-1">{evt.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {new Date(evt.datetime).toLocaleString()} {evt.location && ` / ${evt.location}`}
                      </p>
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={evt.url}>詳細・申込み</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {events.length > 0 && (
                <div className="mt-4 text-center">
                  <Button className="bg-red-600 hover:bg-red-700">すべてのイベントを見る</Button>
                </div>
              )}
            </Card>

            {/* 関連企業 */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">関連企業</h2>

              {relatedLoading ? (
                <p>Loading…</p>
              ) : related.length === 0 ? (
                <p className="text-sm text-gray-500">同業種の企業はありません。</p>
              ) : (
                <div className="space-y-3">
                  {related.map((co) => (
                    <Link
                      key={co.id}
                      href={`/companies/${co.id}`}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
                    >
                      <Image
                        src={co.logo ?? '/placeholder.svg?height=40&width=40&query=company logo'}
                        alt={co.name}
                        width={40}
                        height={40}
                        className="rounded-md border"
                      />
                      <div>
                        <h3 className="font-semibold">{co.name}</h3>
                        <div className="flex items-center text-sm text-gray-500">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={
                                  co.rating && i < Math.round(co.rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }
                              />
                            ))}
                          </div>
                          {co.rating && <span className="ml-1">{co.rating.toFixed(1)}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
