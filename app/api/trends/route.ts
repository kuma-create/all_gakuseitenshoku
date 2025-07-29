// app/api/trends/route.ts
import { NextResponse } from 'next/server'

/** 1 時間 (3600 秒) エッジキャッシュ */
export const revalidate = 60 * 60

export async function GET() {
  try {
    /* === 1) Google Trends RSS 取得 ========================== */
    // The JSON endpoint has become unstable.  The official RSS
    // feed is still available and does not require any date
    // parameters.
    const url =
      'https://trends.google.com/trending/rss?geo=JP';

    const res = await fetch(url, {
      // Without a UA header Google may return 403.
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });

    /* --- Upstream エラーをそのまま返す ---------------------- */
    if (!res.ok) {
      console.error('Google Trends RSS fetch failed:', res.status, res.statusText);
      return NextResponse.json(
        { error: 'upstream_error', status: res.status },
        { status: 502 }
      );
    }

    /* === 2) RSS テキスト -> topic / traffic 抽出 ============ */
    const xml = await res.text();

    // Extract each <item> block
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const topics = items.map((match) => {
      const block = match[1];

      // Title (inside <title> or CDATA)
      const titleMatch =
        block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s) ||
        block.match(/<title>(.*?)<\/title>/s);
      const rawTitle = titleMatch ? titleMatch[1] : '';
      const topic = rawTitle.replace(/ - Google トレンド$/, '').trim();

      // Approximate traffic (may be missing late at night)
      const trafficMatch = block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/);
      const count = trafficMatch ? trafficMatch[1].trim() : '';

      return { topic, count };
    });

    // --- Career‑related filter (normalization aware) ------------
    const careerKeywords = [
      '就活', '就職', '転職', '求人', '採用', '面接', '内定', 'キャリア', '仕事',
      'アルバイト', 'バイト', 'ビジネス', '職', '企業', '職場', 'インターン',
      '学生', '新卒', '履歴書', '職業', '職務経歴書', 'ジョブ', 'ワーク',
      'career', 'job', 'work'
    ].map((kw) => kw.toLowerCase());

    const careerTopics = topics.filter(({ topic }) => {
      // Normalize to NFKC, then lowercase for robust matching
      const norm = topic.normalize('NFKC').toLowerCase();
      return careerKeywords.some((kw) => norm.includes(kw));
    });

    // If no career‑related hits, fall back to the original topics so we still show something
    const resultTopics = careerTopics.length ? careerTopics : topics;

    /* === 3) 正常レスポンス ================================ */
    return new NextResponse(JSON.stringify(resultTopics), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // edge-cache 1h
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('trends route error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}