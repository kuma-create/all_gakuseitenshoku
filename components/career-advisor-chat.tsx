'use client'

import { FormEvent, useEffect, useRef, useState, ReactElement, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  /** ユーザーが1度でも送信したら true */
  const [started, setStarted] = useState(false)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname(); // 現在のページパス

  /** ワンクリックで入力欄に挿入できる定型フレーズ */
  const quickPhrases = [
    '自己PRの書き方を教えて',
    '志望動機の例を見せて',
    '面接でよく聞かれる質問は？',
    '私に合うキャリアパスを提案して',
    '企業研究の進め方を知りたい',
  ]

  /* -------- ReactMarkdown component overrides to tighten spacing -------- */
  const markdownComponents = {
    // paragraphs
    p: ({ node, ...props }: { node?: any; children?: React.ReactNode }) => (
      <p className="m-0 leading-tight" {...props} />
    ),

    // list items
    li: ({ node, ...props }: { node?: any; children?: React.ReactNode }) => (
      <li className="m-0 leading-tight py-[1px]" {...props} />
    ),

    // unordered & ordered lists
    ul: ({ node, ...props }: { node?: any; children?: React.ReactNode }) => (
      <ul className="m-0 p-0 list-disc pl-4 leading-tight space-y-0" {...props} />
    ),
    ol: ({ node, ...props }: { node?: any; children?: React.ReactNode }) => (
      <ol className="m-0 p-0 list-decimal pl-4 leading-tight space-y-0" {...props} />
    ),

    // headings (reduce default top/bottom margins)
    h1: ({ node, ...props }: { node?: any; children?: React.ReactNode }) => (
      <h1 className="mt-2 mb-[2px] text-base font-semibold leading-tight" {...props} />
    ),
    h2: ({ node, ...props }: { node?: any; children?: React.ReactNode }) => (
      <h2 className="mt-2 mb-[2px] text-base font-semibold leading-tight" {...props} />
    ),
    h3: ({ node, ...props }: { node?: any; children?: React.ReactNode }) => (
      <h3 className="mt-2 mb-[2px] text-base font-semibold leading-tight" {...props} />
    ),
    h4: ({ node, ...props }: { node?: any; children?: React.ReactNode }) => (
      <h4 className="mt-2 mb-[2px] text-base font-semibold leading-tight" {...props} />
    ),

    // ignore stray <br> to avoid extra blank lines
    br: () => <></>,
  } as const

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
    if (!started) setStarted(true)

    // ① ユーザー発言を即時表示
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    // ② 類似求人を取得
    const recommendRes = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateProfile: question }),
    })
    const { jobs: recJobs } = (await recommendRes.json()) as { jobs: JobSnippet[] }
    console.log('[advisor-chat] recommend jobs', recJobs.length)
    // ここではまだカードを表示しない（intent を確認してから）

    // ③ /api/chat へリクエスト（JSON 応答）
    const chatRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newMessages,
        candidate: { profile: question },
        jobs: recJobs,
        pagePath: pathname,
      }),
    });

    if (!chatRes.ok) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'エラーが発生しました。時間をおいて再試行してください。' },
      ]);
      setIsThinking(false);
      return;
    }

    // JSON 形式 { text: string; intent?: string }
    const { text: assistantText, intent } = (await chatRes.json()) as {
      text: string;
      intent?: string;
    };

    // ④ アシスタント発言を追加
    setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);

    if (intent === 'job_recommendation') {
      setJobs(recJobs);          // ここで初めてカードを表示
    } else {
      setJobs([]);               // それ以外は非表示
    }

    setIsThinking(false);
    // フォームが更新されたのでページを再フェッチ（React 18 concurrent）
    startTransition(() => {
      router.refresh();
      window.dispatchEvent(new Event('resume-updated'));
    });
  }

  return (
    <div className="flex flex-col h-[60vh] border rounded-lg bg-white">
      {/* チャット表示エリア */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-gray-50">
        {messages.map((m, i) => {
          const isUser = m.role === 'user'
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 text-sm leading-tight whitespace-pre-wrap break-words ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900 text-sm leading-tight'
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {(m.content ?? '').replace(/\\n/g, '\n')}
                </ReactMarkdown>
              </div>
            </div>
          )
        })}

        {isThinking && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>考え中…</span>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobSnippetCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {!started && (
          <div className="flex flex-wrap gap-2 pt-4">
            {quickPhrases.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => setInput(phrase)}
                className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                {phrase}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力フォーム */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 p-3 border-t bg-white"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              handleSubmit(e as unknown as FormEvent)
            }
          }}
          placeholder="相談内容を入力..."
          rows={2}
          className="flex-1 resize-none rounded-md border p-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Button type="submit" size="icon" disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}