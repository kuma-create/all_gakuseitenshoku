/* ------------------------------------------------------------------
   app/admin/(protected)/media/[id]/edit.tsx  – 管理画面: 投稿編集
------------------------------------------------------------------ */
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { supabase } from "@/lib/supabase/client";
import ImageUpload from "@/components/media/upload";
import { marked } from "marked";
import dynamic from "next/dynamic";
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

/* ---------------------- 型 ---------------------- */
type Category = { id: string; name: string; slug: string };
type Tag = { id: string; name: string; slug: string };

type PostRow = Database["public"]["Tables"]["media_posts"]["Row"] & {
  preview_token: string | null;
  media_categories?: { id: string } | null;
};

/* ---------------------- UTILS ---------------------- */
function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-龠ぁ-んァ-ンー]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------------------- COMPONENT ---------------------- */
export default function EditMediaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

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
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [slugDuplicate, setSlugDuplicate] = useState(false);
  const MAX_EXCERPT_LEN = 150;
  const [previewToken, setPreviewToken] = useState<string | null>(null);

  /* fetch all data */
  useEffect(() => {
    (async () => {
      try {
        // カテゴリ・タグマスタ
        const [{ data: cat }, { data: tagData }] = await Promise.all([
          supabase.from("media_categories").select("id,name,slug").order("name"),
          supabase.from("media_tags").select("id,name,slug").order("name"),
        ]);
        setCategories((cat ?? []) as Category[]);
        setTags((tagData ?? []) as Tag[]);

        // 記事データ
        const { data: post, error: postError } = await supabase
          .from("media_posts")
          .select("*, media_categories(id), preview_token")
          .eq("id", params.id)
          .single<PostRow>();
        if (postError || !post) throw postError;

        setTitle(post.title);
        setSlug(post.slug);
        setExcerpt(post.excerpt ?? "");
        setContent(post.content_md ?? "");
        setCoverUrl(post.cover_image_url ?? null);
        setStatus(post.status as "draft" | "published");
        setCategoryId(post.category_id ?? post.media_categories?.id ?? null);
        setPreviewToken(post.preview_token ?? null);

        // 紐付タグ
        const { data: linked } = await supabase
          .from("media_posts_tags")
          .select("tag_id")
          .eq("post_id", params.id);
        setSelected(new Set((linked ?? []).map((t) => t.tag_id)));

        setIsLoading(false);
      } catch (err) {
        console.error(err);
        toast.error("記事を取得できませんでした");
        router.push("/admin/media");
      }
    })();
  }, [params.id]);

  /* auto slug */
  useEffect(() => setSlug(slugify(title)), [title]);

  /* submit */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (slugDuplicate) {
      toast.error("スラッグが重複しています");
      return;
    }
    if (!title) return toast.error("タイトルを入力してください");
    if (!categoryId) return toast.error("カテゴリを選択してください");
    if (excerpt.length > MAX_EXCERPT_LEN) {
      toast.error(`抜粋は ${MAX_EXCERPT_LEN} 文字以内にしてください`);
      return;
    }
    if (!coverUrl) return toast.error("カバー画像をアップロードしてください");

    const html = (await marked.parse(content)) as string;
    setIsSaving(true);

    // 1) update post
    const { error: updateErr } = await supabase
      .from("media_posts")
      .update({
        title,
        slug,
        excerpt,
        content_md: content,
        content_html: html,
        status,
        category_id: categoryId,
        cover_image_url: coverUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);
    if (updateErr) {
      toast.error("更新に失敗しました");
      setIsSaving(false);
      return;
    }

    // 2) sync tags: 全削除 → 挿入
    await supabase.from("media_posts_tags").delete().eq("post_id", params.id);
    if (selected.size) {
      const rows = Array.from(selected).map((tagId) => ({
        post_id: params.id,
        tag_id: tagId,
      }));
      await supabase.from("media_posts_tags").insert(rows);
    }

    const previewUrl =
      previewToken &&
      `/media/preview/${params.id}?token=${previewToken}`;

    toast.success("更新しました！", {
      action:
        previewUrl && {
          label: "プレビュー",
          onClick: () => window.open(previewUrl, "_blank"),
        },
      duration: 8000,
    });
    router.push("/admin/media");
  }

  /* loading state */
  if (isLoading) {
    return (
      <section className="container mx-auto px-6 py-20 max-w-2xl">
        <p className="text-muted-foreground">読み込み中...</p>
      </section>
    );
  }

  /* ------------------ JSX ------------------ */
  return (
    <section className="container mx-auto px-6 py-12 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">投稿を編集</h1>

      <form
        onSubmit={handleSubmit}
        className="grid gap-8 lg:grid-cols-[1fr,320px]"
      >
        {/* ------------ Content Column ------------ */}
        <div className="space-y-6">
          {/* title */}
          <div>
            <label className="block text-sm font-medium mb-1">タイトル *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="記事タイトル"
            />
          </div>

          {/* content */}
          <div data-color-mode="light">
            <label className="block text-sm font-medium mb-1">
              本文 (Markdown)
            </label>
            <MDEditor
              value={content}
              onChange={(val) => setContent(val ?? "")}
              height={600}
              preview="live"
            />
          </div>
        </div>

        {/* ------------ Meta Column ------------ */}
        <aside className="space-y-6">
          {/* slug */}
          <div>
            <label className="block text-sm font-medium mb-1">スラッグ</label>
            <Input
              value={slug}
              onChange={(e) => {
                const v = slugify(e.target.value);
                setSlug(v);
                setSlugDuplicate(false); // reset while typing
              }}
              onBlur={async () => {
                if (!slug) return;
                // 同一 slug で自分以外の記事があるか確認
                const { data, error } = await supabase
                  .from("media_posts")
                  .select("id")
                  .eq("slug", slug)
                  .neq("id", params.id)
                  .limit(1)
                  .maybeSingle();
                if (error) {
                  console.error(error);
                  return;
                }
                if (data) {
                  setSlugDuplicate(true);
                  toast.error("同じスラッグの記事が存在します");
                }
              }}
              placeholder="slug"
              className={slugDuplicate ? "border-red-500" : undefined}
            />
            <p className="text-xs mt-1 text-red-500">
              {slugDuplicate && "※ このスラッグは既に使用されています"}
            </p>
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

          {/* tags */}
          <div>
            <label className="block text-sm font-medium mb-1">タグ</label>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {selected.size ? `${selected.size} 件選択中` : "タグを選択"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>タグを選択</DialogTitle>
                </DialogHeader>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {tags.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={(ck) =>
                          setSelected((prev) => {
                            const s = new Set(prev);
                            ck ? s.add(t.id) : s.delete(t.id);
                            return s;
                          })
                        }
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="secondary">閉じる</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* cover image */}
          <div>
            <label className="block text-sm font-medium mb-2">
              カバー画像 <span className="text-xs text-gray-400">(推奨 1200×630px)</span>
            </label>
            <ImageUpload
              initialUrl={coverUrl ?? undefined}
              onUpload={(url) => setCoverUrl(url)}
              className="h-48"
            />
            {coverUrl && (
              <p className="text-xs text-gray-500 mt-2">
                アップロード済み: {coverUrl}
              </p>
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
            <p
              className={`text-xs mt-1 ${
                excerpt.length > MAX_EXCERPT_LEN ? "text-red-500" : "text-gray-500"
              }`}
            >
              {excerpt.length}/{MAX_EXCERPT_LEN} 文字
            </p>
          </div>

          {/* status */}
          <div>
            <label className="block text-sm font-medium mb-2">ステータス</label>
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
        </aside>

        {/* ------------ Actions ------------ */}
        <div className="lg:col-span-2 flex gap-4 pt-6">
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
