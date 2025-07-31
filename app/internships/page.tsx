// app/internships/page.tsx
import Link from "next/link";
import Script from "next/script";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Briefcase, Globe, Rocket, Users } from "lucide-react";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Site root URL (set in .env as NEXT_PUBLIC_SITE_URL). Fallback to production root.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gakuten.co.jp";

export const metadata = {
  title: "学生転職 | 長期インターン",
  description:
    "長期インターンシップを探すなら学生転職。スタートアップから大手まで最新募集を掲載中。",
  keywords: [
    "長期インターン",
    "インターンシップ",
    "学生転職",
    "新卒採用",
    "就活",
    "スタートアップ求人",
  ],
  alternates: {
    canonical: `${siteUrl}/internships`,
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "学生転職 | 長期インターン",
    description:
      "長期インターンシップを探すなら学生転職。スタートアップから大手まで最新募集を掲載中。",
    url: `${siteUrl}/internships`,
    images: ["/ogp/internships.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "学生転職 | 長期インターン",
    description:
      "長期インターンシップを探すなら学生転職。スタートアップから大手まで最新募集を掲載中。",
    images: ["/ogp/internships.png"],
  },
};

/* ---------- Data ---------- */

const categories = [
  {
    label: "マーケティング",
    href: "/internships/jobs?category=marketing",
    icon: Globe,
  },
  {
    label: "エンジニア",
    href: "/internships/jobs?category=engineering",
    icon: Rocket,
  },
  {
    label: "営業",
    href: "/internships/jobs?category=sales",
    icon: Briefcase,
  },
  {
    label: "人事 / HR",
    href: "/internships/jobs?category=hr",
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

type SimpleJob = {
  id: string;
  title: string;
  company: { name: string; logo: string | null };
};

async function getLatestInternJobs(): Promise<SimpleJob[]> {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase
    .from("jobs")
    .select("id, title, company:companies(name, logo)")
    .eq("selection_type", "intern_long")
    .order("created_at", { ascending: false })
    .limit(6);
  return (data ?? []) as unknown as SimpleJob[];
}

/* ---------- Page ---------- */

export default async function InternshipTop() {
  const jobs = await getLatestInternJobs();

  return (
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
      {/* ---------- Hero ---------- */}
      <section className="relative isolate flex min-h-[90vh] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400">
        {/* Background image (optional) */}
        <Image
          src="/hero/internship.jpg"
          alt="インターンシップ募集サイトの背景画像"
          fill
          priority
          className="absolute inset-0 -z-10 h-full w-full object-cover scale-110 blur-sm opacity-40"
        />

        <div className="relative mx-auto max-w-5xl px-6 py-40 text-center text-white">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-lg">
            本気で成長したい学生のための
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-orange-500 to-orange-300 bg-clip-text text-transparent">
              長期インターン求人サイト
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-200">
            スタートアップからメガベンチャーまで。
            あなたの“挑戦したい”を叶えるポジションが見つかる。
          </p>
          {/* Quick search */}
          <form
            action="/internships/jobs"
            method="GET"
            className="mx-auto mt-8 flex max-w-xl overflow-hidden rounded-md bg-white shadow-sm"
          >
            <input
              type="text"
              name="q"
              placeholder="キーワードで検索（例：マーケティング）"
              className="w-full flex-1 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            <Button type="submit" className="rounded-none rounded-r-md">
              検索
            </Button>
          </form>
          <div className="mt-10 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/internships/jobs">求人を探す</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#how-it-works">はじめての方へ</Link>
            </Button>
          </div>
        </div>
        {/* Decorative wave */}
        <svg
          viewBox="0 0 1440 100"
          className="absolute bottom-[-1px] left-0 w-full text-background"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0,30 C360,90 1080,-60 1440,30 L1440,100 L0,100 Z"
          />
        </svg>
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

      {/* ---------- Latest Jobs ---------- */}
      <section className="container space-y-10 py-20">
        <h2 className="relative mx-auto w-max text-center text-3xl font-bold after:block after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-orange-500 after:content-['']">
          最新の長期インターン求人
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}?apply=1`}
              className="group flex flex-col justify-between gap-4 rounded-2xl bg-white/60 p-6 shadow-lg backdrop-blur-md transition-transform duration-300 hover:-translate-y-2 hover:bg-orange-500/10 hover:shadow-xl"
            >
              <div>
                {job.company.logo && (
                  <Image
                    src={job.company.logo}
                    alt={job.company.name}
                    width={64}
                    height={64}
                    className="mb-4 h-16 w-16 object-contain"
                  />
                )}
                <h3 className="text-lg font-semibold">{job.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{job.company.name}</p>
              </div>

              {/* Apply button */}
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-center transition-colors duration-300 group-hover:bg-orange-500 group-hover:text-white"
              >
                応募する
              </Button>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <Link href="/internships/jobs">すべての求人を見る</Link>
          </Button>
        </div>
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

        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <figure
              key={idx}
              className="rounded-lg bg-card p-6 shadow-sm transition hover:shadow-lg"
            >
              <blockquote className="text-sm leading-relaxed">
                &quot;このサイト経由で挑戦的なポジションに出会い、半年で内定直結の成果を
                出せました！&quot;
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <Image
                  src={`/avatars/student${idx}.jpg`}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                <div>
                  <div className="text-xs font-medium">早稲田大学 佐藤さん</div>
                  <div className="text-xs text-muted-foreground">
                    マーケティングインターン
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="bg-background py-12">
        <div className="container grid gap-8 text-center md:grid-cols-3">
          <div>
            <p className="text-4xl font-extrabold text-orange-500">1,200+</p>
            <p className="mt-2 text-sm text-muted-foreground">掲載求人数</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-orange-500">50,000+</p>
            <p className="mt-2 text-sm text-muted-foreground">利用学生数</p>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-orange-500">92%</p>
            <p className="mt-2 text-sm text-muted-foreground">平均マッチ率</p>
          </div>
        </div>
      </section>

      {/* Sticky CTA (mobile) */}
      <div className="fixed bottom-6 left-1/2 z-50 w-[92%] -translate-x-1/2 md:hidden">
        <div className="flex gap-3 rounded-2xl bg-orange-500 px-4 py-3 shadow-2xl">
          <Button asChild variant="link" className="flex-1 text-primary-foreground">
            <Link href="/internships/jobs">求人を探す</Link>
          </Button>
          <Button asChild variant="secondary" className="flex-1">
            <Link href="/internships/jobs?sort=new">新着をみる</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}