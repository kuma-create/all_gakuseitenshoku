'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import ArticleCard from '@/components/article-card'

export default function SearchPage() {
  const params = useSearchParams()
  const query  = params.get('q') ?? ''
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    if (!query) return
    ;(async () => {
      const res = await fetch(`/api/articles?keyword=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : data.articles ?? [])
    })()
  }, [query])

  if (!query) return <p className="p-6">キーワードを入力してください。</p>

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">「{query}」の検索結果</h1>

      {results.length === 0 ? (
        <p>該当する記事が見つかりませんでした。</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {results.map(a => (
            <ArticleCard
              key={a.id}
              title={a.title}
              excerpt={a.description ?? ''}
              imageUrl={a.imageUrl}
              category={a.source}
              date={a.publishedAt.slice(0,10)}
            />
          ))}
        </div>
      )}
    </main>
  )
}