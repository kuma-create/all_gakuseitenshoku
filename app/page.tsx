/* -------------------------------------------------
   app/page.tsx – 改訂版 LandingPage
   - “好き”を仕事に。白ベース＋赤アクセントの軽快な UI/UX
   - Hero ▶ Stats ▶ Features ▶ HowItWorks ▶ GrandPrix
     ▶ Testimonials ▶ TrustedBy ▶ FAQ ▶ CTA ▶ Footer
--------------------------------------------------*/
"use client"

import Image from "next/image"
import Link  from "next/link"
import {
  ArrowRight, CheckCircle, ChevronRight, ExternalLink,
  MessageSquare, Search, Star, Trophy, Users,
} from "lucide-react"

import { Button }     from "@/components/ui/button"
import { Badge }      from "@/components/ui/badge"
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col scroll-smooth">
      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden bg-white py-8 md:py-16">
        {/* 薄い背景パターン */}
        <Image
          src="/abstract-pattern.png"
          alt="Background pattern"
          fill
          priority
          className="pointer-events-none select-none object-cover opacity-10"
        />

        <div className="container relative z-10 px-4 md:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              &quot;好き&quot;を仕事に。
              <br />
              <span className="text-red-600">自分らしい</span>キャリアを見つけよう
            </h1>

            <p className="mb-10 text-lg text-gray-600 md:text-xl">
              職務経歴書で、自分らしさが伝わる。企業からスカウトが届く、新しい就活のかたち。
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="bg-red-600 px-8 hover:bg-red-700">
                  無料ではじめる
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/grandprix">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  就活グランプリを見る
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* サブコピー */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500">
              {["登録は1分で完了", "完全無料", "いつでも退会可能"].map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ダッシュボード Mock 画像 */}
        <div className="container relative z-10 mt-12 px-4 md:px-6">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-1 shadow-xl">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-white">
              <Image
                src="/dashboard-preview.png"
                alt="学生転職ダッシュボード"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Stats ───────────── */}
      <section className="border-y bg-gray-50 py-8">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              ["1,200+", "登録企業"],
              ["25,000+", "学生ユーザー"],
              ["85%", "内定率"],
              ["3,500+", "月間スカウト数"],
            ].map(([num, label]) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold text-red-600 md:text-4xl">
                  {num}
                </p>
                <p className="text-sm text-gray-600 md:text-base">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Features ───────────── */}
      <section id="features" className="py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-red-100 text-red-600 hover:bg-red-200">
              プラットフォームの特徴
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              あなたの就活を
              <span className="text-red-600">もっと効率的に</span>
            </h2>
            <p className="mb-16 text-gray-600">
              学生転職は、従来の就活の常識を覆す新しいプラットフォーム。
              あなたの強みを最大限に活かし、理想の企業とマッチングします。
            </p>
          </div>

          {/* 4 Col Cards */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: MessageSquare,
                title: "職務経歴書を活用",
                body: "あなたの経験やスキルを職務経歴書として整理。企業に自分の強みを効果的にアピールできます。",
              },
              {
                icon: Trophy,
                title: "就活グランプリ",
                body: "ビジネススキルを可視化するオンラインコンテスト。自分の強みと弱みを客観的に把握できます。",
              },
              {
                icon: Search,
                title: "AIマッチング",
                body: "最先端のAIがあなたのプロフィールを分析し、相性の良い企業からスカウトが届きます。",
              },
              {
                icon: Star,
                title: "長期インターン",
                body: "在学中から実務経験を積める長期インターンの募集も多数。早期からキャリアを構築できます。",
              },
            ].map(({ icon: Ico, title, body }) => (
              <Card
                key={title}
                className="border-0 shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <CardHeader className="pb-2">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <Ico className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{body}</p>
                </CardContent>
                <CardFooter>
                  <Link
                    href="#"
                    className="inline-flex items-center text-sm font-medium text-red-600 hover:underline"
                  >
                    詳しく見る
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── How It Works ───────────── */}
      <section id="how-it-works" className="bg-gray-50 py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-red-100 text-red-600 hover:bg-red-200">
              利用の流れ
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-red-600">4ステップ</span>で理想の企業と出会う
            </h2>
            <p className="mb-16 text-gray-600">
              学生転職は、従来の就活よりもシンプルで効率的。
              あなたのプロフィールを作成するだけで、企業からスカウトが届きます。
            </p>
          </div>

          {/* タイムライン型 4 Col */}
          <div className="relative">
            {/* スマホ縦線 */}
            <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 transform bg-gray-200 md:hidden" />
            {/* PC 横線 */}
            <div className="hidden md:block">
              <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 transform bg-gray-200" />
            </div>

            <div className="grid gap-8 md:grid-cols-4">
              {[
                ["アカウント登録", "メールアドレスで簡単に登録。SNSログインも可能。"],
                ["プロフィール作成", "経験・スキル・志望業界を入力し魅力的に整理。"],
                ["スカウトが届く", "興味を持った企業から直接メッセージが届く。"],
                ["面談・選考へ", "メッセージ後、面談や選考に進み内定へ。"],
              ].map(([title, desc], i) => (
                <div key={title} className="relative">
                  {/* 番号バッジ */}
                  <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white md:mx-0">
                    <span className="text-lg font-bold">{i + 1}</span>
                  </div>
                  {/* カード */}
                  <div className="mt-4 rounded-xl bg-white p-6 shadow-lg md:mt-8">
                    <h3 className="mb-2 text-lg font-bold">{title}</h3>
                    <p className="text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link href="/signup">
              <Button size="lg" className="bg-red-600 px-8 hover:bg-red-700">
                今すぐ始める
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── Grand Prix ───────────── */}
      <section id="grandprix" className="py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* 左コンテンツ */}
            <div>
              <Badge className="mb-4 bg-red-100 text-red-600 hover:bg-red-200">
                就活グランプリ
              </Badge>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                あなたの
                <span className="text-red-600">ビジネススキル</span>
                を可視化
              </h2>
              <p className="mb-6 text-gray-600">
                ビジネスケース・Webテスト・戦闘力診断の3コンテンツで
                強みを客観評価。企業へアピールできる指標を獲得しよう。
              </p>

              {/* Tabs */}
              <Tabs defaultValue="case" className="mb-8 w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="case" className="flex-1">
                    ケーススタディ
                  </TabsTrigger>
                  <TabsTrigger value="webtest" className="flex-1">
                    Webテスト
                  </TabsTrigger>
                  <TabsTrigger value="business" className="flex-1">
                    ビジネス戦闘力
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="case" className="mt-4 rounded-lg border bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-lg font-bold">ケーススタディグランプリ</h3>
                  <p className="mb-4 text-gray-600">
                    実在企業の課題に対し、あなた独自の解決策を提案。
                    論理的思考力や問題解決能力をアピールできます。
                  </p>
                  <InfoRow participant="2,780名" note="優秀者は最終選考免除" />
                </TabsContent>

                <TabsContent value="webtest" className="mt-4 rounded-lg border bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-lg font-bold">Webテストグランプリ</h3>
                  <p className="mb-4 text-gray-600">
                    SPI・玉手箱・TG-Webなど主要テストを網羅。
                    実践形式で弱点を把握し本選考に備えられます。
                  </p>
                  <InfoRow participant="5,120名" note="成績上位者は大手企業へ推薦" />
                </TabsContent>

                <TabsContent value="business" className="mt-4 rounded-lg border bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-lg font-bold">ビジネス戦闘力診断</h3>
                  <p className="mb-4 text-gray-600">
                    必須 10 スキルを測定し強みと弱みを可視化。
                    効果的な自己PRの材料に活用できます。
                  </p>
                  <InfoRow participant="3,240名" note="Amazonギフト券 5,000円分" />
                </TabsContent>
              </Tabs>

              <Link href="/signup">
                <Button className="bg-red-600 hover:bg-red-700">
                  グランプリに参加する（無料登録）
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* 右画像 */}
            <div className="relative mx-auto aspect-square max-w-md overflow-hidden rounded-xl bg-gradient-to-br from-red-600 to-red-700 p-1 shadow-xl">
              <div className="h-full w-full overflow-hidden rounded-lg bg-white">
                <Image
                  src="/purple-radar-analysis.png"
                  alt="ビジネス戦闘力診断の結果例"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Testimonials ───────────── */}
      <section id="testimonials" className="bg-gray-50 py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <SectionHeader
            badge="利用者の声"
            title={
              <>
                <span className="text-red-600">先輩たち</span>の成功体験
              </>
            }
            desc="学生転職を利用して理想の企業に内定した先輩たちの声をご紹介します。"
          />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                img: "/testimonial-1.png",
                name: "田中 美咲",
                school: "早稲田大学 商学部",
                voice:
                  "就活グランプリで自分の強みを客観的に知ることができました。面接でも自信を持って自己PRができ、第一志望の外資系コンサルに内定をいただけました。",
                company: "BCGコンサルティング",
              },
              {
                img: "/testimonial-2.png",
                name: "佐藤 健太",
                school: "東京大学 工学部",
                voice:
                  "職務経歴書を作成したことで自分の強みを整理できました。スカウト機能で知らなかったベンチャー企業と出会い、今はエンジニアとして活躍しています。",
                company: "テックスタートアップ株式会社",
              },
              {
                img: "/testimonial-3.png",
                name: "鈴木 優子",
                school: "慶應義塾大学 経済学部",
                voice:
                  "長期インターンを経験し実務スキルを習得。本選考でも高評価をいただき大手メーカーのマーケティング職に内定しました。",
                company: "株式会社日本製造",
              },
            ].map(({ img, name, school, voice, company }) => (
              <Card key={name} className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar img={img} alt={`${name}の写真`} />
                    <div>
                      <CardTitle className="text-lg">{name}</CardTitle>
                      <CardDescription>{school}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{`「${voice}」`}</p>
                </CardContent>
                <CardFooter>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-500">
                      内定先：
                    </span>
                    <span className="text-sm font-medium">{company}</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* もっと見る */}
          <div className="mt-16 text-center">
            <Link href="/testimonials">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                もっと見る
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── Trusted By ───────────── */}
      <section className="py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <SectionHeader
            badge="掲載企業"
            title={
              <>
                <span className="text-red-600">1,200社以上</span>の企業が利用中
              </>
            }
            desc="大手〜スタートアップまで、幅広い企業があなたとの出会いを待っています。"
          />

          {/* ロゴプレースホルダー */}
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center justify-center">
                  <div className="h-12 w-32 rounded-md bg-gray-200 opacity-70 transition-opacity duration-200 hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>

          {/* more */}
          <div className="mt-16 text-center">
            <Link href="/companies">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                掲載企業一覧を見る
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section id="faq" className="bg-gray-50 py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <SectionHeader
            badge="よくある質問"
            title={
              <>
                <span className="text-red-600">疑問</span>にお答えします
              </>
            }
            desc="学生転職についてよくある質問をまとめました。その他のご質問はお問い合わせフォームまで。"
          />

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {[
                [
                  "学生転職の利用は無料ですか？",
                  "はい、学生の方は完全無料です。登録・プロフィール作成・企業とのメッセージのやり取り、就活グランプリへの参加など、すべて無料でご利用いただけます。",
                ],
                [
                  "就活グランプリとは何ですか？",
                  "ビジネスケース／Webテスト／戦闘力診断の3コンテンツでスキルを客観評価するオンラインコンテストです。上位入賞者には推薦や選考免除などの特典があります。",
                ],
                [
                  "どのような企業が登録していますか？",
                  "IT・通信、コンサル、メーカー、金融、広告など、1,200社以上の幅広い企業が登録しています。",
                ],
                [
                  "スカウトはどのように届きますか？",
                  "あなたのプロフィールや職務経歴書、グランプリ結果を見た企業から直接メッセージが届きます。メール通知＋ダッシュボードで確認可能です。",
                ],
              ].map(([q, a]) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-lg font-medium">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* more */}
          <div className="mt-16 text-center">
            <Link href="/faq">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                すべての質問を見る
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── CTA ───────────── */}
      <section className="bg-gradient-to-r from-red-600 to-red-700 py-16 text-white md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              あなたらしいキャリアを見つけよう
            </h2>
            <p className="mb-8 text-red-100">
              学生転職で、自分の強みを活かせる企業と出会い、理想のキャリアをスタートさせましょう。
              登録は1分で完了します。
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-white px-8 text-red-600 hover:bg-red-50">
                無料ではじめる
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="border-t bg-white py-12 md:py-16">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="relative h-8 w-8 overflow-hidden rounded bg-red-600">
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                    学
                  </span>
                </div>
                <span className="text-xl font-bold text-red-600">学生転職</span>
              </Link>
              <p className="mt-4 text-sm text-gray-600">
                学生のための新しい就活プラットフォーム。あなたらしいキャリアを見つけよう。
              </p>
            </div>

            {/* Links */}
            <FooterColumn
              title="サービス"
              links={[
                ["職務経歴書作成", "#"],
                ["就活グランプリ", "/grandprix"],
                ["企業スカウト", "#"],
                ["長期インターン", "#"],
              ]}
            />
            <FooterColumn
              title="会社情報"
              links={[
                ["会社概要", "#"],
                ["プライバシーポリシー", "#"],
                ["利用規約", "#"],
                ["お問い合わせ", "#"],
              ]}
            />

            {/* Follow / Newsletter */}
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase text-gray-900">フォローする</h3>
              <div className="flex space-x-4">
                {/* X */}
                <SocialIcon />
                {/* Instagram */}
                <SocialIcon type="insta" />
              </div>

              {/* Newsletter */}
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-bold text-gray-900">ニュースレター登録</h3>
                <div className="flex max-w-md gap-2">
                  <input
                    type="email"
                    placeholder="メールアドレス"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <Button className="bg-red-600 hover:bg-red-700">登録</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t pt-8">
            <p className="text-center text-xs text-gray-500">
              &copy; {new Date().getFullYear()} 学生転職 All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ---------- ヘルパー Components ---------- */
function SectionHeader({
  badge,
  title,
  desc,
}: {
  badge: string
  title: React.ReactNode
  desc: string
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Badge className="mb-4 bg-red-100 text-red-600 hover:bg-red-200">
        {badge}
      </Badge>
      <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="mb-16 text-gray-600">{desc}</p>
    </div>
  )
}

function Avatar({ img, alt }: { img: string; alt: string }) {
  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-full">
      <Image src={img} alt={alt} fill className="object-cover" />
    </div>
  )
}

function InfoRow({ participant, note }: { participant: string; note: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Users className="h-4 w-4" />
      <span>{participant}参加中</span>
      <span className="mx-2">•</span>
      <span>{note}</span>
    </div>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: [string, string][]
}) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-bold uppercase text-gray-900">
        {title}
      </h3>
      <ul className="space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-gray-600 transition-colors hover:text-red-600"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialIcon({ type = "x" }: { type?: "x" | "insta" }) {
  if (type === "insta") {
    return (
      <Link href="#" className="text-gray-600 transition-colors hover:text-red-600">
        {/* instagram */}
        <svg
          className="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
            clipRule="evenodd"
          />
        </svg>
      </Link>
    )
  }

  /* X (Twitter) */
  return (
    <Link href="#" className="text-gray-600 transition-colors hover:text-red-600">
      <svg
        className="h-6 w-6"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
      </svg>
    </Link>
  )
}
