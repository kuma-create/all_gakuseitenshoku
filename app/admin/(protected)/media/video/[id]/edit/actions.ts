"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface Payload {
  title: string;
  embed_url: string;
  thumbnail_url?: string | null;
  description?: string | null;
  sort_order: number;
  is_published: boolean;
}

/**
 * 動画レコードを更新するサーバーアクション
 * - watch / short URL を embed 形式へ変換して保存
 * - 完了後は動画タブ一覧へリダイレクト
 */
export async function updateVideo(id: string, values: Payload) {
  /* ---------- URL 正規化: watch・short → embed ---------- */
  let embedUrl = values.embed_url.trim();
  const w = embedUrl.match(/youtube\.com\/watch\?v=([\w-]{11})/);
  const s = embedUrl.match(/youtu\.be\/([\w-]{11})/);
  if (w) embedUrl = `https://www.youtube.com/embed/${w[1]}`;
  else if (s) embedUrl = `https://www.youtube.com/embed/${s[1]}`;

  /* ---------- Supabase 更新 ---------- */
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // service_role key
    { global: { headers: { Cookie: cookies().toString() } } }
  );

  const { error } = await supabase
    .from("featured_videos")
    .update({
      ...values,
      embed_url: embedUrl,
      thumbnail_url: values.thumbnail_url || null,
      description: values.description || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  /* ---------- 編集後は一覧へ ---------- */
  redirect("/admin/media?tab=video");
}