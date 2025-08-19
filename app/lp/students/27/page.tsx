import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

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
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif tracking-tight leading-snug text-neutral-900">{heading}</h2>
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
  className = "",
}: {
  label?: string;
  src?: string;
  alt?: string;
  compact?: boolean;
  className?: string;
}) {
  const baseWhenSrc = compact
    ? "relative w-full aspect-[16/10] overflow-hidden rounded-lg ring-1 ring-neutral-200/60 shadow-sm bg-gradient-to-br from-neutral-50 via-white to-neutral-50 transition hover:shadow-md"
    : "relative aspect-[4/3] w-full overflow-hidden rounded-xl ring-1 ring-neutral-200/60 shadow-sm bg-gradient-to-br from-neutral-50 via-white to-neutral-50 transition hover:shadow-md";
  const baseWhenEmpty = compact
    ? "w-full aspect-[16/10] rounded-lg bg-gradient-to-br from-neutral-100 via-neutral-50 to-white ring-1 ring-neutral-200/60 flex items-center justify-center"
    : "aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-neutral-100 via-neutral-50 to-white ring-1 ring-neutral-200/60 flex items-center justify-center";

  if (src) {
    return (
      <div className={`${baseWhenSrc} ${className}`}>
        {/* padded box for object-contain so画像が切れない */}
        <div className="absolute inset-1.5 md:inset-2">
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
    <div className={`${baseWhenEmpty} ${className}`}>
      <div className={`rounded-lg border-2 border-dashed border-neutral-300/70 px-3 py-1.5 ${compact ? "text-[11px]" : "text-[12px]"} text-neutral-500`}>
        {label}
      </div>
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
      { "@type": "Question", "name": "今からでも間に合いますか？", "acceptedAnswer": { "@type": "Answer", "text": "診断→ES→ケース→スカウトの順で、まず1週間で土台を作れます。週次で進捗の見える化も可能です。" } },
      { "@type": "Question", "name": "難関志望でも使えますか？", "acceptedAnswer": { "@type": "Answer", "text": "高難度の課題と面接練で、解像度を上げて底上げします。" } },
      { "@type": "Question", "name": "費用はかかりますか？", "acceptedAnswer": { "@type": "Answer", "text": "学生は無料です。追加費用はありません。" } }
    ]
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

// ===== Page =====
export default function Page() {
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
            <span className="opacity-95">学生向けサポートが充実。はじめてでも安心です。</span>
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
          <Link href="/" className="font-serif text-lg sm:text-xl tracking-tight" aria-label="IPO大学 × 学生転職">
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
            <h1 className="mt-4 text-[32px] sm:text-5xl md:text-6xl font-serif leading-[1.12] tracking-tight">
              <span className="block">バイト・長期インターンの経験を、<span className="text-rose-700">就活の武器に。</span></span>
              <span className="mt-2 block text-neutral-800 text-xl sm:text-2xl md:text-[26px] font-normal">年収・オファーポジションに上限なし。ハイキャリア就活。</span>
            </h1>
            <p className="mt-6 text-neutral-600 max-w-2xl leading-relaxed">
              あなたの実務経験を”職務経歴書”に書き起こして、企業人事からヘッドハンティングされる時代。<br />
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <CTAButton href="/signup" variant="primary" ga="click_signup_hero">新規登録（1分）</CTAButton>
              <CTAButton href="#about" variant="secondary" ga="click_more_hero">サービスを見る</CTAButton>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Pill>学生は無料</Pill>
              <Pill>個人情報は厳重管理</Pill>
            </div>
            <Note>※ 登録は無料です。登録後、プロフィールはいつでも編集できます。</Note>
          </div>
          <div className="md:col-span-6 lg:col-span-7">
            <HeroVisual src="/gakutentop.png" alt="アプリのUIプレビュー" />
          </div>
        </div>

        {/* USP band */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { t: "合う企業から届く", d: "価値観・適性＋経験ベースの逆スカウト" },
            { t: "年収1,000万円以上のオファーも", d: "オファー額の上限なし。学生時代の実績が正当に評価される" },
            { t: "AIで強みを可視化", d: "自己発見をサポート。言語化・数値化まで最短ルート" },
          ].map((c) => (
            <div
              key={c.t}
              role="group"
              tabIndex={0}
              aria-label={`${c.t} — ${c.d}`}
              className="group relative overflow-hidden rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-neutral-200/60 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              {/* subtle hover highlight */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50/0 via-rose-50/0 to-rose-50/40 opacity-0 transition-opacity group-hover:opacity-100"
              />
              <div className="relative flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/10 text-blue-700 ring-1 ring-blue-200/40">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-snug text-neutral-900">{c.t}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{c.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 学生向けのポイント（イラスト差し替え想定・飽きない変化） */}
      <Section id="student-points" heading="アルバイト・長期インターン経験を最大化" sub="経験を成果物・数値・役割で見せ、逆スカウトに直結。イラストは後から差し替え可能です。" className="py-8 md:py-10">
        {/* 3列×上段、2列×下段のバランス配置（12分割グリッド） */}
        <div className="grid gap-3 md:gap-4 md:grid-cols-12">
          {/* 1 */}
          <div className="md:col-span-4 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <IllustrationSlot src="/offer.png" alt="企業からのオファー" compact className="" />
              <h3 className="mt-3 text-base font-semibold text-neutral-900">経験ベースの逆スカウトに強い</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">バイト/インターンの実績を明快に見せると、あなたに合う企業からの連絡が増えます。</p>
            </div>
          </div>
          {/* 2 */}
          <div className="md:col-span-4 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <IllustrationSlot src="/selfpr.png" alt="自己PR・成果物" compact className="max-h-56 md:max-h-64" />
              <h3 className="mt-3 text-base font-semibold text-neutral-900">“自分らしさ”と成果が伝わる</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">バイト/インターンの役割・成果・学びを言語化し、強みをまっすぐ届けます。</p>
              <ul className="mt-2.5 space-y-1.5 text-[13px] text-neutral-600">
              </ul>
            </div>
          </div>
          {/* 3 */}
          <div className="md:col-span-4 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <IllustrationSlot src="/AI.png" alt="AIで就活をサポート" compact />
              <h3 className="mt-3 text-base font-semibold text-neutral-900">AIで就活をサポート</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">経験の棚卸し→数値化→言語化まで、AIとメンターが伴走。</p>
            </div>
          </div>
          {/* 4 */}
          <div className="md:col-span-6 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <h3 className="text-base font-semibold text-neutral-900">内定まで伴走</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">経験起点で、選考対策→面接→内定まで一気通貫で支援。</p>
              <div className="mt-2.5"><IllustrationSlot src="/get.png" alt="面接・内定" compact className="w-full" /></div>
            </div>
          </div>
          {/* 5 */}
          <div className="md:col-span-6 self-stretch">
            <div className="h-full rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 p-3 shadow-sm flex flex-col">
              <IllustrationSlot src="/long.png" alt="長期インターンを武器化" compact className="w-full" />
              <h3 className="mt-3 text-base font-semibold text-neutral-900">長期インターンを武器化</h3>
              <p className="mt-1 text-sm text-neutral-600 leading-relaxed">実務経験を“職務経歴”として明快に提示。</p>
            </div>
          </div>
        </div>
      </Section>


      {/* Context / Flow */}
      <Section
        id="about"
        heading={
          <>
            経験を<span className="text-rose-700">“成果物化”</span>して、逆スカウトへ直結。
          </>
        }
        sub="バイト/長期インターンの棚卸し → 成果物/ポートフォリオ → ES/ガクチカ → 面接練 → 逆スカウト。就活の日本的文脈に合わせて迷わず進めます。"
        className="py-12 md:py-16 bg-white"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "経験を“職務経歴”に", body: "役割・成果・数値を棚卸しし、ES/ガクチカの一次稿まで自動生成。まずは形に。" },
            { title: "IPO大学で鍛え・形にする", body: "ケース/PM/データの演習とメンタリングで、経験を“語れる成果物”に。" },
            { title: "学生転職で掴む", body: "経験×適性マッチで逆スカウト/イベントを優先表示。内定まで伴走。" },
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

      {/* Compare – 他社との違い */}
      <Section id="compare" heading="他サービスとの比較" sub="“わかりやすさ・導線・伴走”を、就活文脈で最適化。" className="py-12 md:py-16 bg-neutral-50">
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
                { k: "導線のわかりやすさ", a: "日本語UI・3ステップ", b: "情報量が多く迷いやすい", c: "スマホ最適化が弱いことも" },
                { k: "“出せる形”まで", a: "経験の棚卸し→成果物→ES→面接練まで一気通貫", b: "ESテンプレ配布止まり", c: "面接対策は別サービス" },
                { k: "スカウトの質", a: "価値観・適性マッチで逆スカウト優先", b: "一括DMが中心", c: "露出順依存" },
                { k: "学習との連携", a: "IPO大学の演習・メンタリングと同期", b: "学習機能なし", c: "外部講座を別料金" },
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

      {/* IPO大学（育成） */}
      <Section id="training" heading={<span>IPO大学：<span className="text-rose-700">実力を、成果物で示す。</span></span>} className="py-12 md:py-16 bg-neutral-50">
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { h: "AI×自己分析/ES作成", p: "5問で経験の棚卸し→ES/ガクチカのたたき台を作成。仕上げはAI添削で素早く。" },
            { h: "ケース/PM/データ演習", p: "毎日10分の積み上げで、選考で差がつく解像度を育てます。" },
            { h: "メンタリング", p: "先輩レビューで成果物の完成度を引き上げます。" },
            { h: "成果の見える化", p: "ポートフォリオを1クリックでプロフィールに同期し、逆スカウトへ直結。" },
          ].map((c) => (
            <div key={c.h} className="rounded-xl border border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <h3 className="text-base font-semibold text-neutral-900">{c.h}</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{c.p}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 学生転職（機会） */}
      <Section id="opportunities" heading={<span>学生転職：<span className="text-rose-700">合う企業から届く、実力ベースのオファー。</span></span>} className="py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { h: "ミスマッチを減らす", p: "価値観・適性に基づくレコメンドで、無駄な応募を減らします。" },
            { h: "実務経験を武器化", p: "長期インターン/バイトの実績も“職務経歴”として伝わります。" },
            { h: "内定まで伴走", p: "スカウト→選考対策→面接→内定まで、一気通貫でサポート。" },
          ].map((c) => (
            <div key={c.h} className="rounded-xl border border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <h3 className="text-base font-semibold text-neutral-900">{c.h}</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{c.p}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 使い方（3ステップ） */}
      <Section id="how" heading="使い方（3ステップ）" className="py-12 md:py-16">
        <ol className="grid gap-6 md:grid-cols-3">
          {[
            "無料会員登録（1分）：メール/Google/Apple",
            "経験を可視化（IPO大学）：棚卸し→成果物→プロフィール同期",
            "学生転職でスカウト/選考：ES添削・面接練も",
          ].map((t, i) => (
            <li key={i} className="relative rounded-xl border border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="absolute -top-3 left-4 inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white text-sm font-bold shadow">{i + 1}</span>
              <p className="text-sm text-neutral-600 leading-relaxed">{t}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <CTAButton href="/signup" ga="click_signup_how" />
        </div>
      </Section>

      {/* 信頼・実績（ロゴと補足） */}
      <Section id="trust" heading="安心して使える理由" sub="日本の学生向けに、使いやすさと安全性を重視しています。" className="py-12 md:py-16 bg-neutral-50">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { h: "日本語UIで迷わない", p: "専門用語はかんたんな日本語に。初めてでも操作に迷いません。" },
            { h: "個人情報の厳重管理", p: "認証やデータ管理は最新のベストプラクティスに基づき運用。" },
          ].map((c) => (
            <div key={c.h} className="rounded-xl border border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <h3 className="text-base font-semibold text-neutral-900">{c.h}</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{c.p}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-xl border border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
          <p className="text-xs text-neutral-500">※ 掲載企業ロゴ（例）：コンサル/IT/スタートアップ 等（実際のロゴは後日差し替え）</p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md border border-neutral-200 bg-neutral-50" />
            ))}
          </div>
        </div>
      </Section>

      {/* 体験談（横スクロールで飽きにくく） */}
      <Section id="voices" heading="体験談" className="py-12 md:py-16 bg-neutral-50">
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-4 snap-x snap-mandatory px-1">
            {[
              { name: "慶應 / 文", quote: "ケース練で逆質問の質が上がり、内定に直結しました。" },
              { name: "関関同立 / 理", quote: "バイトの売上改善を成果物化→スカウトが増えました。" },
              { name: "地方国立 / 文", quote: "長期インターンで責任者補佐→そのまま内定に。" },
              { name: "MARCH / 情報", quote: "ESの言語化が早くなり、面接での一貫性が出ました。" },
            ].map((v, i) => (
              <figure key={i} className="min-w-[280px] sm:min-w-[340px] md:min-w-[380px] snap-start rounded-2xl bg-white/80 ring-1 ring-neutral-200/60 p-6 shadow-sm">
                <blockquote className="text-neutral-800">“{v.quote}”</blockquote>
                <figcaption className="mt-3 text-xs text-neutral-500">— {v.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Section>

      {/* 登録メリット */}
      <Section id="benefits" heading="登録メリット" className="py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            "経験→ES/ガクチカ：棚卸しテンプレ＋AI添削",
            "面接：想定問答の自動生成＋録画フィードバック",
            "ケース/PM/データ：経験とつなげて語れる演習",
            "ポートフォリオ：成果物をプロフィールに同期",
            "逆スカウト：合う求人・イベントを優先表示",
          ].map((t) => (
            <div key={t} className="rounded-xl border border-neutral-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-6 text-sm text-neutral-600 leading-relaxed shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              {t}
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" heading="FAQ" className="py-12 md:py-20 bg-neutral-50">
        <div className="space-y-4">
          {[
            { q: "今からでも間に合いますか？", a: "診断→ES→ケース→スカウトの順で、まず1週間で土台を作れます。週次で進捗の見える化も可能です。" },
            { q: "難関志望でも使えますか？", a: "高難度の課題と面接練で、解像度を上げて底上げします。" },
            { q: "費用はかかりますか？", a: "学生は無料です。追加費用はありません。" },
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
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif tracking-tight">アルバイト・長期インターンの経験から、今日“就活の武器化”を始めよう。</h2>
          <p className="mt-3 text-blue-50">登録は1分。経験を成果物にして、合う企業からの逆スカウトへ。</p>
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