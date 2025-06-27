// NOTE: Requires @tiptap/* packages and lowlight (see package.json)
/* ------------------------------------------------------------------
   app/admin/(protected)/media/[id]/edit.tsx  – 管理画面: 投稿編集
------------------------------------------------------------------ */
"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
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

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { Cta } from "@/components/tiptap/cta";
import { Node } from "@tiptap/core";


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

/* ---------------------- IFRAME EXT ---------------------- */
const Iframe = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: "100%",
      },
      height: {
        default: "400",
      },
    };
  },

  parseHTML() {
    return [{ tag: "iframe" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      {
        ...HTMLAttributes,
        frameborder: "0",
        allowfullscreen: "true",
      },
    ];
  },
});

/* ---------------------- HTML PREVIEW EXT ---------------------- */
const HtmlPreview = Node.create({
  name: "htmlpreview",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      code: {
        default: "",
      },
      width: {
        default: "100%",
      },
      height: {
        default: "400",
      },
    };
  },

  parseHTML() {
    return [{ tag: "iframe[data-htmlpreview]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { code, width, height, ...rest } = HTMLAttributes;
    return [
      "iframe",
      {
        ...rest,
        "data-htmlpreview": "true",
        width,
        height,
        srcdoc: code,
        sandbox: "allow-scripts allow-same-origin",
        frameborder: "0",
      },
    ];
  },
});
function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-龠ぁ-んァ-ンー]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Toolbar({
  editor,
  fileInputRef,
}: {
  editor: ReturnType<typeof useEditor> | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (!editor) return null;

  const Btn = (
    label: string,
    command: () => void,
    active: boolean = false
  ) => (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "secondary"}
      onMouseDown={(e) => {
        e.preventDefault();  // keep editor selection
        command();
      }}
    >
      {label}
    </Button>
  );

  return (
    <div className="flex flex-wrap gap-1 mb-2 sticky top-16 z-20 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/40 border-b">
      {Btn("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
      {Btn("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
      {Btn("U", () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"))}
      {Btn("S", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"))}
      {Btn("H1", () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 })) }
      {Btn("H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 })) }
      {Btn("H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 })) }
      {Btn("•", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
      {Btn("1.", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
      {Btn("`", () => editor.chain().focus().toggleCode().run(), editor.isActive("code"))}
      {Btn("Code", () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive("codeBlock"))}
      {Btn("CTA", () => {
        const label = prompt("ボタンのラベル", "応募する");
        if (label === null) return;
        const href = prompt("リンク URL", "https://example.com/");
        if (href === null) return;
        editor
          .chain()
          .focus()
          .insertContent({ type: "cta", attrs: { href, label } })
          .run();
      })}
      {Btn("Link", () => {
        const prev = editor.getAttributes("link").href || "";
        const url = prompt("リンク URL を入力", prev);
        if (url === null) return;
        if (url === "") {
          editor.chain().focus().unsetLink().run();
        } else {
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }
      })}
      {Btn("Img", () => {
        fileInputRef.current?.click();
      })}
      {Btn("Embed", () => {
        const url = prompt("埋め込み URL (YouTube, Figma など)", "https://");
        if (!url) return;
        editor
          ?.chain()
          .focus()
          .insertContent({ type: "iframe", attrs: { src: url } })
          .run();
      })}
      {Btn("HTML", () => {
        const init = "<style>body{margin:0}</style><h1>Hello!</h1>";
        const code = prompt("貼り付けたい HTML/CSS を入力してください", init);
        if (code === null || code.trim() === "") return;
        editor
          ?.chain()
          .focus()
          .insertContent({ type: "htmlpreview", attrs: { code } })
          .run();
      })}
    </div>
  );
}

/* ---------------------- COMPONENT ---------------------- */
export default function EditMediaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  /* form state */
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("");
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
  /* ---------- inline image upload ---------- */
const fileInputRef = useRef<HTMLInputElement>(null);

async function handleEmbedImage(files: FileList | null) {
  if (!files || !files[0]) return;
  const file = files[0];
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName =
    `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Supabase Storage へアップロード (bucket: media)
  const { data, error } = await supabase.storage
    .from("media")
    .upload(`inline-images/${fileName}`, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    toast.error("画像アップロードに失敗しました");
    console.error(error);
    return;
  }
  const { data: urlData } = supabase.storage
    .from("media")
    .getPublicUrl(data.path);
  const url = urlData.publicUrl;

  editor?.chain().focus().setImage({ src: url }).run();
}
/* ---------------------------------------- */
  const [previewToken, setPreviewToken] = useState<string | null>(null);

  /* ---- TipTap editor ---- */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false }),
      Image,
      Highlight,
      Underline,
      Cta,           // CTA button block
      Iframe,        // Generic iframe embed
      HtmlPreview,   // Embedded HTML/CSS preview
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose max-w-none focus:outline-none min-h-[600px] lg:min-h-[70vh]",
      },
    },
    onUpdate({ editor }) {
      setContentHtml(editor.getHTML());
    },
  });
  /* ----------------------- */

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
        const initialHtml = post.content_html ?? "";
        setContentHtml(initialHtml);
        if (editor) editor.commands.setContent(initialHtml);
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
  }, [params.id, editor]);

  /* auto slug */
  useEffect(() => setSlug(slugify(title)), [title]);

  /* submit */
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
    // ---- resolve author_id (media_authors.id) ----
    let authorId: string | null = null;
    {
      // Try to fetch an existing author record for this user
      const { data: existingAuthor, error: fetchErr } = await supabase
        .from("media_authors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (fetchErr) {
        console.error(fetchErr);
        toast.error("著者情報の取得に失敗しました");
        return;
      }

      if (existingAuthor) {
        authorId = existingAuthor.id;
      } else {
        // Create a new author record if none exists
        const { data: newAuthor, error: insertErr } = await supabase
          .from("media_authors")
          .insert({
            user_id: user.id,
            display_name:
              (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              user.email ??
              "anonymous",
          })
          .select("id")
          .single();
        if (insertErr || !newAuthor) {
          console.error(insertErr);
          toast.error("著者情報の作成に失敗しました");
          return;
        }
        authorId = newAuthor.id;
      }
    }
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

    const html = contentHtml;
    setIsSaving(true);

    // 1) update post
    const { error: updateErr } = await supabase
      .from("media_posts")
      .update({
        title,
        slug,
        excerpt,
        content_html: html,
        status,
        author_id: authorId!, // media_authors.id を紐付け
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
          <div>
            <label className="block text-sm font-medium mb-1">
              本文 (リッチテキスト)
            </label>
            {editor ? (
              <>
                <Toolbar editor={editor} fileInputRef={fileInputRef} />
                <EditorContent editor={editor} />
                {/* hidden file chooser for inline image */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleEmbedImage(e.target.files);
                      e.target.value = ""; // allow re-selecting same file
                    }}
                  />
              </>
            ) : (
              <p className="text-muted-foreground">エディタを初期化中...</p>
            )}
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
