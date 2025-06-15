/* ───────────────────────────────────────────────
   app/page.tsx  –  Hero 改良版（グリッド内配置で画像が確実に見える）
──────────────────────────────────────────────── */
"use client"

import { useState, useEffect } from "react"
import Link   from "next/link"
import Image  from "next/image"
import {
  ArrowRight, CheckCircle, ChevronRight,
  MessageSquare, Search, Star, Trophy, Users,
} from "lucide-react"

import { LazyImage } from "@/components/ui/lazy-image"
import { Button }    from "@/components/ui/button"
import { Badge }     from "@/components/ui/badge"
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import Footer from "@/components/footer"


/* ---------- Hero 内で使うサブコンポーネント ---------- */
function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-extrabold text-red-600 md:text-4xl lg:text-5xl">
        {num}
      </p>
      <p className="text-xs text-gray-600 md:text-sm lg:text-base">{label}</p>
    </div>
  )
}

/* ---------- Sticky CTA (mobile) ---------- */
function StickySignupCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // 600px 以上スクロールしたら表示
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:hidden">
      <Link href="/signup" className="w-full max-w-sm">
        <Button className="w-full bg-red-600 text-white shadow-lg hover:bg-red-700">
          今すぐ無料登録
        </Button>
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────── */

export default function LandingPage() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => setLoaded(true), [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* ─────────────── Hero ─────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#d24848] via-[#9c0202] to-[#4a0000]">
        {/* 右側イメージ — 画面幅の 45% だけ占有 */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[60%] sm:w-[55%] md:w-[45%] lg:w-[40%]">
          <LazyImage
            src="/hero-woman.webp"
            alt="ノート PC を持つビジネスウーマン"
            fill
            priority
            sizes="(min-width:1024px) 45vw, (min-width:768px) 50vw, (min-width:640px) 60vw, 70vw"
            className="select-none object-contain object-bottom"
          />
        </div>

        {/* LEFT : コピー & CTA  (max-width を設けて左寄せ) */}
        <div className="relative z-10 mx-auto flex min-h-[360px] sm:min-h-[360px] max-w-7xl items-start px-4 sm:px-6 pt-4 sm:pt-12 pb-4 sm:pb-20 lg:px-10">
          <div
            className={`mt-12 sm:mt-8 flex flex-col flex-1 gap-y-16 max-w-full sm:max-w-lg lg:max-w-xl text-left text-white pr-4 sm:pr-8 md:pr-10 transition-opacity duration-700 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* ── Top : Title ───────────────── */}
            <div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl">
                学生時代の”職歴”で
                <br />
                ハイレベルな就活を
              </h1>
            </div>

            {/* ── Bottom : Copy & CTA ───────── */}
            <div className="mt-auto sm:mt-0 space-y-6 mb-1 sm:mb-12">
              {/* Tagline (desktop) */}
              <p className="hidden sm:block text-base leading-relaxed text-red-100">
                あなたの職歴を評価した本気のスカウトが届く。
                <br className="hidden sm:block" />
                限定オファーであなたらしいキャリアを切り拓こう。
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-row gap-2 w-full">
                {/* primary */}
                <Link href="/signup" className="basis-1/2 min-w-0">
                  <Button
                    size="default"
                    variant="outline"
                    className="w-full border border-transparent bg-[#fffcf9] text-[#861010] hover:bg-white hover:text-[#861010] px-1 py-2 text-xs sm:px-4 sm:py-3 sm:text-base flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    スカウトを受け取る
                    <ArrowRight className="ml-0 h-2 w-2" />
                  </Button>
                </Link>

                {/* secondary */}
                <Link href="/jobs" className="flex-1 min-w-[140px]">
                  <Button
                    size="default"
                    variant="outline"
                    className="w-full border border-transparent bg-[#fffcf9] text-[#861010] hover:bg-white hover:text-[#861010] px-2 py-2 text-xs sm:px-6 sm:py-3 sm:text-base flex items-center justify-center gap-1 whitespace-nowrap"
                  >
                    早期選考はこちら
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Tagline (mobile) */}
              <p className="sm:hidden text-xs leading-snug text-red-100">
                あなたの職歴を評価した本気のスカウトが届く。
                限定オファーであなたらしいキャリアを切り拓こう。
              </p>

              {/* Quick facts */}
              <ul className="hidden sm:flex flex-wrap gap-x-4 gap-y-2 text-xs md:text-sm text-[#ffebe8]">
                {["登録は1分で完了", "完全無料", "有料グランプリ開催"].map((txt) => (
                  <li key={txt} className="flex items-center gap-1">
                    <CheckCircle className="h-[14px] w-[14px]" />
                    {txt}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* センターを少し明るくするフェード */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-20 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
      </section>

      {/* Features Section */}
      <section id="features" className="pt-8 pb-16 sm:py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="mb-8 inline-block bg-gradient-to-r from-red-600 via-red-500 to-orange-400 bg-clip-text text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-transparent">
            学生転職とは
          </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-snug tracking-tight">
              長期インターンやアルバイトの<span className="text-red-600">経歴</span>にスカウトが届く
              新しいハイキャリア就活サービス
            </h2>
            <p className="mt-4 text-gray-600">
              学生転職は、従来の就活の常識を覆す新しいスカウトオファーサービスです。
              これまでの経験を企業にアピールし
              スキルに見合った年収・ポジション付きの評価のあるオファーを受け取ってみませんか？
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-600"></div>
              <CardHeader className="pb-2">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Search className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">スカウト型で効率的なマッチング</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  あなたのプロフィールを見た企業から直接オファーが届きます。
                  自分に興味を持った企業とだけ話を進められるので、効率的に就活ができます。
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/signup" className="inline-flex items-center text-sm font-medium text-red-600 hover:underline">
                  詳しく見る
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-600"></div>
              <CardHeader className="pb-2">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">職務経歴書で自分らしさをPR</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  あなたの経験やスキルを職務経歴書として整理。
                  自己分析をサポートし、企業に自分の強みを効果的にアピールできます。
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/signup" className="inline-flex items-center text-sm font-medium text-red-600 hover:underline">
                  詳しく見る
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-white shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500 to-red-600"></div>
              <CardHeader className="pb-2">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Trophy className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">就活グランプリでチャンス拡大</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  ビジネススキルを可視化するオンラインコンテスト。
                  自分の強みと弱みを客観的に把握でき、企業からの注目度もアップします。
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/signup" className="inline-flex items-center text-sm font-medium text-red-600 hover:underline">
                  詳しく見る
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>
      

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-gray-50 py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge className="mb-8 bg-red-100 text-red-600 hover:bg-red-200 text-2lg">スカウトまでの流れ</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-red-600">3ステップ</span>で理想の企業と出会う
            </h2>
            <p className="mt-4 text-gray-600">
              プロフィール作成や就活グランプリへの参加であなたの市場価値を高めましょう。
              市場価値が高いほど驚きのスカウトが届く！
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 transform bg-gray-200 md:hidden"></div>
            <div className="hidden md:block">
              <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 transform bg-gray-200"></div>
            </div>

            <div className="grid gap-12 md:grid-cols-3">
              <div className="relative">
                <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white md:mx-0">
                  <span className="text-xl font-bold">1</span>
                </div>
                <div className="mt-6 rounded-xl bg-white p-6 shadow-lg md:mt-8">
                  <h3 className="mb-3 text-xl font-bold">プロフィール登録</h3>
                  <p className="text-gray-600">
                    あなたのスキルや経験、希望する業界などを入力し、魅力的なプロフィールを作成。
                    職務経歴書を作成して、自分の強みをアピールしましょう。
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white md:mx-0">
                  <span className="text-xl font-bold">2</span>
                </div>
                <div className="mt-6 rounded-xl bg-white p-6 shadow-lg md:mt-8">
                  <h3 className="mb-3 text-xl font-bold">市場価値を高める</h3>
                  <p className="text-gray-600">
                    職務経歴書のブラッシュアップや就活グランプリなどの参加を通じて
                    自身の市場地を高めていきましょう。
                    プロフィールや就活グランプリの結果によりスカウトの内容が変わってきます。
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white md:mx-0">
                  <span className="text-xl font-bold">3</span>
                </div>
                <div className="mt-6 rounded-xl bg-white p-6 shadow-lg md:mt-8">
                  <h3 className="mb-3 text-xl font-bold">スカウトを受け取る</h3>
                  <p className="text-gray-600">
                    あなたのプロフィールに興味を持った企業から直接スカウトメッセージが届きます。
                    興味のある企業とコミュニケーションを取りましょう。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Button size="lg" className="bg-red-600 px-8 hover:bg-red-700" asChild>
              <Link href="/signup">
                今すぐ始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/*就活グランプリ*/}
      <section id="grandprix" className="py-16 md:py-24">
        <div className="container px-4 md:px-6">
          {/* イントロ */}
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge className="mb-4 bg-red-100 text-red-600 hover:bg-red-200 text-2lg">
              就活グランプリとは
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              就活生同士が競い
              <span className="text-red-600">市場価値</span>
              を高める
            </h2>
            <p className="text-gray-600 sm:text-lg">
              就活グランプリでは「ビジネス戦闘力」「Webテスト」「ケースワーク」の3種類のコンテンツで
              <br className="hidden sm:block" />
              就活生同士が順位や点数を競い合い、己の市場価値向上を目指します。
              <br className="hidden sm:block" />
              またグランプリ結果に応じて企業から特別スカウトをもらいやすくなります。
            </p>
          </div>

          {/* 3 Cards */}
          <div className="grid gap-8 md:grid-cols-3">
            {/* ① ビジネス戦闘力診断 */}
            <Card className="border-0 bg-gradient-to-br from-violet-50 to-white shadow-sm">
              <CardHeader className="flex items-start gap-3 pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <Trophy className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-bold">ビジネス戦闘力診断</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  あなたのビジネススキルを診断し、強みと弱みを可視化します。
                  企業からのスカウト獲得にも有利です。
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild size="sm" className="w-full bg-violet-600 hover:bg-violet-700">
                  <Link href="/grandprix/biz">参加する</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* ② Webテスト */}
            <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
              <CardHeader className="flex items-start gap-3 pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Search className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-bold">Webテストグランプリ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  SPI・玉手箱・TG-Webなど主要Webテスト対策ができます。
                  実践的な問題で本番に備えましょう。
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/grandprix/webtest">参加する</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* ③ ケーススタディ */}
            <Card className="border-0 bg-gradient-to-br from-amber-50 to-white shadow-sm">
              <CardHeader className="flex items-start gap-3 pb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-bold">ケーススタディグランプリ</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  実際の企業課題に挑戦し、あなたの問題解決力をアピール。
                  優秀者は最終選考免除の特典も。
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
                  <Link href="/grandprix/case">参加する</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* 下部 CTA */}
          <div className="mt-14 text-center">
            <Link href="/grandprix">
              <Button size="lg" className="bg-red-600 px-10 hover:bg-red-700">
                就活グランプリに挑戦する
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>


      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge className="mb-4 bg-red-100 text-red-600 hover:bg-red-200 text-2lg">利用者の声</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-red-600">先輩たち</span>の成功体験
            </h2>
            <p className="mt-4 text-gray-600">学生転職を利用して理想の企業に内定した先輩たちの声をご紹介します。</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-red-100">
                  <LazyImage src="/student_tanaka.jpg" alt="田中さんのプロフィール" fill className="object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">田中 美咲</h3>
                  <p className="text-sm text-gray-500">早稲田大学 商学部</p>
                </div>
              </div>
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="mb-4 text-gray-600">
                「新規事業や経営などビジネスの最上流に若いうちから携わりたいと思い、
                コンサルファームと事業会社を両面で見ていました。ネットで調べても絶対に出会えなかった
                事業会社から多数スカウトが届き結果経営幹部待遇での内定をもらうことができました。」
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium text-gray-500">内定先：</span>
                <span className="font-medium">BCGコンサルティング</span>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-red-100">
                  <LazyImage src="/student_sato.jpg" alt="佐藤さんのプロフィール" fill className="object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">佐藤 健太</h3>
                  <p className="text-sm text-gray-500">東京大学 工学部</p>
                </div>
              </div>
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="mb-4 text-gray-600">
                「エントリーシートを書く前に職務経歴書を作成したことで、自分の強みを整理できました。
                スカウト機能で知らなかったベンチャー企業と出会い、今はエンジニアとして活躍しています。」
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium text-gray-500">内定先：</span>
                <span className="font-medium">リブ・コンサルティング</span>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-red-100">
                  <LazyImage src="/studetn_suzuki.jpg" alt="鈴木さんのプロフィール" fill className="object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">鈴木 優子</h3>
                  <p className="text-sm text-gray-500">慶應義塾大学 経済学部</p>
                </div>
              </div>
              <div className="mb-4 flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="mb-4 text-gray-600">
                「学生時代からAI系の受託会社にてエンジニアをしていましたが、新卒ではAI×〇〇領域で新規事業に挑戦してみたいと考えていました。
                AI領域のスタートアップが増えている中でAIを活用した未来の姿や自分のやりたいことの全てにマッチした企業と出会うことができました。」
              </p>
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium text-gray-500">内定先：</span>
                <span className="font-medium">株式会社日本製造</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-gray-50 py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge className="mb-8 bg-red-100 text-red-600 hover:bg-red-200 text-2lg">よくある質問</Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-red-600">疑問</span>にお答えします
            </h2>
            <p className="mt-4 text-gray-600">
              学生転職についてよくある質問をまとめました。 その他のご質問はお問い合わせフォームからお気軽にどうぞ。
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border rounded-lg mb-4 bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  逆求人型就活とは何ですか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  逆求人型就活とは、学生が企業に応募するのではなく、企業から学生にスカウトが届く仕組みです。
                  あなたのプロフィールや職務経歴書を見た企業から直接オファーが届くため、
                  効率的に就活を進めることができます。自分に興味を持った企業とだけコミュニケーションを取れるのが特徴です。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border rounded-lg mb-4 bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  職務経歴書って難しいですか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  学生転職では、学生向けに最適化された職務経歴書のテンプレートを用意しています。
                  アルバイトやインターン、ゼミやサークル活動など、学生時代の経験を整理するガイドラインがあるので、
                  初めての方でも簡単に作成できます。また、AIによる文章の添削機能もあり、より魅力的な職務経歴書を作成できます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border rounded-lg mb-4 bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  就活グランプリとは何ですか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  就活グランプリは、ビジネスケース、Webテスト、ビジネス戦闘力診断の3つのコンテンツで
                  あなたのスキルを客観的に評価するオンラインコンテストです。
                  参加することで自分の強みと弱みを把握でき、企業にもその結果をアピールできます。
                  上位入賞者には、企業への推薦や選考免除などの特典もあります。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border rounded-lg mb-4 bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  学生転職の利用は無料ですか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  はい、学生転職は学生の方は完全無料でご利用いただけます。
                  登録、プロフィール作成、企業とのメッセージのやり取り、就活グランプリへの参加など、
                  すべての機能を無料でご利用いただけます。
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border rounded-lg bg-white">
                <AccordionTrigger className="px-6 py-4 text-left text-lg font-medium hover:no-underline">
                  どのような企業が登録していますか？
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-600">
                  大手企業からベンチャー、スタートアップまで、様々な業界の1,200社以上の企業が登録しています。
                  IT・通信、コンサルティング、メーカー、金融、広告・マスコミなど、幅広い業界の企業があなたとの出会いを待っています。
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700"></div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>

        <div className="container relative z-10 px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-white md:text-4xl">
              あなたらしいキャリアを見つけよう
            </h2>
            <p className="mb-8 text-lg text-red-100">
              学生転職で、自分の強みを活かせる企業と出会い、理想のキャリアをスタートさせましょう。
              登録は1分で完了します。
            </p>
            <Button size="lg" className="bg-white px-8 text-red-600 hover:bg-red-50" asChild>
              <Link href="/signup">
                無料ではじめる
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <StickySignupCTA />
      <Footer />
    </div>
  )
}