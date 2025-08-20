/* ------------------------------------------------------------------
   既存動画の編集ページ (Server Component)
------------------------------------------------------------------ */
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import VideoEditClient from "./video-edit-client";

interface Props {
  params: { id: string };
}

export default async function VideoEditPage({ params }: Props) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // service_role key
    { global: { headers: { Cookie: cookies().toString() } } }
  );

  const { data: video } = await supabase
    .from("featured_videos")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!video) notFound();

  return (
    <section className="container mx-auto px-6 py-12 max-w-3xl">
      <h1 className="text-2xl font-bold mb-8">動画を編集</h1>
      {/* ↓ クライアント側フォーム */}
      <VideoEditClient video={video} />
    </section>
  );
}