// apps/web/app/api/cron/news/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// --- Utilities: timeout & limited concurrency --------------------------------
const DEFAULT_FETCH_TIMEOUT_MS = Number(process.env.CRON_FETCH_TIMEOUT_MS ?? 8000); // 8s per source
const MAX_CONCURRENCY = Number(process.env.CRON_MAX_CONCURRENCY ?? 3); // avoid stampede

function withTimeout<T>(p: Promise<T>, ms = DEFAULT_FETCH_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`fetch timeout ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function runLimited<T>(items: T[], worker: (item: T, idx: number) => Promise<void>, limit = MAX_CONCURRENCY) {
  const queue = items.map((v, i) => ({ v, i }));
  const running: Promise<void>[] = [];
  async function next() {
    const n = queue.shift();
    if (!n) return;
    await worker(n.v, n.i);
    await next();
  }
  for (let k = 0; k < Math.min(limit, queue.length); k++) {
    running.push(next());
  }
  await Promise.allSettled(running);
}

// 既存の /api/articles を一次集約元にしつつ、必要なら ENV で追加も可能にする
function resolveSources(origin: string): string[] {
  const baseFromOrigin = origin.replace(/\/$/, "");
  const fallbackBase = (process.env.CRON_UPSTREAM_BASE || "").replace(/\/$/, "");
  const defaults = [ `${baseFromOrigin}/api/articles` ];
  if (fallbackBase && fallbackBase !== baseFromOrigin) defaults.push(`${fallbackBase}/api/articles`);
  const extra = (process.env.NEWS_SOURCES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...defaults, ...extra];
}

function normalizeItem(a: any, i: number) {
  // 統一された上流に対応する正規化
  const url = a.url ?? a.link ?? '';
  const title = a.title ?? 'No title';
  const source = a.source ?? a.provider ?? a.site ?? 'News';
  const img = a.imageUrl ?? a.image_url ?? a.image ?? a.thumbnail ?? a.cover_image_url ?? null;
  const published = a.publishedAt ?? a.published_at ?? a.date ?? null;
  return { url, title, source, image_url: img, published_at: published ? new Date(published) : null };
}

async function fetchAll(sources: string[]): Promise<any[]> {
  const outs: any[] = [];
  await runLimited(sources, async (src) => {
    try {
      const res = await withTimeout(fetch(src, {
        headers: { 'Accept': 'application/json, application/rss+xml, text/xml' },
        cache: 'no-store',
        // NOTE: next.revalidate を使わない（cronは毎回最新でOK）
      }));
      if (!res.ok) return;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        const j = await res.json().catch(() => ({} as any));
        const arr = Array.isArray(j) ? j : (j.items ?? j.articles ?? []);
        (arr ?? []).slice(0, 50).forEach((a: any, i: number) => outs.push(normalizeItem(a, i)));
      } else if (contentType.includes('xml') || contentType.includes('rss')) {
        const xml = await res.text();
        const itemRe = /<item>[\s\S]*?<\/item>/g;
        const linkRe = /<link>([\s\S]*?)<\/link>/;
        const titleRe = /<title>([\s\S]*?)<\/title>/;
        const dateRe = /<pubDate>([\s\S]*?)<\/pubDate>/;
        const items = xml.match(itemRe) ?? [];
        for (const it of items.slice(0, 50)) {
          const link = (linkRe.exec(it)?.[1] || '').trim();
          const title = (titleRe.exec(it)?.[1] || '').trim();
          const date = (dateRe.exec(it)?.[1] || '').trim();
          outs.push({
            url: link,
            title,
            source: new URL(src).hostname,
            image_url: null,
            published_at: date ? new Date(date) : null,
          });
        }
      } else {
        // HTML (likely a page) -> skip fast
        return;
      }
    } catch {
      // timeout or network error -> skip this source
      return;
    }
  });
  return outs;
}

export async function GET(req: Request) {
  const auth = process.env.CRON_SECRET;
  const provided = new URL(req.url).searchParams.get('token');
  if (!auth || provided !== auth) return NextResponse.json({ ok: false }, { status: 401 });

  const { origin, searchParams } = new URL(req.url);
  const sources = resolveSources(origin);
  const debug = searchParams.get('debug') === '1';

  const startedAt = Date.now();
  const SOFT_WALL_MS = Number(process.env.CRON_SOFT_WALL_MS ?? 24000); // 24s soft wall

  // Supabase admin client（Service Role）で upsert
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← service role
  );

  const all = await fetchAll(sources);
  const rawCount = all.length;

  // 正規化 & 重複除去
  const rows = all
    .filter(a => a.url && a.title)
    .map(a => ({
      url: a.url,
      title: a.title,
      source: a.source ?? 'News',
      image_url: a.image_url ?? null,
      published_at: a.published_at ?? null,
    }));
  const normalizedCount = rows.length;

  if (Date.now() - startedAt > SOFT_WALL_MS) {
    if (debug) return NextResponse.json({ ok: true, rawCount, normalizedCount, inserted: 0, sources, note: 'soft wall reached' });
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  if (rows.length === 0) {
    if (debug) return NextResponse.json({ ok: true, rawCount, normalizedCount, inserted: 0, sources });
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const { data, error } = await supabase
    .from('news_articles')
    .upsert(rows, { onConflict: 'url_hash', ignoreDuplicates: false })
    .select();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (debug) return NextResponse.json({ ok: true, rawCount, normalizedCount, inserted: (data as any[])?.length ?? 0, sources });
  return NextResponse.json({ ok: true, inserted: (data as any[])?.length ?? 0 });
}