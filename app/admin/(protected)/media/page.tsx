/* ------------------------------------------------------------------
   app/admin/(protected)/media/page.tsx  – 管理画面: 投稿一覧
------------------------------------------------------------------ */
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit2 } from "lucide-react";
import DeletePostButton from "@/components/media/delete-button";

import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic"; // always SSR to avoid stale cache in admin list

/* ------------------------- 型 ------------------------- */
type AdminPost =
  Database["public"]["Tables"]["media_posts"]["Row"] & {
    media_categories: { name: string; slug: string } | null;
  };

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

/* =================================================================== */

export default async function AdminMediaPage() {
  const posts = await fetchMyPosts();

  return (
    <section className="container mx-auto px-6 py-12">
      {/* heading */}
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-bold">メディア投稿管理</h1>
        <Button asChild>
          <Link href="/admin/media/new">
            <Plus className="w-4 h-4 mr-2" />
            新規作成
          </Link>
        </Button>
      </div>

      {/* posts list */}
      {posts.length === 0 ? (
        <p className="text-muted-foreground">投稿がありません。</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card key={post.id} className="relative">
              <CardContent className="pt-6 pb-8">
                {/* status */}
                <Badge
                  variant={
                    post.status === "published"
                      ? "default"
                      : post.status === "draft"
                      ? "secondary"
                      : "outline"
                  }
                  className="mb-2"
                >
                  {post.status === "published"
                    ? "公開中"
                    : post.status === "draft"
                    ? "下書き"
                    : "非公開"}
                </Badge>

                {/* title */}
                <h3 className="font-semibold line-clamp-2">{post.title}</h3>

                {/* category + date */}
                <div className="mt-3 flex items-center text-sm text-gray-500 gap-2">
                  {post.media_categories?.name && (
                    <span>{post.media_categories.name}</span>
                  )}
                  <span>・</span>
                  <time>
                    {format(
                      new Date((post.updated_at ?? post.created_at) as string),
                      "yyyy/MM/dd HH:mm",
                      { locale: ja }
                    )}
                  </time>
                </div>

                {/* actions */}
                <div className="mt-6 flex gap-3">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/admin/media/${post.id}/edit`}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      編集
                    </Link>
                  </Button>
                  <DeletePostButton id={post.id as string} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}