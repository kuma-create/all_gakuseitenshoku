/* ------------------------------------------------------------------
   app/admin/(protected)/media/page.tsx  – 管理画面: 投稿一覧
------------------------------------------------------------------ */
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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

/* -------------------- Client component: status toggle -------------------- */
function StatusToggle({
  id,
  current,
}: {
  id: string;
  current: "published" | "draft" | "private";
}) {
  "use client";
  const [status, setStatus] = useState<"published" | "draft" | "private">(current);

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 公開→下書き→非公開→公開… の順でループ
  const cycle = async () => {
    const next =
      status === "published"
        ? "draft"
        : status === "draft"
        ? "private"
        : "published";

    // 楽観的 UI
    setStatus(next);

    const { error } = await supabase.from("media_posts").update({ status: next }).eq("id", id);
    if (error) {
      alert(error.message);
      // rollback
      setStatus(status);
    }
  };

  return (
    <button
      onClick={cycle}
      className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
      title="クリックで公開状態を切替"
    >
      {status === "published" ? "公開中" : status === "draft" ? "下書き" : "非公開"}
    </button>
  );
}

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
                  <Link href={`/admin/media/${post.id}/edit`} className="hover:underline">
                    {post.title}
                  </Link>
                </td>
                <td className="p-2">{post.media_categories?.name ?? "-"}</td>
                <td className="p-2">
                  {format(new Date((post.updated_at ?? post.created_at) as string), "yyyy/MM/dd HH:mm", {
                    locale: ja,
                  })}
                </td>
                <td className="p-2">
                  <StatusToggle id={post.id as string} current={post.status as any} />
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
    </section>
  );
}