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
  Heart,
  Bookmark,
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  ChevronUp,
  List,
  Search,
  Star,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";
import type { Database } from "@/lib/supabase/types";
import { load } from "cheerio";

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

/** slugify – same rule set as editor */
function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-龠ぁ-んァ-ンー]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Extract h1–h3 headings and ensure each has an id.
 *  Returns { headings, html } where html includes injected ids.
 */
function extractToc(html: string) {
  const $ = load(html);
  const headings: { id: string; text: string; level: number }[] = [];

  $("h1, h2, h3").each((_, el) => {
    const level = Number(el.tagName.slice(1));
    const text = $(el).text();
    let id = $(el).attr("id");
    if (!id) {
      id = slugify(text);
      $(el).attr("id", id);
    }
    headings.push({ id, text, level });
  });

  return { headings, html: $.html() };
}


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
export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
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
export default async function MediaDetailPage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;
  const post = await fetchPost(params.slug);
  if (!post) notFound();

  const readTime = estimateReadTime(post.content_html);
  const { headings, html: htmlWithAnchors } = extractToc(post.content_html ?? "");
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
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* ===== HEADER ===== */}
      <header
        id="pageTop"
        className="backdrop-blur-md bg-white/80 border-b border-white/20 sticky top-0 z-50 overflow-x-hidden"
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
              <div className="absolute -top-1 right-0 w-2 h-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full animate-pulse" />
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              {readTime}読了
            </div>
          </div>

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
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-4 md:mb-6">
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

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 md:mb-6 leading-tight break-words">
                  {post.title}
                </h1>

                {post.excerpt && (
                  <p className="hidden md:block text-lg lg:text-xl text-gray-600 leading-relaxed md:mb-8">
                    {post.excerpt}
                  </p>
                )}

                {/* AUTHOR (SEO only, hidden) */}
                {post.media_authors && (
                  <div className="hidden" aria-hidden="true">
                    <span itemProp="author" itemScope itemType="http://schema.org/Person">
                      <meta itemProp="name" content={post.media_authors.display_name} />
                      {post.media_authors.avatar_url && (
                        <meta itemProp="image" content={post.media_authors.avatar_url} />
                      )}
                    </span>
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
                {headings.length > 0 && (
                  <nav className="hidden md:block md:mb-10">
                    <details
                      open
                      className="group bg-gray-50/80 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm"
                    >
                      <summary className="flex items-center gap-2 cursor-pointer font-semibold text-gray-900 dark:text-gray-100 select-none">
                        <List className="w-4 h-4 text-orange-500 transition-transform group-open:rotate-90" />
                        目次
                      </summary>

                      <ol className="mt-4 space-y-2 text-sm">
                        {headings.map(({ id, text, level }) => (
                          <li key={id} style={{ marginLeft: (level - 1) * 16 }}>
                            <a
                              href={`#${id}`}
                              className="block hover:text-orange-600 transition-colors"
                            >
                              {text}
                            </a>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </nav>
                )}

                {post.content_html ? (
                  <div
                    className="prose prose-lg max-w-none
                      prose-headings:font-bold prose-headings:text-gray-900 prose-headings:mb-4
                      prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6
                      prose-strong:text-gray-900 prose-strong:font-semibold
                      prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-orange-50 prose-blockquote:p-6 prose-blockquote:rounded-r-lg prose-blockquote:my-8
                      prose-ul:space-y-2 prose-ol:space-y-2
                      prose-li:text-gray-700"
                    dangerouslySetInnerHTML={{ __html: htmlWithAnchors }}
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
          <aside className="lg:col-span-1 sticky top-32 space-y-6">

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
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-full"
            >
              <Link href="/jobs" className="flex items-center justify-center">
                <Search className="w-4 h-4 mr-2" />
                求人を探す
              </Link>
            </Button>

            <Button
              asChild
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full"
            >
              <Link href="/media" className="flex items-center justify-center">
                <Star className="w-4 h-4 mr-2" />
                おすすめ記事
              </Link>
            </Button>

            <Button
              asChild
              className="w-full bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-600 hover:to-emerald-600 text-white rounded-full"
            >
              <Link href="/media/categories" className="flex items-center justify-center">
                <FolderOpen className="w-4 h-4 mr-2" />
                カテゴリ一覧
              </Link>
            </Button>

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
