// apps/web/app/api/articles/mobile/route.ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

function nextRevalidateSec(): number {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const slots = [0, 6, 12, 18];
  const h = jst.getHours();
  let t = 24;
  for (const s of slots) { if (h < s) { t = s; break; } }
  const next = new Date(jst);
  if (t === 24) { next.setDate(jst.getDate() + 1); next.setHours(0,0,0,0); }
  else { next.setHours(t,0,0,0); }
  return Math.floor((next.getTime() - jst.getTime()) / 1000);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS as any });
}

export async function GET(req: Request) {
  const revalidate = nextRevalidateSec();
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') ?? 12)));

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 読み取りだけなら anon でも良いが、サーバ側で完結させるなら service でOK
  );

  const { data, error } = await supabase
    .from('news_articles')
    .select('id, title, source, image_url, url, published_at')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ articles: [] }, {
      status: 200,
      headers: { 'Cache-Control': `s-maxage=${revalidate}, stale-while-revalidate`, ...CORS_HEADERS },
    });
  }

  const mapped = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    source: a.source ?? 'News',
    imageUrl: a.image_url ?? '/logo3.png',
    url: a.url,
  }));

  return NextResponse.json({ articles: mapped }, {
    headers: { 'Cache-Control': `s-maxage=${revalidate}, stale-while-revalidate`, ...CORS_HEADERS },
  });
}