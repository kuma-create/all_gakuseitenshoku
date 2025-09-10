
/* ---------- Wave Style (static) ---------- */
const waveCSS = (
  <style
    dangerouslySetInnerHTML={{
      __html: `
        /* Disable wave animation */
        svg.wave > path {
          animation: none;
        }
      `,
    }}
  />
);
// app/internships/page.tsx
import Link from "next/link";
import Script from "next/script";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Globe,
  Rocket,
  Users,
  Zap,
  ShieldCheck,
  TrendingUp,
  Eye,
  Send,
} from "lucide-react";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
// TODO: When a job photo column (e.g., jobs.thumbnail_url or jobs.cover_image) is available, extend the select in getLatestInternJobs()
// and use that as the primary image in the card. The UI below already supports an image-first design.

// Site root URL (set in .env as NEXT_PUBLIC_SITE_URL). Fallback to production root.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gakuten.co.jp";

export const metadata = {
  title: "最強のガクチカを手に入れろ！学転インターン｜長期インターン求人一覧 | 学生転職",
  description:
    "就活そして社会人を無双したい人へ。最強のガクチカが作れる長期インターンが見つかる。スタートアップから大手までの厳選求人を掲載。無料登録で今日から行動しよう。",
  keywords: [
    "長期インターン",
    "インターンシップ",
    "学転インターン",
    "ガクチカ",
    "学生転職",
    "新卒採用",
    "就活",
    "スタートアップ求人",
    "マーケティング インターン",
    "エンジニア インターン",
    "営業 インターン",
  ],
  alternates: {
    canonical: `${siteUrl}/internships`,
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "最強のガクチカを手に入れろ！学転インターン｜長期インターン求人一覧 | 学生転職",
    description:
      "就活そして社会人を無双したい人へ。最強のガクチカが作れる長期インターンが見つかる。スタートアップから大手までの厳選求人を掲載。無料登録で今日から行動しよう。",
    url: `${siteUrl}/internships`,
    images: ["/ogp/internships.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "最強のガクチカを手に入れろ！学転インターン｜長期インターン求人一覧 | 学生転職",
    description:
      "就活そして社会人を無双したい人へ。最強のガクチカが作れる長期インターンが見つかる。スタートアップから大手までの厳選求人を掲載。無料登録で今日から行動しよう。",
    images: ["/ogp/internships.png"],
  },
};

/* ---------- Data ---------- */

const categories = [
  {
    label: "マーケティング",
    href: "/jobs/list?jobType=marketing&selectionType=intern_long",
    icon: Globe,
  },
  {
    label: "エンジニア",
    href: "/jobs/list?jobType=engineering&selectionType=intern_long",
    icon: Rocket,
  },
  {
    label: "営業",
    href: "/jobs/list?jobType=sales&selectionType=intern_long",
    icon: Briefcase,
  },
  {
    label: "人事 / HR",
    href: "/jobs/list?jobType=hr&selectionType=intern_long",
    icon: Users,
  },
];

const steps = [
  { title: "会員登録", text: "1分で完了。完全無料です。" },
  {
    title: "求人を探す",
    text: "豊富なフィルターで自分に合った長期インターンを検索。",
  },
  {
    title: "応募 & 面談",
    text: "気になる企業にワンクリック応募。最短即日で面談可。",
  },
];

const features = [
  {
    icon: Zap,
    title: "最短1日で内定直結",
    text: "スピーディーな選考フローで、挑戦したい気持ちをすぐに行動へ。",
  },
  {
    icon: ShieldCheck,
    title: "実践力が魅力",
    text: "ガクチカとして強みになる実践型のインターンを監修。",
  },
  {
    icon: TrendingUp,
    title: "成長機会が豊富",
    text: "成長企業・スタートアップの実践的なプロジェクトに挑戦できる。",
  },
];

type SimpleJob = {
  id: string;
  title: string;
  cover_image_url: string | null; // 求人ごとの写真（なければnull）
  company: { name: string; logo: string | null };
};

async function getLatestInternJobs(): Promise<SimpleJob[]> {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase
    .from("jobs")
    .select("id, title, cover_image_url, company:companies(name, logo)")
    .eq("selection_type", "intern_long")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(8);
  return (data ?? []) as unknown as SimpleJob[];
}


/* ---------- Testimonials Data ---------- */
const testimonials = [
  {
    quote:
      "このサイトを通じて自分に合う成長環境を見つけ、半年で事業責任者を任されました！",
    name: "早稲田大学 佐藤さん",
    role: "マーケティングインターン",
    image: "/uni/3517043_l.jpg",
  },
  {
    quote:
      "スタートアップの現場で実践的な開発に携われたことで、エンジニアとして一気にレベルアップできました。",
    name: "慶應義塾大学 鈴木さん",
    role: "エンジニアインターン",
    image: "/uni/27556652_l.jpg",
  },
  {
    quote:
      "営業インターンで圧倒的な経験を積み、内定先の選択肢が一気に広がりました！",
    name: "東京大学 田中さん",
    role: "営業インターン",
    image: "/uni/30820664_l.jpg",
  },
];

/* ---------- Page ---------- */

export default async function InternshipTop() {
  const jobs = await getLatestInternJobs();

  return (
    <>
      {waveCSS}
      <main className="scroll-smooth">
      {/* --- SEO Structured Data --- */}
      <Script id="breadcrumbs-jsonld" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "ホーム",
              item: siteUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "長期インターン",
              item: `${siteUrl}/internships`,
            },
          ],
        })}
      </Script>
      <Script id="collection-jsonld" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "長期インターン一覧",
          description:
            "長期インターンシップを探すなら学生転職。スタートアップから大手まで最新募集を掲載中。",
          url: `${siteUrl}/internships`,
        })}
      </Script>
      {/* --- Additional JSON-LD Structured Data --- */}
      <Script id="website-jsonld" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "学生転職",
          url: siteUrl,
          potentialAction: {
            "@type": "SearchAction",
            target: `${siteUrl}/jobs/list?selectionType=intern_long&q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        })}
      </Script>
      <Script id="faq-jsonld" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "長期インターンは未経験でも応募できますか？",
              acceptedAnswer: {
                "@type": "Answer",
                text: "多くの求人で未経験歓迎です。募集要項の必須条件をご確認のうえ、まずは気軽にご応募ください。",
              },
            },
            {
              "@type": "Question",
              name: "学業との両立は可能ですか？",
              acceptedAnswer: {
                "@type": "Answer",
                text: "シフトの柔軟な求人も多数あります。週2〜3日、リモート可などの条件で検索できます。",
              },
            },
            {
              "@type": "Question",
              name: "応募から内定までの流れは？",
              acceptedAnswer: {
                "@type": "Answer",
                text: "会員登録→求人検索→応募→面談→内定が基本の流れです。キャリアアドバイザーが選考対策もサポートします。",
              },
            },
          ],
        })}
      </Script>
      <Script id="itemlist-jsonld" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: (Array.isArray(jobs) ? jobs : []).map((job, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            url: `${siteUrl}/jobs/${job.id}`,
            name: job.title,
          })),
        })}
      </Script>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate flex min-h-[60vh] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400">
        {/* Background image (optional) */}
        <Image
          src="/shukatu.jpg"
          alt="学生が就活に励むイメージ写真"
          fill
          priority
          className="absolute inset-0 -z-20 h-full w-full object-cover scale-105 opacity-40"
        />
        {/* Color overlay to improve text readability */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-orange-900/60 via-orange-800/40 to-orange-700/20 mix-blend-multiply"></div>

        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">
            最強のガクチカを手に入れろ！
            <br className="hidden md:block" />
            <span className="text-6xl md:text-7xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
              学転インターン
            </span>
          </h1>
          <p className="mt-6 text-lg text-white/90">
            就活そして社会人を無双したい人へ。最強のガクチカが作れる長期インターンが見つかる。
          </p>
          {/* --- Search Bar --- */}
          <form
            action="/jobs/list"
            method="GET"
            className="mx-auto mt-8 flex w-full max-w-lg sm:max-w-xl md:max-w-2xl overflow-hidden rounded-full bg-white shadow-lg"
          >
            <input type="hidden" name="selectionType" value="intern_long" />
            <input
              type="text"
              name="q"
              placeholder="キーワードで検索（例：マーケティング）"
              className="flex-1 px-5 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            <Button
              type="submit"
              size="lg"
              className="rounded-none rounded-r-full px-8 font-semibold"
            >
              検索
            </Button>
          </form>
          {/* CTA Buttons — styled like the reference UI */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {/* Filled pill button */}
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white px-8 py-3 font-semibold text-orange-600 hover:bg-white/90"
            >
              <Link href="/signup">無料登録</Link>
            </Button>

            {/* Orange filled pill button with arrow */}
            <Button
              asChild
              size="lg"
              className="rounded-full bg-orange-600 px-8 py-3 font-semibold text-white hover:bg-orange-500"
            >
              <Link
                href="/jobs/list?selectionType=intern_long"
                className="flex items-center gap-2"
              >
                <span>求人を探す</span>
                <svg
                  xmlns="https://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </Button>
          </div>
        </div>
        {/* Decorative wave */}
        <svg
          viewBox="0 0 2880 100"
          className="wave absolute bottom-[-1px] left-0 w-full text-background"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,30 C360,90 1080,-60 1440,30 C1800,90 2520,-60 2880,30 L2880,100 L0,100 Z"
          />
        </svg>
      </section>

      {/* ---------- Latest Jobs ---------- */}
      <section className="container space-y-10 py-12">
        <h2 className="relative mx-auto w-max text-center text-3xl font-bold after:block after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-orange-500 after:content-['']">
          最新の長期インターン求人
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="group block overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Clickable image area */}
              <Link
                href={`/jobs/${job.id}`}
                aria-label={`${job.title}の詳細ページへ`}
                className="relative block aspect-[16/9] w-full overflow-hidden"
              >
                {job.cover_image_url ? (
                  <Image
                    src={job.cover_image_url}
                    alt={`${job.title} の募集写真`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    priority={false}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                    {job.company.logo ? (
                      <Image
                        src={job.company.logo}
                        alt={`${job.company.name}のロゴ`}
                        width={96}
                        height={96}
                        className="object-contain"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-300" />
                    )}
                  </div>
                )}

                {/* Gradient overlay for readability */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

                {/* Company logo badge (always shown if available) */}
                {job.company.logo && (
                  <div className="absolute bottom-3 left-3 rounded-full bg-white/90 p-1 shadow-md ring-1 ring-black/5">
                    <Image
                      src={job.company.logo}
                      alt={`${job.company.name}のロゴ`}
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-contain"
                    />
                  </div>
                )}
              </Link>

              {/* Text area */}
              <div className="flex flex-col gap-2 px-4 pb-4 pt-3">
                {/* Clickable title (separate link, not nested) */}
                <Link href={`/jobs/${job.id}`} className="line-clamp-2 text-base font-semibold leading-snug text-gray-900">
                  {job.title}
                </Link>
                <p className="text-sm text-muted-foreground">{job.company.name}</p>

                {/* CTA row */}
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    className="h-10 w-full rounded-full bg-orange-600 font-semibold text-white hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                    asChild
                  >
                    <Link
                      href={`/jobs/${job.id}`}
                      aria-label={`${job.title}の詳細を見る`}
                      className="flex items-center justify-center gap-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye className="h-4 w-4" />
                      <span>詳細を見る</span>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 w-full rounded-full border-orange-300 bg-white text-orange-700 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2"
                    asChild
                  >
                    <Link href={`/jobs/${job.id}?apply=1`} aria-label={`${job.title}に応募する`} className="flex items-center justify-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>応募</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/jobs/list?selectionType=intern_long">すべての求人を見る</Link>
          </Button>
        </div>
      </section>

      {/* ---------- Categories ---------- */}
      <section className="container space-y-10 py-20">
        <h2 className="relative mx-auto w-max text-center text-3xl font-bold after:block after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-orange-500 after:content-['']">
          カテゴリから探す
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="relative group rounded-2xl bg-card/70 p-6 text-center shadow-lg ring-1 ring-border backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:bg-orange-500/10 hover:ring-orange-500/50"
            >
              <Icon className="mx-auto h-8 w-8 text-orange-500 transition-transform duration-300 group-hover:scale-110" />
              <span className="mt-3 block font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Why Choose Us ---------- */}
      <section className="relative overflow-hidden py-20">
        {/* Wave top */}
        <svg
          viewBox="0 0 2880 100"
          className="wave absolute -top-px left-0 w-full rotate-180 text-orange-500/10"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,30 C360,90 1080,-60 1440,30 C1800,90 2520,-60 2880,30 L2880,100 L0,100 Z"
          />
        </svg>

        <div className="container relative space-y-12">
          <h2 className="relative mx-auto w-max text-center text-3xl font-bold after:block after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-orange-500 after:content-['']">
            学転インターンが選ばれる理由
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl bg-white/60 p-8 text-center shadow-lg backdrop-blur-md transition hover:-translate-y-1 hover:shadow-xl"
              >
                <Icon className="mx-auto h-10 w-10 text-orange-500" />
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave bottom */}
        <svg
          viewBox="0 0 2880 100"
          className="wave absolute bottom-[-1px] left-0 w-full text-orange-500/10"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,30 C360,90 1080,-60 1440,30 C1800,90 2520,-60 2880,30 L2880,100 L0,100 Z"
          />
        </svg>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="bg-muted py-20">
        <div className="container space-y-12">
          <h2 className="relative mx-auto w-max text-center text-3xl font-bold after:block after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-orange-500 after:content-['']">
            ご利用の流れ
          </h2>

          <ol className="mx-auto grid max-w-4xl gap-12 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="space-y-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="container space-y-10 py-20">
        <h2 className="relative mx-auto w-max text-center text-3xl font-bold after:block after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-orange-500 after:content-['']">
          活躍する先輩の声
        </h2>

        <div className="grid justify-items-center gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex max-w-sm flex-col gap-6 rounded-2xl bg-white/70 p-8 shadow-lg backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mx-auto h-16 w-16 overflow-hidden rounded-full ring-2 ring-orange-200">
                <Image
                  src={t.image}
                  alt={`${t.name}の写真`}
                  width={64}
                  height={64}
                  className="h-16 w-16 object-cover"
                  priority={false}
                />
              </div>
              <blockquote className="text-sm leading-relaxed text-gray-700 md:text-base">
                「{t.quote}」
              </blockquote>

              <figcaption className="pt-4 text-sm">
                <div className="font-medium text-gray-900">{t.name}</div>
                <div className="text-muted-foreground">{t.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- Stats ---------- */}

      {/* Sticky CTA (mobile) */}
      <div className="fixed bottom-6 left-1/2 z-50 w-[92%] -translate-x-1/2 md:hidden">
        <div className="flex gap-3 rounded-2xl bg-orange-500 px-4 py-3 shadow-2xl">
          <Button asChild variant="link" className="flex-1 text-primary-foreground">
            <Link href="/jobs/list?selectionType=intern_long">求人を探す</Link>
          </Button>
          <Button asChild variant="secondary" className="flex-1">
            <Link href="/jobs/list?sort=new&selectionType=intern_long">新着をみる</Link>
          </Button>
        </div>
      </div>
      </main>
    </>
  );
}
