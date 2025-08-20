"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { FormValues } from "./page";   // 型だけ再利用

export async function insertVideo(values: FormValues) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,     // service_role を使うのはサーバーだけ
    { global: { headers: { Cookie: cookies().toString() } } }
  );

  const { error } = await supabase.from("featured_videos").insert({
    title:        values.title,
    embed_url:    values.embed_url,
    thumbnail_url: values.thumbnail_url || null,
    description:  values.description || null,
    sort_order:   values.sort_order,
    is_published: values.is_published,
  });

  if (error) throw error;
  redirect("/admin/media?tab=video");
}