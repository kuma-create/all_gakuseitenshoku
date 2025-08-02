"use client";
/* ------------------------------------------------------------------
   app/admin/(protected)/media/new/videoPage.tsx
   動画埋め込みの新規作成フォーム
------------------------------------------------------------------ */
import Link from "next/link";
import Head from "next/head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVideo } from "./actions";

/* -------------------- フォームバリデーション -------------------- */
const schema = z.object({
  title: z.string().min(2, "タイトルを入力してください"),
  embed_url: z
    .string()
    .url("有効な URL を入力してください")
    .refine(
      (val) =>
        /youtu\.be\/[\w-]{11}/.test(val) ||
        /youtube\.com\/(watch\?v=|embed\/)[\w-]{11}/.test(val),
      { message: "有効な YouTube 動画 URL を入力してください" }
    ),
  thumbnail_url: z
    .string()
    .url("有効な URL を入力してください")
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
  sort_order: z.coerce.number().min(0).default(0),
  is_published: z.boolean().default(false),
});

export type FormValues = z.infer<typeof schema>;

export default function VideoNewPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { is_published: false, sort_order: 0 },
  });

  return (
    <>
      {/* --- SEO / <head> meta tags --- */}
      <Head>
        <title>新規投稿 | 管理画面 | 学生転職</title>
        <meta
          name="description"
          content="学生転職メディアの記事を新規作成する管理フォームです。"
        />
        {/* Prevent search engines from indexing this protected admin page */}
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href="https://culture.gakuten.co.jp/admin/media/new" />
      </Head>

      {/* ---- Page content ---- */}
      <section className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-2xl font-bold mb-8">動画を追加</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(insertVideo)} className="space-y-6">
            {/* タイトル */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タイトル</FormLabel>
                  <FormControl>
                    <Input placeholder="例）学転サービス紹介ムービー" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* embed_url */}
            <FormField
              control={form.control}
              name="embed_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embed URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://www.youtube.com/embed/XXXXXXXXXXX"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* thumbnail_url */}
            <FormField
              control={form.control}
              name="thumbnail_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>サムネイル URL（任意）</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://img.youtube.com/vi/XXXXXXXXXXX/maxresdefault.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明（任意）</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="動画の概要や補足説明" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* sort_order & publish */}
            <div className="flex items-end gap-6">
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormLabel>表示順</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <Label htmlFor="is_published">公開する</Label>
                  </FormItem>
                )}
              />
            </div>

            {/* buttons */}
            <div className="flex gap-4">
              <Button type="submit">保存</Button>
              <Button variant="secondary" asChild>
                <Link href="/admin/media?tab=video">キャンセル</Link>
              </Button>
            </div>
          </form>
        </Form>
      </section>
    </>
  );
}