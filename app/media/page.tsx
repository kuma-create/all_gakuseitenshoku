/* ------------------------------------------------------------------
   app/media/page.tsx  – GAKUTEN Media トップページ
   v0 のリッチ UI をベースに、Supabase `media_posts` から動的に記事を取得
------------------------------------------------------------------ */
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  TrendingUp,
  Users,
  Calendar,
  Briefcase,
  ArrowRight,
  Star,
  Eye,
  Heart,
} from "lucide-react";

import type { Database } from "@/lib/supabase/types";

/* -------- 型 -------- */
type MediaPost =
  Database["public"]["Tables"]["media_posts"]["Row"] & {
    media_categories: { name: string } | null;
  };

/* -------- Supabase から記事を取得 -------- */
async function fetchPosts(): Promise<MediaPost[]> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("media_posts")
    .select(
      `
        id,
        title,
        slug,
        excerpt,
        cover_image_url,
        published_at,
        media_categories ( name )
      `
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    return [];
  }

  // Fallback placeholder を付与
  return (data as MediaPost[]).map((p) => ({
    ...p,
    cover_image_url:
      p.cover_image_url ||
      "/placeholder.svg?height=300&width=400&text=No+Image",
  }));
}

/* -------- Sidebar アイテム（固定） -------- */
const sidebarItems = [
  {
    title: "インターン情報",
    icon: TrendingUp,
    href: "/intern",
    gradient: "from-pink-500 to-rose-500",
    bgGradient: "from-pink-50 to-rose-50",
    count: "120+",
  },
  {
    title: "スタートアップ情報",
    icon: Users,
    href: "/startup",
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    count: "85+",
  },
  {
    title: "キャリア情報",
    icon: Briefcase,
    href: "/career",
    gradient: "from-orange-500 to-amber-500",
    bgGradient: "from-orange-50 to-amber-50",
    active: true,
    count: "200+",
  },
  {
    title: "イベント情報",
    icon: Calendar,
    href: "/events",
    gradient: "from-purple-500 to-indigo-500",
    bgGradient: "from-purple-50 to-indigo-50",
    count: "45+",
  },
];

/* ================================================================== */

export default async function MediaPage() {
  const posts = await fetchPosts();

  // フィーチャー記事：最新 3 本
  const featuredArticles = posts.slice(0, 3);
  const otherArticles = posts.slice(3);

  // Hero は一番目
  const hero = featuredArticles[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/80 border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="relative">
              <span className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                GAKUTEN
              </span>
              <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent ml-1">
                Media
              </span>
              <div className="absolute -top-1 -right-2 w-2 h-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full animate-pulse" />
            </div>
          </div>
          <Button className="bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Mail className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <main className="flex-1">
          {/* Hero Section */}
          {hero && (
            <section className="relative h-[600px] overflow-hidden">
              <div className="absolute inset-0">
                <Image
                  src={hero.cover_image_url}
                  alt={hero.title}
                  fill
                  className="object-cover scale-105 hover:scale-100 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>

              <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
                <div className="text-white max-w-3xl">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 mb-6 border border-white/20">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium">
                      学生に選ばれるキャリアメディア
                    </span>
                  </div>

                  <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight line-clamp-2">
                    {hero.title}
                  </h1>

                  {hero.excerpt && (
                    <p className="text-lg mb-8 text-gray-200 line-clamp-3">
                      {hero.excerpt}
                    </p>
                  )}

                  <div className="flex gap-4">
                    <Link href={`/media/${hero.slug}`}>
                      <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        記事を読む
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 backdrop-blur-md px-8 py-3 rounded-full font-semibold transition-all duration-300"
                    >
                      サービス紹介
                    </Button>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute top-20 right-20 w-20 h-20 bg-gradient-to-r from-orange-400/20 to-amber-400/20 rounded-full blur-xl animate-pulse" />
              <div className="absolute bottom-32 left-32 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-xl animate-pulse delay-1000" />
            </section>
          )}

          {/* Featured Articles Section */}
          {featuredArticles.length > 0 && (
            <section className="container mx-auto px-4 py-20">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-4 mb-6">
                  <div className="w-12 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
                  <h2 className="text-4xl font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                    PICKUP
                  </h2>
                  <div className="w-12 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
                </div>
                <p className="text-xl text-gray-600 font-medium">特集記事</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {featuredArticles.map((article, index) => (
                  <Card
                    key={article.id}
                    className={`group overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/80 backdrop-blur-sm border-0 shadow-lg ${
                      index === 1 ? "md:scale-105" : ""
                    }`}
                  >
                    <Link href={`/media/${article.slug}`}>
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={article.cover_image_url}
                          alt={article.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="absolute top-4 left-4 flex gap-2">
                          {article.media_categories && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-lg">
                              {article.media_categories.name}
                            </Badge>
                          )}
                        </div>

                        <div className="absolute bottom-4 right-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {/* NOTE: views / likes が DB に無い場合は非表示 */}
                        </div>
                      </div>

                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors duration-300">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-4">
                            {article.excerpt}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {new Date(article.published_at!).toLocaleDateString(
                              "ja-JP"
                            )}
                          </span>
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-orange-500" />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* 残りの記事をグリッドで表示 */}
          {otherArticles.length > 0 && (
            <section className="container mx-auto px-4 pb-24">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherArticles.map((post) => (
                  <Card
                    key={post.id}
                    className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm border-0"
                  >
                    <Link href={`/media/${post.slug}`}>
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={post.cover_image_url}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>

                      <CardContent className="p-5">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
                            {post.excerpt}
                          </p>
                        )}

                        <div className="text-xs text-gray-500">
                          {new Date(post.published_at!).toLocaleDateString(
                            "ja-JP"
                          )}
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-80 bg-gradient-to-b from-white/50 to-gray-50/50 backdrop-blur-sm min-h-screen p-6 border-l border-white/20">
          <div className="mb-8">
            <span className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              GAKUTEN
            </span>
            <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent ml-1">
              Media
            </span>
          </div>

          <nav className="space-y-4 mb-8">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block group"
                prefetch
                scroll={false}
              >
                <Card
                  className={`overflow-hidden transition-all duration-300 border-0 ${
                    item.active
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg"
                      : `bg-gradient-to-r ${item.bgGradient} hover:shadow-lg hover:-translate-y-1`
                  }`}
                >
                  <div className="flex items-center gap-4 px-5 py-4 font-semibold text-sm">
                    <span
                      className={`p-2 rounded-lg ${
                        item.active ? "bg-white/20" : `bg-gradient-to-r ${item.gradient} text-white`
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                    </span>
                    <span className={`${item.active ? "text-white" : "text-gray-800"}`}>
                      {item.title}
                    </span>
                    <span
                      className={`ml-auto text-xs font-normal ${
                        item.active ? "text-white/80" : "text-gray-500"
                      }`}
                    >
                      {item.count}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}