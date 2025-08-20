import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Brain, Target, Users2, BarChart3 } from "lucide-react";

// =========================================================
// 27卒向け LP – 高解像度UI（2025 toCトレンド準拠）
// 参考にした潮流：大胆タイポ＋余白、静かなグラデ＋ノイズ、
// マイクロインタラクション、ベントーグリッド、比較表、
// モバイルの下部固定CTA、アクセシビリティ配慮。
// =========================================================

export const metadata: Metadata = {
  title: "27卒向け｜アルバイト・長期インターン経験を武器に就活 | 学生転職 × IPO大学",
  description:
    "27卒向け。アルバイト・長期インターンの実績を“職務経歴”として見せ、合う企業から逆スカウト。IPO大学で成果物化→学生転職でオファー直結。登録1分、学生は無料。",
  alternates: {
    canonical: "https://gakuten.co.jp/lp/students/27",
  },
  openGraph: {
    title: "27卒向け｜アルバイト・長期インターン経験を武器に就活 | 学生転職 × IPO大学",
    description:
      "27卒向け。アルバイト・長期インターンの実績を“職務経歴”として見せ、合う企業から逆スカウト。IPO大学で成果物化→学生転職でオファー直結。登録1分、学生は無料。",
    url: "https://gakuten.co.jp/lp/students/27",
    siteName: "学生転職 × IPO大学",
    type: "website",
    images: [
      {
        url: "/og/lp-students-27.png",
        width: 1200,
        height: 630,
        alt: "27卒向け 就活・長期インターンLP",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "27卒向け｜アルバイト・長期インターン経験を武器に就活 | 学生転職 × IPO大学",
    description:
      "27卒向け。アルバイト・長期インターンの実績を“職務経歴”として見せ、合う企業から逆スカウト。IPO大学で成果物化→学生転職でオファー直結。登録1分、学生は無料。",
    images: ["/og/lp-students-27.png"],
  },
  robots: { index: true, follow: true },
  themeColor: "#ffffff",
};

// ===== UI utils =====
function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

function Section({
  id,
  heading,
  sub,
  children,
  className = "",
}: {
  id?: string;
  heading?: string | React.ReactNode;
  sub?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      <Container>
        {heading ? (
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-sans tracking-tight leading-snug text-neutral-900">{heading}</h2>
            {sub ? <p className="mt-3 text-sm sm:text-base text-neutral-600 leading-relaxed">{sub}</p> : null}
          </div>
        ) : null}
        {children}
      </Container>
    </section>
  );
}

function CTAButton({
  href = "/signup",
  children = "無料会員登録（1分）",
  variant = "primary",
  ga = "click_signup",
  className = "",
}: {
  href?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary";
  ga?: string;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-6 py-3.5 min-h-11 text-sm sm:text-base font-semibold transition shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-blue-500 to-rose-500 text-white hover:from-blue-600 hover:to-rose-600"
      : "ring-1 ring-inset ring-blue-600 text-blue-700 hover:bg-blue-50";
  return (
    <Link href={href} data-ga={ga} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-[12px] text-neutral-600 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />
      {children}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs text-sky-700 shadow-sm">
      {children}
    </span>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[11px] text-neutral-500">{children}</p>;
}

function IllustrationSlot({
  label = "イラスト（差し替え）",
  src,
  alt = "",
  compact = false,
  bare = false,
  className = "",
}: {
  label?: string;
  src?: string;
  alt?: string;
  compact?: boolean;
  bare?: boolean;
  className?: string;
}) {
  const baseWhenSrc = compact
    ? "relative w-full aspect-[16/10] overflow-hidden rounded-lg ring-1 ring-neutral-200/60 shadow-sm bg-gradient-to-br from-neutral-50 via-white to-neutral-50 transition hover:shadow-md"
    : "relative aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-neutral-200/60 shadow-sm bg-gradient-to-br from-neutral-50 via-white to-neutral-50 transition hover:shadow-md";
  const baseWhenEmpty = compact
    ? "w-full aspect-[16/10] rounded-lg bg-gradient-to-br from-neutral-100 via-neutral-50 to-white ring-1 ring-neutral-200/60 flex items-center justify-center"
    : "aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-neutral-100 via-neutral-50 to-white ring-1 ring-neutral-200/60 flex items-center justify-center";

  // Frameless version
  const baseWhenBare = compact
    ? "relative w-full aspect-[16/10] overflow-hidden"
    : "relative w-full aspect-[4/3] overflow-hidden";

  if (src) {
    const wrapperClass = bare ? baseWhenBare : baseWhenSrc;
    const insetClass = bare ? "absolute inset-0" : "absolute inset-1.5 md:inset-2";
    return (
      <div className={`${wrapperClass} ${className}`}>
        <div className={insetClass}>
          <Image
            src={src}
            alt={alt || label}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
            loading="lazy"
          />
        </div>
      </div>
    );
  }
  return (
    <div className={`${bare ? baseWhenBare : baseWhenEmpty} ${className}`}>
      {!bare && (
        <div className={`rounded-lg border-2 border-dashed border-neutral-300/70 px-3 py-1.5 ${compact ? "text-[11px]" : "text-[12px]"} text-neutral-500`}>
          {label}
        </div>
      )}
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M20 7L9 18l-5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FloatingChip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`absolute rounded-full bg-white/90 text-neutral-800 text-[11px] px-2.5 py-1 shadow-sm ring-1 ring-neutral-200/70 ${className}`}>
      {children}
    </span>
  );
}

function HeroVisual({ src, alt = "アプリのUIプレビュー" }: { src?: string; alt?: string }) {
  return (
    <div className="relative w-full aspect-[16/10] md:aspect-[4/3] lg:aspect-[3/2]">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 40vw"
          priority
          fetchPriority="high"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-[12px] text-neutral-500">
          UIキャプチャ（後日差し替え）
        </div>
      )}
    </div>
  );
}

function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "今からでも間に合いますか？", "acceptedAnswer": { "@type": "Answer", "text": "診断→ES→ケース→スカウトの順で、まず1週間で土台を作れます。以降は週次で振り返りと改善を回していきます。" } },
      { "@type": "Question", "name": "難関志望でも使えますか？", "acceptedAnswer": { "@type": "Answer", "text": "ケース/PM/データ演習と面接練習で解像度を上げます。ポートフォリオや逆質問の作り込みまで伴走します。" } },
      { "@type": "Question", "name": "費用はかかりますか？", "acceptedAnswer": { "@type": "Answer", "text": "学生は無料です。追加費用はありません。" } },
      { "@type": "Question", "name": "対象となる学生は？", "acceptedAnswer": { "@type": "Answer", "text": "長期インターン/アルバイトの経験がある方はもちろん、これから経験を積みたい方も歓迎です。文理不問・地方在住でも利用可能です。" } },
      { "@type": "Question", "name": "スカウトはどれくらいで届きますか？", "acceptedAnswer": { "@type": "Answer", "text": "プロフィールの完成度により異なりますが、完成後1〜2週間で届き始めるケースが多いです（成果を保証するものではありません）。" } },
      { "@type": "Question", "name": "個人情報の扱いは？", "acceptedAnswer": { "@type": "Answer", "text": "厳重に管理し、マッチング以外の目的には利用しません。氏名の非公開設定や、いつでもデータの削除が可能です。" } }
    ]
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

// ===== Page =====
export default function Page() {
  // IllustrationTile helper component
  const IllustrationTile: React.FC<{
    title: string;
    description: string;
    src?: string;
    icon?: React.ElementType;
    accent?: string; // e.g. "from-sky-500 to-cyan-600"
  }> = ({ title, description, src, icon: Icon, accent = "from-sky-500 to-cyan-600" }) => {
    return (
      <div className="h-full rounded-2xl bg-white/80 ring-1 ring-gray-200/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden rounded-xl ring-1 ring-gray-200/60 bg-gradient-to-br from-gray-50 to-white">
          {src ? (
            <Image
              src={src}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-r ${accent}`}>
              {Icon ? <Icon className="w-10 h-10 text-white drop-shadow" /> : null}
            </div>
          )}
        </div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    );
  };

  return (
    <main className="bg-white text-neutral-900 min-h-screen">
      <a href="#hero" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-white/90 focus:px-3 focus:py-2 focus:shadow focus:outline-none">本編へスキップ</a>
      <StructuredData />
      {/* Background: soft radial + noise for“AIっぽさ”脱却 */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(1200px_420px_at_50%_-60%,rgba(37,99,235,0.16),transparent_60%),radial-gradient(900px_300px_at_80%_0%,rgba(244,63,94,0.14),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\' viewBox=\'0 0 40 40\'><g fill=\'%23AAAAAA\' fill-opacity=\'0.4\'><circle cx=\'1\' cy=\'1\' r=\'1\'/></g></svg>')] [background-size:160px_160px]" />
      </div>

      {/* Announcement Bar */}
      <div className="w-full bg-gradient-to-r from-blue-600 via-sky-500 to-rose-500 text-white md:hidden">
        <Container className="flex h-10 items-center justify-between gap-4 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">🎓</span>
            <span className="opacity-95">学生向けサポートが充実。はじめてでも安心。</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <Link href="#faq" className="underline underline-offset-2">よくある質問</Link>
            <span className="opacity-60">|</span>
            <Link href="/login" className="underline underline-offset-2">ログイン</Link>
          </div>
        </Container>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur shadow-sm">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" className="font-sans text-lg sm:text-xl tracking-tight" aria-label="IPO大学 × 学生転職">
            <span className="text-neutral-900">IPO大学</span>
            <span className="mx-2 text-neutral-400">×</span>
            <span className="text-neutral-900">学生転職</span>
          </Link>
          <nav aria-label="主要" className="hidden md:flex items-center gap-6 text-sm text-neutral-700">
            <Link href="#about" className="hover:text-neutral-900">サービス紹介</Link>
            <Link href="#voices" className="hover:text-neutral-900">体験談</Link>
            <Link href="#compare" className="hover:text-neutral-900">他社との違い</Link>
            <Link href="#faq" className="hover:text-neutral-900">FAQ</Link>
            <Link href="/login" className="hover:text-neutral-900">ログイン</Link>
            <CTAButton href="/signup" variant="primary" ga="click_signup_header">新規登録（1分）</CTAButton>
          </nav>
        </Container>
      </header>

      {/* Hero – dynamic type + card stack visual */}
      <Section id="hero" className="pt-10 md:pt-16 pb-8 md:pb-14">
        <div className="grid items-center gap-10 md:grid-cols-12">
          <div className="md:col-span-6 lg:col-span-5" data-ga="view_hero">
            <Kicker>27卒向け / 就活・長期インターン</Kicker>
            <h1 className="mt-4 text-[32px] sm:text-5xl md:text-6xl font-sans leading-[1.12] tracking-tight">
              <span className="block">長期インターン</span>
              <span className="block">バイトの経験を、</span>
              <span className="block text-rose-700">就活の武器に。</span>
              <span className="mt-2 block text-neutral-800 text-xl sm:text-2xl md:text-[26px] font-normal">ハイキャリア就活サービス</span>
            </h1>
            <p className="mt-6 text-neutral-600 max-w-2xl leading-relaxed">
              長期インターン/アルバイトの実務を“職務経歴書”として整理。<br />
              IPO大学で自己分析→プロフィールに同期し、スカウト/選考へつなげます。
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <CTAButton href="/signup" variant="primary" ga="click_signup_hero">新規登録（1分）</CTAButton>
              <CTAButton href="#about" variant="secondary" ga="click_more_hero">サービスを見る</CTAButton>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Pill>登録1分</Pill>
              <Pill>学生は無料</Pill>
              <Pill>非公開求人あり</Pill>
              <Pill>個人情報は厳重管理</Pill>
            </div>
            <Note>※ 登録は無料です。登録後、プロフィールはいつでも編集できます。</Note>
          </div>
          <div className="md:col-span-6 lg:col-span-7">
            <HeroVisual src="/gakutentop.png" alt="アプリのUIプレビュー" />
          </div>
        </div>
      </Section>

      {/* 学生向けのポイント（イラスト差し替え想定・飽きない変化） */}
      <Section
        id="student-points"
        heading={
          <>
            <span className="block text-[11px] sm:text-xs font-semibold tracking-wider text-rose-600 uppercase">POINT</span>
            <span className="relative inline-block mt-1">
              <span className="relative z-10">
                <span className="bg-gradient-to-r from-rose-600 to-blue-600 bg-clip-text text-transparent">長期インターン・アルバイト</span>
                <span className="text-neutral-900">経験を最大化</span>
              </span>
              <span aria-hidden className="absolute left-0 right-0 -bottom-1 h-2 rounded bg-rose-100/70"></span>
            </span>
          </>
        }
        sub="経験を成果物・数値・役割で見せ、逆スカウトに直結。"
        className="py-8 md:py-10"
      >
        {/* 3列×上段、2列×下段のバランス配置（12分割グリッド） */}
        <div className="grid gap-3 md:gap-4 md:grid-cols-12">
          {/* 1 */}
          <div className="md:col-span-4 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <IllustrationSlot src="/offer.png" alt="企業からのオファー" compact className="" />
              <h3 className="mt-3 text-base font-semibold text-neutral-900">経験起点の逆スカウトに強い</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">バイト/インターンの実績を明快に可視化。あなたに合う企業からの連絡が増えます。</p>
            </div>
          </div>
          {/* 2 */}
          <div className="md:col-span-4 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <IllustrationSlot src="/selfpr.png" alt="自己PR・成果物" compact className="max-h-56 md:max-h-64" />
              <h3 className="mt-3 text-base font-semibold text-neutral-900">“自分らしさ”と成果が伝わるプロフィール</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">役割・成果・学びを言語化し、強みをまっすぐ届けます。</p>
              <ul className="mt-2.5 space-y-1.5 text-[13px] text-neutral-600">
              </ul>
            </div>
          </div>
          {/* 3 */}
          <div className="md:col-span-4 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <IllustrationSlot src="/AI.png" alt="AIで就活をサポート" compact />
              <h3 className="mt-3 text-base font-semibold text-neutral-900">AIで就活をサポート</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">棚卸し→数値化→言語化まで、AIとメンターが伴走。</p>
            </div>
          </div>
          {/* 4 */}
          <div className="md:col-span-6 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <h3 className="text-base font-semibold text-neutral-900">内定まで一直線の伴走</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">経験起点で、選考対策→面接→内定まで一気通貫で支援します。</p>
              <div className="mt-2.5"><IllustrationSlot src="/get.png" alt="面接・内定" compact className="w-full" /></div>
            </div>
          </div>
          {/* 5 */}
          <div className="md:col-span-6 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <IllustrationSlot src="/long.png" alt="長期インターンを武器化" compact className="w-full" />
              <h3 className="mt-3 text-base font-semibold text-neutral-900">長期インターンを武器化</h3>
              <p className="mt-1 text-sm text-neutral-600 leading-relaxed">実務経験を“職務経歴”として明快に提示できます。</p>
            </div>
          </div>
        </div>
      </Section>


      {/* Context / Flow */}
      <Section
        id="about"
        heading={
          <>
            経験を<span className="text-rose-700">“職務経歴書”</span>に書いて、あなただけのスカウトが。
          </>
        }
        sub="アルバイト・長期インターンの経験を“職務経歴”として提示し、あなただけのスカウトを受け取りましょう。"
        className="py-12 md:py-16 bg-white"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "経験を“職務経歴”に", body: "長期インターン等の実務を、職務経歴として端的に言語化。採用担当に「任せられること」を伝えます。" },
            { title: "IPO大学で鍛え・形にする", body: "経験・自己分析・演習を一元管理。面談対策やケース対策までこの場で完結。" },
            { title: "学生転職で掴む", body: "経験×適性マッチで逆スカウト/イベントを優先表示。内定まで伴走します。" },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <h3 className="text-lg font-semibold text-neutral-900">{c.title}</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <CTAButton href="/signup" ga="click_signup_about" />
        </div>
      </Section>

      {/* Training (育成) — 半分が写真、半分が「何ができるか」 */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid gap-8 md:gap-10 md:grid-cols-2 items-center">
            {/* Left: Photo / Illustration (差し替え想定) */}
            <div className="relative">
              <div className="relative w-full overflow-hidden aspect-[16/10] md:aspect-[4/3]">
                {/* 画像があれば表示、なければプレースホルダー */}
                <Image
                  src="/iposmartphone.png"
                  alt="IPO大学の学習・成果物イメージ"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>

            {/* Right: What you can do（何ができるか） */}
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                IPO大学：<span className="text-rose-600">実力を、成果物で示す。</span>
              </h2>
              <p className="mt-3 text-neutral-600">
                「まず何ができるのか」を直感的に伝えるため、画像と要点テキストを左右に配置。5分で始められ、プロフィールへワンクリック同期できます。
              </p>

              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900">AI×自己分析 / ES作成</p>
                    <p className="text-sm text-neutral-600 mt-0.5">5問の棚卸しからES/ガクチカ案を自動生成。AI添削で素早く仕上げます。</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900">ケース / PM / データ演習</p>
                    <p className="text-sm text-neutral-600 mt-0.5">毎日10分の積み上げで、選考で差がつく解像度を育てます。</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900">メンタリング</p>
                    <p className="text-sm text-neutral-600 mt-0.5">先輩レビューで完成度を引き上げ、弱点を素早く補強。</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900">成果の見える化</p>
                    <p className="text-sm text-neutral-600 mt-0.5">ポートフォリオを1クリックでプロフィールに同期。逆スカウトへ直結します。</p>
                  </div>
                </li>
              </ul>

              <div className="mt-6">
                <CTAButton href="/signup" ga="click_signup_training_halfhalf">新規登録（1分）</CTAButton>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Compare – 他社との違い */}
      <Section id="compare" heading="他サービスとの比較" sub="年収レンジ・非公開枠・スカウト精度・伴走で比較。" className="py-12 md:py-16 bg-neutral-50">
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] table-fixed text-xs sm:text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold sticky left-0 bg-neutral-50">項目</th>
                <th scope="col" className="px-4 py-3.5 text-center font-semibold">学生転職 × IPO大学</th>
                <th scope="col" className="px-4 py-3.5 text-center font-semibold">一般的な就活サイトA</th>
                <th scope="col" className="px-4 py-3.5 text-center font-semibold">一般的な就活サイトB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[
                { k: "年収レンジ・上限", a: "上限なし。実績ベースで高年収オファー可（1,000万円超の実例あり）", b: "新卒相場中心", c: "新卒相場中心" },
                { k: "非公開求人/特別選考", a: "スタートアップ/難関の非公開枠あり（イベント招待含む）", b: "限定枠は少ない", c: "限定枠は基本なし" },
                { k: "逆スカウトの精度", a: "経験×価値観×適性で高精度にマッチ", b: "一括DMが中心", c: "露出順依存" },
                { k: "サポート体制", a: "経験の可視化→成果物→ES→面接対策をワンストップで提供", b: "ESテンプレ配布止まり", c: "面接対策は別サービス" },
                { k: "学習/伴走", a: "IPO大学と双方向同期（演習・メンタリング）", b: "学習機能なし", c: "外部講座を別料金" }
              ].map((r) => (
                <tr key={r.k} className="odd:bg-neutral-50/40">
                  <th scope="row" className="px-4 py-4 text-neutral-800 font-medium sticky left-0 bg-white">{r.k}</th>
                  <td className="px-4 py-4 text-rose-700 font-semibold bg-rose-50">{r.a}</td>
                  <td className="px-4 py-4 text-neutral-700 text-center">{r.b}</td>
                  <td className="px-4 py-4 text-neutral-700 text-center">{r.c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>



      {/* 使い方（3ステップ） → ビジュアル重視レイアウト */}
      <Section id="how" heading="簡単3ステップ" sub="数分で始められる、シンプルで効果的なプロセス" className="py-12 md:py-16">
        <div className="space-y-10 md:space-y-14">
          {/* Step 01 */}
          <div className="grid gap-6 md:grid-cols-12 items-center">
            <div className="md:col-span-5 order-2 md:order-1">
              <div className="inline-flex items-center gap-2 text-rose-700 font-semibold">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white text-sm font-bold">01</span>
                <span className="text-sm uppercase tracking-wide">無料登録</span>
              </div>
              <h3 className="mt-2 text-xl font-semibold text-neutral-900">無料会員登録（1分）</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                メール / Google / Appleでかんたん登録。まずは市場価値を確認しましょう。
              </p>
              <div className="mt-4"><CTAButton href="/signup" ga="click_signup_how_v2">新規登録（1分）</CTAButton></div>
            </div>
            <div className="md:col-span-7 order-1 md:order-2">
              <IllustrationSlot src="/enroll.png" alt="登録フォームのイメージ" compact bare className="w-full" />
            </div>
          </div>

          {/* Step 02 */}
          <div className="grid gap-6 md:grid-cols-12 items-center">
            <div className="md:col-span-7">
              <IllustrationSlot src="/resume.png" alt="経験の可視化（レジュメ）" compact bare className="w-full" />
            </div>
            <div className="md:col-span-5">
              <div className="inline-flex items-center gap-2 text-rose-700 font-semibold">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white text-sm font-bold">02</span>
                <span className="text-sm uppercase tracking-wide">経験を可視化</span>
              </div>
              <h3 className="mt-2 text-xl font-semibold text-neutral-900">棚卸し→成果物→プロフィールに同期</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                IPO大学で自己分析・ケース・ESをまとめて作成。成果物はワンクリックでプロフィールに同期できます。
              </p>
            </div>
          </div>

          {/* Step 03 */}
          <div className="grid gap-6 md:grid-cols-12 items-center">
            <div className="md:col-span-5 order-2 md:order-1">
              <div className="inline-flex items-center gap-2 text-rose-700 font-semibold">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white text-sm font-bold">03</span>
                <span className="text-sm uppercase tracking-wide">スカウト&選考</span>
              </div>
              <h3 className="mt-2 text-xl font-semibold text-neutral-900">学生転職でスカウト / 選考</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                経験×適性マッチで逆スカウト。ES添削や面接練も同じ画面で進められ、内定まで伴走します。
              </p>
            </div>
            <div className="md:col-span-7 order-1 md:order-2">
              <IllustrationSlot src="/scout.png" alt="スカウト・内定の流れ" compact bare className="w-full" />
            </div>
          </div>
        </div>
        <div className="mt-10">
          <CTAButton href="/signup" ga="click_signup_how_bottom" />
        </div>
      </Section>

      {/* 導入・利用企業一覧 */}
      <Section
        id="companies"
        heading="導入企業・利用企業（一例）"
        sub="非公開求人・特別選考枠も多数ご用意。"
        className="py-12 md:py-16 bg-neutral-50"
      >
        <div className="rounded-xl border border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              "salesmarker.png",
              "geniee.jpg",
              "ma.png",
              "データX.png",
              "yappli.png",
              "sansan.png",
            ].map((file, i) => {
              const alt = file.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
              return (
                <div key={i} className="flex h-14 items-center justify-center rounded-md border border-neutral-200 bg-white">
                  <Image
                    src={`/logo/${file}`}
                    alt={alt}
                    width={160}
                    height={48}
                    className="object-contain max-h-10 w-auto"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* 体験談（読みごたえ重視・文章量を増やす） */}
      <Section id="voices" heading="体験談" className="py-12 md:py-16 bg-neutral-50">
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-4 snap-x snap-mandatory px-1">
            {[
              {
                name: "慶應 / 文",
                quote:
                  "ケース面接の練習で“問いの立て方”が分かり、逆質問の質が一段上がりました。面接官からも『論点の整理が速いね』と言われ、最終面接では自分の経験と結び付けて語れるように。",
                detail:
                  "結果：2週間で通過率が上がり、第一志望群から内定。弱点の“抽象→具体”を毎日10分で矯正できたのが効きました。",
              },
              {
                name: "関関同立 / 理",
                quote:
                  "アルバイトで改善した施策を“成果物”として数値付きで整理。売上+18%の根拠や再現条件を可視化したところ、スカウト文面が明らかに具体的になり、面談の深さも変わりました。",
                detail:
                  "結果：スカウト受信が月6件→18件に増加。うち3社が特別選考に直結し、希望ポジションで最終へ。",
              },
              {
                name: "地方国立 / 文",
                quote:
                  "長期インターンでの“責任者補佐”経験を役割・KPI・学びで整理。『何を任せられるか』が伝わるようになり、面接の逆質問でも“入社後の価値”を示せました。",
                detail:
                  "結果：内定獲得。入社後に求められるアウトプット像まで擦り合わせたことで、配属のミスマッチ不安も解消。",
              },
              {
                name: "MARCH / 情報",
                quote:
                  "ESは“経験の棚卸し→言語化テンプレ→AI添削”で回す運用に。毎回0から書かずに済み、面接準備へ時間を回せました。『一貫性がある』と言われたのは初めてです。",
                detail:
                  "結果：通過率が上がり、志望度の高い企業の面接に集中できた。",
              },
            ].map((v, i) => (
              <figure
                key={i}
                className="min-w-[300px] sm:min-w-[360px] md:min-w-[420px] snap-start rounded-2xl bg-white ring-1 ring-neutral-200/70 p-6 shadow-sm"
              >
                <blockquote className="text-[15px] leading-relaxed text-neutral-900">
                  <span aria-hidden className="mr-1 text-rose-600">“</span>
                  {v.quote}
                  <span aria-hidden className="ml-1 text-rose-600">”</span>
                </blockquote>
                <p className="mt-3 text-[13px] leading-relaxed text-neutral-600">{v.detail}</p>
                <figcaption className="mt-3 text-xs text-neutral-500">— {v.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        <p className="sr-only">※個人の感想であり、成果を保証するものではありません。</p>
      </Section>

      {/* FAQ */}
      <Section id="faq" heading="FAQ" className="py-12 md:py-20 bg-neutral-50">
        <div className="space-y-4">
          {[
            { q: "今からでも間に合いますか？", a: "はい。診断→ES→ケース→スカウトの順で、まず1週間で土台を作れます。以降は週次レビューで改善を回し、強みの言語化と選考対策を同時並行で進めます。" },
            { q: "難関志望でも使えますか？", a: "使えます。ケース/PM/データ演習と模擬面接で解像度を上げ、ポートフォリオや逆質問の作り込みまで伴走します。" },
            { q: "費用はかかりますか？", a: "学生は無料です。登録・利用に追加費用はかかりません。" },
            { q: "対象となる学生は？", a: "長期インターンやアルバイトの実務経験を活かしたい方、これから経験を積みたい方のどちらも対象です。文理不問・地方在住でも問題ありません。" },
            { q: "スカウトはどれくらいで届きますか？", a: "プロフィールの完成度によりますが、完成後1〜2週間で届き始める事例が多いです。件数や選考通過は保証できませんが、改善のためのフィードバックを提供します。" },
            { q: "個人情報の扱いは？", a: "厳重に管理し、マッチング以外の目的には利用しません。氏名の非公開設定や、アカウント設定からのデータ削除もいつでも可能です。" }
          ].map((f) => (
            <details key={f.q} className="group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer list-none font-medium text-neutral-900">{f.q}</summary>
              <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Closing CTA */}
      <Section id="closing" className="pb-28 md:pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-600 to-pink-500 p-8 text-center text-white shadow-md">
          <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-sans tracking-tight">アルバイト・長期インターンの経験から、今日“就活の武器化”を始めましょう。</h2>
          <p className="mt-3 text-blue-50">登録は1分。経験を成果物にして、合う企業からの逆スカウトへつなげましょう。</p>
          <div className="mt-6 flex justify-center">
            <CTAButton href="/signup" variant="primary" ga="click_signup_closing" className="">新規登録（1分）</CTAButton>
          </div>
        </div>
      </Section>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden">
        <Container className="py-3">
          <CTAButton className="w-full" href="/signup" variant="primary" ga="click_signup_sticky">新規登録（1分）</CTAButton>
          <div className="mt-2 text-center text-sm">
            <Link href="/login" className="underline underline-offset-2 text-neutral-700" data-ga="click_login_sticky_text">ログイン</Link>
          </div>
        </Container>
      </div>

      <footer className="border-t border-neutral-200 bg-white">
        <Container className="py-8 text-xs text-neutral-500">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/terms" className="hover:text-neutral-700">利用規約</Link>
            <span className="text-neutral-300">|</span>
            <Link href="/privacy" className="hover:text-neutral-700">プライバシーポリシー</Link>
            <span className="text-neutral-300">|</span>
            <Link href="/law" className="hover:text-neutral-700">特定商取引法に基づく表示</Link>
            <span className="ml-auto">© {new Date().getFullYear()} Make Culture Inc.</span>
          </div>
        </Container>
      </footer>
    </main>
  );
}