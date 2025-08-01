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
  GraduationCap,
  Zap,
  Calendar,
  Star,
  MapPin,
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
import { supabase } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"





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

          // 新着求人
          supabase
            .from("jobs")
            .select(
              `id, title, description, location, salary_range, work_type, selection_type, cover_image_url,
               is_recommended, created_at, application_deadline,
               companies ( name, logo )`
            )
            .eq("published", true)
            .eq("selection_type", "fulltime")
            .order("created_at", { ascending: false })
            .limit(8),

          // インターンシップ
          supabase
            .from("jobs")
            .select(
              `id, title, description, location, work_type,
               selection_type, cover_image_url, created_at, is_recommended,
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
            jobsData.map((j: any) => ({
              id: j.id,
              title: j.title,
              company: j.companies?.name ?? "",
              companyLogo: j.companies?.logo ?? "",
              location: j.location ?? "",
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
              coverImageUrl: j.cover_image_url ?? "",
              selectionType: j.selection_type ?? "fulltime",
            }))
          );
        }

        /* ---------- インターンシップ ---------- */
        if (!internsErr && internsData) {
          setInternships(
            internsData.map((i: any) => ({
              id: i.id,
              title: i.title,
              company: i.companies?.name ?? "",
              companyLogo: i.companies?.logo ?? "",
              location: i.location ?? "",
              description: i.description ?? "",
              coverImageUrl: i.cover_image_url ?? "",
              isNew:
                Date.now() - new Date(i.created_at).getTime() <
                1000 * 60 * 60 * 24 * 7,
              duration: "-", // 期間情報は別テーブルを後で紐づける想定
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
                        return d.commission_rate
                          ? `歩合${d.commission_rate}`
                          : "";
                      }
                      return "";
                    })()
                  : i.selection_type === "internship_short"
                  ? (i.internship_details?.allowance ??
                      i.internship_details?.[0]?.allowance ??
                      "")
                  : "",
              isRemote: i.work_type === "リモート",
              isRecommended: i.is_recommended,
            }))
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
return (
    <div className="min-h-screen bg-white">

      {/* Desktop and Mobile Headers removed */}

      {/* Hero Section -------------------------------------------------- */}
      <section className="relative isolate flex items-center pt-20 pb-24 sm:pb-20 md:pb-16 bg-gradient-to-br from-red-600 via-red-400 to-blue-500 text-white overflow-hidden min-h-[75vh] animate-hero-bg">
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-40 w-[580px] h-[580px] rounded-full bg-white/10 blur-3xl animate-[blob_35s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-0 right-0 w-[460px] h-[460px] rounded-full bg-white/10 blur-3xl animate-[blob_40s_ease-in-out_infinite]"></div>
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
      <section id="trending-articles" className="max-w-6xl mx-auto px-4 py-12">
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
      </section>

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
                  {job.coverImageUrl && (
                    <div className="relative h-32 w-full overflow-hidden">
                      <Image
                        src={job.coverImageUrl || "/placeholder.svg"}
                        alt="cover"
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
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
                  )}

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
                  {internship.coverImageUrl && (
                    <div className="relative h-32 w-full overflow-hidden">
                      <Image
                        src={internship.coverImageUrl || "/placeholder.svg"}
                        alt="cover"
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
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
                  )}

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
                  {internship.isNew && (
                    <Badge className="bg-green-100 text-green-700 text-xs">NEW</Badge>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </section>


      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">

        {/* Enhanced Tabs Navigation like NewsPicks */}
        <Tabs defaultValue="news" className="mb-10">
          <div className="border-b sticky top-14 z-40 bg-white md:static md:bg-transparent px-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              {/* --- Tab Navigation --- */}
              <TabsList className="flex-1 justify-start bg-transparent h-12 p-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <TabsTrigger
                  value="news"
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent min-w-max"
                >
                  ニュース
                </TabsTrigger>
                <TabsTrigger
                  value="career"
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent min-w-max"
                >
                  キャリア
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent min-w-max"
                >
                  AI分析
                </TabsTrigger>
                <TabsTrigger
                  value="companies"
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent min-w-max"
                >
                  企業研究
                </TabsTrigger>
                <TabsTrigger
                  value="own"
                  className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent min-w-max"
                >
                  自社メディア
                </TabsTrigger>
              </TabsList>

              {/* --- Search --- */}
              <div className="hidden md:flex items-center relative ml-6 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="記事を検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                    }
                  }}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
          <TabsContent value="news" className="mt-6">
            {newsArticles.length === 0 ? (
              <p className="text-center py-12 text-gray-500">記事が見つかりませんでした</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-8">
                {newsArticles.map((a) => (
                  <ArticleCard
                    key={a.id}
                    title={a.title}
                    excerpt={a.description ?? ""}
                    imageUrl={a.imageUrl!}
                    category={a.source}
                    date={a.publishedAt.slice(0, 10)}
                    onClick={() => setActive(a)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="career" className="mt-6">
            {careerArticles.length === 0 ? (
              <p className="text-center py-12 text-gray-500">記事が見つかりませんでした</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-8">
                {careerArticles.map((a) => (
                  <ArticleCard
                    key={a.id}
                    title={a.title}
                    excerpt={a.description ?? ""}
                    imageUrl={a.imageUrl!}
                    category={a.source}
                    date={a.publishedAt.slice(0, 10)}
                    onClick={() => setActive(a)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="ai" className="mt-6">
            {aiArticles.length === 0 ? (
              <p className="text-center py-12 text-gray-500">記事が見つかりませんでした</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-8">
                {aiArticles.map((a) => (
                  <ArticleCard
                    key={a.id}
                    title={a.title}
                    excerpt={a.description ?? ""}
                    imageUrl={a.imageUrl!}
                    category={a.source}
                    date={a.publishedAt.slice(0, 10)}
                    onClick={() => setActive(a)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="companies" className="mt-6">
            {companyArticlesTab.length === 0 ? (
              <p className="text-center py-12 text-gray-500">記事が見つかりませんでした</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-8">
                {companyArticlesTab.map((a) => (
                  <ArticleCard
                    key={a.id}
                    title={a.title}
                    excerpt={a.description ?? ""}
                    imageUrl={a.imageUrl!}
                    category={a.source}
                    date={a.publishedAt.slice(0, 10)}
                    onClick={() => setActive(a)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="own" className="mt-6">
            {companyArticlesWithImages.length === 0 ? (
              <p className="text-center py-12 text-gray-500">
                記事が見つかりませんでした
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-8">
                {companyArticlesWithImages.map((c) => (
                  <ArticleCard
                    key={c.id}
                    title={c.title}
                    excerpt={c.description ?? ""}
                    imageUrl={c.imageUrl!}
                    category={c.source}
                    date={c.publishedAt.slice(0, 10)}
                    onClick={() => setActive(c)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {active && (
        <ArticleDetailDrawer
          article={active}
          open={!!active}
          onOpenChange={(v) => {
            if (!v) setActive(null)
          }}
        />
      )}

      {/* CV Registration CTA */}
      <section className="relative flex items-center justify-center min-h-[60vh] bg-gradient-to-br from-red-600 via-red-400 to-blue-500 text-white px-4">
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-40 w-[580px] h-[580px] rounded-full bg-white/10 blur-3xl animate-[blob_35s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-0 right-0 w-[460px] h-[460px] rounded-full bg-white/10 blur-3xl animate-[blob_40s_ease-in-out_infinite]"></div>
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
            <Link href="/cv/register">無料で登録する</Link>
          </Button>
        </div>
      </section>


      {/* Floating AI Advisor Button */}
      <div
        className={`fixed ${bannerClosed ? 'bottom-4' : 'bottom-36'} right-4 z-60`}
      >
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

      {/* Mobile App Banner – fixed at bottom 
      {!bannerClosed && (
        <div className="fixed inset-x-0 bottom-0 z-50">
          <MobileAppBanner onClose={() => setBannerClosed(true)} />
        </div>
      )}*/}

      {/* AI Advisor Modal */}
      <Dialog open={showAdvisor} onOpenChange={setShowAdvisor}>
        <DialogContent className="max-w-3xl p-0">
          <GptCareerAdvisorCard />
        </DialogContent>
      </Dialog>
    </div>
  )
}