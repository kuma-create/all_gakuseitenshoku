"use client"

import type React from "react"
import { useState, useEffect, useRef, type FC } from "react"
import Image from "next/image"
import {
  ChevronLeft,
  ChevronDown,
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  Globe,
  Award,
  Target,
  CheckCircle,
  XCircle,
  Star,
  Briefcase,
  Calendar,
  Download,
  ArrowRight,
  BarChart3,
  PieChart,
  Zap,
  AlertTriangle,
  Shield,
  Brain,
  Handshake,
  Cloud,
  Laptop,
  PieChart as LucidePieChart,
  AlertTriangle as LucideAlertTriangle,
  Handshake as LucideHandshake,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

// ---------------- ユニット変換ヘルパ ----------------
const usdToJpy = (usd: number, rate = 145) => Math.round(usd * rate);

const formatJpy = (jpy: number): string => {
  if (jpy >= 1_0000_0000_0000) return `約${(jpy / 1_0000_0000_0000).toFixed(1)}兆円`;
  if (jpy >= 1_0000_0000) return `約${(jpy / 1_0000_0000).toFixed(1)}億円`;
  return `約${jpy.toLocaleString("ja-JP")}円`;
};

const formatCount = (n: number): string => {
  if (n >= 10_000) {
    const num = n / 10_000;
    const text = Number.isInteger(num) ? num.toFixed(0) : num.toFixed(1);
    return `${text}万人以上`;
  }
  return `${n.toLocaleString("ja-JP")}人以上`;
};
// ---------------------------------------------------

/** ===== Updated Firm master data based on research ===== */
interface FirmData {
  name: string
  revenue: string
  fiscalYear: string
  employees?: string
  headline: string
  bullets: string[]
  strengths: string[]
  challenges: string[]
  color: string
  bgGradient: string
  icon: React.ReactNode
  recentNews: string[]
}

const firms: FirmData[] = [
  {
    name: "Deloitte",
    revenue: "約10.1兆円",
    fiscalYear: "2024年度",
    employees: "460,000+",
    headline: "BIG4最大規模・コンサル×テック領域のリーダー",
    color: "text-slate-700",
    bgGradient: "from-slate-600 to-slate-800",
    icon: (
      <Image
        src="/Deloitte.png"
        alt="Deloitte logo"
        width={48}
        height={48}
        className="h-12 w-12 object-contain"
      />
    ),
    bullets: [
      "BIG4の中で規模・売上共に最大",
      "グローバルのクライアントネットワークが最も広い",
      "コンサルティング・テクノロジー領域に強み",
      "積極的な投資・買収戦略でサービス拡大",
    ],
    strengths: ["最大手としての圧倒的なリソース", "最先端技術への積極投資", "幅広い事業ポートフォリオ"],
    challenges: ["成長ペース鈍化傾向", "英国で賞与カット・昇給抑制（2025年）", "事業ポートフォリオ再編の必要性"],
    recentNews: ["英国T&T部門で賞与カット・昇進抑制を実施", "最先端技術への投資継続", "事業ポートフォリオの再編に注力"],
  },
  {
    name: "PwC",
    revenue: "約8.3兆円",
    fiscalYear: "2024年度",
    employees: "370,000+",
    headline: "監査×戦略コンサルの一貫サービス・最も権威ある会社",
    color: "text-slate-700",
    bgGradient: "from-slate-600 to-slate-800",
    icon: (
      <Image
        src="/PwC.png"
        alt="PwC logo"
        width={48}
        height={48}
        className="h-12 w-12 object-contain"
      />
    ),
    bullets: [
      "「BIG4で最も権威ある会社」",
      "Strategy&による戦略立案から実行支援まで一貫サービス",
      "協調性が高くサポーティブな社風",
      "堅実な監査基盤と新興分野への対応力を両立",
    ],
    strengths: ["監査・税務の信頼性と戦略コンサル力のバランス", "Strategy&の存在による差別化", "協調性の高い企業文化"],
    challenges: ["成長率鈍化（+9.9%→+3.7%）", "豪州機密情報流用スキャンダル", "PwC中国を巡る問題"],
    recentNews: [
      "2024年度収益554億ドル（過去最高益）",
      "AIへ15億ドル投資をコミット",
      "英国で税務業務支援AIアシスタント導入",
    ],
  },
  {
    name: "EY",
    revenue: "約7.7兆円",
    fiscalYear: "2024年度",
    employees: "395,000+",
    headline: "People First文化・ESG先駆者・初の女性CEO",
    color: "text-slate-700",
    bgGradient: "from-slate-600 to-slate-800",
    icon: (
      <Image
        src="/EY.png"
        alt="EY logo"
        width={48}
        height={48}
        className="h-12 w-12 object-contain"
      />
    ),
    bullets: [
      "「People First」の企業文化で従業員重視",
      "「働きがいのある企業」ランキング常連",
      "ESG・サステナビリティ分野にいち早く注力",
      "リスク管理・内部統制支援に定評",
    ],
    strengths: ["優れた職場環境と従業員満足度", "多様性・包括性へのコミットメント", "ESG分野でのリーダーシップ"],
    challenges: ["「監査のEY」イメージが強く残る", "戦略コンサル分野で他社に後れ", "収益減速に直面"],
    recentNews: [
      "初の女性CEO ジャネット・トランケール就任",
      "AIアシスタント「EYQ」提供開始",
      "組織変革とテクノロジー活用を推進",
    ],
  },
  {
    name: "KPMG",
    revenue: "約5.8兆円",
    fiscalYear: "2024年度",
    employees: "273,000+",
    headline: "公共・金融分野の信頼・ワークライフバランス重視",
    color: "text-slate-700",
    bgGradient: "from-slate-600 to-slate-800",
    icon: (
      <Image
        src="/KPMG.png"
        alt="KPMG logo"
        width={48}
        height={48}
        className="h-12 w-12 object-contain"
      />
    ),
    bullets: [
      "官公庁・金融機関など公共性の高い分野で信頼厚い",
      "比較的保守的・安定志向の社風",
      "ワークライフバランスが競合より良好",
      "監査・アドバイザリー分野での安定感",
    ],
    strengths: ["公共・金融分野での強固な信頼関係", "良好なワークライフバランス", "安定した経営基盤"],
    challenges: ["他3社に比べ規模が小さい", "コンサル部門の規模・ブランド力で見劣り", "英国で過去最大級の制裁金"],
    recentNews: [
      "英国で2,600万ドル（約40億円）の罰金",
      "2025年までにパートナー・ディレクター職の1/3を女性に",
      "ESG・税務・テクノロジー人材への投資強化",
    ],
  },
]

/** ===== Updated data based on research ===== */
export const big4FY2024Results = [
  {
    name: "Deloitte",
    revenueUSD: 67.2,
    employees: 460_000,
    revenueGrowthRate: "成長鈍化傾向",
    profitGrowthRate: "非公開",
    notes: "BIG4最大規模・コンサル×テック強み",
    keyFocus: "事業ポートフォリオ再編と最先端技術投資",
  },
  {
    name: "PwC",
    revenueUSD: 55.4,
    employees: 370_000,
    revenueGrowthRate: "+3.7% (前年+9.9%から鈍化)",
    profitGrowthRate: "過去最高益",
    notes: "Strategy&による差別化・AIに15億ドル投資",
    keyFocus: "地域・人員見直しとテクノロジー強化",
  },
  {
    name: "EY",
    revenueUSD: 51.2,
    employees: 393_000,
    revenueGrowthRate: "収益減速",
    profitGrowthRate: "非公開",
    notes: "People First文化・初の女性CEO",
    keyFocus: "組織変革とテクノロジー活用推進",
  },
  {
    name: "KPMG",
    revenueUSD: 38.4,
    employees: 275_288,
    revenueGrowthRate: "安定成長",
    profitGrowthRate: "非公開",
    notes: "公共・金融分野で信頼・WLB良好",
    keyFocus: "ESG・税務・テクノロジー人材投資",
  },
] as const

export const big4CoreBusiness = {
  audit: {
    title: "監査",
    description: "クライアント企業の財務状況を調査し、その会社の経営が健全であることの証拠文章を作成",
    icon: <Shield className="h-6 w-6" />,
  },
  consulting: {
    title: "コンサルティング",
    description: "監査の知見を基に企業の経営方針をアドバイス",
    icon: <Brain className="h-6 w-6" />,
  },
} as const

const businessDetails: Record<keyof typeof big4CoreBusiness, string> = {
  audit: "公認会計士が財務諸表をチェックし、粉飾が無いかを第三者として証明する仕事。投資家や取引先が安心して会社と取引できるようにする社会インフラ的役割です。",
  consulting: "経営課題を洗い出し、改善策を提案・実行支援する仕事。戦略立案から業務改革、IT導入まで幅広く企業変革をサポートします。",
}

export const firmCulturesWLB = [
  {
    firm: "PwC",
    culture: "協調性が高くサポーティブ",
    wlb: "堅実な監査基盤と新興分野対応のバランス重視",
    reputation: "BIG4で最も権威ある会社",
  },
  {
    firm: "Deloitte",
    culture: "積極的・成長志向",
    wlb: "最大手としてのリソース活用・挑戦的環境",
    reputation: "コンサル×テック領域のリーダー",
  },
  {
    firm: "EY",
    culture: "People First・多様性重視",
    wlb: "働きがいのある企業ランキング常連",
    reputation: "従業員満足度とESG分野のリーダー",
  },
  {
    firm: "KPMG",
    culture: "保守的・安定志向",
    wlb: "ワークライフバランスが競合より良好",
    reputation: "公共・金融分野での信頼",
  },
] as const

/** ===== Why this firm? (position‑specific answers) ===== */
export const interviewWhyThisFirm: {
  firm: string
  keyPoint: string
  positions: { label: string; good: string; ng: string }[]
}[] = [
  {
    firm: "PwC",
    keyPoint: "監査・税務の信頼性と戦略コンサル力のバランス",
    positions: [
      {
        label: "監査",
        good: "グローバル基準に準拠したデジタル監査を先導する環境で専門性を高められるため。",
        ng: "公認会計士資格を活かせそうだから。"
      },
      {
        label: "コンサルティング",
        good: "Strategy&と一体となり戦略〜実行をハンズオンで支援できるため。",
        ng: "ブランド力が高いから。"
      },
      {
        label: "テクノロジー／AI",
        good: "AI・クラウド領域に15億ドルを投資し最先端プロジェクトが豊富なため。",
        ng: "AIが流行っているから。"
      }
    ]
  },
  {
    firm: "Deloitte",
    keyPoint: "最先端技術への投資と幅広い事業ポートフォリオ",
    positions: [
      {
        label: "コンサルティング",
        good: "世界最大規模のリソースを活用しながらグローバル案件で成長できるため。",
        ng: "一番大きい会社だから安心。"
      },
      {
        label: "リスクアドバイザリー",
        good: "サイバー・ESGなど拡大市場で専門性を磨けるため。",
        ng: "新しい領域で何でもできそうだから。"
      }
    ]
  },
  {
    firm: "EY",
    keyPoint: "従業員重視文化とESGリーダーシップ",
    positions: [
      {
        label: "サステナビリティ・ESG",
        good: "ESG保証や脱炭素支援で社会的インパクトを創出できるため。",
        ng: "ESGが話題だから。"
      },
      {
        label: "コンサルティング",
        good: "People First文化の中で多様なバックグラウンドと協働し変革を推進できるため。",
        ng: "女性CEOがいるので働きやすそうだから。"
      }
    ]
  },
  {
    firm: "KPMG",
    keyPoint: "公共・金融分野の信頼と良好なWLB",
    positions: [
      {
        label: "金融アドバイザリー",
        good: "金融規制対応やM&A支援で専門知識を深められるため。",
        ng: "金融に強いと聞いたから。"
      },
      {
        label: "監査",
        good: "公共性の高いインフラ企業を多く担当し社会貢献度が高いため。",
        ng: "残業が少なそうで楽だから。"
      }
    ]
  }
]

export const big4ComparisonMatrix = {
  headers: ["企業文化", "強み分野", "最近の動向", "初任給(万円)"],
  rows: [
    ["PwC", "協調・権威", "Strategy&一貫サービス", "AI15億ドル投資", "550"],
    ["Deloitte", "積極・成長", "コンサル×テック", "事業再編推進", "580"],
    ["EY", "People First", "ESG・多様性", "初女性CEO就任", "550"],
    ["KPMG", "安定・保守", "公共・金融", "ダイバーシティ推進", "570"],
  ],
} as const

/** ===== 就活倍率・ガクチカ・併願先 ===== */
export const big4CompetitionRates = [
  {
    name: "Deloitte",
    internshipRate: "インターン: 50名 / 応募26,000+ (約520倍)",
    mainRate: "本選考: 380名 / 倍率100倍+",
  },
  {
    name: "PwC",
    internshipRate: "インターン: 50名 / 応募9,000+ (181倍)",
    mainRate: "本選考: 300名 / 倍率100倍+",
  },
  {
    name: "EY",
    internshipRate: "インターン: 数十名 / 倍率50倍+",
    mainRate: "本選考: 100名 / 倍率100倍+",
  },
  {
    name: "KPMG",
    internshipRate: "インターン: 数十名 / 倍率20倍+",
    mainRate: "本選考: 130名 / 倍率30-40倍",
  },
] as const

export const valuableGakuchika = [
  "長期インターンで売上 150% 改善を達成",
  "全国大会出場レベルの部活動キャプテン",
  "海外スタートアップとの共同プロジェクトを主導",
  "学内起業で 500 万円の資金調達",
  "社会課題解決型プロジェクトで賞を受賞",
] as const

export const alliedIndustries = [
  {
    industry: "戦略コンサル (MBB)",
    examples: ["McKinsey & Company", "Boston Consulting Group", "Bain & Company"],
    reason: "高度なロジカルシンキングと分析力が共通し、ケース面接対策が流用可能。",
  },
  {
    industry: "総合系コンサル",
    examples: ["Accenture", "IBM Consulting", "Capgemini"],
    reason: "DX推進やIT実行力を評価する案件が多く、テクノロジー志向のキャリア展開が可能。",
  },
  {
    industry: "外資投資銀行",
    examples: ["Goldman Sachs", "Morgan Stanley", "J.P. Morgan"],
    reason: "定量分析力とタフな交渉力が親和し、財務モデリングスキルを活かせる。",
  },
  {
    industry: "総合商社",
    examples: ["三菱商事", "三井物産", "伊藤忠商事"],
    reason: "リーダーシップとグローバル案件経験が活きる。海外駐在や事業投資で成長機会。",
  },
  {
    industry: "外資テック (FAANG 等)",
    examples: ["Google", "Amazon", "Meta", "Microsoft"],
    reason: "イノベーション志向と問題解決力が共通。プロダクトマネジメントやデータ活用領域で評価される。",
  },
] as const

export const careerFitDiagnostic = {
  questions: [
    { q: "権威ある環境で協調性を重視して働きたい？", a: ["はい", "いいえ"] },
    { q: "最大規模のリソースで挑戦的に成長したい？", a: ["はい", "いいえ"] },
    { q: "多様性とESG分野でリーダーシップを発揮したい？", a: ["はい", "いいえ"] },
    { q: "安定した環境でワークライフバランスを重視したい？", a: ["はい", "いいえ"] },
  ],
  mapping: {
    PwC: {
      fits: "権威×協調型",
      message: "Strategy&の一貫サービスと協調的な文化があなたに最適",
      keywords: ["権威", "協調", "一貫サービス"],
    },
    Deloitte: {
      fits: "挑戦×成長型",
      message: "最大規模のリソースで最先端分野に挑戦できる環境",
      keywords: ["最大規模", "コンサル×テック", "挑戦"],
    },
    EY: {
      fits: "多様性×ESG型",
      message: "People First文化でESG分野のリーダーとして活躍",
      keywords: ["多様性", "ESG", "People First"],
    },
    KPMG: {
      fits: "安定×WLB型",
      message: "公共分野での信頼とワークライフバランスを両立",
      keywords: ["安定", "公共分野", "WLB"],
    },
  },
} as const

export const recruitingSchedule27 = [
  {
    period: "2025 春",
    action: "自己分析・業界研究スタート",
    icon: <Users className="h-5 w-5" />,
    detail: "SPI 練習や BIG4 のビジネスモデル調査、OB･OG訪問を始める",
  },
  {
    period: "2025 夏",
    action: "サマーインターン応募・選考",
    icon: <Calendar className="h-5 w-5" />,
    detail: "各社の特色理解＆早期ルート獲得の最大チャンス（応募締切: 6月中旬〜7月上旬）",
  },
  {
    period: "2025 秋",
    action: "インターン経由の早期内定 & ケース対策強化",
    icon: <Target className="h-5 w-5" />,
    detail: "選抜者はリターンオファー獲得。落選者もケース面接対策を本格開始",
  },
  {
    period: "2025 冬",
    action: "OB訪問ピーク & 本選考情報解禁",
    icon: <Handshake className="h-5 w-5" />,
    detail: "12月〜2月はOB訪問枠が埋まりやすいので早めに予約",
  },
  {
    period: "2026 3月",
    action: "エントリーシート・Webテスト提出",
    icon: <Briefcase className="h-5 w-5" />,
    detail: "ES締切は3月中旬が最多。SPI/GABは事前に模試で時間配分を確認",
  },
  {
    period: "2026 4月",
    action: "GD・一次面接",
    icon: <Users className="h-5 w-5" />,
    detail: "STAR法でエピソード整理＆ロジカルなコミュニケーションを意識",
  },
  {
    period: "2026 5月",
    action: "ケース & 最終面接",
    icon: <Target className="h-5 w-5" />,
    detail: "フェルミ推定・市場規模分析の型を暗記 → 模擬面接で実践",
  },
  {
    period: "2026 初夏",
    action: "内定受諾・オファー比較",
    icon: <Award className="h-5 w-5" />,
    detail: "企業文化・キャリアパス・年収を総合比較しファームを決定",
  },
  {
    period: "2026 夏",
    action: "入社前準備 & 資格学習",
    icon: <BookOpen className="h-5 w-5" />,
    detail: "USCPA ／ TOEIC ／ Python など業務で差がつく資格を先取り",
  },
] as const

export const industryInsights = {
  summary: "BIG4は世界的に有名な4つの大手会計事務所とそのグループ会社",
  coreServices: "監査とコンサルティングが主要業務",
  currentTrends: [
    "AI・テクノロジー投資の加速",
    "ESG・サステナビリティ分野の重要性増大",
    "多様性・包括性への取り組み強化",
    "ワークライフバランス改善への注力",
  ],
} as const

export const big4TrendDetails = [
  {
    title: "生成AIの監査・税務活用",
    desc: "監査手続きの自動化や税務リサーチに生成AIを導入し、効率と精度を向上",
    score: 95,
    icon: <Zap className="h-5 w-5 text-purple-600" />,
  },
  {
    title: "ESG／サステナビリティ報告強化",
    desc: "EU CSRDなど規制拡大に伴い、非財務情報開示と保証業務への需要が急増",
    score: 90,
    icon: <Globe className="h-5 w-5 text-green-600" />,
  },
  {
    title: "クラウド会計 & 自動化プラットフォーム",
    desc: "リアルタイムデータ連携で監査効率化、顧客のデジタルトランスフォーメーションを推進",
    score: 80,
    icon: <Cloud className="h-5 w-5 text-blue-600" />,
  },
  {
    title: "リモートワーク & デジタル監査",
    desc: "ハイブリッドワーク環境に合わせ、遠隔での在庫立会やデジタル証跡活用が標準に",
    score: 75,
    icon: <Laptop className="h-5 w-5 text-indigo-600" />,
  },
  {
    title: "人材多様化とスキル再構築",
    desc: "AI時代に合わせたデータ・サイバー・サステナ専門人材の採用・再教育を強化",
    score: 70,
    icon: <Users className="h-5 w-5 text-rose-600" />,
  },
] as const

/** ===== Placeholder logo paths (update with actual assets) ===== */
export const firmLogos = [
  { name: "Deloitte", src: "/deloitte.png" },
  { name: "PwC", src: "/pwc.png" },
  { name: "EY", src: "/ey.png" },
  { name: "KPMG", src: "/kpmg.png" },
] as const

export const offerDecisionFactors = [
  {
    title: "企業文化との適合性（最重要）",
    desc: "ミッション・バリューや働き方が自身の価値観と一致するか。社員の声や離職率で実態を確認。",
    points: ["ミッション・バリューの共感度", "社員インタビュー／OB訪問での印象", "離職率・定着率"],
  },
  {
    title: "専門分野での成長機会",
    desc: "入社後に専門スキルを磨き続けられるか。多様な案件や研修制度・メンター体制が鍵。",
    points: ["プロジェクトの多様性・難易度", "資格取得支援・研修制度", "メンター／コーチ体制"],
  },
  {
    title: "ワークライフバランスの実現可能性",
    desc: "平均残業時間や休暇取得率、柔軟な働き方制度の有無をチェック。",
    points: ["平均残業時間・月次稼働", "有給・育休取得率", "リモート／フレックス制度"],
  },
  {
    title: "グローバルキャリアの展望",
    desc: "海外案件やクロスボーダーチームでの経験機会、海外オフィスや駐在制度の有無。",
    points: ["海外オフィス・駐在制度", "クロスボーダープロジェクト比率", "語学研修・留学支援"],
  },
  {
    title: "長期的な安定性とキャリアパス",
    desc: "組織成長性と昇進スピード、専門orマネジメントなど多様なキャリアルートがあるか。",
    points: ["売上・人員の成長率", "昇進実績・スピード", "専門職／マネジメント両キャリアラダー"],
  },
] as const

/** ************************************************************ */

type PageProps = { setCurrent: (n: number) => void }

const PageWrapper: FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <section
    className={cn(
      "flex min-h-screen w-full flex-col items-center justify-center gap-8 px-6 pt-28 pb-12 md:px-16 lg:px-32",
      className,
    )}
  >
    {children}
  </section>
)

// ---------- Enhanced Cover Page ----------
const CoverPage: FC<PageProps> = ({ setCurrent }) => (
  <PageWrapper className="pt-12 md:pt-16 pb-10 relative bg-gradient-to-br from-slate-50 via-sky-50 to-violet-50 overflow-hidden">
    {/* Decorative blurred blobs */}
    <div className="pointer-events-none absolute -top-56 -left-56 h-[28rem] w-[28rem] rounded-full bg-sky-200 opacity-40 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-56 -right-56 h-[32rem] w-[32rem] rounded-full bg-violet-200 opacity-50 blur-3xl" />

    <div className="relative text-center space-y-10 max-w-4xl">
      {/* Cover image */}
      <div className="flex justify-center">
        <Image
          src="/whitepapers_con.jpg"
          alt="白書カバー"
          width={1200}
          height={500}
          className="w-full max-w-none md:max-w-4xl h-[40vh] sm:h-[45vh] md:h-[60vh] object-cover object-center rounded-2xl shadow-xl"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-violet-700 to-indigo-700 bg-clip-text text-transparent">
        BIG4完全攻略ガイド
      </h1>

      {/* Subtitle */}
      <p className="text-xl md:text-2xl text-slate-600 leading-relaxed">
        世界的に有名な4つの大手会計事務所<br />
        監査 × コンサルティングで描くキャリアの未来
      </p>

      {/* Feature badges */}
      <div className="flex flex-wrap justify-center gap-4">
        <Badge variant="secondary" className="px-4 py-2 text-sm bg-white/70 backdrop-blur">
          <TrendingUp className="h-4 w-4 mr-2" />
          最新2024年度データ
        </Badge>
        <Badge variant="secondary" className="px-4 py-2 text-sm bg-white/70 backdrop-blur">
          <Users className="h-4 w-4 mr-2" />
          詳細企業分析
        </Badge>
        <Badge variant="secondary" className="px-4 py-2 text-sm bg-white/70 backdrop-blur">
          <Target className="h-4 w-4 mr-2" />
          内定獲得戦略
        </Badge>
      </div>

      {/* Call-to-action */}
      <Button
        size="lg"
        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg"
        onClick={() => setCurrent(1)}
      >
        コンテンツへ進む
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>

    {/* Scroll indicator */}
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
      <ChevronDown className="h-8 w-8 text-indigo-600" />
    </div>
  </PageWrapper>
);

/* ---------- Improved IntroReasons Page ---------- */
const IntroReasons: FC<PageProps> = () => (
  <PageWrapper className="pt-14 md:pt-16 pb-20 bg-gradient-to-b from-white via-slate-50 to-white">
    <div className="max-w-4xl w-full space-y-12">
      {/* Heading */}
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent text-center mb-2">
        BIG4とは？
      </h2>
      <div className="h-1 w-32 mx-auto bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full mb-6" />

      <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
        BIG4は世界的に有名な4つの大手会計事務所とそのグループ会社
      </p>

      {/* Key facts */}
      {(() => {
        const totalEmployees = big4FY2024Results.reduce((sum, f) => sum + f.employees, 0);
        const totalRevenueJpy = usdToJpy(
          big4FY2024Results.reduce((sum, f) => sum + f.revenueUSD, 0) * 1_000_000_000,
        );

        const facts = [
          {
            label: "総従業員数",
            value: formatCount(totalEmployees),
            icon: <Users className="h-6 w-6 text-indigo-600" />,
          },
          {
            label: "総売上高 (2024年度)",
            value: formatJpy(totalRevenueJpy),
            icon: <DollarSign className="h-6 w-6 text-green-600" />,
          },
          {
            label: "展開国数",
            value: "150ヵ国以上",
            icon: <Globe className="h-6 w-6 text-sky-600" />,
          },
        ] as const;
        return (
          <div className="grid sm:grid-cols-3 gap-6 mb-16">
            {facts.map((fact, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center p-6 rounded-xl bg-white/90 backdrop-blur-md border hover:shadow-lg transition-all duration-300 group"
              >
                <div className="mb-4 p-4 rounded-full bg-gradient-to-tr from-indigo-100 via-purple-100 to-cyan-100 animate-pulse-slow">
                  {fact.icon}
                </div>
                <div className="text-2xl font-bold mb-1">{fact.value}</div>
                <div className="text-sm text-muted-foreground">{fact.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Firm logos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 items-center justify-center mb-10">
        {firmLogos.map((f) => (
          <div key={f.name} className="flex flex-col items-center">
            <Image
              src={f.src}
              alt={`${f.name} logo`}
              width={120}
              height={60}
              className="object-contain h-12 w-auto"
            />
            <span className="mt-2 text-sm font-medium">{f.name}</span>
          </div>
        ))}
      </div>

      {/* Core business cards */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {Object.entries(big4CoreBusiness).map(([key, business]) => (
          <Popover key={key}>
            <PopoverTrigger asChild>
              <Card
                className="text-center cursor-pointer bg-white/70 backdrop-blur-lg border border-transparent shadow-md hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <CardContent className="pt-10 pb-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-tr from-indigo-400/25 via-purple-400/25 to-cyan-400/25 flex items-center justify-center shadow-inner">
                    {business.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{business.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {business.description}
                  </p>
                </CardContent>
              </Card>
            </PopoverTrigger>
            <PopoverContent className="max-w-sm text-sm leading-relaxed">
              <h4 className="font-semibold mb-2">{business.title}ってどんな仕事？</h4>
              <p>{businessDetails[key as keyof typeof big4CoreBusiness]}</p>
            </PopoverContent>
          </Popover>
        ))}
      </div>

      {/* Industry Trends */}
      <h3 className="text-2xl font-bold text-center mb-10">業界の最新トレンド</h3>
      <div className="grid md:grid-cols-2 gap-6">
        {big4TrendDetails.map((t, i) => (
          <Card key={i} className="hover:shadow-lg transition-all duration-300">
            <CardContent className="flex items-start gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {t.icon}
              </div>
              <div className="flex-1 space-y-2">
                <div className="font-semibold">{t.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </PageWrapper>
);

const HistoryAndDomains: FC<PageProps> = () => (
  <PageWrapper className="bg-gradient-to-b from-white via-slate-50 to-white">
    <div className="max-w-4xl w-full text-center space-y-8">
      {/* Section heading */}
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent">
        BIG4 の業界ポジション
      </h2>
      <div className="h-1 w-28 mx-auto bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full" />

      {/* Hero highlight */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 via-white to-violet-50" />
        <div className="relative p-10 md:p-14 flex flex-col items-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center shadow-inner">
            <BarChart3 className="h-12 w-12 text-indigo-600" />
          </div>
          <p className="text-lg md:text-xl leading-relaxed text-slate-700 max-w-2xl">
            世界的に有名な四つの大手会計事務所として
            <br />
            監査・コンサルティング業界をリード
          </p>
        </div>
      </div>

      {/* Industry key stats */}
      {(() => {
        const stats = [
          {
            label: "世界監査・コンサル市場規模(推定)",
            value: formatJpy(usdToJpy(2_800_000_000_000)), // ≒2.8兆ドル
            icon: <DollarSign className="h-6 w-6 text-emerald-600" />,
          },
          {
            label: "BIG4売上シェア",
            value: "約40%",
            icon: <PieChart className="h-6 w-6 text-indigo-600" />,
          },
          {
            label: "Fortune500 監査/アドバイザリ採用数",
            value: "490社+",
            icon: <Target className="h-6 w-6 text-purple-600" />,
          },
        ] as const

        return (
          <div className="grid sm:grid-cols-3 gap-6 my-10">
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center p-6 rounded-xl bg-white/90 backdrop-blur-md border hover:shadow-lg transition-all duration-300"
              >
                <div className="mb-4 p-4 rounded-full bg-gradient-to-tr from-indigo-100 via-purple-100 to-cyan-100">
                  {s.icon}
                </div>
                <div className="text-2xl font-bold mb-1">{s.value}</div>
                <div className="text-sm text-muted-foreground text-center">{s.label}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* BIG4 Revenue Comparison 2024 (USD billions) */}
      {(() => {
        const maxRev = Math.max(...big4FY2024Results.map((r) => r.revenueUSD))
        return (
          <div className="my-12 space-y-4">
            <h3 className="text-xl font-semibold text-left mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              2024年度 売上規模比較
            </h3>
            {big4FY2024Results
              .slice() // shallow copy
              .sort((a, b) => b.revenueUSD - a.revenueUSD)
              .map((f, i) => {
                const width = (f.revenueUSD / maxRev) * 100
                const firmIcon = firms.find((x) => x.name === f.name)?.icon
                return (
                  <div key={i} className="flex items-center gap-3">
                    {firmIcon}
                    <span className="w-20 text-sm font-medium">{f.name}</span>
                    <div className="flex-1 h-3 bg-slate-100 rounded">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm">
                      {f.revenueUSD}
                      <span className="text-xs">B</span>
                    </span>
                  </div>
                )
              })}
          </div>
        )
      })()}

      {/* Core Service Domains */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          {
            label: "監査",
            icon: Shield,
            desc: "財務諸表の信頼性を保証し投資家へ透明性を提供",
          },
          {
            label: "税務",
            icon: DollarSign,
            desc: "税務コンプライアンス支援と税負担最適化",
          },
          {
            label: "アドバイザリー",
            icon: Briefcase,
            desc: "戦略策定から業務改革・M&A支援まで",
          },
          {
            label: "テクノロジー",
            icon: Zap,
            desc: "生成AIやクラウドでDXと監査自動化を推進",
          },
          {
            label: "リスク",
            icon: AlertTriangle,
            desc: "不正検知・規制対応など総合リスク管理",
          },
          {
            label: "サステナ",
            icon: Globe,
            desc: "ESG報告や脱炭素戦略で社会価値を向上",
          },
          {
            label: "人事・組織",
            icon: Users,
            desc: "組織設計・報酬制度構築で人材戦略を支援",
          },
          {
            label: "M&A",
            icon: Handshake,
            desc: "買収戦略立案からPMIまで一気通貫で支援",
          },
        ].map((d, i) => {
          const Icon = d.icon
          return (
            <div
              key={i}
              className="group flex flex-col items-center justify-center gap-3 p-6 bg-white/70 backdrop-blur rounded-2xl border hover:border-indigo-300 shadow transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shadow-inner">
                <Icon className="h-6 w-6 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="font-medium text-sm">{d.label}</div>
              <p className="text-xs text-muted-foreground text-center leading-snug">
                {d.desc}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  </PageWrapper>
)

const SnapshotComparison: FC<PageProps> = () => (
  <PageWrapper>
    <div className="max-w-6xl w-full">
      <h2 className="text-3xl font-bold text-center mb-12">4 社詳細比較</h2>
      <div className="grid md:grid-cols-2 gap-8">
        {firms.map((firm) => {
          const result = big4FY2024Results.find((r) => r.name === firm.name)!
          return (
            <Card key={firm.name} className="hover:shadow-lg transition-all duration-300">
              <CardHeader className={cn("bg-white", "border-b")}>
                <div className="flex items-center justify-between">
                  {firm.icon}
                  <Badge variant="secondary">{firm.fiscalYear}</Badge>
                </div>
                <CardTitle className="text-xl">{firm.name}</CardTitle>
                <p className={cn("text-sm font-medium", firm.color)}>{firm.headline}</p>
              </CardHeader>
              {/* --- Begin enriched CardContent block --- */}
              <CardContent className="pt-4">
                <div className="space-y-4 text-sm">
                  {[
                    {
                      label: "売上",
                      value: formatJpy(usdToJpy(result.revenueUSD * 1_000_000_000)),
                    },
                    { label: "従業員", value: formatCount(result.employees) },
                    { label: "成長率", value: result.revenueGrowthRate },
                    { label: "重点分野", value: result.keyFocus },
                  ].map((row, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-semibold text-right">{row.value}</span>
                    </div>
                  ))}

                  {/* Strength & Challenge preview */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <h4 className="text-xs font-semibold mb-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        強み
                      </h4>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        {firm.strengths.slice(0, 2).map((s, i) => (
                          <li key={i} className="text-muted-foreground">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-orange-600" />
                        課題
                      </h4>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        {firm.challenges.slice(0, 1).map((c, i) => (
                          <li key={i} className="text-muted-foreground">
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
              {/* --- End enriched CardContent block --- */}
            </Card>
          )
        })}
      </div>
    </div>
  </PageWrapper>
)

// --- Enhanced Firm Detail Pages ---
const makeFirmDetail =
  (firmName: "PwC" | "EY" | "KPMG" | "Deloitte"): FC<PageProps> =>
  () => {
    const firm = firms.find((f) => f.name === firmName)!
    const firmResult = big4FY2024Results.find((f) => f.name === firmName)!

    return (
      <PageWrapper>
        <div className="max-w-4xl w-full space-y-8">
          <Card className="overflow-hidden">
            <CardHeader className={cn("bg-gradient-to-r text-white", firm.bgGradient.replace("/20", ""))}>
              <div className="flex items-center gap-4">
                {firm.icon}
                <div>
                  <CardTitle className="text-3xl text-white">{firm.name}</CardTitle>
                  <p className="text-white/90 text-lg mt-2">{firm.headline}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    基本情報
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">売上</span>
                      <span className="font-semibold">
                        {formatJpy(usdToJpy(firmResult.revenueUSD * 1_000_000_000))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">従業員数</span>
                      <span className="font-semibold">{formatCount(firmResult.employees)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">成長率</span>
                      <span className="font-semibold text-sm">{firmResult.revenueGrowthRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">重点分野</span>
                      <span className="font-semibold text-sm">{firmResult.keyFocus}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    特徴・強み
                  </h3>
                  <ul className="space-y-3">
                    {firm.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent News Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                最新動向・注目ポイント
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-green-700">強み・機会</h4>
                  <ul className="space-y-2">
                    {firm.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-orange-700">課題・リスク</h4>
                  <ul className="space-y-2">
                    {firm.challenges.map((challenge, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        {challenge}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3">最新ニュース</h4>
                <div className="space-y-2">
                  {firm.recentNews.map((news, i) => (
                    <Alert key={i}>
                      <AlertDescription className="text-sm">{news}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    )
  }

const PwCDetail = makeFirmDetail("PwC")
const EYDetail = makeFirmDetail("EY")
const KPMGDetail = makeFirmDetail("KPMG")
const DeloitteDetail = makeFirmDetail("Deloitte")

const MatrixPage: FC<PageProps> = () => (
  <PageWrapper>
    <div className="max-w-6xl w-full">
      <h2 className="text-3xl font-bold text-center mb-12">詳細比較マトリクス</h2>
      <Card className="overflow-hidden mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-6 w-6" />
            企業文化 × 強み × 最新動向
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2">
                  <th className="py-4 px-4 text-left font-semibold">Firm</th>
                  {big4ComparisonMatrix.headers.map((header, i) => (
                    <th key={i} className="py-4 px-4 text-center font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {big4ComparisonMatrix.rows.map((row, i) => {
                  const firm = firms.find((f) => f.name === row[0])
                  return (
                    <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {firm?.icon}
                          <span className="font-semibold">{row[0]}</span>
                        </div>
                      </td>
                      {row.slice(1).map((cell, j) => (
                        <td key={j} className="py-4 px-4 text-center">
                          <Badge variant="outline" className="text-xs">
                            {cell}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Culture & WLB Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-6 w-6" />
            企業文化 & 働き方の特徴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {firmCulturesWLB.map((item, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  {firms.find((f) => f.name === item.firm)?.icon}
                  <span className="font-semibold text-lg">{item.firm}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">企業文化: </span>
                    <span>{item.culture}</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-700">働き方: </span>
                    <span>{item.wlb}</span>
                  </div>
                  <div>
                    <span className="font-medium text-purple-700">評判: </span>
                    <span>{item.reputation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </PageWrapper>
)

const InterviewGuide: FC<PageProps> = () => (
  <PageWrapper>
    <div className="max-w-4xl w-full space-y-8">
      <h2 className="text-3xl font-bold text-center">面接必勝ガイド</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-600" />
            STAR 法テンプレートの利用
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            STARとは、<strong>S</strong>ituation（状況）、<strong>T</strong>ask（課題・目標）、
            <strong>A</strong>ction（具体的行動）、<strong>R</strong>esult（結果・学び）の頭文字を取った
            フレームワークで、エピソードを簡潔かつ論理的に伝えるための構造化手法です。
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { letter: "S", word: "Situation", desc: "状況設定", color: "bg-red-100 text-red-700" },
              { letter: "T", word: "Task", desc: "課題・目標", color: "bg-blue-100 text-blue-700" },
              { letter: "A", word: "Action", desc: "具体的行動", color: "bg-green-100 text-green-700" },
              { letter: "R", word: "Result", desc: "結果・学び", color: "bg-purple-100 text-purple-700" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
                    item.color,
                  )}
                >
                  {item.letter}
                </div>
                <div>
                  <div className="font-semibold">{item.word}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6 text-green-600" />
            "なぜこのファームを選んだのですか?" に対する最新版回答例
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {interviewWhyThisFirm.map((item, i) => {
              const firm = firms.find((f) => f.name === item.firm)
              return (
                <div key={i} className="border rounded-lg p-6 space-y-4">
                  {/* Firm header */}
                  <div className="flex items-center gap-3">
                    {firm?.icon}
                    <span className="font-semibold text-lg">{item.firm}</span>
                    <Badge variant="outline">{item.keyPoint}</Badge>
                  </div>

                  {/* Position‑specific answers */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {item.positions.map((pos, j) => (
                      <div key={j} className="space-y-3 p-4 border rounded-md bg-white/70">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <span className="font-medium">{pos.label}</span>
                        </div>

                        <div className="p-3 bg-green-50 rounded-lg flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <span className="text-xs sm:text-sm">{pos.good}</span>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <span className="text-xs sm:text-sm">{pos.ng}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  </PageWrapper>
)


const CaseStudy: FC<PageProps> = () => (
  <PageWrapper>
    <div className="max-w-4xl w-full">
      <h2 className="text-3xl font-bold text-center mb-12">内定者が重視したポイント</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-yellow-600" />
            内定獲得の決定要因（重要度順）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {offerDecisionFactors.map((factor, i) => (
              <div
                key={i}
                className="space-y-2 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100 border hover:shadow-md transition-shadow"
              >
                {/* Rank & title row */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {i + 1}
                  </div>
                  <span className="font-medium flex-1">{factor.title}</span>
                  <Progress value={100 - i * 15} className="w-24" />
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed">{factor.desc}</p>

                {/* Check points */}
                <ul className="pl-5 list-disc space-y-1 text-xs">
                  {factor.points.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </PageWrapper>
)

/* --- 就活倍率ページ --- */
const CompetitionPage: FC<PageProps> = () => (
  <PageWrapper>
    <div className="max-w-4xl w-full">
      <h2 className="text-3xl font-bold text-center mb-12">BIG4 基礎就活情報（倍率）</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            最新倍率まとめ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {big4CompetitionRates.map((item, i) => {
              const firm = firms.find((f) => f.name === item.name)
              return (
                <div key={i} className="p-4 rounded-lg border hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    {firm?.icon}
                    <span className="font-semibold">{item.name}</span>
                  </div>
                  <p className="text-sm mb-1">{item.internshipRate}</p>
                  <p className="text-sm">{item.mainRate}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  </PageWrapper>
)

/* --- ガクチカ例ページ --- */
const GakuchikaPage: FC<PageProps> = () => (
  <PageWrapper>
    <div className="max-w-4xl w-full">
      <h2 className="text-3xl font-bold text-center mb-12">ガクチカで有用な経験例</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-600" />
            高評価ガクチカ 5 選
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {valuableGakuchika.map((g, i) => (
              <li key={i} className="flex items-start gap-3">
                <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
                <span className="text-sm">{g}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  </PageWrapper>
)

/* --- 併願先ページ --- */
const AlliedIndustriesPage: FC<PageProps> = () => (
  <PageWrapper>
    <div className="max-w-4xl w-full">
      <h2 className="text-3xl font-bold text-center mb-12">併願先として相性の良い企業・業界</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-6 w-6" />
            業界と親和性
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alliedIndustries.map((a, i) => (
              <div key={i} className="p-4 rounded-lg border hover:shadow-sm transition-shadow space-y-1">
                <div className="font-semibold">{a.industry}</div>
                <p className="text-sm text-muted-foreground">{a.reason}</p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">代表企業:</span> {a.examples.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </PageWrapper>
)

const Timeline: FC<PageProps> = () => {
  const total = recruitingSchedule27.length;
  return (
    <PageWrapper>
      <div className="max-w-4xl w-full">
        <h2 className="text-3xl font-bold text-center mb-12">27卒 就活スケジュール</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              重要スケジュール & 対策ポイント
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recruitingSchedule27.map((item, i) => (
                <div
                  key={i}
                  className="p-4 space-y-3 rounded-lg border hover:shadow-md transition-shadow"
                >
                  {/* Main row */}
                  <div className="flex items-start gap-6">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      {item.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg">{item.period}</div>
                      <div className="text-muted-foreground mb-2">{item.action}</div>
                      <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded break-words">
                        {item.detail}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {i + 1}
                    </div>
                  </div>

                  {/* Progress bar (full‑width) */}
                  <Progress
                    value={((i + 1) / total) * 100}
                    className="h-1 w-full bg-slate-200"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}

/* --- 診断クイズページ (Yes/No) --- */
const firmKeys = ["PwC", "Deloitte", "EY", "KPMG"] as const;

const CareerFitQuiz: FC<PageProps> = () => {
  const qs = careerFitDiagnostic.questions;
  const [answers, setAnswers] = useState<(boolean | null)[]>(
    Array(qs.length).fill(null),
  );
  const allAnswered = answers.every((a) => a !== null);

  /* ---------- Scoring & recommendation logic (weighted) ---------- */
  type Firm = typeof firmKeys[number];

  /**
   * 質問ごとに「はい」を選択した場合に各ファームへ加算される重み
   * Key = question index
   * Value = { PwC?: number, Deloitte?: number, EY?: number, KPMG?: number }
   * 重み付けは各社のカルチャー・強みへの親和性を考慮
   */
  const questionWeights: Record<number, Partial<Record<Firm, number>>> = {
    // Q1: 権威 × 協調 → PwC が最適、他社はややマッチ
    0: { PwC: 3, Deloitte: 1, EY: 1, KPMG: 1 },
    // Q2: 最大規模 × 挑戦 → Deloitte が最適
    1: { Deloitte: 3, PwC: 1, EY: 1, KPMG: 1 },
    // Q3: 多様性 × ESG → EY が最適
    2: { EY: 3, PwC: 1, Deloitte: 1, KPMG: 1 },
    // Q4: 安定 × WLB → KPMG が最適
    3: { KPMG: 3, PwC: 1, EY: 1, Deloitte: 1 },
  };

  // ベーススコア初期化
  const scores: Record<Firm, number> = {
    PwC: 0,
    Deloitte: 0,
    EY: 0,
    KPMG: 0,
  };

  // 「はい」を選んだ質問に対応する重みを加算
  answers.forEach((ans, idx) => {
    if (!ans) return; // 「いいえ」ならスキップ
    const weights = questionWeights[idx] || {};
    (Object.keys(weights) as Firm[]).forEach((f) => {
      scores[f] += weights[f]!;
    });
  });

  // 推薦判定
  const maxScore = Math.max(...Object.values(scores));
  const recommendedFirms: Firm[] =
    maxScore > 0
      ? (firmKeys.filter((f) => scores[f] === maxScore) as Firm[])
      : [];
  const recommendedFirm = recommendedFirms.length === 1 ? recommendedFirms[0] : null;

  /* ---------- Helper for score bars ---------- */
  const ScoreBar: FC<{ label: Firm; score: number; max: number }> = ({
    label,
    score,
    max,
  }) => (
    <div className="flex items-center gap-3">
      {firms.find((f) => f.name === label)?.icon}
      <span className="w-20 text-sm font-medium">{label}</span>
      <Progress value={(score / max) * 100} className="flex-1" />
      <span className="w-6 text-right text-sm font-semibold">{score}</span>
    </div>
  );

  return (
    <PageWrapper>
      <div className="max-w-3xl w-full space-y-10">
        <h2 className="text-3xl font-bold text-center">あなたに合う BIG4 は？</h2>

        {/* 質問リスト */}
        <div className="space-y-6">
          {qs.map((q, i) => (
            <Card key={i}>
              <CardContent className="p-6 flex flex-col gap-4">
                <p className="font-medium">
                  {i + 1}. {q.q}
                </p>
                <div className="flex gap-4">
                  {["はい", "いいえ"].map((label, j) => {
                    const val = j === 0;
                    const selected = answers[i] === val;
                    return (
                      <Button
                        key={label}
                        variant={selected ? "default" : "outline"}
                        onClick={() =>
                          setAnswers((prev) => {
                            const copy = [...prev];
                            copy[i] = val;
                            return copy;
                          })
                        }
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 診断結果 */}
        {allAnswered && (
          <div className="space-y-6">
            {recommendedFirm ? (
              <Card className="border-2 border-primary shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {firms.find((f) => f.name === recommendedFirm)?.icon}
                    あなたにおすすめ: {recommendedFirm}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    フィットタイプ:{" "}
                    {careerFitDiagnostic.mapping[recommendedFirm].fits}
                  </p>
                  <p className="text-sm">
                    {careerFitDiagnostic.mapping[recommendedFirm].message}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {careerFitDiagnostic.mapping[recommendedFirm].keywords.map(
                      (k) => (
                        <Badge key={k} variant="secondary">
                          {k}
                        </Badge>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : recommendedFirms.length > 1 ? (
              <Alert>
                <AlertDescription className="text-sm">
                  同点で複数のファームが最適候補です: {recommendedFirms.join(", ")}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertDescription className="text-sm">
                  すべて「いいえ」が選択されています。少なくとも1つ「はい」を選択して診断してください。
                </AlertDescription>
              </Alert>
            )}

            {/* スコア可視化 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  あなたのフィットスコア
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {firmKeys.map((f) => (
                  <ScoreBar
                    key={f}
                    label={f}
                    score={scores[f]}
                    max={qs.length * 3}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

const ServiceSteps: FC<PageProps> = () => (
  <PageWrapper>
    <div className="max-w-4xl w-full">
      <h2 className="text-3xl font-bold text-center mb-12">BIG4内定獲得 3 STEP</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: "企業研究と自己分析",
            icon: <Users className="h-8 w-8" />,
            color: "from-blue-500 to-blue-600",
            detail: "各社の文化・強み・最新動向を深く理解",
          },
          {
            title: "面接対策とケース練習",
            icon: <Target className="h-8 w-8" />,
            color: "from-green-500 to-green-600",
            detail: "STAR法とWhy this firm?の完璧な準備",
          },
          {
            title: "内定獲得と意思決定",
            icon: <Award className="h-8 w-8" />,
            color: "from-purple-500 to-purple-600",
            detail: "文化フィットと将来ビジョンで最終判断",
          },
        ].map((step, i) => (
          <Card key={i} className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div
                className={cn(
                  "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-gradient-to-r text-white",
                  step.color,
                )}
              >
                {step.icon}
              </div>
              <CardTitle className="text-xl">STEP {i + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium mb-2">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </PageWrapper>
)

const SignupIncentive: FC<PageProps> = () => (
  <PageWrapper className="bg-gradient-to-br from-primary/5 to-primary/10">
    <div className="max-w-4xl w-full text-center">
      <h2 className="text-3xl font-bold mb-8">限定特典で内定確率UP！</h2>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Download className="h-8 w-8 text-primary" />
            今だけ限定特典
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Download className="h-6 w-6" />, title: "最新面接対策資料", desc: "2024年版完全ガイド" },
              { icon: <Users className="h-6 w-6" />, title: "1対1キャリア相談", desc: "BIG4出身者が直接アドバイス" },
              {
                icon: <Briefcase className="h-6 w-6" />,
                title: "内定者体験談集",
                desc: "実際の選考プロセス詳細レポート",
              },
            ].map((benefit, i) => (
              <div key={i} className="text-center p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {benefit.icon}
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="px-12 py-6 text-lg bg-slate-800 hover:bg-slate-700 text-white"
      >
        今すぐ無料で特典を受け取る
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>

      <p className="text-sm text-muted-foreground mt-4">※ 完全無料・メール配信はいつでも停止可能 ※ 27卒限定特典</p>
    </div>
  </PageWrapper>
)

const Appendix: FC<PageProps> = () => (
  <PageWrapper>
    <div className="max-w-4xl w-full">
      <h2 className="text-3xl font-bold text-center mb-12">参考資料 &amp; 最新データ</h2>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              業界概要
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{industryInsights.summary}</p>
            <p className="text-sm">{industryInsights.coreServices}</p>
            <div className="pt-2">
              <h4 className="font-semibold mb-2">最新トレンド</h4>
              <ul className="text-sm space-y-1">
                {industryInsights.currentTrends.map((trend, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-blue-600" />
                    {trend}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              2024年度 業績ハイライト
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {big4FY2024Results.map((firm, i) => (
                <div key={i} className="p-4 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2 mb-2">
                    {firms.find((f) => f.name === firm.name)?.icon}
                    <span className="font-semibold">{firm.name}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>売上: {formatJpy(usdToJpy(firm.revenueUSD * 1_000_000_000))}</div>
                    <div>成長: {firm.revenueGrowthRate}</div>
                    <div className="text-muted-foreground">{firm.notes}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </PageWrapper>
)

// ---------- Pages Array ----------
const pages: { id: number; component: FC<PageProps>; label: string }[] = [
  { id: 0, component: CoverPage, label: "Cover" },
  { id: 1, component: IntroReasons, label: "BIG4とは" },
  { id: 2, component: HistoryAndDomains, label: "業界ポジション" },
  { id: 3, component: SnapshotComparison, label: "4社比較" },
  { id: 4, component: PwCDetail, label: "PwC詳細" },
  { id: 5, component: EYDetail, label: "EY詳細" },
  { id: 6, component: KPMGDetail, label: "KPMG詳細" },
  { id: 7, component: DeloitteDetail, label: "Deloitte詳細" },
  { id: 8, component: MatrixPage, label: "詳細比較" },
  { id: 9, component: CompetitionPage, label: "倍率情報" },
  { id: 10, component: ServiceSteps, label: "内定獲得3STEP" },
  { id: 11, component: InterviewGuide, label: "面接対策" },
  { id: 12, component: CaseStudy, label: "内定要因" },
  { id: 13, component: Timeline, label: "就活スケジュール" },
  { id: 14, component: AlliedIndustriesPage, label: "併願先" },
  { id: 15, component: CareerFitQuiz, label: "おすすめ診断" },
  { id: 16, component: Appendix, label: "参考資料" }
]

// ---------- Root Component ----------
export default function BIG4WhitepaperPage() {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const goPrev = () => setCurrent((p) => Math.max(0, p - 1))
  const goNext = () => setCurrent((p) => Math.min(pages.length - 1, p + 1))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return
      const diff = e.changedTouches[0].clientX - touchStartX.current
      if (diff > 50) goPrev()
      if (diff < -50) goNext()
      touchStartX.current = null
    }

    window.addEventListener("keydown", onKey)
    window.addEventListener("touchstart", onTouchStart)
    window.addEventListener("touchend", onTouchEnd)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  const Current = pages[current].component

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      {/* Page Content */}
      <Current setCurrent={setCurrent} />

      {/* Enhanced Navigation */} 
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-background/95 backdrop-blur-md px-6 py-3 rounded-full border shadow-lg">
        <Button
          variant="outline" 
          size="icon"
          onClick={goPrev}
          disabled={current === 0}
          className="rounded-full bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex gap-2">
          {pages.map((p, i) => (
            <button
              key={p.id}
              aria-label={`page ${i + 1}`}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-200",
                i === current ? "bg-primary w-6" : "bg-muted-foreground/40 hover:bg-muted-foreground/60",
              )}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={goNext}
          disabled={current === pages.length - 1}
          className="rounded-full bg-transparent"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </main>
  )
}

// Slow pulse animation for statistic icons
const animatePulseSlow = `
  @keyframes pulse-slow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .5; transform: scale(.95); }
  }
`;