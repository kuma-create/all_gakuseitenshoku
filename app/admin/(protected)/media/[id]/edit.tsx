/* ------------------------------------------------------------------
   app/admin/(protected)/media/[id]/edit.tsx  – 管理画面: 投稿編集
------------------------------------------------------------------ */
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Database } from "@/lib/supabase/types";
import ImageUpload from "@/components/media/upload";

/* ---------------------- 型 ---------------------- */
type Category = {
  id: string;
  name: string;
  slug: string;
};

type MediaPost =
  Database["public"]["Tables"]["media_posts"]["Row"] & {
    media_categories: Category | null;
  };

/* ---------------------- ユーティリティ ---------------------- */
function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-龠ぁ-んァ-ンー]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------------------- コンポーネント ---------------------- */
export default function EditMediaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /* form state */
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  /* fetch categories + post */
  useEffect(() => {
    (async () => {
      // カテゴリ
      const { data: cat } = await supabase
        .from("media_categories")
        .select("id,name,slug")
        .order("name");
      setCategories((cat ?? []) as Category[]);

      // 記事
      const { data: post, error } = await supabase
        .from("media_posts")
        .select(
          `
          *,
          media_categories(id)
        `
        )
        .eq("id", params.id)
        .single();

      if (error || !post) {
        toast.error("記事を取得できませんでした");
        router.push("/admin/media");
        return;
      }

      const p = post as MediaPost;
      setTitle(p.title);
      setSlug(p.slug);
      setExcerpt(p.excerpt ?? "");
      setContent(p.content_md ?? "");
      setCoverUrl(p.cover_image_url ?? null);
      setStatus(p.status as "draft" | "published");
      setCategoryId(p.category_id ?? p.media_categories?.id ?? null);
      setIsLoading(false);
    })();
  }, [params.id]);

  /* submit */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title) {
      toast.error("タイトルを入力してください");
      return;
    }
    if (!categoryId) {
      toast.error("カテゴリを選択してください");
      return;
    }
    if (!coverUrl) {
      toast.error("カバー画像をアップロードしてください");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("media_posts")
      .update({
        title,
        slug,
        excerpt,
        content_md: content,
        status,
        category_id: categoryId,
        cover_image_url: coverUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (error) {
      console.error(error);
      toast.error("更新に失敗しました");
      setIsSaving(false);
    } else {
      toast.success("更新しました");
      router.push("/admin/media");
    }
  }

  if (isLoading) {
    return (
      <section className="container mx-auto px-6 py-20 max-w-2xl">
        <p className="text-muted-foreground">読み込み中...</p>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-6 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">投稿を編集</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* title */}
        <div>
          <label className="block text-sm font-medium mb-1">タイトル *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="記事タイトル"
          />
        </div>

        {/* slug */}
        <div>
          <label className="block text-sm font-medium mb-1">スラッグ</label>
          <Input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="slug"
          />
        </div>

        {/* category */}
        <div>
          <label className="block text-sm font-medium mb-1">カテゴリ *</label>
          <Select
            value={categoryId ?? ""}
            onValueChange={(val) => setCategoryId(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="カテゴリを選択" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* cover image */}
        <div>
          <label className="block text-sm font-medium mb-2">カバー画像</label>
          <ImageUpload
            initialUrl={coverUrl ?? undefined}
            onUpload={(url) => setCoverUrl(url)}
            className="h-48"
          />
          {coverUrl && (
            <p className="text-xs text-gray-500 mt-2">アップロード済み: {coverUrl}</p>
          )}
        </div>

        {/* excerpt */}
        <div>
          <label className="block text-sm font-medium mb-1">抜粋</label>
          <Textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            placeholder="一覧に表示される短い説明文"
          />
        </div>

        {/* content */}
        <div>
          <label className="block text-sm font-medium mb-1">
            本文 (Markdown)
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="## 見出し\n本文を書いてください…"
            className="font-mono"
          />
        </div>

        {/* status */}
        <div className="flex items-center gap-4">
          <label className="block text-sm font-medium">ステータス</label>
          <div className="flex gap-2">
            <Badge
              variant={status === "draft" ? "default" : "secondary"}
              className="cursor-pointer select-none"
              onClick={() => setStatus("draft")}
            >
              下書き
            </Badge>
            <Badge
              variant={status === "published" ? "default" : "secondary"}
              className="cursor-pointer select-none"
              onClick={() => setStatus("published")}
            >
              公開
            </Badge>
          </div>
        </div>

        {/* actions */}
        <div className="pt-4 flex gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "更新中…" : "更新"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/admin/media")}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </section>
  );
}
