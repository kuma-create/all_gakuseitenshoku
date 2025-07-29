'use client'

import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

type Topic = { topic: string; count: string }

/**
 * 汎用 fetcher
 * - JSON ヘッダを付与
 * - レスポンス異常時は本文を読み込み詳細エラーを throw
 */
const fetcher = async <T = unknown>(
  url: string,
  init: RequestInit = {}
): Promise<T> => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    // 本文を取得してスタックトレースに残すとデバッグしやすい
    const message = await res.text().catch(() => res.statusText);
    throw new Error(
      `Fetch ${url} failed: ${res.status} ${res.statusText} – ${message}`
    );
  }

  return res.json() as Promise<T>;
};

export default function TrendingTopics() {
  const { data: topics = [], isLoading } = useSWR<Topic[]>(
    '/api/trends',
    fetcher,
    { refreshInterval: 60 * 60 * 1000 }
  )

  if (isLoading) {
    return <div className="animate-pulse h-52 bg-gray-100 rounded-lg" />
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-red-600" />
          トレンドトピック（Google 検索）
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <p className="text-sm text-gray-500">現在トレンドが取得できません</p>
        ) : (
          <ul className="space-y-3">
            {topics.map((item, idx) => (
              <li key={item.topic} className="flex justify-between">
                <span>
                  {idx + 1}. {item.topic}
                </span>
                <span className="text-xs text-gray-500">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
