'use client'
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  TrendingUp,
  Bell,
  Menu,
  Eye,
  Heart,
  Share2,
  Bookmark,
  ArrowRight,
  ChevronDown,
  Users,
  User,
  Mail,
  GraduationCap,
  Zap,
  Calendar,
  Star,
  MapPin,
  MessageSquare,
  Trophy,
  ChevronRight,
  Lock,
} from "lucide-react"
import ArticleCard from "@/components/article-card"
import TrendingTopics from "@/components/trending-topics"
import GptCareerAdvisorCard from "@/components/GptCareerAdvisorCard"
import dynamic from "next/dynamic";
import { ProfileCompletionCard } from "@/components/ProfileCompletionCard"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation";

import ArticleDetailDrawer from "@/components/article-detail-drawer"
import DecorativeBlob from "@/components/DecorativeBlob";
import { supabase } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { LazyImage } from "@/components/ui/lazy-image"





export default function Home() {
  const [active, setActive] = useState<any>(null)

  // client‑side fetched data
  const [articles, setArticles] = useState<any[]>([])
  const [companyArticles, setCompanyArticles] = useState<any[]>([])
  const [session, setSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredCompanies, setFeaturedCompanies] = useState<any[]>([]);
  const [jobListings, setJobListings] = useState<any[]>([]);
  const router = useRouter();

  // fetch on mount --------------------------------------------------------
  useEffect(() => {
    (async () => {
      /* ---------- fetch external RSS / API articles ---------- */
      try {
        const res = await fetch("/api/articles");
        if (res.ok) {
          const data = await res.json();
          const arts = Array.isArray(data) ? data : data.articles ?? [];
          setArticles(arts ?? []);
        }
      } catch (e) {
        console.error("articles fetch error", e);
      }

      /* ---------- keep the current auth session (for RLS) ---------- */
      const {
        data: { session: supaSession },
      } = await supabase.auth.getSession();
      setSession(supaSession);

      /* ---------- fetch Supabase data in parallel ---------- */
      try {
        const [
          { data: mediaPosts, error: mediaErr },
          { data: companiesData, error: companiesErr },
          { data: jobsData, error: jobsErr },
          { data: internsData, error: internsErr },
        ] = await Promise.all([
          // 自社メディア
          supabase
            .from("media_posts")
            .select(
              "id, title, slug, excerpt, cover_image_url, updated_at"
            )
            .eq("status", "published")
            .order("updated_at", { ascending: false })
            .limit(30),

          // 注目企業
          supabase
            .from("companies")
            .select(
              `id, name, logo, industry, description,
               rating, employee_count, founded_year,
               jobs(id)`
            )
            .order("rating", { ascending: false })
            .limit(8),

          // 新着求人（member_only も含めて取得）
          supabase
            .from("jobs")
            .select(
              `id, title, description, location, salary_range, work_type, selection_type, cover_image_url,
               is_recommended, created_at, application_deadline, member_only,
               companies ( name, logo )`
            )
            .eq("published", true)
            .eq("selection_type", "fulltime")
            .order("created_at", { ascending: false })
            .limit(8),

          // インターンシップ（member_only も含めて取得）
          supabase
            .from("jobs")
            .select(
              `id, title, description, location, work_type,
               selection_type, cover_image_url, created_at, is_recommended, member_only,
               companies ( name, logo ),
               intern_long_details!job_id ( hourly_wage, remuneration_type, commission_rate ),
               internship_details!job_id ( allowance )`
            )
            .eq("published", true)
            .in("selection_type", ["intern_long", "internship_short"])
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

        /* ---------- 自社メディア ---------- */
        if (!mediaErr && mediaPosts) {
          const comps = mediaPosts.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.excerpt ?? "",
            imageUrl: p.cover_image_url ?? "",
            source: "GAKUTEN Media",
            publishedAt: p.updated_at ?? "",
            url: `/media/${encodeURIComponent(p.slug)}`,
          }));
          setCompanyArticles(comps);
        }

        /* ---------- 注目企業/一旦なし ---------- *
        /*if (!companiesErr && companiesData) {
          setFeaturedCompanies(
            companiesData.map((c: any) => ({
              id: c.id,
              name: c.name,
              logo: c.logo ?? "",
              industry: c.industry ?? "",
              description: c.description ?? "",
              tags: c.tags ?? [],
              rating: c.rating ?? 0,
              employees: c.employee_count ?? "",
              founded: c.founded_year ?? "",
              jobCount: (c.jobs ?? []).length,
            }))
          );
        }

        /* ---------- 新着求人 ---------- */
        if (!jobsErr && jobsData) {
          setJobListings(
            jobsData.map((j: any) => {
              const isLimited = !!j.member_only;
              const shouldMask = isLimited && !supaSession; // 非ログイン時のみ伏せる
              return {
                id: j.id,
                title: j.title,
                company: shouldMask ? "（ログイン後に表示）" : (j.companies?.name ?? ""),
                companyLogo: shouldMask ? "" : (j.companies?.logo ?? ""),
                location: shouldMask ? "" : (j.location ?? ""),
                salary: j.salary_range ?? "",
                type: j.work_type ?? "",
                tags: [],
                description: j.description ?? "",
                postedAt: j.created_at,
                deadline: j.application_deadline,
                isNew:
                  Date.now() - new Date(j.created_at).getTime() <
                  1000 * 60 * 60 * 24 * 7, // 7 days
                isRecommended: j.is_recommended,
                coverImageUrl: shouldMask ? "" : (j.cover_image_url ?? ""),
                selectionType: j.selection_type ?? "fulltime",
                isLimited,
              }
            })
          );
        }

        /* ---------- インターンシップ ---------- */
        if (!internsErr && internsData) {
          setInternships(
            internsData.map((i: any) => {
              const isLimited = !!i.member_only;
              const shouldMask = isLimited && !supaSession;
              return {
                id: i.id,
                title: i.title,
                company: shouldMask ? "（ログイン後に表示）" : (i.companies?.name ?? ""),
                companyLogo: shouldMask ? "" : (i.companies?.logo ?? ""),
                location: shouldMask ? "" : (i.location ?? ""),
                description: i.description ?? "",
                coverImageUrl: shouldMask ? "" : (i.cover_image_url ?? ""),
                isNew:
                  Date.now() - new Date(i.created_at).getTime() <
                  1000 * 60 * 60 * 24 * 7,
                duration: "-",
                salary:
                  i.selection_type === "intern_long"
                    ? (() => {
                        const d =
                          (Array.isArray(i.intern_long_details)
                            ? i.intern_long_details[0]
                            : i.intern_long_details) || {};
                        if (d.remuneration_type === "hourly") {
                          return d.hourly_wage ? `時給${d.hourly_wage}円` : "";
                        }
                        if (d.remuneration_type === "commission") {
                          return d.commission_rate ? `歩合${d.commission_rate}` : "";
                        }
                        return "";
                      })()
                    : i.selection_type === "internship_short"
                    ? (i.internship_details?.allowance ?? i.internship_details?.[0]?.allowance ?? "")
                    : "",
                isRemote: i.work_type === "リモート",
                isRecommended: i.is_recommended,
                isLimited,
              }
            })
          );
        }
      } catch (e) {
        console.error("supabase fetch error", e);
      }
    })();
  }, []);

  // ① 画像がない記事にはデフォルト画像を設定
  const fallbackImg = "/logo3.png"
  const articlesWithImages = articles.map((a) => {
    const raw =
      (a as any).image ??
      (a as any).img ??
      (a as any).thumbnail ??
      (a as any).imageUrl ??
      (a as any).image_url ??
      (a as any).cover_image_url ??
      ""
    const final = typeof raw === "string" && raw.trim() !== "" ? raw : fallbackImg
    return {
      ...a,
      image: final,
      img: final,
      thumbnail: final,
      imageUrl: final,
      image_url: final,
      cover_image_url: final,
    }
  })

  // ② Featured はその先頭 1 件
  const featuredArticle = articlesWithImages[0] ?? null

  // ③ グリッド用：Featured を除いた残り（すべて画像付き）
  const otherArticles = featuredArticle
    ? articlesWithImages.slice(1)
    : articlesWithImages
  // ④ 画像を持つ記事だけを各タブで再利用
  const imgArticles = articlesWithImages

  // ===== カテゴリー別に記事を分類 =========================================
  // API から返る各記事オブジェクトに `category` フィールド（例: 'news' | 'career' | 'ai' | 'interview' | 'company'）
  // が含まれている前提で、タブごとに表示する配列を用意する。
  const newsArticles        = articlesWithImages.filter((a) => a.category === 'news')
  const careerArticles      = articlesWithImages.filter((a) => a.category === 'career')
  const aiArticles = articlesWithImages.filter((a) => a.category === 'ai')
  const interviewArticles   = articlesWithImages.filter((a) => a.category === 'interview')
  const companyArticlesTab  = articlesWithImages.filter((a) => a.category === 'company')

  // *** 自社メディア ***
  const companyArticlesWithImages = companyArticles.map((c) => {
    const raw =
      (c as any).image ??
      (c as any).img ??
      (c as any).thumbnail ??
      (c as any).imageUrl ??
      (c as any).image_url ??
      (c as any).cover_image_url ??
      ""
    const final = typeof raw === "string" && raw.trim() !== "" ? raw : fallbackImg
    return {
      ...c,
      image: final,
      img: final,
      thumbnail: final,
      imageUrl: final,
      image_url: final,
      cover_image_url: final,
    }
  })

  // Add state hooks for internships, trendingTopics, quickStats
  const [internships, setInternships] = useState<any[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [quickStats, setQuickStats] = useState<{ articles: number; readers: string; companies: number }>({
    articles: 0,
    readers: "0",
    companies: 0,
  });
  // controls visibility of the bottom banner
  const [bannerClosed, setBannerClosed] = useState(false);
  // Controls the AI advisor modal
  const [showAdvisor, setShowAdvisor] = useState(false);
  // Feature flag for floating advisor button/modal
  const SHOW_FLOATING_ADVISOR = false;
return (
    <div className="w-[100vw] max-w-none min-h-screen bg-white overflow-x-hidden">

      {/* Desktop and Mobile Headers removed */}

      {/* Hero Section -------------------------------------------------- */}
      <section className="w-full relative isolate flex items-center pt-20 pb-24 sm:pb-20 md:pb-16 bg-gradient-to-br from-red-600 via-red-400 to-blue-500 text-white overflow-visible md:overflow-hidden min-h-[75vh] animate-hero-bg">
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-40 w-[580px] h-[580px] rounded-full bg-white/10 blur-3xl animate-[blob_35s_ease-in-out_infinite]"></div>
          <DecorativeBlob position="br" size="md" />
        </div>

        <div className="max-w-7xl mx-auto flex flex-col-reverse md:flex-row items-center justify-between gap-8 px-6 md:px-10">
          {/* --- Copy ---------------------------------------------------------------- */}
          <div className="max-w-xl text-center md:text-left">

            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mb-4"
            >
              学生転職
            </motion.h2>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6"
            >
              <span className="block text-3xl sm:text-4xl lg:text-5xl">学生のキャリアは</span>
              <span className="block mt-[2mm] text-5xl sm:text-6xl lg:text-7xl text-white drop-shadow-md">
                可能性
              </span>
              <span className="block mt-[2mm] text-3xl sm:text-4xl lg:text-5xl">に満ち溢れている</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="text-base sm:text-lg lg:text-xl font-medium mb-10 opacity-90 leading-relaxed"
            >
              知ってる人は使ってる。キャリアプラットフォーム
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center md:justify-start"
            >
              <Button
                size="lg"
                className="bg-white text-red-600 hover:bg-red-50 font-semibold rounded-full px-8 shadow-md"
                asChild
              >
                <Link href="/signup" className="flex items-center space-x-2">
                  無料で始める
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="rounded-full px-8 backdrop-blur-sm bg-white/15 border border-white/60 text-white font-semibold hover:bg-white hover:text-red-600 transition-colors flex items-center justify-center"
                asChild
              >
                <Link href="/jobs" className="flex items-center space-x-2">
                  <span>キャリアを探す</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* --- Illustration ------------------------------------------------------- */}
          <div className="relative flex justify-center md:justify-end mb-6 md:mb-0 pointer-events-none">
            {/* subtle glow backdrop */}
            <div className="absolute -z-10 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl" />
            <Image
              src="/logo2.png"
              alt="就活生がキャリアを考えるイメージ"
              width={460}
              height={350}
              className="w-52 sm:w-720 lg:w-[460px] h-auto drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)] animate-[float_6s_ease-in-out_infinite]"
              priority
            />
          </div>
        </div>
        {/* --- Scroll Indicator --------------------------------------------- */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 1 }}
          onClick={() => {
            const el = document.getElementById("trending-articles");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute inset-x-0 bottom-4 sm:bottom-6 md:bottom-8 flex flex-col items-center justify-center group"
          aria-label="Scroll to content"
        >
          <ChevronDown className="w-6 h-6 animate-bounce text-white group-hover:text-red-200" />
          <span className="mt-1 text-xs tracking-wide text-white/80 group-hover:text-red-200">
            SCROLL
          </span>
        </motion.button>
      </section>

      {/* ---- Animations -------------------------------------------------- */}
      <style jsx global>{`
        @keyframes blob {
          0%,100% { transform: translate(0px,0px) scale(1); }
          33%     { transform: translate(30px,-50px) scale(1.05); }
          66%     { transform: translate(-20px,40px) scale(0.95); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-25px); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        /* ---------- Animated hero gradient background ---------- */
        @keyframes heroBg {
          0%,100% { background-position: 0% 50%; }
          50%     { background-position: 100% 50%; }
        }
        .animate-hero-bg {
          background-size: 300% 300%;
          animation: heroBg 12s ease-in-out infinite;
        }
      `}</style>
      
      {/* Features Section */}
      <section id="features" className="pt-8 pb-16 sm:py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="mb-8 inline-block bg-gradient-to-r from-red-600 via-red-500 to-orange-400 bg-clip-text text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-transparent">
            学生転職とは
          </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-snug tracking-tight">
              長期インターンやアルバイトの<span className="text-red-600">経歴</span>にスカウトが届く
              新しいハイキャリア就活サービス
            </h2>
            <p className="mt-4 text-gray-600">
              学生転職は、従来の就活の常識を覆す新しいスカウトオファーサービスです。
              これまでの経験を企業にアピールし
              スキルに見合った年収・ポジション付きの評価のあるオファーを受け取ってみませんか？
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-600"></div>
              <CardHeader className="pb-2">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Search className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">スカウト型で効率的なマッチング</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  あなたのプロフィールを見た企業から直接オファーが届きます。
                  自分に興味を持った企業とだけ話を進められるので、効率的に就活ができます。
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-600"></div>
              <CardHeader className="pb-2">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">職務経歴書で自分らしさをPR</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  あなたの経験やスキルを職務経歴書として整理。
                  自己分析をサポートし、企業に自分の強みを効果的にアピールできます。
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-600"></div>
              <CardHeader className="pb-2">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Trophy className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">就活グランプリでチャンス拡大</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  ビジネススキルを可視化するオンラインコンテスト。
                  自分の強みと弱みを客観的に把握でき、企業からの注目度もアップします。
                </p>
              </CardContent>

            </Card>
          </div>
        </div>
      </section>
      

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-gray-50 py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge className="mb-8 bg-red-100 text-red-600 hover:bg-red-200 text-2lg">スカウトまでの流れ</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-red-600">3ステップ</span>で理想の企業と出会う
            </h2>
            <p className="mt-4 text-gray-600">
              プロフィール作成や就活グランプリへの参加であなたの市場価値を高めましょう。
              市場価値が高いほど驚きのスカウトが届く！
            </p>
          </div>

          {/* steps */}
          <div className="grid gap-10 md:gap-8 md:grid-cols-3 items-stretch">
            {/* Step 1 */}
            <div className="flex flex-col items-center md:items-start h-full">
              <div className="relative">
                <div className="mx-auto md:mx-0 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow ring-2 ring-red-500">
                  <span className="sr-only">Step</span>
                  <span className="text-xl font-bold text-red-600">1</span>
                </div>
                <div className="absolute -right-2 -bottom-2 hidden md:flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white">
                  <User className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-6 md:mt-8 w-full flex-1 flex flex-col">
                <h3 className="mb-3 text-xl font-bold md:text-left text-center w-full">プロフィール登録</h3>
                <p className="text-gray-600 md:text-left text-center min-h-[88px]">
                  あなたのスキルや経験、希望する業界などを入力し、魅力的なプロフィールを作成。
                  職務経歴書を作成して、自分の強みをアピールしましょう。
                </p>
                <div className="mt-6">
                  <div className="relative mx-auto w-full max-w-[260px] aspect-[9/16]">
                    <Image
                      src="/toppage/enrollment.png"
                      alt="プロフィール登録イメージ"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 92vw, 260px"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center md:items-start h-full">
              <div className="relative">
                <div className="mx-auto md:mx-0 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow ring-2 ring-red-500">
                  <span className="sr-only">Step</span>
                  <span className="text-xl font-bold text-red-600">2</span>
                </div>
                <div className="absolute -right-2 -bottom-2 hidden md:flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-6 md:mt-8 w-full flex-1 flex flex-col">
                <h3 className="mb-3 text-xl font-bold md:text-left text-center w-full">市場価値を高める</h3>
                <p className="text-gray-600 md:text-left text-center min-h-[88px]">
                  職務経歴書のブラッシュアップや就活グランプリなどの参加を通じて
                  自身の市場価値を高めていきましょう。
                  プロフィールや就活グランプリの結果によりスカウトの内容が変わってきます。
                </p>
                <div className="mt-6">
                  <div className="relative mx-auto w-full max-w-[260px] aspect-[9/16]">
                    <Image
                      src="/toppage/resumes.png"
                      alt="市場価値を高めるイメージ"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 92vw, 260px"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center md:items-start h-full">
              <div className="relative">
                <div className="mx-auto md:mx-0 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow ring-2 ring-red-500">
                  <span className="sr-only">Step</span>
                  <span className="text-xl font-bold text-red-600">3</span>
                </div>
                <div className="absolute -right-2 -bottom-2 hidden md:flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white">
                  <Mail className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-6 md:mt-8 w-full flex-1 flex flex-col">
                <h3 className="mb-3 text-xl font-bold md:text-left text-center w-full">スカウトを受け取る</h3>
                <p className="text-gray-600 md:text-left text-center min-h-[88px]">
                  あなたのプロフィールに興味を持った企業から直接スカウトメッセージが届きます。
                  興味のある企業とコミュニケーションを取りましょう。
                </p>
                <div className="mt-6">
                  <div className="relative mx-auto w-full max-w-[260px] aspect-[9/16]">
                    <Image
                      src="/toppage/offerletter.png"
                      alt="スカウト受け取りイメージ"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 92vw, 260px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" className="bg-red-600 px-8 hover:bg-red-700" asChild>
              <Link href="/signup">
                今すぐ始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge className="mb-4 bg-red-100 text-red-600 hover:bg-red-200 text-2lg">利用者の声</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-red-600">先輩たち</span>の成功体験
            </h2>
            <p className="mt-4 text-gray-600">学生転職を利用して理想の企業に内定した先輩たちの声をご紹介します。</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-red-100">
                  <LazyImage src="/student_tanaka.jpg" alt="田中さんのプロフィール" fill className="object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">田中 美咲</h3>
                  <p className="text-sm text-gray-500">早稲田大学 商学部</p>
                </div>
              </div>
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="mb-4 text-gray-600">
                「新規事業や経営などビジネスの最上流に若いうちから携わりたいと思い、
                コンサルファームと事業会社を両面で見ていました。ネットで調べても絶対に出会えなかった
                事業会社から多数スカウトが届き結果経営幹部待遇での内定をもらうことができました。」
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium text-gray-500">内定先：</span>
                <span className="font-medium">BCGコンサルティング</span>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-red-100">
                  <LazyImage src="/student_sato.jpg" alt="佐藤さんのプロフィール" fill className="object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">佐藤 健太</h3>
                  <p className="text-sm text-gray-500">東京大学 工学部</p>
                </div>
              </div>
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="mb-4 text-gray-600">
                「エントリーシートを書く前に職務経歴書を作成したことで、自分の強みを整理できました。
                スカウト機能で知らなかったベンチャー企業と出会い、今はエンジニアとして活躍しています。」
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium text-gray-500">内定先：</span>
                <span className="font-medium">リブ・コンサルティング</span>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-red-100">
                  <LazyImage src="/studetn_suzuki.jpg" alt="鈴木さんのプロフィール" fill className="object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">鈴木 優子</h3>
                  <p className="text-sm text-gray-500">慶應義塾大学 経済学部</p>
                </div>
              </div>
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="mb-4 text-gray-600">
                「学生時代からAI系の受託会社にてエンジニアをしていましたが、新卒ではAI×〇〇領域で新規事業に挑戦してみたいと考えていました。
                AI領域のスタートアップが増えている中でAIを活用した未来の姿や自分のやりたいことの全てにマッチした企業と出会うことができました。」
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium text-gray-500">内定先：</span>
                <span className="font-medium">株式会社日本製造</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-gray-50 py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge className="mb-8 bg-red-100 text-red-600 hover:bg-red-200 text-2lg">よくある質問</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-red-600">疑問</span>にお答えします
            </h2>
            <p className="mt-4 text-gray-600">
              学生転職についてよくある質問をまとめました。 その他のご質問はお問い合わせフォームからお気軽にどうぞ。
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border rounded-lg mb-4 bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  逆求人型就活とは何ですか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  逆求人型就活とは、学生が企業に応募するのではなく、企業から学生にスカウトが届く仕組みです。
                  あなたのプロフィールや職務経歴書を見た企業から直接オファーが届くため、
                  効率的に就活を進めることができます。自分に興味を持った企業とだけコミュニケーションを取れるのが特徴です。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-lg mb-4 bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  職務経歴書って難しいですか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  学生転職では、学生向けに最適化された職務経歴書のテンプレートを用意しています。
                  アルバイトやインターン、ゼミやサークル活動など、学生時代の経験を整理するガイドラインがあるので、
                  初めての方でも簡単に作成できます。また、AIによる文章の添削機能もあり、より魅力的な職務経歴書を作成できます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg mb-4 bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  就活グランプリとは何ですか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  就活グランプリは、ビジネスケース、Webテスト、ビジネス戦闘力診断の3つのコンテンツで
                  あなたのスキルを客観的に評価するオンラインコンテストです。
                  参加することで自分の強みと弱みを把握でき、企業にもその結果をアピールできます。
                  上位入賞者には、企業への推薦や選考免除などの特典もあります。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-lg mb-4 bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  学生転職の利用は無料ですか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  はい、学生転職は学生の方は完全無料でご利用いただけます。
                  登録、プロフィール作成、企業とのメッセージのやり取り、就活グランプリへの参加など、
                  すべての機能を無料でご利用いただけます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-lg bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  どのような企業が登録していますか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  大手企業からベンチャー、スタートアップまで、様々な業界の1,200社以上の企業が登録しています。
                  IT・通信、コンサルティング、メーカー、金融、広告・マスコミなど、幅広い業界の企業があなたとの出会いを待っています。
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Featured Video & Side Articles — temporarily disabled */}
      {false && (
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          注目のコンテンツ
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* --- Main Video --- */}
          <div className="md:col-span-2">
            <div className="relative pt-[56.25%] rounded-lg overflow-hidden shadow">
              <iframe
                src="https://www.youtube.com/embed/VIDEO_ID?rel=0&controls=1&modestbranding=1"
                title="Make Culture Promo Video"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* --- Side Article List --- */}
          <div className="space-y-6">
            {articlesWithImages.slice(0, 2).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setActive(a)}
                className="flex items-center space-x-4 text-left hover:opacity-80 transition"
              >
                <Image
                  src={a.imageUrl}
                  alt={a.title}
                  width={96}
                  height={64}
                  className="w-24 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-1 text-xs">
                    {a.category ?? "その他"}
                  </Badge>
                  <h3 className="text-sm font-medium leading-snug line-clamp-2">
                    {a.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {a.publishedAt.slice(0, 10)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* --- AI Career Advisor Card --- */}
        <div id="ai-advisor" className="mt-12">
          <GptCareerAdvisorCard />
        </div>
      </section>
      )}

      {/* Trending Articles Section ----------------------------------------- */}
      {/* <section id="trending-articles" className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            トレンド記事
          </h2>
          <Link
            href="/media"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            すべて見る <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {articlesWithImages.slice(0, 8).map((a) => (
            <div key={a.id} className="min-w-[200px] max-w-[200px] flex-shrink-0">
              <ArticleCard
                title={a.title}
                excerpt={a.description ?? ''}
                imageUrl={a.imageUrl!}
                category={a.source}
                date={a.publishedAt.slice(0, 10)}
                onClick={() => setActive(a)}
              />
            </div>
          ))}
        </div>
      </section> */}

      {/* 
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">注目企業</h2>
          </div>
          <Link href="/companies" className="text-orange-600 hover:text-orange-700 font-medium flex items-center">
            すべて見る <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCompanies.map((company) => (
            <Card
              key={company.id}
              className="overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Image
                    src={company.logo}
                    alt={company.name}
                    width={80}
                    height={40}
                    className="h-8 object-contain"
                  />
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm font-medium">{company.rating}</span>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{company.name}</h3>
                <Badge variant="outline" className="mb-2 text-xs">{company.industry}</Badge>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{company.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {(company.tags as string[]).slice(0, 2).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>従業員: {company.employees}</span>
                  <span>設立: {company.founded}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-600">
                    {company.jobCount}件の求人
                  </span>
                  <Button size="sm" variant="outline" className="text-xs bg-transparent">
                    詳細を見る
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      */}

      {/* Job Listings Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">新着求人</h2>
            </div>
            <Link href="/jobs" className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
              すべて見る <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobListings.map((job) => (
              <Card
                key={job.id}
                className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow rounded-xl"
              >
                <Link href={`/jobs/${job.id}`} className="block">
                  <div className="relative h-32 w-full overflow-hidden">
                    {job.coverImageUrl ? (
                      <Image
                        src={job.coverImageUrl || "/placeholder.svg"}
                        alt="cover"
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gray-200">
                        {job.isLimited && !session ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Lock className="w-5 h-5" />
                            <span className="text-xs">限定公開（ログインで表示）</span>
                          </div>
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {job.companyLogo && (
                      <Image
                        src={job.companyLogo || "/placeholder.svg"}
                        alt={job.company}
                        width={64}
                        height={64}
                        className="absolute bottom-2 left-2 rounded-full border-2 border-white bg-white object-contain"
                      />
                    )}
                    {job.isRecommended && (
                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-xs font-medium text-yellow-900">
                        <Star size={12} />
                        おすすめ
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="mb-1 line-clamp-1 font-bold">{job.title}</h3>
                    <p className="line-clamp-1 text-sm text-gray-600">{job.company}</p>
                    {job.location && (
                      <p className="line-clamp-1 text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={12} />
                        {job.location}
                      </p>
                    )}
                    {(job.salary || job.deadline) && (
                      <div className="mt-3 text-xs text-gray-500 flex gap-1 items-center">
                        {job.salary && <span>{job.salary}</span>}
                        {job.deadline && (
                          <>
                            <Calendar size={12} />
                            <span>締切 {job.deadline}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="absolute right-2 top-2 flex space-x-1">
                  {job.isLimited && !session && (
                    <Badge className="bg-gray-800/80 text-white text-xs">限定公開</Badge>
                  )}
                  {job.isNew && (
                    <Badge className="bg-green-100 text-green-700 text-xs">NEW</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Internship Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">インターンシップ</h2>
          </div>
          <Link href="/internships" className="text-pink-600 hover:text-pink-700 font-medium flex items-center">
            すべて見る <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {internships.length === 0 ? (
            <p className="text-center py-12 text-gray-500">インターンシップが見つかりませんでした</p>
          ) : (
            internships.map((internship) => (
              <Card
                key={internship.id}
                className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow rounded-xl"
              >
                <Link href={`/jobs/${internship.id}`} className="block">
                  <div className="relative h-32 w-full overflow-hidden">
                    {internship.coverImageUrl ? (
                      <Image
                        src={internship.coverImageUrl || "/placeholder.svg"}
                        alt="cover"
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gray-200">
                        {internship.isLimited && !session ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Lock className="w-5 h-5" />
                            <span className="text-xs">限定公開（ログインで表示）</span>
                          </div>
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {internship.companyLogo && (
                      <Image
                        src={internship.companyLogo || "/placeholder.svg"}
                        alt={internship.company}
                        width={64}
                        height={64}
                        className="absolute bottom-2 left-2 rounded-full border-2 border-white bg-white object-contain"
                      />
                    )}
                    {internship.isRecommended && (
                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-1 text-xs font-medium text-yellow-900">
                        <Star size={12} />
                        おすすめ
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="mb-1 line-clamp-1 font-bold">{internship.title}</h3>
                    <p className="line-clamp-1 text-sm text-gray-600">{internship.company}</p>
                    {internship.location && (
                      <p className="line-clamp-1 text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={12} />
                        {internship.location}
                      </p>
                    )}
                    {(internship.salary || internship.duration) && (
                      <div className="mt-3 text-xs text-gray-500 flex gap-1 items-center">
                        {internship.salary && <span>{internship.salary}</span>}
                        {internship.duration && <span>{internship.duration}</span>}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="absolute right-2 top-2 flex space-x-1">
                  {internship.isLimited && !session && (
                    <Badge className="bg-gray-800/80 text-white text-xs">限定公開</Badge>
                  )}
                  {internship.isNew && (
                    <Badge className="bg-green-100 text-green-700 text-xs">NEW</Badge>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* CV Registration CTA */}
      <section className="w-full relative flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-red-600 via-red-400 to-blue-500 text-white px-4">
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-40 w-[580px] h-[580px] rounded-full bg-white/10 blur-3xl animate-[blob_35s_ease-in-out_infinite]"></div>
          <DecorativeBlob position="br" size="md" />
        </div>
        <div className="text-center max-w-xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-8 leading-tight">
            学生転職に登録してキャリアを広げよう
          </h2>
          <Button
            size="lg"
            className="bg-white hover:bg-red-50 text-red-600 font-semibold rounded-full px-10 py-5 shadow-lg"
            asChild
          >
            <Link href="/signup">無料で登録する</Link>
          </Button>
        </div>
      </section>


      {/* Floating AI Advisor Button (temporarily hidden) */}
      {SHOW_FLOATING_ADVISOR && (
        <div className={`fixed ${bannerClosed ? 'bottom-2' : 'bottom-12'} right-4 z-60`}>
          <button
            onClick={() => setShowAdvisor(true)}
            className="block focus:outline-none"
            aria-label="Open AI Advisor"
          >
            <Image
              src="/logo2.png"
              alt="AI Advisor"
              width={56}
              height={56}
              className="rounded-full shadow-lg hover:scale-105 transition-transform"
            />
          </button>
        </div>
      )}

      {/* Mobile App Banner – fixed at bottom 
      {!bannerClosed && (
        <div className="fixed inset-x-0 bottom-0 z-50">
          <MobileAppBanner onClose={() => setBannerClosed(true)} />
        </div>
      )}*/}

      {/* AI Advisor Modal (hidden with flag) */}
      {SHOW_FLOATING_ADVISOR && (
        <Dialog open={showAdvisor} onOpenChange={setShowAdvisor}>
          <DialogContent className="max-w-3xl p-0">
            <GptCareerAdvisorCard />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}