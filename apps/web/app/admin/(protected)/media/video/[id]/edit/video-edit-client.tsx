"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTransition } from "react";
import { updateVideo } from "./actions";

/* ---------------- Zod スキーマ ---------------- */
const schema = z.object({
  title: z.string().min(2, "タイトルを入力してください"),
  embed_url: z
    .string()
    .url("有効な URL を入力してください")
    .refine(
      (v) =>
        /youtu\.be\/[\w-]{11}/.test(v) ||
        /youtube\.com\/(watch\?v=|embed\/)[\w-]{11}/.test(v),
      { message: "有効な YouTube 動画 URL を入力してください" }
    ),
  thumbnail_url: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  sort_order: z.coerce.number().min(0),
  is_published: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  video: any; // featured_videos Row
}

/* ---------------- フォーム UI ---------------- */
export default function VideoEditClient({ video }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: video.title ?? "",
      embed_url: video.embed_url ?? "",
      thumbnail_url: video.thumbnail_url ?? "",
      description: video.description ?? "",
      sort_order: video.sort_order ?? 0,
      is_published: video.is_published ?? false,
    },
  });

  const onSubmit = (v: FormValues) => startTransition(() => updateVideo(video.id, v));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* タイトル */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>タイトル</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Embed URL */}
        <FormField
          control={form.control}
          name="embed_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Embed URL</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Thumbnail URL */}
        <FormField
          control={form.control}
          name="thumbnail_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>サムネイル URL</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 説明 */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 表示順 & 公開 */}
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

        {/* ボタン */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isPending}>
            保存
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/admin/media?tab=video">キャンセル</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}