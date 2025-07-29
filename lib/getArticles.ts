// For fetch types (no code change needed for Node fetch)
// import type { RequestInit, Response } from 'node-fetch' // if needed for types
import Parser from 'rss-parser'


export interface Article {
  id: string
  title: string
  url: string
  imageUrl?: string
  source: string
  publishedAt: string
  description?: string
  /** 自動検出された記事カテゴリー */
  category?: string
}

/** 大学生向けキャリア記事と判定するキーワード */
const STUDENT_CAREER_KEYWORDS = [
  /* career‑related */
  '大学生',
  '学生',
  '就活',
  '就職',
  '新卒',
  'インターン',
  '長期インターン',
  'キャリア',
  'エントリーシート',
  '内定',
  '面接',

  /* news */
  '経済',
  'マーケット',
  '速報',
  'ニュース',
  '報道',
  '社会',
  '政治',

  /* AI / tech */
  'AI',
  '人工知能',
  '機械学習',
  'LLM',
  'ChatGPT',
  '生成AI',

  /* interview */
  'インタビュー',
  '対談',
  'OB訪問',
  '社員',
  '座談会',

  /* company / business */
  '企業研究',
  '企業分析',
  '決算',
  'IR',
  '事業',
  'ビジネスモデル',
] as const

/** カテゴリー自動判定用キーワード */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  news: ['経済', 'マーケット', '速報', 'ニュース', '報道', '社会', '政治'],
  career: ['就活', '就職', '内定', 'エントリー', '面接', 'インターン', '学生', '新卒'],
  ai: ['AI', '人工知能', '機械学習', 'LLM', 'ChatGPT', '生成AI'],
  interview: ['インタビュー', '対談', 'OB訪問', '社員', '座談会'],
  company: ['企業研究', '企業分析', '決算', 'IR', '事業', 'ビジネスモデル'],
}

/** 記事タイトル・概要からカテゴリーを推測 */
function detectCategory(a: Pick<Article, 'title' | 'description'>): string {
  const text = `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase()
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((kw) => text.includes(kw.toLowerCase()))) return cat
  }
  return 'other'
}

/** 記事タイトルまたは概要にキーワードが含まれるか判定 */
function isStudentCareerArticle(a: Article): boolean {
  const text = `${a.title ?? ''} ${a.description ?? ''}`
  return STUDENT_CAREER_KEYWORDS.some((kw) => text.includes(kw))
}

/**
 * 各 RSS item から代表画像 URL を推測する
 * - <enclosure url="..."> (rss-parser: item.enclosure.url)
 * - <media:content url="...">
 * - <media:thumbnail url="...">
 * - 記事本文 HTML の最初の <img> src
 */
function extractImageUrl(item: any): string | undefined {
  /** Normalise //example.com → https://example.com */
  const normalize = (u?: string): string | undefined =>
    u && u.startsWith('//') ? `https:${u}` : u

  // 1) <enclosure> tag
  if (item.enclosure?.url) return normalize(item.enclosure.url)

  // 2) <media:content> / <media:thumbnail>
  if (item['media:content']?.$.url) return normalize(item['media:content'].$.url)
  if (item['media:thumbnail']?.$.url) return normalize(item['media:thumbnail'].$.url)

  // 3) HTML snippet (description / summary etc.)
  const htmlSnippet =
    item['content:encoded'] ??
    item.content ??
    item.summary ??
    item.description ??
    ''

  // 3‑A) <meta property="og:image" ... content="...">
  const ogMeta = htmlSnippet.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  )
  if (ogMeta) return normalize(ogMeta[1])

  // 3‑B) first <img src="...">
  const imgMatch = htmlSnippet.match(
    /<img[^>]+src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^ >]+))/i,
  )
  if (imgMatch) return normalize(imgMatch[1] || imgMatch[2] || imgMatch[3])

  return undefined
}

/** NewsAPI（あれば）＋RSS からまとめて取得して共通フォーマットで返す */
export async function getArticles(): Promise<Article[]> {
  const results: Article[] = []

  /** ---- 2) RSS（大学生×キャリア向けメディア） ---------------------- */
  // NOTE: 2025-07-22 マイナビ就活系 keyword feeds は 404 のため一旦除外
  const feeds = [
    /* --- 就活・経済系 ------------------------------------------------ */
    {
      url: 'https://journal.rikunabi.com/feed',
      label: '就職ジャーナル',
    },
    {
      url: 'https://note.com/hashtag/就活/rss',
      label: 'note #就活',
    },
    {
      url: 'https://toyokeizai.net/list/feed/rss',
      label: '東洋経済オンライン',
    },

    /* --- AI 活用・テクノロジー系 ------------------------------------ */
    {
      url: 'https://ledge.ai/feed/',
      label: 'Ledge.ai',
    },
    {
      url: 'https://jp.techcrunch.com/tag/artificial-intelligence/feed/',
      label: 'TechCrunch Japan – AI',
    },
    {
      url: 'https://www.itmedia.co.jp/news/rss/news_2.0.xml',
      label: 'ITmedia News',
    },
    {
      url: 'https://ai.googleblog.com/atom.xml',
      label: 'Google AI Blog'
    },
    {
      url: 'https://prtimes.jp/index.rdf',
      label: 'PR TIMES',
    },
  ] as const

  // Use a custom UA and short timeout to avoid Cloudflare/anti-bot blocks
  const parser = new Parser({
    requestOptions: {
      // Pretend to be a regular browser
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; GakutenCareerBot/1.0; +https://culture.gakuten.co.jp)',
        'Accept-Language': 'ja,en;q=0.9',
      },
      // Fail fast so the page doesn’t hang on slow feeds
      timeout: 10000,
    },
  })
  await Promise.all(
    feeds.map(async ({ url, label }) => {
      try {
        const safeUrl = encodeURI(url) // 日本語などを含む URL をエンコード
        const feed = await parser.parseURL(safeUrl)

        // feed.items -> Article[]
        const articlesFromFeed = await Promise.all(
          feed.items.map(async (item) => {
            // 1) RSS 内の画像
            let image = extractImageUrl(item)

            // 2) fallback: fetch HTML and grab <meta property="og:image">
            if (!image) {
              try {
                const html = await fetch(item.link!, { cache: 'force-cache' }).then((r) =>
                  r.text(),
                )
                // 2‑A) og:image
                const og = html.match(
                  /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
                )
                if (og?.[1]) {
                  image = og[1]
                } else {
                  // 2‑B) ページ本文中の最初の <img> src
                  const firstImg = html.match(
                    /<img[^>]+src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^ >]+))/i,
                  )
                  if (firstImg) image = firstImg[1] || firstImg[2] || firstImg[3]
                  if (image?.startsWith('//')) image = `https:${image}`
                }
              } catch {
                /* ignore network errors */
              }
            }

            // --- fallback: デフォルト画像を補完 --------------------------
            const safeImage =
              typeof image === "string" && image.trim() !== ""
                ? image
                : "/logo3.png"

            const category = detectCategory({
              title: item.title ?? '',
              description: item.contentSnippet ?? '',
            })

            // --- description (冒頭 400 文字を抽出) ----------------------
            const rawDesc =
              item.contentSnippet ??
              item.summary ??
              item.description ??
              ''

            const excerpt = rawDesc
              // HTML タグ除去
              .replace(/<[^>]+>/g, '')
              // 改行・連続空白を 1 つにまとめる
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 400)

            return {
              id: item.link!,
              title: item.title!,
              url: item.link!,
              imageUrl: safeImage,
              source: label,
              publishedAt: item.isoDate ?? new Date().toISOString(),
              description: excerpt,
              category,
            } as Article
          }),
        )

        results.push(...articlesFromFeed)
      } catch (e) {
        console.warn('[getArticles] RSS fetch skipped:', url, (e as Error)?.message)
      }
    }),
  )

  console.log('[getArticles] fetched', results.length, 'articles')

  /** ---- 日付降順＆重複除去 ------------------------------------------ */
  const uniqMap = new Map<string, Article>()
  results
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .forEach((a) => uniqMap.set(a.id, a))

  const filtered = Array.from(uniqMap.values()).filter(isStudentCareerArticle)

  // ---- 最終結果を作成（最大 40 件。重複を除外しつつ、学生キャリア記事を優先） ----
  const finalResults: Article[] = []
  const seenIds = new Set<string>()

  // 1) 学生キャリア系の記事を優先して追加
  for (const a of filtered) {
    if (finalResults.length >= 40) break
    finalResults.push(a)
    seenIds.add(a.id)
  }

  // 2) 足りない分はその他の記事で補完（重複は除外）
  if (finalResults.length < 40) {
    for (const a of uniqMap.values()) {
      if (finalResults.length >= 40) break
      if (!seenIds.has(a.id)) {
        finalResults.push(a)
        seenIds.add(a.id)
      }
    }
  }

  return finalResults
}
