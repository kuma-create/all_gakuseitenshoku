/* ------------------------------------------------------------------
   app/admin/(protected)/media/page.tsx  – 管理画面: 投稿一覧
------------------------------------------------------------------ */
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Plus, Edit2 } from "lucide-react";
import Image from "next/image";
import DeletePostButton from "@/components/media/delete-button";
import StatusToggle from "@/components/media/StatusToggle";

import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic"; // always SSR to avoid stale cache in admin list

/* ------------------------- 型 ------------------------- */
type AdminPost =
  Database["public"]["Tables"]["media_posts"]["Row"] & {
    media_categories: { name: string; slug: string } | null;
  };

type AdminVideo =
  Database["public"]["Tables"]["featured_videos"]["Row"];

/* -------------------- データ取得 (SSR) -------------------- */
async function fetchMyPosts(): Promise<AdminPost[]> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // service_role key – only on the server
    { global: { headers: { Cookie: (await cookies()).toString() } } }
  );

  const { data, error } = await supabase
    .from("media_posts")
    .select(
      `
      *,
      media_categories ( name, slug )
    `
    )
    .is("deleted_at", null)              // 追加
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return data as AdminPost[];
}

async function fetchVideos(): Promise<AdminVideo[]> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,          // service_role key – server only
    { global: { headers: { Cookie: (await cookies()).toString() } } }
  );

  const { data, error } = await supabase
    .from("featured_videos")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return data as AdminVideo[];
}

export default async function AdminMediaPage() {
  const [posts, videos] = await Promise.all([fetchMyPosts(), fetchVideos()]);

  return <MediaTabs posts={posts} videos={videos} />;
}

function MediaTabs({
  posts,
  videos,
}: {
  posts: AdminPost[];
  videos: AdminVideo[];
}) {
  return (
    <section className="container mx-auto px-6 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">メディア &amp; 動画管理</h1>
      </div>

      <Tabs defaultValue="media" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="media">メディア</TabsTrigger>
          <TabsTrigger value="video">動画</TabsTrigger>
        </TabsList>

        {/* ▼ メディア記事タブ ▼ */}
        <TabsContent value="media">
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link href="/admin/media/new">
                <Plus className="w-4 h-4 mr-2" />
                新規作成
              </Link>
            </Button>
          </div>
          {posts.length === 0 ? (
            <p className="text-muted-foreground">投稿がありません。</p>
          ) : (
            <table className="w-full text-sm border border-gray-200">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 font-medium">タイトル</th>
                  <th className="p-2 font-medium">カテゴリ</th>
                  <th className="p-2 font-medium">更新日</th>
                  <th className="p-2 font-medium">公開状態</th>
                  <th className="p-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t">
                    <td className="p-2">
                      <Link
                        href={`/admin/media/${post.id}/edit`}
                        className="hover:underline"
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td className="p-2">
                      {post.media_categories?.name ?? "-"}
                    </td>
                    <td className="p-2">
                      {format(
                        new Date(
                          (post.updated_at ?? post.created_at) as string
                        ),
                        "yyyy/MM/dd HH:mm",
                        { locale: ja }
                      )}
                    </td>
                    <td className="p-2">
                      <StatusToggle
                        id={post.id as string}
                        current={post.status as any}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-3">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/admin/media/${post.id}/edit`}>
                            <Edit2 className="w-4 h-4 mr-1" />
                            編集
                          </Link>
                        </Button>
                        <DeletePostButton id={post.id as string} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        {/* ▼ 動画タブ ▼ */}
        <TabsContent value="video">
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link href="/admin/media/new/video">
                <Plus className="w-4 h-4 mr-2" />
                新規作成
              </Link>
            </Button>
          </div>
          {videos.length === 0 ? (
            <p className="text-muted-foreground">動画がありません。</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => {
                const youtubeMatch = video.embed_url?.match(
                  /(?:youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/
                );
                const fallbackThumb = youtubeMatch
                  ? `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`
                  : undefined;

                return (
                  <Link
                    key={video.id}
                    href={`/admin/media/video/${video.id}/edit`}
                    className="group flex flex-col"
                  >
                    <div className="relative w-full pt-[56.25%] overflow-hidden rounded-lg shadow">
                      <Image
                        src={
                          video.thumbnail_url ||
                          fallbackThumb ||
                          "/placeholder.svg"
                        }
                        alt={video.title ?? "thumbnail"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw,
                               (max-width: 1280px) 50vw,
                               25vw"
                        priority
                      />
                    </div>
                    <h3 className="mt-3 text-sm font-medium line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(
                          (video.updated_at ?? video.created_at) as string
                        ),
                        "yyyy/MM/dd",
                        { locale: ja }
                      )}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}