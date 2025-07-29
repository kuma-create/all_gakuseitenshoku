'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import JobSnippetCard from '@/components/JobSnippetCard'

/** チャット 1 行分の型 */
type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type JobSnippet = {
  id: string
  title: string
  company: string
  url: string
  summary: string
  score: number
}

export default function CareerAdvisorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'こんにちは！キャリアについて何でも相談してくださいね。',
    },
  ])
  const [isThinking, setIsThinking] = useState(false)
  const [jobs, setJobs] = useState<JobSnippet[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  /* ------- スクロールを常に最下部へ ------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ------- 送信ハンドラ ------- */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const question = input.trim()
    if (!question) return

    // ① ユーザー発言を即時表示
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setInput('')
    setIsThinking(true)

    // ② 類似求人を取得
    const recommendRes = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateProfile: question }),
    })
    const { jobs: recJobs } = (await recommendRes.json()) as { jobs: JobSnippet[] }
    console.log('[advisor-chat] recommend jobs', recJobs.length)
    setJobs(recJobs)

    // ③ /api/chat へリクエスト（ストリーミング）
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, { role: 'user', content: question }],
        candidate: { profile: question },
        jobs: recJobs,
      }),
    })

    if (!res.ok || !res.body) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'エラーが発生しました。時間をおいて再試行してください。' },
      ])
      setIsThinking(false)
      return
    }

    // ④ ストリームを読み取りながらアシスタント発言を追加
    const reader = res.body
      .pipeThrough(new TextDecoderStream())
      .getReader()

    let assistantText = ''
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
    const assistantIndex = messages.length + 1

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      assistantText += value
      setMessages((prev) => {
        const next = [...prev]
        next[assistantIndex] = { role: 'assistant', content: assistantText }
        return next
      })
    }
    setIsThinking(false)
  }

  return (
    <div className="flex flex-col h-[60vh] border rounded-lg bg-white">
      {/* チャット表示エリア */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
        {/* メッセージバブル */}
        {messages.map((m, i) => {
          const isUser = m.role === 'user'
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900 prose prose-slate prose-sm'
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {(m.content ?? '').replace(/\\n/g, '\n')}
                </ReactMarkdown>
              </div>
            </div>
          )
        })}

        {/* 読み込み中インジケータ */}
        {isThinking && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>考え中…</span>
          </div>
        )}

        {/* おすすめ求人カード */}
        {jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobSnippetCard key={job.id} job={job} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t bg-white">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="相談内容を入力..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}