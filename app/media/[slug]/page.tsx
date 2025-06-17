/* ------------------------------------------------------------------
   app/media/[slug]/page.tsx  – 記事詳細ページ
------------------------------------------------------------------ */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

/* -------- 型定義 -------- */
type FullPost =
  Database["public"]["Tables"]["media_posts"]["Row"] & {
    media_categories: { name: string; slug: string } | null;
    media_authors: { display_name: string; avatar_url: string | null } | null;
    media_posts_tags: {
      media_tags: { name: string; slug: string } | null;
    }[];
  };

/* -------- Supabase から記事取得 -------- */
async function getPost(slug: string): Promise<FullPost | null> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
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
    .single();

  if (error) {
    console.error(error);
    return null;
  }
  return data as FullPost;
}

/* -------- Metadata (SEO) -------- */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return {};

  const title = `${post.title} | GAKUTEN Media`;
  const description = post.excerpt ?? "";
  const image = post.cover_image_url ?? "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/media/${post.slug}`,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

/* ================================================================== */

export default async function MediaDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  return (
    <article className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50">
      {/* HERO */}
      {post.cover_image_url && (
        <div className="relative h-[400px] md:h-[500px]">
          <Image
            src={post.cover_image_url}
            alt={post.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
          <div className="relative z-10 container mx-auto px-4 h-full flex items-end pb-10">
            <h1 className="text-white text-3xl md:text-5xl font-black drop-shadow-lg">
              {post.title}
            </h1>
          </div>
        </div>
      )}

      {/* Breadcrumb + back */}
      <div className="container mx-auto px-4 pt-6 flex items-center gap-4">
        <Link href="/media" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Link>
        <div className="text-xs text-gray-400">/</div>
        {post.media_categories && (
          <Link
            href={`/media?category=${post.media_categories.slug}`}
            className="text-sm text-orange-600 hover:underline"
          >
            {post.media_categories.name}
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-12 prose prose-gray lg:prose-lg">
        {/* Post meta */}
        <div className="mb-8 flex items-center flex-wrap gap-4">
          {post.media_categories && (
            <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0">
              {post.media_categories.name}
            </Badge>
          )}
          <time className="text-sm text-gray-500">
            {new Date(post.published_at!).toLocaleDateString("ja-JP")}
          </time>
          {post.media_authors && (
            <div className="flex items-center gap-2 ml-auto">
              {post.media_authors.avatar_url && (
                <Image
                  src={post.media_authors.avatar_url}
                  alt={post.media_authors.display_name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-gray-700">
                {post.media_authors.display_name}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        {post.content_html ? (
          <div
            dangerouslySetInnerHTML={{ __html: post.content_html }}
            className="post-body"
          />
        ) : (
          <p>本文がまだありません。</p>
        )}

        {/* Tags */}
        {post.media_posts_tags.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2">
            {post.media_posts_tags.map(
              (t) =>
                t.media_tags && (
                  <Link
                    key={t.media_tags.slug}
                    href={`/media?tag=${t.media_tags.slug}`}
                  >
                    <Badge variant="outline">#{t.media_tags.name}</Badge>
                  </Link>
                )
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 flex justify-center">
          <Link href="/media" className="inline-flex">
            <Button variant="secondary" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              記事一覧に戻る
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
