'use client'
import { useAIAdvisor } from './provider'
import Image from 'next/image'

export function FloatingAIButton() {
  const { openAdvisor } = useAIAdvisor()

  return (
    <button
      onClick={openAdvisor}
      className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full shadow-xl ring-1 ring-gray-200 hover:shadow-2xl hover:scale-105 transition-transform focus:outline-none"
      aria-label="AIアドバイザーを開く"
    >
      <Image
        src="/logo2.png"
        alt="AI Advisor Logo"
        width={48}
        height={48}
        priority
      />
    </button>
  )
}