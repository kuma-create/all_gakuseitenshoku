"use client";
// NOTE: run `pnpm add chart.js react-chartjs-2` (or npm / yarn equiv.) before build
import dynamic from "next/dynamic";

// Dynamically import chart component to avoid SSR issues
const Pie = dynamic(() =>
  import("react-chartjs-2").then((m) => m.Pie),
  { ssr: false }
);
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

// Register needed chart elements once
ChartJS.register(ArcElement, Tooltip, Legend);
import { Button } from "@/components/ui/button";
import Head from "next/head";
import Image from "next/image";
import { motion, type Variants } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search,
  Users,
  Rocket,
  CalendarCheck,
  Badge,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  Briefcase,
} from "lucide-react";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

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

// MovieSection – short explainer video
function MovieSection() {
  return (
    <Section id="movie" className="py-20 bg-white">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Badge
            className="mb-4 bg-red-100 text-red-700 border-red-200 inline-block px-3 py-1 rounded-full text-xs font-semibold"
          >
            ABOUT
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-relaxed">
            <span className="bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
              学生転職
            </span>
            とは？
          </h2>
          <p className="text-gray-700 mb-8">
            学生転職は、職務経歴を持つ学生のみが登録できるハイキャリア新卒採用プラットフォームです。年収やポジションに縛られず
            今自社に本当に必要な人材をダイレクトヘッドハンティングすることが可能です。
          </p>
        </div>
        {/* Logo image instead of video placeholder */}
        <div className="relative w-full h-48 md:h-64 lg:h-72">
          <Image
            src="/logo.png"
            alt="学生転職ロゴ"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>
    </Section>
  );
}

/* ---------- FEATURES DATA & ANIMATION ---------- */
const features = [
  {
    Icon: Search,
    title: "職務経歴書を書いている学生のみ",
    text:
      "学生は履歴書に加え職務経歴書も登録。これまでの職歴やスキルを客観的に確認できます。",
    accent: "from-blue-600 to-indigo-600",
    number: "01",
  },
  {
    Icon: Users,
    title: "母集団形成からサポート",
    text:
      "企業様に合わせた最適な学生母集団の形成を専任チームが支援します。",
    accent: "from-purple-600 to-violet-600",
    number: "02",
  },
  {
    Icon: Rocket,
    title: "長期インターンから新卒採用まで一貫したフォロー",
    text:
      "インターン紹介『学転インターン』とナレッジサービスで新卒採用まで一気通貫。",
    accent: "from-orange-600 to-red-600",
    number: "03",
  },
  {
    Icon: CalendarCheck,
    title: "長期的な費用削減",
    text:
      "実務経験のある学生が多いため教育コストを抑え、採用コストを長期的に削減できます。",
    accent: "from-emerald-600 to-teal-600",
    number: "04",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 60, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};
/* ---------------------------------------------- */

/* ---------- DEMOGRAPHIC PIE CHART ---------- */
type PieDatum = { label: string; value: number };

function DemographicPie({
  title,
  data,
}: {
  title: string;
  data: PieDatum[];
}) {
  const pastelColors = [
    "#93c5fd", // blue-300
    "#60a5fa", // blue-400
    "#818cf8", // indigo-400
    "#a78bfa", // violet-400
    "#f0abfc", // fuchsia-300
    "#f9a8d4", // pink-300
    "#fca5a5", // red-300
  ];
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: pastelColors,
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-12">
      <h3 className="text-xl font-bold text-center mb-6">{title}</h3>
      <div className="relative w-full h-72">
        <Pie
          data={chartData}
          options={{
            plugins: { legend: { display: false } },
            maintainAspectRatio: false,
            responsive: true,
          }}
        />
      </div>
      {/* Legend with % */}
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {data.map((d, idx) => {
          const total = data.reduce((sum, cur) => sum + cur.value, 0);
          const pct = ((d.value / total) * 100).toFixed(0);
          return (
            <li key={d.label} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: pastelColors[idx] }}
              />
              <span className="text-gray-700">{d.label}</span>
              <span className="ml-auto font-medium text-gray-900">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Data sets
const eduPie: PieDatum[] = [
  { label: "GMARCH", value: 34 },
  { label: "早慶上理", value: 22 },
  { label: "関関同立", value: 10 },
  { label: "成成明学", value: 8 },
  { label: "日東駒専", value: 14 },
  { label: "東京一工", value: 6 },
  { label: "その他", value: 6 },
];

const jobPie: PieDatum[] = [
  { label: "営業", value: 42 },
  { label: "マーケティング", value: 24 },
  { label: "エンジニア", value: 13 },
  { label: "コンサル", value: 8 },
  { label: "事業開発", value: 6 },
  { label: "人事", value: 5 },
  { label: "起業", value: 2 },
];
/* ------------------------------------------ */

/* ---------- STUDENT CASES ---------- */
type StudentCase = {
  img: string;
  alt: string;
  title: string;
  text: string;
};

const studentCases: StudentCase[] = [
  {
    img: "/case-sales.png",
    alt: "バルコニーで腕を組むスーツ姿の学生",
    title: "人材系ベンチャーの立ち上げに従事した学生が営業部長として活躍！",
    text: "大学2年生から人材会社にて週4日働いた後、人材系ベンチャー企業から新規企画の営業部長として採用。",
  },
  {
    img: "/case-engineer.png",
    alt: "ノートPCで開発作業をする学生",
    title: "スタートアップでリードエンジニアとしてサービス開発に奮闘中！",
    text: "プログラミングスクールで学習のち、IT企業でプログラマーとして長期インターンに従事。現在はリードエンジニアとして活躍中。",
  },
];
/* ----------------------------------- */

/* ---------- SMALL RADIAL CHART ---------- */
function RadialChart({
  percentage,
  size = 80,
  stroke = 6,
}: {
  percentage: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (percentage / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mb-4"
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#f1f5f9"
        strokeWidth={stroke}
        fill="none"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#ef4444"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{
          strokeDashoffset: dashOffset,
          transition: "stroke-dashoffset 0.6s ease",
        }}
      />
    </svg>
  );
}
/* --------------------------------------- */

/* ---------- CONTACT SECTION ---------- */
function ContactSection() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    inquiry: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      // 1) DB insert
      const { error: insertError } = await supabase.from("inquiries").insert({
        name: form.name,
        email: form.email,
        company: form.company,
        message: form.inquiry,
      });
      if (insertError) throw insertError;

      // 2) Send notification & thank‑you emails via Edge Function
      const { error: fnError } = await supabase.functions.invoke(
        "send-inquiry-email",
        {
          body: {
            name: form.name,
            email: form.email,
            company: form.company,
            inquiry: form.inquiry,
          },
        },
      );
      if (fnError) throw fnError;

      // 3) Success – reset form & show thank‑you
      setForm({ name: "", email: "", company: "", inquiry: "" });
      setStatus("success");
    } catch (err) {
      console.error("Inquiry submit failed:", err);
      setStatus("error");
    }
  };

  return (
    <Section id="contact" className="bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">お問い合わせ</h2>

        {status === "success" ? (
          <p className="text-center text-green-600 font-semibold">
            送信しました。担当者よりご連絡いたします。
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              name="name"
              placeholder="お名前"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full p-3 border rounded-lg"
            />
            <input
              type="email"
              name="email"
              placeholder="メールアドレス"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full p-3 border rounded-lg"
            />
            <input
              type="text"
              name="company"
              placeholder="会社名"
              value={form.company}
              onChange={handleChange}
              required
              className="w-full p-3 border rounded-lg"
            />
            {/* Inquiry radio buttons */}
            <div className="space-y-2">
              <p className="font-medium">お問い合わせ内容 <span className="text-red-600">*</span></p>
              {["学生転職を利用したい", "デモを試してみたい", "その他"].map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="inquiry"
                    value={label}
                    checked={form.inquiry === label}
                    onChange={handleChange}
                    required
                    className="accent-red-600"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <Button type="submit" size="lg" disabled={status === "loading"}>
              {status === "loading" ? "送信中…" : "送信する"}
            </Button>
            {status === "error" && (
              <p className="text-center text-red-600">
                送信に失敗しました。もう一度お試しください。
              </p>
            )}
          </form>
        )}
      </div>
    </Section>
  );
}
/* ------------------------------------- */

export default function CompanyLP() {
  // Smooth‑scrolls to the inquiry form (#contact section)
  const scrollToContact = useCallback(() => {
    const el = document.getElementById("contact");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);
  return (
    <>
      <Head>
        <title>学生転職｜本気で新卒を採用したい企業だけの新サービス</title>
        <meta
          name="description"
          content="職務経歴をすでに持っている学生を、ポジション・年収を固定せずヘッドハンティングできる新世代の採用サービス"
        />
        <meta
          property="og:title"
          content="学生転職｜本気で新卒を採用したい企業だけの新サービス"
        />
        <meta
          property="og:description"
          content="職務経歴をすでに持っている学生を、ポジション・年収を固定せずヘッドハンティングできる新世代の採用サービス"
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

      <main id="main" role="main">
        {/* Hero */}
        <Section
          id="hero"
          className="bg-gradient-to-br from-red-600 to-red-700 text-white pt-32 relative overflow-hidden"
        >
          {/* Decorative blurred blobs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 -left-32 w-96 h-96 bg-red-400 opacity-30 rounded-full blur-3xl"></div>
            <div className="absolute top-24 -right-32 w-80 h-80 bg-red-400 opacity-25 rounded-full blur-3xl"></div>
          </div>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center px-4">
        {/* Left: copy */}
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            企業の本気の採用に応える<br className="md:hidden" />
            “学生転職” 
            ハイキャリア新卒採用
          </h1>
          <p className="mb-8 text-lg opacity-90">
            “いま会いたい”即戦力新卒人材に、たった3ステップでリーチ
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Button
              size="lg"
              aria-label="資料をダウンロード"
              onClick={scrollToContact}
            >
              デモを試してみる
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-white/10"
              aria-label="無料相談を申し込む"
              onClick={scrollToContact}
            >
              担当者に相談する
            </Button>
          </div>
        </div>

        {/* Right: hero image */}
        <div className="relative w-full h-72 md:h-[420px]">
          <Image
            src="/hero-students.png"
            alt="ノートPCを囲んで協力する学生たち"
            fill
            className="object-cover rounded-xl shadow-2xl"
            priority
          />
        </div>
      </div>
        </Section>

        <MovieSection />

        {/* Pain Points */}
        <Section
          id="pain"
          className="bg-gradient-to-br from-red-50 via-red-100 to-white"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">
            こんなお悩みありませんか？
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                text: "ターゲット学生に求人情報が届かない",
                img: "/pain-1-target.png",
                alt: "ターゲットに届かないイメージ"
              },
              {
                text: "母集団形成に大きな広告費がかかる",
                img: "/pain-2-cost.png",
                alt: "コストがかかるイメージ"
              },
              {
                text: "内定承諾率が伸びず採用計画が遅れる",
                img: "/pain-3-offer.png",
                alt: "内定承諾率が伸びないイメージ"
              },
            ].map(({ text, img, alt }, i) => (
              <div
                key={i}
                className="relative p-8 bg-white rounded-2xl shadow-lg ring-1 ring-gray-200/60 flex flex-col items-center text-center gap-6 transition-all duration-500 group hover:-translate-y-2 hover:ring-red-400/60"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-50 via-white to-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Thumbnail */}
                <Image
                  src={img}
                  alt={alt}
                  width={120}
                  height={120}
                  className="w-28 h-28 mb-6 rounded-lg object-cover shadow-md"
                />

                {/* Copy */}
                <p className="text-gray-800 font-semibold leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Features */}
        <Section id="features" className="relative py-24 bg-gradient-to-br from-red-900 via-red-800 to-red-700 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 25% 25%, white 2px, transparent 2px), radial-gradient(circle at 75% 75%, white 2px, transparent 2px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          {/* Gradient Orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 relative z-10">
            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-center mb-20"
            >
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  学生転職が
                </span>
                <br />
                <span className="bg-gradient-to-r from-red-300 via-red-100 to-red-300 bg-clip-text text-transparent">
                  選ばれる理由
                </span>
              </h2>
              <div className="flex justify-center">
                <div className="w-32 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              </div>
            </motion.div>

            {/* Cards */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid gap-8 md:grid-cols-2 lg:grid-cols-4"
            >
              {features.map(({ Icon, title, text, accent, number }, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <Card className="group relative h-full bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-700 overflow-hidden">
                    {/* Hover Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-5 transition-opacity duration-700`} />

                    {/* Top Accent Line */}
                    <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                    <CardContent className="relative p-8 h-full">
                      {/* Large Faded Number */}
                      <div className="absolute top-6 right-6 text-6xl font-extrabold text-white/5 group-hover:text-white/10 transition-colors duration-500 select-none">
                        {number}
                      </div>

                      {/* Icon */}
                      <div className="mb-8">
                        <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/10 group-hover:bg-white/20 transition-all duration-500">
                          <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                        </div>
                      </div>

                      {/* Title & Text */}
                      <h3 className="font-bold text-xl mb-4 text-white group-hover:text-gray-100 transition-colors duration-300 leading-tight">
                        {title}
                      </h3>
                      <p className="text-gray-300 group-hover:text-gray-200 leading-relaxed transition-colors duration-300 text-sm">
                        {text}
                      </p>

                      {/* Bottom Accent Line */}
                      <div className={`absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r ${accent} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Inline CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-center mt-20"
            >
              <div className="inline-flex items-center gap-4 px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300 cursor-pointer group">
                <span className="text-white font-medium">詳細を確認する</span>
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-white/80 to-white/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-3 h-3 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>
        </Section>

        {/* Demographics */}
        <Section id="demographics">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            『学生転職』登録学生層
          </h2>
          <div className="grid gap-12 md:grid-cols-2 max-w-5xl mx-auto">
            <DemographicPie title="学歴層" data={eduPie} />
            <DemographicPie title="経験職種" data={jobPie} />
          </div>
        </Section>



        {/* Student Cases */}
        <Section id="cases">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
            実際の学生例
          </h2>

          <div className="space-y-16">
            {studentCases.map((c, i) => (
              <div
                key={i}
                className={`grid md:grid-cols-2 gap-10 items-center ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Image */}
                <div
                  className={`relative w-full h-60 md:h-72 lg:h-80 ${
                    i % 2 === 1 ? "md:order-2" : ""
                  }`}
                >
                  <Image
                    src={c.img}
                    alt={c.alt}
                    fill
                    className="object-cover rounded-xl shadow-lg"
                  />
                </div>

                {/* Text */}
                <div className={`${i % 2 === 1 ? "md:order-1" : ""}`}>
                  <h3 className="text-2xl font-bold mb-4 leading-snug">
                    {c.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* How It Works */}
        <Section id="flow" className="bg-white">
          <h2 className="text-2xl font-bold mb-4 text-center">ご利用の流れ</h2>
          <ol className="space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
            {[
              {
                num: "01",
                title: "利用申込をする",
                text: "下記より利用申込のフォームもしくは無料相談よりご連絡ください",
              },
              {
                num: "02",
                title: "アカウントの設定",
                text: "企業アカウントを設定させていただきます。専任のカスタマーサポーターがつきますのでご安心ください",
              },
              {
                num: "03",
                title: "学生への募集・ヘッドハンティング",
                text: "自社の求めている学生に対してアピールをしましょう！",
              },
            ].map(({ num, title, text }, i) => (
              <li
                key={num}
                className="relative bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                {i !== 2 && (
                  <ArrowRight className="hidden md:block absolute right-[-28px] top-1/2 -translate-y-1/2 w-7 h-7 text-red-400" />
                )}
                <span className="text-4xl font-extrabold text-red-600 mb-2 block">
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
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                logo: "/sansanlogo.png",
                alt: "Sansan株式会社 ロゴ",
                quote:
                  "ティア1層の採用にぴったりな採用でした。実際に営業経験をしている学生も多くハイキャリア向けです。",
                author: "Sansan株式会社 採用担当",
              },
              {
                logo: "/yaplilogo.png",
                alt: "株式会社ヤプリ ロゴ",
                quote:
                  "本来新卒が入るようなポジション以外での採用に成功することができました。",
                author: "株式会社ヤプリ",
              },
              {
                logo: "/taylorlogo.png",
                alt: "テイラー株式会社 ロゴ",
                quote:
                  "新卒採用を今期から開始するが、外資系の企業でも理想としているような学生と触れ合えました。",
                author: "テイラー株式会社",
              },
            ].map(({ logo, alt, quote, author }, i) => (
              <div
                key={i}
                className="relative p-10 bg-white rounded-2xl shadow-lg ring-1 ring-gray-200/60 flex flex-col gap-6 transition-all duration-500 group hover:-translate-y-2 hover:ring-red-400/60"
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-50 via-white to-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Logo */}
                <div className="relative w-56 h-16 mx-auto flex items-center justify-center">
                  {/* Subtle glow behind logo */}
                  <div
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-400 via-pink-400 to-red-500 opacity-20 group-hover:opacity-40 transition-opacity duration-500 blur-sm"
                    aria-hidden="true"
                  />
                  <Image
                    src={logo}
                    alt={alt}
                    fill
                    className="object-contain relative z-10 drop-shadow-md group-hover:drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>

                {/* Quote */}
                <p className="text-sm italic leading-relaxed text-gray-800 relative">
                  “{quote}”
                </p>

                {/* Author */}
                <p className="mt-auto text-xs text-gray-500 text-right">
                  — {author}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq">
          <h2 className="text-2xl font-bold mb-4 text-center">よくあるご質問</h2>
          <div className="max-w-2xl mx-auto">
            <details className="mb-4 p-4 border rounded-lg">
              <summary className="font-semibold cursor-pointer">
                スカウト型の採用サービスですか？
              </summary>
              <p className="mt-2 text-sm text-gray-700">
                新卒総合ポータルプラットフォームとなります。求人の広告やスカウト機能など幅広い機能の利用が可能となります。
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

        {/* Contact */}
        <ContactSection />

        {/* CTA */}
        <Section id="cta" className="bg-red-600 text-white">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">今すぐ学生転職を体験する</h2>
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