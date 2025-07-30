

/* app/ipo/page.tsx */


import Link from 'next/link'
import { motion } from 'framer-motion'

export const metadata = {
  title: '就活選抜コミュニティ IPO | 学生転職',
  description:
    '次世代リーダーを育てる就活選抜コミュニティ「IPO」の公式ページです。',
}

export default function IPOPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ────── Hero ────── */}
      <section className="relative flex items-center justify-center text-white bg-gradient-to-br from-purple-700 via-pink-600 to-red-500 h-[70vh] overflow-hidden">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center font-extrabold leading-tight drop-shadow-xl text-4xl sm:text-5xl lg:text-6xl"
        >
          就活選抜コミュニティ
          <br className="sm:hidden" /> IPO
        </motion.h1>

        {/* 背景のブロブ装飾 */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-28 -left-32 w-[520px] h-[520px] rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl animate-pulse delay-1000" />
        </div>
      </section>

      {/* ────── 埋め込みコンテンツ ────── */}
      <section className="max-w-6xl mx-auto w-full px-4 py-16">
        <div className="relative pt-[56.25%] rounded-lg shadow-2xl overflow-hidden">
          <iframe
            src="https://www.internsummit.com/IPO/top"
            title="IPO Official Site"
            className="absolute inset-0 w-full h-full"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/register?via=ipo"
            className="inline-block bg-purple-700 hover:bg-purple-800 transition-colors text-white font-semibold px-8 py-3 rounded-full shadow-lg"
          >
            無料で参加登録する
          </Link>
        </div>
      </section>
    </div>
  )
}
