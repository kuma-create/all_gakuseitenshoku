"use client";

import { useState, useEffect, useRef, FC } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** ===== Firm master data (FY2024 basis) ===== */
interface FirmData {
  name: string;
  revenue: string;        // e.g., "US$67.2B"
  fiscalYear: string;     // e.g., "FY2024"
  employees?: string;     // optional head‑count
  headline: string;       // punch line for the firm
  bullets: string[];      // key facts shown on detail pages
}

const firms: FirmData[] = [
  {
    name: "Deloitte",
    revenue: "US$67.2B",
    fiscalYear: "FY2024",
    employees: "460,000+",
    headline: "規模最大・Tech買収戦略先導",
    bullets: [
      "グローバル売上 67.2B（+3.1% LC）",
      "約46万人のプロフェッショナル",
      "Technology & Consulting 領域で大型 M&A を加速",
      "英国 T&T 部門で賞与カット・昇進抑制（2025）"
    ],
  },
  {
    name: "PwC",
    revenue: "US$55.4B",
    fiscalYear: "FY2024",
    employees: "370,000+",
    headline: "監査 × Strategy& で一貫支援",
    bullets: [
      "売上 55.4B（+3.7% LC）",
      "15 億ドル規模の AI 投資",
      "豪州・中国での不祥事を受けガバナンス改革中",
    ],
  },
  {
    name: "EY",
    revenue: "US$51.2B",
    fiscalYear: "FY2024",
    employees: "395,000+",
    headline: "People First・ESG 先駆",
    bullets: [
      "売上 51.2B（+3.9% LC）",
      "女性初のグローバル CEO 就任（2024）",
      "独自 AI アシスタント “EYQ” を展開",
    ],
  },
  {
    name: "KPMG",
    revenue: "US$38.4B",
    fiscalYear: "FY2024",
    employees: "273,000+",
    headline: "公共性 × WLB を両立",
    bullets: [
      "売上 38.4B（+5.1% LC）",
      "公共・金融分野で高い信頼",
      "最大級の監査罰金（2023）を契機に品質改善へ",
    ],
  },
];

/** =====================================================================
 * 追加データセット（ホワイトペーパー 24 ページ全体で使用）
 * すべて 1 ファイルに集約するという要件に合わせて、このファイル内に
 * 定数として定義します。必要に応じてページコンポーネント側で import
 * せず直接参照できます。
 * ===================================================================*/

/** 1) FY2024 主要業績データ */
export const big4FY2024Results = [
  { name: "Deloitte", revenueUSD: 67.2, employees: 460_000, revenueGrowthRate: "3.1% (LC)", profitGrowthRate: "非公開", notes: "Big4 最大規模" },
  { name: "PwC",      revenueUSD: 55.4, employees: 370_000, revenueGrowthRate: "3.7% (LC)", profitGrowthRate: "非公開", notes: "AI へ15億ドル投資" },
  { name: "EY",       revenueUSD: 51.2, employees: 393_000, revenueGrowthRate: "3.9% (LC)", profitGrowthRate: "非公開", notes: "EY.ai / EYQ を展開" },
  { name: "KPMG",     revenueUSD: 38.4, employees: 275_288, revenueGrowthRate: "5.1% (LC)", profitGrowthRate: "非公開", notes: "FY24 成長率トップ" },
] as const;

/** 2) ESG・AI・テック戦略ハイライト */
export const big4ESGandTech = {
  Deloitte: {
    ESG:  "ESG コンサルのグローバルリーダー、ネットゼロロードマップ公開",
    AI:   "2030 年までに 30 億ドル超を GenAI へ投資、AI Factory を設立",
    tech: "AWS・Google・NVIDIA などと戦略提携、独自 SaaS『Ascend』展開"
  },
  PwC: {
    ESG:  "2030 年ネットゼロ宣言、The New Equation フレームで信頼構築",
    AI:   "FY24 に 15 億ドル投資し AI チーム拡充、アライアンス収益 +24%",
    tech: "クラウド&デジタル実行力を高めるべく Strategy& との連携強化"
  },
  EY: {
    ESG:  "統合報告『Value Realized』で ESG KPI 開示、“EY All In” 戦略推進",
    AI:   "EY.ai と社内 LLM EYQ を全世界 75% の社員が利用",
    tech: "EY Fabric 等の基盤に継続投資、バッジ制度で新技術習得を促進"
  },
  KPMG: {
    ESG:  "『Our Impact Plan』で進捗開示、ESG アシュアランス需要増",
    AI:   "3 年で 17 億ドル投資、57k Copilot ライセンスを導入",
    tech: "“Collective Strategy” でテクノロジー&タレントへ集中投資"
  }
} as const;

/** 3) 文化 & WLB 特徴 */
export const firmCulturesWLB = [
  {
    firm: "PwC",
    culture: "協調・People First",
    wlb: "平均残業 30h/月程度、金曜残業禁止デーなど柔軟施策"
  },
  {
    firm: "Deloitte",
    culture: "高性能・成長志向",
    wlb: "平均残業 60h/月前後、チャレンジ環境を重視"
  },
  {
    firm: "EY",
    culture: "育成・グローバル志向",
    wlb: "柔軟勤務・高い有給取得率で WLB 良好"
  },
  {
    firm: "KPMG",
    culture: "穏やか・協力的",
    wlb: "平均残業 40h/月程度、プロジェクト後に長期休暇推奨"
  },
] as const;

/** 4) “Why this firm?” 模範回答 & NG 例 */
export const interviewWhyThisFirm = [
  {
    firm: "PwC",
    good: "チーム協働と社会的信頼構築という文化が自分の価値観と合致するため。",
    ng:   "Big4 で一番入りやすそうだから。"
  },
  {
    firm: "Deloitte",
    good: "最も難易度の高い案件で急成長できる環境に魅力を感じたため。",
    ng:   "一番規模が大きく、履歴書映えするから。"
  },
  {
    firm: "EY",
    good: "国際色豊かな環境と体系的な育成制度でグローバルキャリアを築けるため。",
    ng:   "面接回数が少なくて楽そうだから。"
  },
  {
    firm: "KPMG",
    good: "成長途上のチームで新しい挑戦ができ、かつ穏やかな文化が合うため。",
    ng:   "ワークライフバランスが楽らしいので負荷が低そうだから。"
  },
] as const;

/** 5) 比較マトリクス指標 */
export const big4ComparisonMatrix = {
  headers: ["文化", "育成", "グローバル度", "初任給(万円)"],
  rows: [
    ["PwC",      "協調",      "OJT+メンター", "高", "550"],
    ["Deloitte", "挑戦",      "Stretch",      "高", "580"],
    ["EY",       "育成",      "EY Badges",    "非常に高", "550"],
    ["KPMG",     "穏やか",    "Growing",      "中", "570"],
  ]
} as const;

/** 6) 診断クイズ */
export const careerFitDiagnostic = {
  questions: [
    { q: "チームで協調するのが好き？",         a: ["はい", "どちらかと言えばいいえ"] },
    { q: "国際的な環境で働きたい？",           a: ["はい", "いいえ"] },
    { q: "急成長のためなら長時間労働も許容？", a: ["はい", "いいえ"] },
  ],
  mapping: {
    TeamPlayer: { fits: "PwC/KPMG", message: "協調型のあなたには…" },
    Challenger: { fits: "Deloitte", message: "挑戦型のあなたには…" },
    Globalist:  { fits: "EY",       message: "グローバル志向のあなたには…" },
  }
} as const;

/** 7) 27卒 就活スケジュール */
export const recruitingSchedule27 = [
  { period: "2025 夏",  action: "サマーインターン応募・選考" },
  { period: "2025 秋",  action: "インターン経由の早期内定" },
  { period: "2026 春",  action: "本選考 ES・Webテスト提出" },
  { period: "2026 初夏",action: "最終面接・内定受諾" },
] as const;

/** 8) 学生人気 & 業界比較サマリ */
export const popularityAndIndustryStats = {
  summary: "総合人気トップ10に Big4 は不在だがコンサル志望内では上位。",
  compensation: "初任給 550〜580 万円は MBB より低いが安定性が高い。",
} as const;

/** 9) 内定者決定要因 */
export const offerDecisionFactors = [
  "文化フィットが最重要",
  "グローバル機会の有無",
  "WLB と成長のバランス",
  "プロジェクト領域",
  "長期的な安定性・Exit オプション"
] as const;

/** ************************************************************
 * BIG4 Whitepaper – 24‐page interactive viewer
 * A4 横開き PDF 相当を Web でページ送り表示するクライアント
 * ************************************************************/

// 1. ===== Generic Page Wrapper =====
type PageProps = { setCurrent: (n: number) => void };

const PageWrapper: FC<{ children: React.ReactNode }> = ({ children }) => (
  <section className="flex min-h-screen w-full flex-col items-center justify-center gap-8 px-6 pt-28 pb-12 md:px-16 lg:px-32">
    {children}
  </section>
);

// 2. ===== Individual Page Components =====
/** NOTE:
 *  - 24 logical “pages” as defined in content map (index 0‑23)
 *  - Each should be replaced with actual content by Design team.
 *  - Provide a clear heading so reviewers can recognise location.
 */

const CoverPage: FC<PageProps> = () => (
  <PageWrapper>
    <h1 className="text-center text-4xl font-extrabold tracking-tight md:text-6xl">
      BIG4 キャリア完全攻略ガイド 2027
    </h1>
    <p className="mt-4 text-center text-lg text-muted-foreground">
      監査 × コンサル × Tech で描くキャリアの未来
    </p>
  </PageWrapper>
);

const IntroReasons: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">BIG4 が学生に選ばれる 3 つの理由</h2>
    <ol className="mt-6 space-y-4 text-left text-lg leading-relaxed">
      <li>1. 圧倒的ブランド力</li>
      <li>2. 高い初任給と成長カーブ</li>
      <li>3. キャリアの可搬性</li>
    </ol>
  </PageWrapper>
);

const HistoryAndDomains: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">BIG4 の歴史と業務領域</h2>
    <p className="mt-6 max-w-2xl text-center">
      1960s の BIG8 から 2000s の BIG4 へ ‐ 監査・税務・アドバイザリー・テクノロジー
    </p>
  </PageWrapper>
);

const SnapshotComparison: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">4 社スナップショット比較</h2>
    <table className="mt-6 w-full max-w-3xl table-auto text-sm md:text-base">
      <thead>
        <tr className="border-b">
          <th className="py-2 text-left">Firm</th>
          <th className="py-2 text-right">Revenue</th>
          <th className="py-2 text-right hidden sm:table-cell">Employees</th>
          <th className="py-2 text-left">Keyword</th>
        </tr>
      </thead>
      <tbody>
        {firms.map((f) => (
          <tr key={f.name} className="border-b/20">
            <td className="py-2 font-semibold">{f.name}</td>
            <td className="py-2 text-right">{f.revenue}</td>
            <td className="py-2 text-right hidden sm:table-cell">
              {f.employees ?? "—"}
            </td>
            <td className="py-2">{f.headline}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </PageWrapper>
);

// --- Company detail placeholders ---
const PwCDetail: FC<PageProps> = () => {
  const pwc = firms.find((f) => f.name === "PwC")!;
  return (
    <PageWrapper>
      <h2 className="text-3xl font-bold">{pwc.name} 詳細プロファイル</h2>
      <p className="mt-2 text-lg font-medium text-primary">{pwc.headline}</p>
      <ul className="mt-6 space-y-2 text-left text-base leading-relaxed">
        {pwc.bullets.map((b, i) => (
          <li key={i}>• {b}</li>
        ))}
      </ul>
    </PageWrapper>
  );
};
const EYDetail: FC<PageProps> = () => {
  const ey = firms.find((f) => f.name === "EY")!;
  return (
    <PageWrapper>
      <h2 className="text-3xl font-bold">{ey.name} 詳細プロファイル</h2>
      <p className="mt-2 text-lg font-medium text-primary">{ey.headline}</p>
      <ul className="mt-6 space-y-2 text-left text-base leading-relaxed">
        {ey.bullets.map((b, i) => (
          <li key={i}>• {b}</li>
        ))}
      </ul>
    </PageWrapper>
  );
};
const KPMGDetail: FC<PageProps> = () => {
  const kpmg = firms.find((f) => f.name === "KPMG")!;
  return (
    <PageWrapper>
      <h2 className="text-3xl font-bold">{kpmg.name} 詳細プロファイル</h2>
      <p className="mt-2 text-lg font-medium text-primary">{kpmg.headline}</p>
      <ul className="mt-6 space-y-2 text-left text-base leading-relaxed">
        {kpmg.bullets.map((b, i) => (
          <li key={i}>• {b}</li>
        ))}
      </ul>
    </PageWrapper>
  );
};
const DeloitteDetail: FC<PageProps> = () => {
  const deloitte = firms.find((f) => f.name === "Deloitte")!;
  return (
    <PageWrapper>
      <h2 className="text-3xl font-bold">{deloitte.name} 詳細プロファイル</h2>
      <p className="mt-2 text-lg font-medium text-primary">{deloitte.headline}</p>
      <ul className="mt-6 space-y-2 text-left text-base leading-relaxed">
        {deloitte.bullets.map((b, i) => (
          <li key={i}>• {b}</li>
        ))}
      </ul>
    </PageWrapper>
  );
};

const MatrixPage: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">比較マトリクス</h2>
    <p className="mt-4 text-center">文化 × サービス × キャリア</p>
  </PageWrapper>
);

const InterviewGuide: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">面接必勝ガイド</h2>
    <p className="mt-4">STAR 法 &lt;テンプレ入り&gt;</p>
  </PageWrapper>
);

const QuickQuiz: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">3 分自己診断クイズ</h2>
  </PageWrapper>
);

const QuizResult: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">診断結果タイプ別 レコメンド</h2>
  </PageWrapper>
);

const CaseStudy: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">ケーススタディ：内定者の決め手</h2>
  </PageWrapper>
);

const Timeline: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">就活タイムライン &amp; To‑Do</h2>
  </PageWrapper>
);

const ServiceSteps: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">学生転職活用法 3 STEP</h2>
  </PageWrapper>
);

const SignupIncentive: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">登録特典 &amp; 今すぐ行動！</h2>
  </PageWrapper>
);

const Appendix: FC<PageProps> = () => (
  <PageWrapper>
    <h2 className="text-3xl font-bold">巻末付録 &amp; 参考資料</h2>
  </PageWrapper>
);

// 3. ===== Pages Array =====
const pages: { id: number; component: FC<PageProps>; label: string }[] = [
  { id: 0, component: CoverPage, label: "Cover" },
  { id: 1, component: IntroReasons, label: "Intro" },
  { id: 2, component: HistoryAndDomains, label: "History" },
  { id: 3, component: SnapshotComparison, label: "Snapshot" },
  { id: 4, component: PwCDetail, label: "PwC" },
  { id: 5, component: EYDetail, label: "EY" },
  { id: 6, component: KPMGDetail, label: "KPMG" },
  { id: 7, component: DeloitteDetail, label: "Deloitte" },
  { id: 8, component: MatrixPage, label: "Matrix" },
  { id: 9, component: InterviewGuide, label: "Interview" },
  { id: 10, component: QuickQuiz, label: "Quiz" },
  { id: 11, component: QuizResult, label: "Quiz Result" },
  { id: 12, component: CaseStudy, label: "Case Study" },
  { id: 13, component: Timeline, label: "Timeline" },
  { id: 14, component: ServiceSteps, label: "3‑Step" },
  { id: 15, component: SignupIncentive, label: "Signup" },
  { id: 16, component: Appendix, label: "Appendix" },
];

/** ************************************************************
 * Root Component
 * ************************************************************/
export default function BIG4WhitepaperPage() {
  const [current, setCurrent] = useState(0);

  // ---- keyboard & touch handlers ----
  const touchStartX = useRef<number | null>(null);

  const goPrev = () => setCurrent((p) => Math.max(0, p - 1));
  const goNext = () => setCurrent((p) => Math.min(pages.length - 1, p + 1));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (diff > 50) goPrev();
      if (diff < -50) goNext();
      touchStartX.current = null;
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [current]);

  const CurrentPage = pages[current].component;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 z-10 flex w-full items-center justify-between gap-4 bg-background/80 px-6 py-3 backdrop-blur">
        <span className="text-base font-semibold tracking-tight">BIG4 Whitepaper</span>
        <span className="text-sm text-muted-foreground">
          {pages[current].label} ({current + 1}/{pages.length})
        </span>
      </header>

      {/* Page Content */}
      <CurrentPage setCurrent={setCurrent} />

      {/* Navigation */}
      <div className="fixed bottom-6 flex w-full max-w-md justify-between px-6">
        <Button
          variant="outline"
          size="icon"
          onClick={goPrev}
          disabled={current === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1">
          {pages.map((p, idx) => (
            <button
              key={p.id}
              aria-label={`page ${idx + 1}`}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                idx === current ? "bg-primary" : "bg-muted-foreground/40"
              )}
              onClick={() => setCurrent(idx)}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={current === pages.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </main>
  );
}