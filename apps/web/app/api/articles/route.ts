// app/api/articles/route.ts
import { NextResponse } from 'next/server'
import { getArticles } from '@/lib/getArticles'           // 既存のロジックを再利用

// 日本時間 0, 6, 12, 18時にキャッシュ更新
const CACHE_TIMES = [0, 6, 12, 18];

function getNextRevalidateSeconds(): number {
  const now = new Date();
  // 現在時刻を日本時間に変換
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const currentHour = jst.getHours();

  // 次の更新時刻を決定
  let nextHour = CACHE_TIMES.find(h => h > currentHour);
  if (nextHour === undefined) {
    nextHour = CACHE_TIMES[0];
    jst.setDate(jst.getDate() + 1);
  }
  const next = new Date(jst);
  next.setHours(nextHour, 0, 0, 0);

  return Math.floor((next.getTime() - jst.getTime()) / 1000);
}

export const dynamic = 'force-dynamic';

// CORS helpers (allow mobile app / other origins during fetch)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS as any,
  });
}

export async function GET(req: Request) {
  const revalidateSec = getNextRevalidateSeconds();
  try {
    // ── 1) 取得 & フィルタリング ───────────────────────────────
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    // ── 検索クエリ (?q=xxx) ────────────────────────────────
    // 大文字小文字を無視できるように前後空白を除去して小文字化
    const q = searchParams.get('q')?.trim().toLowerCase() || null

    const articles = await getArticles() // 既存ロジック
    const filtered = articles.filter(a => {
      // カテゴリでの絞り込み（指定が無い場合は常に true）
      const categoryMatch = !category || a.category === category

      // 検索語での絞り込み（タイトル・概要・本文のいずれかに部分一致）
      const searchMatch =
        !q ||
        [
          a.title,
          // Article 型に無い可能性のあるプロパティは any キャストで回避
          (a as any).summary,
          (a as any).content,
        ]
          .filter(Boolean)
          .some(field =>
            String(field).toLowerCase().includes(q as string)
          )

      return categoryMatch && searchMatch
    })

    return NextResponse.json(
      { articles: filtered },
      {
        headers: {
          'Cache-Control': `s-maxage=${revalidateSec}, stale-while-revalidate`,
          ...CORS_HEADERS,
        }
      }
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { message: 'failed' },
      {
        status: 500,
        headers: {
          'Cache-Control': `s-maxage=${revalidateSec}, stale-while-revalidate`,
          ...CORS_HEADERS,
        }
      }
    )
  }
}