/* ------------------------------------------------------------------
   app/media/[slug]/page.tsx – Published article view (magazine style) – v2
------------------------------------------------------------------ */
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Calendar,
  Eye,
  Clock,
  Mail,
  Heart,
  MessageCircle,
  Bookmark,
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  ChevronUp,
  TrendingUp,
  Users,
  Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";
import type { Database } from "@/lib/supabase/types";
import { SidebarNav } from "@/components/ui/sidebarnav";

export const revalidate = 3600; // 1時間（Next.js の page ファイルでは式不可）

/* ---------- Types ---------- */
type FullPost = Database["public"]["Tables"]["media_posts"]["Row"] & {
  media_categories: { name: string; slug: string } | null;
  media_authors: { display_name: string; avatar_url: string | null } | null;
  media_posts_tags: {
    media_tags: { name: string; slug: string } | null;
  }[];
};

type SimplePost = {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  media_categories: { name: string; slug: string } | null;
  read_time: string;
};

/* ---------- Helpers ---------- */
function estimateReadTime(html: string | null): string {
  if (!html) return "1分";
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 400));
  return `${minutes}分`;
}

/* ---------- Sidebar Items ---------- */
const sidebarItems = [
  {
    title: "インターン情報",
    icon: TrendingUp,
    href: "/intern",
    gradient: "from-pink-500 to-rose-500",
    bgGradient: "from-pink-50 to-rose-50",
    count: "120+",
    active: false,
  },
  {
    title: "キャリア情報",
    icon: Briefcase,
    href: "/media",
    gradient: "from-orange-500 to-amber-500",
    bgGradient: "from-orange-50 to-amber-50",
    active: true,
    count: "300+",
  },
  {
    title: "コミュニティ",
    icon: Users,
    href: "/community",
    gradient: "from-sky-500 to-cyan-500",
    bgGradient: "from-sky-50 to-cyan-50",
    count: "1.2k",
    active: false,
  },
  {
    title: "お問い合わせ",
    icon: Mail,
    href: "/contact",
    gradient: "from-purple-500 to-fuchsia-500",
    bgGradient: "from-purple-50 to-fuchsia-50",
    count: "",
    active: false,
  },
] as const;

/* ---------- Data Fetch ---------- */
async function fetchPost(slug: string): Promise<FullPost | null> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("media_posts")
    .select(
      `
        *,
        media_categories ( name, slug ),
        media_authors ( display_name, avatar_url ),
        media_posts_tags (
          media_tags ( name, slug )
        )
      `
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  return data as FullPost | null;
}

async function fetchRelated(
  categorySlug: string | null,
  excludeId: string
): Promise<SimplePost[]> {
  if (!categorySlug) return [];
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase
    .from("media_posts")
    .select(
      `
        id,
        slug,
        title,
        cover_image_url,
        media_categories ( name, slug )
      `
    )
    .eq("status", "published")
    .eq("media_categories.slug", categorySlug)
    .neq("id", excludeId)
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    data?.map((d) => ({
      id: d.id,
      slug: d.slug,
      title: d.title,
      cover_image_url: d.cover_image_url,
      media_categories: d.media_categories,
      read_time: "3分",
    })) ?? []
  );
}


/* ---------- Metadata ---------- */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await fetchPost(params.slug);
  if (!post) return {};

  const keywords =
    post.media_posts_tags
      .map(t => t.media_tags?.name)
      .filter(Boolean)
      .join(", ") || undefined;

  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    keywords,
    alternates: { canonical: `https://gakuten.co.jp/media/${post.slug}` },
    openGraph: {
      type: "article",
      locale: "ja_JP",
      title: post.title,
      description: post.excerpt ?? "",
      url: `https://gakuten.co.jp/media/${post.slug}`,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : [],
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? post.published_at ?? undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt ?? "",
      images: post.cover_image_url ? [post.cover_image_url] : [],
      site: "@gakuten_media",
    },
  };
}

/* ---------- Page ---------- */
export default async function MediaDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await fetchPost(params.slug);
  if (!post) notFound();

  const readTime = estimateReadTime(post.content_html);
  const related = await fetchRelated(
    post.media_categories?.slug ?? null,
    post.id
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? "",
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at ?? post.published_at,
    author: post.media_authors
      ? { "@type": "Person", name: post.media_authors.display_name }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "GAKUTEN",
      logo: {
        "@type": "ImageObject",
        url: "https://gakuten.co.jp/logo.png",
      },
    },
  };

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* ===== HEADER ===== */}
      <header
        id="pageTop"
        className="backdrop-blur-md bg-white/80 border-b border-white/20 sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <div className="relative">
              <span className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                GAKUTEN
              </span>
              <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent ml-1">
                Media
              </span>
              <div className="absolute -top-1 -right-2 w-2 h-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full animate-pulse" />
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {readTime}読了
            </div>
          </div>

          <Button className="bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Mail className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Link
          href="/media"
          className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
          記事一覧に戻る
        </Link>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* ----- MAIN ----- */}
          <main className="lg:col-span-3">
            <article className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              {/* HEADER */}
              <header className="p-8 pb-0">
                <div className="flex items-center gap-3 mb-6">
                  {post.media_categories && (
                    <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 px-4 py-1">
                      {post.media_categories.name}
                    </Badge>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {post.published_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(post.published_at)}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      ---
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {readTime}
                    </div>
                  </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p className="text-xl text-gray-600 leading-relaxed mb-8">
                    {post.excerpt}
                  </p>
                )}

                {/* AUTHOR */}
                {post.media_authors && (
                  <div className="flex items-center justify-between mb-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      {post.media_authors.avatar_url ? (
                        <Image
                          src={post.media_authors.avatar_url}
                          alt={post.media_authors.display_name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold">
                          {post.media_authors.display_name.charAt(0)}
                        </div>
                      )}
                      <div className="font-semibold text-gray-900">
                        {post.media_authors.display_name}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-full">
                        <Heart className="w-4 h-4 mr-1 text-red-500" />
                        --
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        --
                      </Button>
                    </div>
                  </div>
                )}
              </header>

              {/* COVER */}
              {post.cover_image_url && (
                <div className="px-8 mb-8">
                  <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl">
                    <Image
                      src={post.cover_image_url}
                      alt={`${post.title} | GAKUTEN Media`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>
                </div>
              )}

              {/* BODY */}
              <div className="px-8 pb-8">
                {post.content_html ? (
                  <div
                    className="prose prose-lg max-w-none
                      prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mb-4
                      prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6
                      prose-strong:text-gray-900 prose-strong:font-semibold
                      prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-orange-50 prose-blockquote:p-6 prose-blockquote:rounded-r-lg prose-blockquote:my-8
                      prose-ul:space-y-2 prose-ol:space-y-2
                      prose-li:text-gray-700"
                    dangerouslySetInnerHTML={{ __html: post.content_html }}
                  />
                ) : (
                  <p>本文がまだありません。</p>
                )}
              </div>

              {/* FOOTER */}
              <footer className="px-8 pb-8 border-t border-gray-100 pt-8">
                {post.media_posts_tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">タグ</h3>
                    <div className="flex flex-wrap gap-2">
                      {post.media_posts_tags.map(
                        (t) =>
                          t.media_tags && (
                            <Link
                              key={t.media_tags.slug}
                              href={`/media?tag=${t.media_tags.slug}`}
                            >
                              <Badge
                                variant="outline"
                                className="text-sm border-orange-200 text-orange-600 hover:bg-orange-50 cursor-pointer"
                              >
                                #{t.media_tags.name}
                              </Badge>
                            </Link>
                          )
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl">
                  <div className="flex gap-3">
                    <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full">
                      <Heart className="w-4 h-4 mr-2" />
                      いいね
                    </Button>
                    <Button variant="outline" className="rounded-full">
                      <Bookmark className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Twitter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Facebook className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Linkedin className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </footer>
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
              />
            </article>
          </main>

          {/* ----- SIDEBAR ----- */}
          <aside className="lg:col-span-1 space-y-6">
            <SidebarNav items={sidebarItems} />

            {related.length > 0 && (
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                    関連記事
                  </h3>
                  <div className="space-y-4">
                    {related.map((a) => (
                      <Link key={a.id} href={`/media/${a.slug}`} className="block group">
                        <div className="flex gap-3">
                          <div className="relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={a.cover_image_url || "/placeholder.svg"}
                              alt={a.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-orange-600 transition-colors">
                              {a.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              {a.media_categories && (
                                <Badge variant="outline" className="text-xs">
                                  {a.media_categories.name}
                                </Badge>
                              )}
                              <span>{a.read_time}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              asChild
              className="w-full bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white rounded-full"
            >
              <Link href="#pageTop" scroll={true} className="flex items-center justify-center">
                <ChevronUp className="w-4 h-4 mr-2" />
                トップに戻る
              </Link>
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}
