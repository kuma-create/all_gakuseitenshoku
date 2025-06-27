/* ------------------------------------------------------------------
   app/admin/(protected)/media/new/page.tsx  – 管理画面: 新規投稿フォーム
------------------------------------------------------------------ */
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import { marked } from "marked";
import { supabase } from "@/lib/supabase/client";

import dynamic from "next/dynamic";
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

/* ---------------------- 型 ---------------------- */
type Category = {
  id: string;
  name: string;
  slug: string;
};
type Tag = { id: string; name: string; slug: string };

/* ---------------------- ユーティリティ ---------------------- */
function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-龠ぁ-んァ-ンー]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------------------- コンポーネント ---------------------- */
export default function NewMediaPage() {
  const router = useRouter();

  /* form state */
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [slugDuplicate, setSlugDuplicate] = useState(false);
  const MAX_EXCERPT_LEN = 150;

  /* fetch categories once */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("media_categories")
        .select("id,name,slug")
        .order("name");
      if (error) {
        console.error(error);
      } else {
        setCategories(data as Category[]);
      }

      const { data: tagData } = await supabase
        .from("media_tags")
        .select("id,name,slug")
        .order("name");
      setTags((tagData ?? []) as Tag[]);
    })();
  }, []);

  /* auto slug */
  useEffect(() => {
    setSlug(slugify(title));
  }, [title]);

  /* submit handler */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // 現在のユーザーを取得
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.error(userErr);
    }
    if (!user) {
      toast.error("セッションが切れています。再ログインしてください");
      return;
    }
    if (slugDuplicate) {
      toast.error("スラッグが重複しています");
      return;
    }
    if (!title) {
      toast.error("タイトルを入力してください");
      return;
    }
    if (!categoryId) {
      toast.error("カテゴリを選択してください");
      return;
    }
    if (excerpt.length > MAX_EXCERPT_LEN) {
      toast.error(`抜粋は ${MAX_EXCERPT_LEN} 文字以内にしてください`);
      return;
    }
    if (!coverUrl) {
      toast.error("カバー画像をアップロードしてください");
      return;
    }

    // marked.parse can be sync or async → `await` で Promise<string> を解消
    const html = await marked.parse(content) as string;
    setIsSaving(true);
    // まず記事を INSERT し、返却された id を取得
    const { data: inserted, error: insertError } = await supabase
      .from("media_posts")
      .insert({
        title,
        slug,
        excerpt,
        content_md: content,
        content_html: html,
        status,
        author_id: user.id, // ログインユーザーを紐付け
        category_id: categoryId,
        cover_image_url: coverUrl,
      })
      .select("id, preview_token") // ← id とプレビュートークンを返却
      .single<{ id: string; preview_token: string }>(); // 型を明示

    if (insertError || !inserted) {
      console.error(insertError);
      toast.error("保存に失敗しました");
      setIsSaving(false);
      return;
    }

    // タグが選択されていれば junction テーブルへ挿入
    if (selected.size) {
      const postId = inserted.id;
      const tagRows = Array.from(selected).map((tagId) => ({
        post_id: postId,
        tag_id: tagId,
      }));
      await supabase.from("media_posts_tags").insert(tagRows);
    }

    const previewUrl = `/media/preview/${inserted.id}?token=${inserted.preview_token}`;
    toast.success(
      `保存しました！ プレビューリンクを開きますか？`,
      {
        action: {
          label: "開く",
          onClick: () => window.open(previewUrl, "_blank"),
        },
        duration: 8000,
      }
    );
    router.push("/admin/media");
  }

  return (
    <section className="container mx-auto px-6 py-12 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">新規投稿</h1>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr,320px]">
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
                const val = slugify(e.target.value);
                setSlug(val);
                // 入力中は重複フラグを一旦リセット
                setSlugDuplicate(false);
              }}
              onBlur={async () => {
                if (!slug) return;
                // 同一 slug が存在するかチェック
                const { data, error } = await supabase
                  .from("media_posts")
                  .select("id")
                  .eq("slug", slug)
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
                    <label key={t.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={(ck) => {
                          setSelected((prev) => {
                            const s = new Set(prev);
                            ck ? s.add(t.id) : s.delete(t.id);
                            return s;
                          });
                        }}
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
            {isSaving ? "保存中…" : "保存"}
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