"use client";
import { Button } from "@/components/ui/button";
import Head from "next/head";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Search, Rocket, CalendarCheck } from "lucide-react";
import { Play, Badge } from "lucide-react";
import {
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Users,
} from "lucide-react";

function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-16 md:py-24 ${className ?? ""}`}>
      <div className="container mx-auto px-4">{children}</div>
    </section>
  );
}

function Nav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const links = [
    { href: "#pain", label: "課題" },
    { href: "#features", label: "特徴" },
    { href: "#metrics", label: "実績" },
    { href: "#flow", label: "流れ" },
    { href: "#testimonials", label: "事例" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <>
      {/* Skip link for keyboard and screen‑reader users */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only absolute top-2 left-2 z-[60] bg-white text-indigo-600 px-3 py-2 rounded"
      >
        メインコンテンツへスキップ
      </a>

      <header className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur border-b z-50">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          <a href="#hero" className="font-bold text-indigo-700">
            学生転職
          </a>

          {/* Desktop navigation */}
          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-6 text-sm font-medium"
          >
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hover:text-indigo-600 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <Button size="sm" aria-label="資料をダウンロード">
              資料DL
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button
            aria-label="メニューを開閉"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="lg:hidden text-indigo-700"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile navigation panel */}
        {isMenuOpen && (
          <div className="lg:hidden border-b shadow-sm bg-white">
            <nav
              aria-label="Mobile"
              className="flex flex-col px-6 py-4 gap-4 text-sm font-medium"
            >
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="hover:text-indigo-600 transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <Button
                size="sm"
                onClick={() => setIsMenuOpen(false)}
                aria-label="資料をダウンロード"
              >
                資料DL
              </Button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}

// MovieSection – short explainer video
function MovieSection() {
  return (
    <Section id="movie" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Badge
            className="mb-4 bg-indigo-100 text-indigo-700 border-indigo-200 inline-block px-3 py-1 rounded-full text-xs font-semibold"
          >
            MOVIE
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-relaxed">
            2分で分かる
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              学生転職
            </span>
          </h2>
          <p className="text-gray-700 mb-8">
            機能の全体像をサクッと把握したい方向けに、ハイライト動画を用意しました。
          </p>
        </div>
        <div className="relative">
          <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-indigo-100 to-violet-100">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 rounded-full p-6"
                aria-label="再生する"
              >
                <Play className="w-8 h-8 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

export default function CompanyLP() {
  return (
    <>
      <Head>
        <title>学生転職｜企業向けリバーススカウト採用プラットフォーム</title>
        <meta
          name="description"
          content="25〜28卒学生に特化したリバーススカウトサービス『学生転職』。独自データベースとAI活用で早期ポテンシャル人材に効率的に出会えます。"
        />
        <meta
          property="og:title"
          content="学生転職｜企業向けリバーススカウト採用プラットフォーム"
        />
        <meta
          property="og:description"
          content="25〜28卒学生に特化したリバーススカウトサービス『学生転職』で、質の高い母集団形成と内定承諾率向上を実現。"
        />

        {/* OGP image */}
        <meta property="og:image" content="/ogp/company-lp.png" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://culture.gakuten.co.jp/company" />

        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "学生転職",
              operatingSystem: "Web",
              applicationCategory: "BusinessApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "JPY",
              },
              url: "https://culture.gakuten.co.jp/company",
              publisher: {
                "@type": "Organization",
                name: "Make Culture Inc.",
              },
            }),
          }}
        />
      </Head>

      <Nav />

      <main id="main" role="main">
        {/* Hero */}
        <Section
          id="hero"
          className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white pt-32 relative overflow-hidden"
        >
          {/* Decorative blurred blobs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 -left-32 w-96 h-96 bg-violet-400 opacity-30 rounded-full blur-3xl"></div>
            <div className="absolute top-24 -right-32 w-80 h-80 bg-indigo-400 opacity-25 rounded-full blur-3xl"></div>
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              採用を加速する<br className="md:hidden" />“学生転職” リバーススカウト
            </h1>
            <p className="mb-8 text-lg opacity-90">
              25〜28卒の“いま会いたい”ポテンシャル人材に、たった3ステップでリーチ
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" aria-label="資料をダウンロード">資料を受け取る（無料）</Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10"
                aria-label="無料相談を申し込む"
              >
                担当者に相談する
              </Button>
            </div>
          </div>
        </Section>

        <MovieSection />

        {/* Pain Points */}
        <Section
          id="pain"
          className="bg-gradient-to-br from-violet-50 via-indigo-50 to-white"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
            こんなお悩みありませんか？
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              "ターゲット学生に求人情報が届かない",
              "母集団形成に大きな広告費がかかる",
              "内定承諾率が伸びず採用計画が遅れる",
            ].map((text, i) => (
              <div
                key={i}
                className="p-6 bg-white rounded-xl shadow-md flex items-start gap-4 hover:shadow-lg transition-shadow"
              >
                <AlertTriangle className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                <p className="text-gray-800 font-medium">{text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Features */}
        <Section id="features" className="bg-gray-50">
          <h2 className="text-2xl font-bold mb-4 text-center">
            学生転職が選ばれる理由
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <Search className="w-10 h-10 mb-4 text-indigo-600" />
              <h3 className="font-semibold mb-2">国内最大級データベース</h3>
              <p>45,000件超の学生プロフィールを常時アップデート</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <Rocket className="w-10 h-10 mb-4 text-indigo-600" />
              <h3 className="font-semibold mb-2">AIマッチング</h3>
              <p>応募意欲が高い候補者を自動リストアップ</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <CalendarCheck className="w-10 h-10 mb-4 text-indigo-600" />
              <h3 className="font-semibold mb-2">日程調整オートメーション</h3>
              <p>カレンダー連携で面談設定までワンクリック</p>
            </div>
          </div>
        </Section>

        {/* Metrics */}
        <Section id="metrics">
          <h2 className="text-2xl font-bold mb-4 text-center">実績</h2>
          <div className="grid gap-8 md:grid-cols-3 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <p className="text-4xl font-extrabold text-indigo-600">150+</p>
              <p className="font-medium text-gray-700">導入社数</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <p className="text-4xl font-extrabold text-indigo-600">50,000+</p>
              <p className="font-medium text-gray-700">登録学生数</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-4xl font-extrabold text-indigo-600">32%</p>
              <p className="font-medium text-gray-700">平均内定承諾率UP</p>
            </div>
          </div>
        </Section>

        {/* How It Works */}
        <Section id="flow" className="bg-white">
          <h2 className="text-2xl font-bold mb-4 text-center">ご利用の流れ</h2>
          <ol className="space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
            {[
              {
                num: "01",
                title: "学生検索 & ターゲティング",
                text: "5万件超のデータから理想の学生を高速絞り込み",
              },
              {
                num: "02",
                title: "AIマッチング & 日程調整",
                text: "AIが最適候補をレコメンドし、自動で面談調整",
              },
              {
                num: "03",
                title: "データ分析 & 改善",
                text: "施策効果をダッシュボードで可視化し継続的に最適化",
              },
            ].map(({ num, title, text }, i) => (
              <li
                key={num}
                className="relative bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                {i !== 2 && (
                  <ArrowRight className="hidden md:block absolute right-[-28px] top-1/2 -translate-y-1/2 w-7 h-7 text-indigo-400" />
                )}
                <span className="text-4xl font-extrabold text-indigo-600 mb-2 block">
                  {num}
                </span>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-gray-700">{text}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* Testimonials */}
        <Section id="testimonials" className="bg-gray-50">
          <h2 className="text-2xl font-bold mb-4 text-center">導入企業の声</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 bg-white rounded-lg shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <Image
                src="/logos/abc_corp.png"
                alt="ABC Corp のロゴ"
                width={160}
                height={32}
                className="h-8 mb-4 mx-auto"
                loading="lazy"
              />
              <p className="text-sm italic">
                &quot;登録からわずか2週間で3名の内定承諾。母集団形成コストを40%削減できました。&quot;
              </p>
              <p className="mt-4 text-xs text-gray-500 text-right">
                — 株式会社ABC 採用担当
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <Image
                src="/logos/xyz_inc.png"
                alt="XYZ Inc のロゴ"
                width={160}
                height={32}
                className="h-8 mb-4 mx-auto"
                loading="lazy"
              />
              <p className="text-sm italic">
                &quot;AIレコメンドのおかげでスカウト返信率が従来の3倍になりました。&quot;
              </p>
              <p className="mt-4 text-xs text-gray-500 text-right">
                — XYZ Inc. HRBP
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <Image
                src="/logos/def_llc.png"
                alt="DEF LLC のロゴ"
                width={160}
                height={32}
                className="h-8 mb-4 mx-auto"
                loading="lazy"
              />
              <p className="text-sm italic">
                &quot;面談調整を自動化できたことで、採用担当者の工数が月20時間削減。&quot;
              </p>
              <p className="mt-4 text-xs text-gray-500 text-right">
                — DEF LLC Talent Acquisition
              </p>
            </div>
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq">
          <h2 className="text-2xl font-bold mb-4 text-center">よくあるご質問</h2>
          <div className="max-w-2xl mx-auto">
            <details className="mb-4 p-4 border rounded-lg">
              <summary className="font-semibold cursor-pointer">
                料金体系を教えてください
              </summary>
              <p className="mt-2 text-sm text-gray-700">
                初期費用0円、成果報酬型（採用1名につき◯◯万円）と月額利用プランをご用意しています。
              </p>
            </details>
            <details className="mb-4 p-4 border rounded-lg">
              <summary className="font-semibold cursor-pointer">
                導入までの期間は？
              </summary>
              <p className="mt-2 text-sm text-gray-700">
                お申し込みから最短3営業日でご利用開始いただけます。
              </p>
            </details>
            <details className="mb-4 p-4 border rounded-lg">
              <summary className="font-semibold cursor-pointer">
                大手企業でも利用可能ですか？
              </summary>
              <p className="mt-2 text-sm text-gray-700">
                はい。学生転職はスタートアップから上場企業まで幅広くご利用いただいております。
              </p>
            </details>
          </div>
        </Section>

        {/* CTA */}
        <Section id="cta" className="bg-indigo-600 text-white">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">今すぐ学生転職を体験する</h2>
            <Button
              size="lg"
              className="animate-pulse bg-white text-indigo-700 font-semibold hover:animate-none"
            >
              無料で始める
            </Button>
          </div>
        </Section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center text-sm">
          © 2025 Make Culture Inc. All rights reserved.
        </div>
      </footer>
    </>
  );
}