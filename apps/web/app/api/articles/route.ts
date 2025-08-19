// app/api/articles/route.ts
import { NextResponse } from 'next/server'
import { getArticles } from '@/lib/getArticles'           // 既存のロジックを再利用

const CACHE_SECONDS = 3600; // 1 hour edge‑cache

export const revalidate = 3600  // ISR：1時間キャッシュ（任意）
// 動的処理を含むため静的プリレンダを無効化
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
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
          'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate`
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
          'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate`
        }
      }
    )
  }
}