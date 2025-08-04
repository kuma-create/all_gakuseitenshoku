'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FloatingAIButton } from '@/components/ai-advisor/FloatingButton'
import CareerAdvisorChat from '@/components/career-advisor-chat'
import { X, Minus } from 'lucide-react'

export type AIAdvisorRole =
  | 'homepage'
  | 'job-search'
  | 'resume-helper'
  | 'company-research'
  | 'default'

export interface AIAdvisorConfig {
  role: AIAdvisorRole
  systemPrompt: string        // GPT への system メッセージ等
  /* ─ 必要に応じて機能フラグを追加 ─ */
}

interface Ctx {
  /** 現在の設定を取得 */
  config: AIAdvisorConfig
  /** ページから設定を差し替える */
  setConfig: (c: Partial<AIAdvisorConfig>) => void
  /** ボタンからモーダルを開く */
  openAdvisor: () => void
  /** チャットが開いているかどうか */
  isOpen: boolean
}

const defaultConfig: AIAdvisorConfig = {
  role: 'default',
  systemPrompt: 'You are a helpful career assistant for students.',
}

const AIAdvisorContext = createContext<Ctx | null>(null)

export function AIAdvisorProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AIAdvisorConfig>(defaultConfig)
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;          // during SSR
    return localStorage.getItem('aiAdvisorOpen') === 'true';
  })

  const setConfig = (partial: Partial<AIAdvisorConfig>) =>
    setConfigState((prev) => ({ ...prev, ...partial }))

  const openAdvisor = () => setOpen(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aiAdvisorOpen', open ? 'true' : 'false')
    }
  }, [open])

  return (
    <AIAdvisorContext.Provider
      value={{ config, setConfig, openAdvisor, isOpen: open }}
    >
      {children}
      {/* 右下固定ボタン */}
      <FloatingAIButton />
      {/* モーダル本体 */}
      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent
          /* Prevent closing unless the ✕ button is pressed */
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 
                     left-auto top-auto translate-x-0 translate-y-0
                     w-[420px] sm:w-[480px] md:w-[560px] max-h-[80vh]
                     p-0 overflow-hidden bg-white shadow-2xl rounded-2xl flex flex-col
                     [&_[data-radix-dialog-close]]:hidden"
        >
          {/* ── Header with controls ── */}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="font-semibold text-sm">AIアドバイザー</span>
              <div className="flex gap-1">
                {/* Minimize (acts same as close for now) */}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded hover:bg-gray-100 p-1"
                  aria-label="最小化"
                >
                  <Minus size={20} strokeWidth={2} className="text-gray-600" />
                </button>
                {/* Close */}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded hover:bg-gray-100 p-1"
                  aria-label="閉じる"
                >

                </button>
              </div>
            </div>

            {/* ── Chat body ── */}
            <div className="flex-1">
              <CareerAdvisorChat />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AIAdvisorContext.Provider>
  )
}

export const useAIAdvisor = () => {
  const ctx = useContext(AIAdvisorContext)
  if (!ctx) throw new Error('useAIAdvisor must be inside <AIAdvisorProvider>')
  return ctx
}