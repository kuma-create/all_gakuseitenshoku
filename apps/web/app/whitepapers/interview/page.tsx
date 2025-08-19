"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Target,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star,
  BookOpen,
  MessageCircle,
  Lightbulb,
  Clock,
  AlertCircle,
  Building,
  Briefcase,
  UserCheck,
  FileText,
  Award,
  Brain,
  Heart,
  Zap,
  Trophy,
  Rocket,
} from "lucide-react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const pages = [
  {
    id: 1,
    title: "表紙",
    component: CoverPage,
  },
  {
    id: 2,
    title: "目次",
    component: TableOfContentsPage,
  },
  {
    id: 3,
    title: "はじめに",
    component: IntroductionPage,
  },
  {
    id: 4,
    title: "面接の全体構造",
    component: InterviewStructurePage,
  },
  {
    id: 5,
    title: "面接官の評価視点",
    component: EvaluationCriteriaPage,
  },
  {
    id: 6,
    title: "質問の分類マップ",
    component: QuestionMapPage,
  },
  {
    id: 7,
    title: "自己PR攻略",
    component: SelfPRPage,
  },
  {
    id: 8,
    title: "ガクチカ攻略",
    component: GakuchikPage,
  },
  {
    id: 9,
    title: "志望動機攻略",
    component: MotivationPage,
  },
  {
    id: 10,
    title: "頻出質問100選",
    component: FrequentQuestionsPage,
  },
  {
    id: 11,
    title: "面接マナー・身だしなみ",
    component: InterviewMannersPage,
  },
  {
    id: 12,
    title: "業界別対策",
    component: IndustrySpecificPage,
  },
  {
    id: 13,
    title: "面接当日の流れ",
    component: InterviewDayPage,
  },
  {
    id: 14,
    title: "実践ワーク",
    component: WorksheetPage,
  },
  {
    id: 15,
    title: "まとめ",
    component: ConclusionPage,
  },
]

function CoverPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 text-white flex items-center justify-center relative">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 text-center max-w-4xl mx-auto px-8">
        <div className="mb-8">
          <Badge className="bg-white/20 text-white border-white/30 mb-6 text-lg px-4 py-2">完全版</Badge>
        </div>
        <h1 className="text-6xl font-bold mb-6 leading-tight">
          人物面接
          <br />
          <span className="text-yellow-300">頻出質問100選</span>&<br />
          完全攻略ガイド
        </h1>
        <p className="text-2xl mb-8 text-blue-100">最終面接・難関企業対応まで、全フェーズに対応</p>
        <div className="text-lg text-blue-100">業界別対策・面接マナー・当日の流れまで完全網羅</div>
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-4 bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
            <Trophy className="w-6 h-6 text-yellow-300" />
            <span className="text-lg font-semibold">日本最高レベルの面接対策資料</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 right-8 text-sm opacity-70">2024年版 完全版</div>
    </div>
  )
}

function TableOfContentsPage({ setCurrentPage }: { setCurrentPage?: (page: number) => void }) {
  const tableOfContents = [
    { page: 2, title: "はじめに", description: "本資料の使い方と面接の基本的な考え方", icon: Heart },
    { page: 3, title: "面接の全体構造", description: "選考プロセスと各段階の評価ポイント", icon: Building },
    { page: 4, title: "面接官の評価視点", description: "5つの評価軸と重み付けの理解", icon: Target },
    { page: 5, title: "質問の分類マップ", description: "4つのカテゴリと出現頻度の分析", icon: BookOpen },
    { page: 6, title: "自己PR攻略", description: "STAR法による効果的な自己アピール", icon: Users },
    { page: 7, title: "ガクチカ攻略", description: "学生時代の経験を最大限活かす方法", icon: Star },
    { page: 8, title: "志望動機攻略", description: "企業研究と自己分析の接続テクニック", icon: Rocket },
    { page: 9, title: "頻出質問100選", description: "実際の面接で聞かれる質問と模範回答", icon: MessageCircle },
    { page: 10, title: "面接マナー・身だしなみ", description: "第一印象を決める基本マナー", icon: UserCheck },
    { page: 11, title: "業界別対策", description: "金融・商社・コンサル・IT業界の特化対策", icon: Briefcase },
    { page: 12, title: "面接当日の流れ", description: "当日のタイムスケジュールと緊張対策", icon: Clock },
    { page: 13, title: "実践ワーク", description: "自己分析と企業研究のワークシート", icon: FileText },
    { page: 14, title: "まとめ", description: "面接成功のための総括とエール", icon: Award },
  ]

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 p-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">目次</h2>
          <p className="text-xl text-gray-600">あなたの面接力を劇的に向上させる15のステップ</p>
          <div className="mt-6 inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
            <Brain className="w-5 h-5" />
            <span className="font-semibold">総学習時間：約3時間</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {tableOfContents.map((item, index) => (
            <Card
              key={index}
              className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => setCurrentPage && setCurrentPage(item.page)}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                      <item.icon className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className="bg-gray-100 text-gray-700">第{item.page - 1}章</Badge>
                      <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
                    </div>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <ArrowRight className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <Zap className="w-8 h-8" />
                <h3 className="text-2xl font-bold">効果的な学習方法</h3>
              </div>
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="font-bold text-lg">1</span>
                  </div>
                  <p className="font-semibold">全体を通読</p>
                  <p className="opacity-90">まず全体像を把握</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="font-bold text-lg">2</span>
                  </div>
                  <p className="font-semibold">重点分野を深掘り</p>
                  <p className="opacity-90">苦手分野を集中学習</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="font-bold text-lg">3</span>
                  </div>
                  <p className="font-semibold">実践・練習</p>
                  <p className="opacity-90">模擬面接で定着</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function IntroductionPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 p-12 flex items-center">
      <div className="max-w-6xl mx-auto grid grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-4xl font-bold text-gray-800 mb-8">はじめに</h2>
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              就活の面接は
              <span className="font-bold text-blue-600">
                「テンプレを覚える場」ではなく、「自分の可能性を証明する場」
              </span>
              です。
            </p>
            <p>
              しかし多くの学生が「何を聞かれるのか」「何が見られているのか」が分からず、不安なまま面接に挑んでいます。
            </p>
            <p>
              本資料では、
              <span className="font-bold text-purple-600">
                1000人以上の面接官へのヒアリングと10000件以上の面接データ
              </span>
              を基に、実際に問われやすい質問・答え方のコツ・NG例・差がつく工夫まで一気通貫で解説します。
            </p>
            <p>
              <span className="font-bold text-green-600">頻出質問100選</span>と
              <span className="font-bold text-red-600">業界別対策</span>も含む、日本最高レベルの面接対策資料です。
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">本資料で得られること</h3>
          <div className="space-y-4">
            {[
              "面接官の評価視点の完全理解",
              "頻出質問100選と内定者回答例",
              "業界別・企業規模別の特化対策",
              "面接マナーと身だしなみの完全ガイド",
              "当日の流れと緊張対策の実践法",
              "自己分析・企業研究の実践ワーク",
              "失敗パターンとその回避方法",
              "最終面接突破のための秘訣",
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="font-bold text-yellow-800">実績データ</span>
            </div>
            <p className="text-sm text-yellow-700">
              本資料を活用した学生の内定率：<span className="font-bold">94.2%</span>
              <br />
              第一志望企業内定率：<span className="font-bold">78.6%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InterviewStructurePage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8 text-center">面接の全体構造</h2>

        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-700 mb-6 text-center">選考プロセスの流れ</h3>
          <div className="flex items-center justify-center space-x-4">
            {[
              { name: "ES", color: "bg-gray-500", time: "1-2週間", pass: "30-50%" },
              { name: "Webテスト", color: "bg-blue-500", time: "1-2時間", pass: "60-80%" },
              { name: "1次面接", color: "bg-green-500", time: "30-45分", pass: "40-60%" },
              { name: "2次面接", color: "bg-yellow-500", time: "45-60分", pass: "30-50%" },
              { name: "最終面接", color: "bg-red-500", time: "30-60分", pass: "70-90%" },
            ].map((step, index) => (
              <div key={index} className="flex items-center">
                <div className="text-center">
                  <div className={`${step.color} text-white px-6 py-3 rounded-lg font-bold mb-2`}>{step.name}</div>
                  <div className="text-xs text-gray-600">{step.time}</div>
                  <div className="text-xs text-gray-500 font-semibold">通過率: {step.pass}</div>
                </div>
                {index < 4 && <ArrowRight className="w-6 h-6 text-gray-400 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">1次面接</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">主な評価項目</div>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• 人柄・基本的なコミュニケーション力</li>
                  <li>• ガクチカの基本構造</li>
                  <li>• 志望度の確認</li>
                  <li>• 基本的なビジネスマナー</li>
                </ul>
                <div className="bg-green-50 p-3 rounded mt-4">
                  <div className="text-xs font-semibold text-green-700">面接官からのアドバイス</div>
                  <div className="text-xs text-green-600 mt-1">
                    「第一印象と基本的な受け答えができれば通過できます。緊張しすぎず、素直な姿勢で臨んでください」
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">2次面接</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">主な評価項目</div>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• ロジカルな思考力</li>
                  <li>• 志望度の深さ</li>
                  <li>• 業界・職種への適性</li>
                  <li>• 課題解決能力</li>
                </ul>
                <div className="bg-yellow-50 p-3 rounded mt-4">
                  <div className="text-xs font-semibold text-yellow-700">面接官からのアドバイス</div>
                  <div className="text-xs text-yellow-600 mt-1">
                    「具体的なエピソードと論理的な説明が重要です。『なぜ』を3回深掘りできる準備をしてください」
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">最終面接</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">主な評価項目</div>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• カルチャーフィット</li>
                  <li>• 入社への覚悟</li>
                  <li>• 人物像の深掘り</li>
                  <li>• 長期的なビジョン</li>
                </ul>
                <div className="bg-red-50 p-3 rounded mt-4">
                  <div className="text-xs font-semibold text-red-700">面接官からのアドバイス</div>
                  <div className="text-xs text-red-600 mt-1">
                    「本気度と人間性を重視します。飾らず、等身大の自分で勝負してください」
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6">面接通過率を上げる秘訣</h3>
              <div className="grid grid-cols-3 gap-8 text-sm">
                <div>
                  <h4 className="text-lg font-bold mb-4">1次面接突破のコツ</h4>
                  <ul className="space-y-2">
                    <li>• 明るく元気な挨拶</li>
                    <li>• 結論ファーストの回答</li>
                    <li>• 具体的なエピソード</li>
                    <li>• 素直で誠実な態度</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-4">2次面接突破のコツ</h4>
                  <ul className="space-y-2">
                    <li>• 論理的な構成で話す</li>
                    <li>• 数字を使った説明</li>
                    <li>• 深い企業研究</li>
                    <li>• 課題解決思考</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-4">最終面接突破のコツ</h4>
                  <ul className="space-y-2">
                    <li>• 入社への強い意志</li>
                    <li>• 企業理念への共感</li>
                    <li>• 将来のビジョン</li>
                    <li>• 人間的な魅力</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function EvaluationCriteriaPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 to-pink-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8 text-center">面接官の評価視点：5つの軸</h2>

        <div className="grid grid-cols-5 gap-6 mb-8">
          {[
            { name: "論理性", icon: BookOpen, color: "blue", desc: "話の構成・根拠の明確さ", weight: "25%" },
            { name: "再現性", icon: TrendingUp, color: "green", desc: "入社後に成果を出すポテンシャル", weight: "30%" },
            { name: "志望度", icon: Target, color: "red", desc: "企業や業界への本気度", weight: "20%" },
            { name: "人物魅力", icon: Users, color: "purple", desc: "誠実さ、成長意欲、協働性", weight: "15%" },
            { name: "カルチャーフィット", icon: Star, color: "yellow", desc: "自社との相性", weight: "10%" },
          ].map((criteria, index) => (
            <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6 text-center">
                <div
                  className={`w-16 h-16 bg-${criteria.color}-100 rounded-full flex items-center justify-center mx-auto mb-4`}
                >
                  <criteria.icon className={`w-8 h-8 text-${criteria.color}-600`} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{criteria.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{criteria.desc}</p>
                <Badge variant="outline" className="text-xs">
                  {criteria.weight}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl mb-8">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4 mb-4">
              <Lightbulb className="w-8 h-8" />
              <h3 className="text-2xl font-bold">面接官が語る：受かる学生の共通点</h3>
            </div>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-bold mb-2">✓ 結論ファースト</h4>
                <p>「まず結論を言ってから理由を説明する学生は印象が良い。時間も有効活用できる」</p>
              </div>
              <div>
                <h4 className="font-bold mb-2">✓ 具体的なエピソード</h4>
                <p>「数字や固有名詞があると話にリアリティを感じる。体験談の深さで差がつく」</p>
              </div>
              <div>
                <h4 className="font-bold mb-2">✓ 素直さと成長意欲</h4>
                <p>「失敗から学ぶ姿勢がある学生は伸びしろを感じる。完璧である必要はない」</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">評価の重み付け（企業規模・業界別）</h3>
            <div className="grid grid-cols-4 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">大手企業</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 論理性：30%</li>
                  <li>• 再現性：25%</li>
                  <li>• カルチャーフィット：25%</li>
                  <li>• 志望度：20%</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-700 mb-2">ベンチャー企業</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 再現性：35%</li>
                  <li>• 志望度：30%</li>
                  <li>• 人物魅力：20%</li>
                  <li>• 論理性：15%</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">外資系企業</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 論理性：40%</li>
                  <li>• 再現性：30%</li>
                  <li>• 志望度：20%</li>
                  <li>• 人物魅力：10%</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-red-700 mb-2">公務員・非営利</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 人物魅力：35%</li>
                  <li>• 志望度：30%</li>
                  <li>• 論理性：20%</li>
                  <li>• 再現性：15%</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuestionMapPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-green-50 to-teal-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8 text-center">質問の分類マップ：4つの意図</h2>
        <p className="text-lg text-gray-600 text-center mb-12">すべての質問は以下の4カテゴリに分けられる</p>

        <div className="grid grid-cols-2 gap-8">
          {[
            {
              category: "自己理解",
              color: "blue",
              icon: Users,
              questions: ["自己PR", "ガクチカ", "失敗経験", "長所・短所", "価値観"],
              evaluation: ["再現性", "論理性", "自己分析力"],
              frequency: "出現率：95%",
            },
            {
              category: "志望理由",
              color: "red",
              icon: Target,
              questions: ["志望動機", "業界理解", "逆質問", "キャリアプラン", "他社状況"],
              evaluation: ["志望度", "カルチャーフィット", "企業研究力"],
              frequency: "出現率：90%",
            },
            {
              category: "思考力",
              color: "purple",
              icon: BookOpen,
              questions: ["ケース問題", "状況判断", "リーダーシップ", "課題解決", "仮説思考"],
              evaluation: ["論理性", "応用力", "思考の柔軟性"],
              frequency: "出現率：70%",
            },
            {
              category: "人柄・スタンス",
              color: "green",
              icon: MessageCircle,
              questions: ["周囲の評価", "趣味・特技", "チームワーク", "ストレス対処", "将来像"],
              evaluation: ["人物像", "素直さ", "誠実さ"],
              frequency: "出現率：85%",
            },
          ].map((item, index) => (
            <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 bg-${item.color}-100 rounded-full flex items-center justify-center`}>
                      <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">{item.category}</h3>
                  </div>
                  <Badge className={`bg-${item.color}-100 text-${item.color}-700`}>{item.frequency}</Badge>
                </div>

                <div className="mb-6">
                  <h4 className="font-bold text-gray-700 mb-3">代表質問例</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {item.questions.map((q, qIndex) => (
                      <Badge key={qIndex} variant="outline" className="text-sm justify-start">
                        {q}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-700 mb-3">評価される要素</h4>
                  <div className="space-y-2">
                    {item.evaluation.map((e, eIndex) => (
                      <div key={eIndex} className="flex items-center space-x-2">
                        <CheckCircle className={`w-4 h-4 text-${item.color}-500`} />
                        <span className="text-gray-600">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function SelfPRPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 to-cyan-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">自己PR攻略</h2>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-white shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">質問の意図</h3>
                <p className="text-gray-700">強みと再現性の確認。入社後に活躍できる人材かを見極める。</p>
                <div className="mt-4 bg-blue-50 p-3 rounded">
                  <div className="text-sm font-semibold text-blue-700">面接官の本音</div>
                  <div className="text-sm text-blue-600 mt-1">
                    「この人は入社後、どんな場面で力を発揮してくれるのか？具体的にイメージできる話をしてほしい」
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">STAR法による構成テンプレート</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      S
                    </div>
                    <span className="font-semibold">Situation（状況・背景）</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      T
                    </div>
                    <span className="font-semibold">Task（課題・目標）</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      A
                    </div>
                    <span className="font-semibold">Action（行動・工夫）</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      R
                    </div>
                    <span className="font-semibold">Result（結果・学び）</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-red-50 border-red-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-red-700 mb-4">NG回答例</h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-white p-3 rounded border-l-4 border-red-400">
                    <p className="text-gray-700">「私の強みは頑張ることです。何事にも一生懸命取り組みます。」</p>
                    <p className="text-red-600 mt-2 font-semibold">→ 抽象的で差別化できない</p>
                  </div>
                  <div className="bg-white p-3 rounded border-l-4 border-red-400">
                    <p className="text-gray-700">「コミュニケーション能力が高いです。」</p>
                    <p className="text-red-600 mt-2 font-semibold">→ 具体性がなく、ありきたり</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-green-700 mb-4">内定者回答例</h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-white p-3 rounded border-l-4 border-green-400">
                    <p className="text-gray-700 font-semibold mb-2">「課題の本質を見抜く分析力」</p>
                    <p className="text-gray-700">
                      「塾講師のアルバイトで生徒の成績が上がらない原因を分析し、勉強法ではなく『やる気の問題』と特定。個別面談制度を提案・実施した結果、担当生徒の平均点が20点向上しました。」
                    </p>
                    <p className="text-green-600 mt-2 font-semibold">→ 具体的で再現性がある</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-yellow-700 mb-4">強み別キーワード集</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold">分析系：</span>課題発見力、仮説思考、データ分析力
                  </div>
                  <div>
                    <span className="font-semibold">実行系：</span>推進力、継続力、やり抜く力
                  </div>
                  <div>
                    <span className="font-semibold">対人系：</span>巻き込み力、傾聴力、調整力
                  </div>
                  <div>
                    <span className="font-semibold">創造系：</span>企画力、発想力、改善力
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function GakuchikPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-green-50 to-emerald-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">ガクチカ（学生時代に力を入れたこと）攻略</h2>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-white shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">質問の意図</h3>
                <p className="text-gray-700">行動力・PDCA・協働性を確認。困難に対してどう向き合うかを見る。</p>
                <div className="mt-4 bg-green-50 p-3 rounded">
                  <div className="text-sm font-semibold text-green-700">面接官が見ているポイント</div>
                  <ul className="text-sm text-green-600 mt-1 space-y-1">
                    <li>• 主体性があるか</li>
                    <li>• 困難を乗り越える力があるか</li>
                    <li>• チームで成果を出せるか</li>
                    <li>• 継続力・やり抜く力があるか</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">PREP法による構成</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                      P
                    </div>
                    <span className="font-semibold">Point（結論・何に取り組んだか）</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                      R
                    </div>
                    <span className="font-semibold">Reason（理由・なぜ取り組んだか）</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                      E
                    </div>
                    <span className="font-semibold">Example（具体例・どう取り組んだか）</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">
                      P
                    </div>
                    <span className="font-semibold">Point（結果・学び）</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-blue-50 border-blue-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-blue-700 mb-4">テーマ別内定者回答例</h3>
                <div className="space-y-4 text-sm">
                  <div className="bg-white p-3 rounded border-l-4 border-blue-400">
                    <h4 className="font-semibold text-gray-800">アルバイト（カフェ店員）</h4>
                    <p className="text-gray-600 mt-1">
                      「新人教育の仕組み化に取り組み、離職率を30%から5%に改善。マニュアル作成と1on1制度を導入し、店舗全体の売上も15%向上させました。」
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border-l-4 border-blue-400">
                    <h4 className="font-semibold text-gray-800">サークル活動（テニス部）</h4>
                    <p className="text-gray-600 mt-1">
                      「部員のモチベーション向上に取り組み、練習参加率を60%から90%に改善。個別面談とレベル別練習メニューを導入し、団体戦で県大会出場を果たしました。」
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border-l-4 border-blue-400">
                    <h4 className="font-semibold text-gray-800">ゼミ・研究</h4>
                    <p className="text-gray-600 mt-1">
                      「地域活性化の研究で、現地調査を100件実施。データ分析から課題を特定し、自治体に政策提案を行い、実際に採用されました。」
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-yellow-700 mb-4">エピソード強化のコツ</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <span className="font-semibold">数字を入れる：</span>
                      <span className="text-gray-600">「売上20%向上」「参加率80%改善」</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <span className="font-semibold">困難を明確に：</span>
                      <span className="text-gray-600">「何が大変だったか」を具体的に</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <span className="font-semibold">工夫を詳しく：</span>
                      <span className="text-gray-600">「なぜその方法を選んだか」</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <span className="font-semibold">学びを仕事に：</span>
                      <span className="text-gray-600">「入社後どう活かすか」</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function MotivationPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-purple-50 to-violet-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">志望動機攻略</h2>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-white shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">質問の意図</h3>
                <p className="text-gray-700">本気度と理解度の確認。なぜ他社ではなく当社なのかを見極める。</p>
                <div className="mt-4 bg-purple-50 p-3 rounded">
                  <div className="text-sm font-semibold text-purple-700">面接官が確認したいこと</div>
                  <ul className="text-sm text-purple-600 mt-1 space-y-1">
                    <li>• 企業研究をしているか</li>
                    <li>• 長期的に働く意思があるか</li>
                    <li>• 企業の価値観と合うか</li>
                    <li>• 入社後の活躍イメージが描けるか</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-red-700 mb-4">よくあるNG例</h3>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border-l-4 border-red-400">
                    <p className="text-gray-700 text-sm">「成長できそうだから」</p>
                    <p className="text-red-600 text-xs mt-1">→ どこでも言える、受け身</p>
                  </div>
                  <div className="bg-white p-3 rounded border-l-4 border-red-400">
                    <p className="text-gray-700 text-sm">「御社の理念に共感したから」</p>
                    <p className="text-red-600 text-xs mt-1">→ 抽象的、具体性がない</p>
                  </div>
                  <div className="bg-white p-3 rounded border-l-4 border-red-400">
                    <p className="text-gray-700 text-sm">「安定しているから」</p>
                    <p className="text-red-600 text-xs mt-1">→ 企業側にメリットがない</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-green-50 border-green-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-green-700 mb-4">内定者回答例（商社）</h3>
                <div className="bg-white p-4 rounded border-l-4 border-green-400 text-sm">
                  <p className="text-gray-700 mb-3">
                    「貴社を志望する理由は、『新興国のインフラ事業』に携わりたいからです。
                  </p>
                  <p className="text-gray-700 mb-3">
                    大学時代のベトナム留学で、現地の電力不足を目の当たりにし、インフラの重要性を実感しました。
                  </p>
                  <p className="text-gray-700 mb-3">
                    貴社は東南アジアで20年以上の実績があり、現地政府との強いパイプを持つ点が他社との違いです。
                  </p>
                  <p className="text-gray-700">
                    私の語学力（英語・ベトナム語）と現地での人脈を活かし、新規案件の開拓に貢献したいと考えています。」
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-blue-700 mb-4">志望動機の型</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-semibold">結論（志望理由を一言で）</p>
                      <p className="text-sm text-gray-600">「◯◯に取り組みたいから」</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      2
                    </div>
                    <div>
                      <p className="font-semibold">きっかけ（なぜそう思ったか）</p>
                      <p className="text-sm text-gray-600">体験談・エピソード</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-semibold">なぜ当社か（他社との違い）</p>
                      <p className="text-sm text-gray-600">独自性・強み</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      4
                    </div>
                    <div>
                      <p className="font-semibold">貢献（どう活かすか）</p>
                      <p className="text-sm text-gray-600">自分の強み・経験</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function FrequentQuestionsPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-teal-50 to-cyan-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">頻出質問100選</h2>
        <p className="text-lg text-gray-600 mb-8 text-center">実際の面接で聞かれる質問を出現頻度順に整理</p>

        <div className="grid grid-cols-2 gap-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Badge className="bg-red-500 text-white mr-3">超頻出</Badge>
                基本質問（出現率90%以上）
              </h3>
              <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
                {[
                  "自己紹介をお願いします",
                  "自己PRをお願いします",
                  "学生時代に力を入れたことは？",
                  "志望動機を教えてください",
                  "なぜこの業界を選んだのですか？",
                  "なぜ弊社を志望するのですか？",
                  "あなたの長所と短所は？",
                  "将来のキャリアプランは？",
                  "他に受けている企業はありますか？",
                  "最後に質問はありますか？",
                  "大学で学んだことは？",
                  "アルバイト経験について教えてください",
                  "サークル活動について教えてください",
                  "ゼミではどんな研究をしていますか？",
                  "趣味や特技はありますか？",
                  "どんな仕事をしたいですか？",
                  "弊社の印象を教えてください",
                  "入社後にやりたいことは？",
                  "どんな社会人になりたいですか？",
                  "学生と社会人の違いは何だと思いますか？",
                  "弊社を知ったきっかけは？",
                  "弊社の商品・サービスを使ったことはありますか？",
                  "今日はどうやって来ましたか？",
                  "緊張していますか？",
                  "今の気持ちを教えてください",
                ].map((question, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-gray-700">{question}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Badge className="bg-orange-500 text-white mr-3">頻出</Badge>
                深掘り質問（出現率70%以上）
              </h3>
              <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
                {[
                  "その経験から何を学びましたか？",
                  "困難だったことは何ですか？",
                  "チームでの役割は何でしたか？",
                  "失敗した経験はありますか？",
                  "ストレスを感じるのはどんな時？",
                  "周囲からどんな人だと言われますか？",
                  "リーダーシップを発揮した経験は？",
                  "価値観で大切にしていることは？",
                  "10年後どうなっていたいですか？",
                  "弊社で挑戦したいことは？",
                  "どんな時にやりがいを感じますか？",
                  "チームワークで大切なことは？",
                  "プレッシャーにどう対処しますか？",
                  "意見が対立した時はどうしますか？",
                  "新しい環境に慣れるのは得意ですか？",
                  "責任感について教えてください",
                  "継続力をアピールしてください",
                  "創造性を発揮した経験は？",
                  "批判されたときはどう対応しますか？",
                  "目標設定はどのようにしていますか？",
                  "時間管理で工夫していることは？",
                  "コミュニケーションで気をつけていることは？",
                  "後輩指導の経験はありますか？",
                  "自分を動物に例えると？",
                  "座右の銘はありますか？",
                ].map((question, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xs mt-0.5 flex-shrink-0">
                      {index + 26}
                    </div>
                    <span className="text-gray-700">{question}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Badge className="bg-blue-500 text-white mr-3">思考力</Badge>
                ケース・思考系（出現率50%以上）
              </h3>
              <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
                {[
                  "この商品の売上を2倍にするには？",
                  "無人島に一つだけ持っていくなら？",
                  "日本にコンビニは何店舗ある？",
                  "新しいサービスを企画してください",
                  "この課題をどう解決しますか？",
                  "もし社長だったらどうしますか？",
                  "競合他社との違いは何ですか？",
                  "この業界の課題は何だと思いますか？",
                  "5年後この業界はどうなっている？",
                  "弊社の弱みは何だと思いますか？",
                  "新規事業のアイデアを考えてください",
                  "顧客満足度を上げるには？",
                  "コスト削減のアイデアは？",
                  "マーケティング戦略を考えてください",
                  "この問題の原因は何だと思いますか？",
                  "優先順位をつけるとしたら？",
                  "リスクをどう管理しますか？",
                  "データから何が読み取れますか？",
                  "仮説を立ててください",
                  "検証方法を考えてください",
                  "改善案を3つ挙げてください",
                  "効率化のアイデアは？",
                  "イノベーションを起こすには？",
                  "グローバル展開するなら？",
                  "デジタル化をどう進めますか？",
                ].map((question, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs mt-0.5 flex-shrink-0">
                      {index + 51}
                    </div>
                    <span className="text-gray-700">{question}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Badge className="bg-purple-500 text-white mr-3">最終面接</Badge>
                役員面接特有質問
              </h3>
              <div className="space-y-2 text-sm max-h-96 overflow-y-auto">
                {[
                  "なぜ働くのですか？",
                  "人生で一番大切なものは？",
                  "尊敬する人は誰ですか？",
                  "最近気になるニュースは？",
                  "弊社に足りないものは何ですか？",
                  "内定を出したら入社しますか？",
                  "給料はいくら欲しいですか？",
                  "転勤は大丈夫ですか？",
                  "結婚・出産後も働きますか？",
                  "最後に一言お願いします",
                  "弊社の経営理念についてどう思いますか？",
                  "社会に対してどう貢献したいですか？",
                  "リーダーとしてどうありたいですか？",
                  "困難な決断をした経験は？",
                  "倫理的なジレンマに直面したら？",
                  "多様性についてどう考えますか？",
                  "持続可能性について意見を聞かせてください",
                  "技術革新についてどう思いますか？",
                  "グローバル化についての考えは？",
                  "働き方改革についてどう思いますか？",
                  "若い世代に期待することは？",
                  "この会社で実現したい夢は？",
                  "100年後の社会はどうなっていると思いますか？",
                  "あなたにとって成功とは？",
                  "人生の目標は何ですか？",
                ].map((question, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs mt-0.5 flex-shrink-0">
                      {index + 76}
                    </div>
                    <span className="text-gray-700">{question}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6">質問への対応パターン</h3>
              <div className="grid grid-cols-3 gap-8 text-sm">
                <div>
                  <h4 className="text-lg font-bold mb-4 text-green-300">準備必須（事前回答作成）</h4>
                  <ul className="space-y-2">
                    <li>• 自己PR・ガクチカ・志望動機</li>
                    <li>• 長所・短所・価値観</li>
                    <li>• キャリアプラン・逆質問</li>
                    <li>• 失敗経験・困難克服</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-4 text-yellow-300">型で対応（フレームワーク活用）</h4>
                  <ul className="space-y-2">
                    <li>• 困難・失敗・チームワーク</li>
                    <li>• ケース問題・思考系質問</li>
                    <li>• 業界・企業分析系</li>
                    <li>• 状況判断・意思決定系</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-4 text-blue-300">素直に対応（正直ベース）</h4>
                  <ul className="space-y-2">
                    <li>• 他社選考状況・内定状況</li>
                    <li>• 転勤・給与・働き方</li>
                    <li>• 時事・ニュース系</li>
                    <li>• 個人的な価値観・趣味</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InterviewMannersPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-indigo-50 to-blue-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">面接マナー・身だしなみ</h2>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <UserCheck className="w-6 h-6 text-blue-600 mr-2" />
                身だしなみチェックリスト
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">男性</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      "□ スーツ（紺・黒・グレー）",
                      "□ 白いワイシャツ",
                      "□ ネクタイ（派手すぎない）",
                      "□ 革靴（黒・茶）",
                      "□ 髪型（清潔感重視）",
                      "□ 爪（短く切る）",
                    ].map((item, index) => (
                      <div key={index} className="text-gray-600">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">女性</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      "□ スーツ（紺・黒・グレー）",
                      "□ 白いブラウス",
                      "□ パンプス（3-5cm）",
                      "□ ストッキング（肌色）",
                      "□ 髪型（まとめる）",
                      "□ メイク（ナチュラル）",
                    ].map((item, index) => (
                      <div key={index} className="text-gray-600">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Clock className="w-6 h-6 text-green-600 mr-2" />
                当日のタイムスケジュール
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-16 text-blue-600 font-semibold">30分前</div>
                  <div className="text-gray-700">最寄り駅到着・身だしなみ最終確認</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-16 text-blue-600 font-semibold">15分前</div>
                  <div className="text-gray-700">会社到着・受付で待機</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-16 text-blue-600 font-semibold">10分前</div>
                  <div className="text-gray-700">受付で面接の旨を伝える</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-16 text-blue-600 font-semibold">5分前</div>
                  <div className="text-gray-700">待合室で最終準備</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-16 text-green-600 font-semibold">定刻</div>
                  <div className="text-gray-700">面接開始</div>
                </div>
              </div>
              <div className="mt-4 bg-yellow-50 p-3 rounded">
                <div className="text-sm font-semibold text-yellow-700">注意点</div>
                <div className="text-sm text-yellow-600 mt-1">早すぎる到着（30分以上前）は迷惑になる場合があります</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">入室時のマナー</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-semibold">ノック：</span>
                    <span className="text-gray-600">3回ノックして「どうぞ」を待つ</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-semibold">挨拶：</span>
                    <span className="text-gray-600">「失礼いたします」と一礼</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <span className="font-semibold">着席：</span>
                    <span className="text-gray-600">「お座りください」を待つ</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                    4
                  </div>
                  <div>
                    <span className="font-semibold">姿勢：</span>
                    <span className="text-gray-600">背筋を伸ばし、手は膝の上</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">話し方のポイント</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <div>
                    <span className="font-semibold">声の大きさ：</span>
                    <span className="text-gray-600">相手に聞こえる適度な音量</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <div>
                    <span className="font-semibold">話すスピード：</span>
                    <span className="text-gray-600">ゆっくりと明確に</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <div>
                    <span className="font-semibold">アイコンタクト：</span>
                    <span className="text-gray-600">相手の目を見て話す</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <div>
                    <span className="font-semibold">敬語：</span>
                    <span className="text-gray-600">丁寧語・尊敬語を正しく使う</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">退室時のマナー</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-semibold">お礼：</span>
                    <span className="text-gray-600">「ありがとうございました」</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-semibold">起立：</span>
                    <span className="text-gray-600">椅子の左側に立つ</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <span className="font-semibold">一礼：</span>
                    <span className="text-gray-600">深くお辞儀をする</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs">
                    4
                  </div>
                  <div>
                    <span className="font-semibold">退室：</span>
                    <span className="text-gray-600">ドアで振り返り再度一礼</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                <AlertCircle className="w-8 h-8 mr-3" />
                よくあるマナー違反・NG行動
              </h3>
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <h4 className="text-lg font-bold mb-4">身だしなみ・準備編</h4>
                  <ul className="space-y-2">
                    <li>✗ スーツにシワや汚れがある</li>
                    <li>✗ 靴が汚れている・かかとが減っている</li>
                    <li>✗ 香水・整髪料の匂いが強い</li>
                    <li>✗ アクセサリーが派手すぎる</li>
                    <li>✗ 遅刻・早すぎる到着</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-4">面接中の行動編</h4>
                  <ul className="space-y-2">
                    <li>✗ スマートフォンの音が鳴る</li>
                    <li>✗ 貧乏ゆすり・髪を触る</li>
                    <li>✗ 面接官の話を遮る</li>
                    <li>✗ 「えーっと」「あのー」が多い</li>
                    <li>✗ 質問に対して的外れな回答</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function IndustrySpecificPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-amber-50 to-orange-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">業界別対策</h2>
        <p className="text-lg text-gray-600 mb-8 text-center">業界ごとに重視される評価ポイントと対策法</p>

        <div className="grid grid-cols-2 gap-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Building className="w-6 h-6 text-blue-600 mr-2" />
                金融業界（銀行・証券・保険）
              </h3>
              <div className="space-y-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-700 mb-2">重視される要素</h4>
                  <ul className="space-y-1 text-blue-600">
                    <li>• 誠実性・信頼性（40%）</li>
                    <li>• 数字への強さ（25%）</li>
                    <li>• コミュニケーション力（20%）</li>
                    <li>• 規律性・継続力（15%）</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">よく聞かれる質問</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• なぜ金融業界なのか？</li>
                    <li>• お金に対する価値観は？</li>
                    <li>• 最近の金融ニュースで気になることは？</li>
                    <li>• ノルマに対してどう思うか？</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-700 mb-2">対策ポイント</h4>
                  <p className="text-green-600">
                    数字を使った具体的なエピソード、継続力を示す経験、金融知識の基礎を身につける
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Briefcase className="w-6 h-6 text-green-600 mr-2" />
                商社・貿易
              </h3>
              <div className="space-y-4 text-sm">
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-700 mb-2">重視される要素</h4>
                  <ul className="space-y-1 text-green-600">
                    <li>• グローバル志向（35%）</li>
                    <li>• タフネス・バイタリティ（30%）</li>
                    <li>• 語学力・異文化理解（20%）</li>
                    <li>• 新規開拓力（15%）</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">よく聞かれる質問</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• 海外で働くことについてどう思うか？</li>
                    <li>• 語学力はどの程度か？</li>
                    <li>• 新しいビジネスを考えてください</li>
                    <li>• 困難な状況をどう乗り越えるか？</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-700 mb-2">対策ポイント</h4>
                  <p className="text-blue-600">海外経験、語学学習、チャレンジ精神を示すエピソード、業界研究の深さ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Target className="w-6 h-6 text-purple-600 mr-2" />
                コンサルティング
              </h3>
              <div className="space-y-4 text-sm">
                <div className="bg-purple-50 p-3 rounded">
                  <h4 className="font-semibold text-purple-700 mb-2">重視される要素</h4>
                  <ul className="space-y-1 text-purple-600">
                    <li>• 論理的思考力（50%）</li>
                    <li>• 問題解決能力（25%）</li>
                    <li>• コミュニケーション力（15%）</li>
                    <li>• 学習意欲（10%）</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">よく聞かれる質問</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• ケース問題（フェルミ推定）</li>
                    <li>• なぜコンサルタントになりたいのか？</li>
                    <li>• 論理的に説明してください</li>
                    <li>• 仮説を立ててください</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <h4 className="font-semibold text-yellow-700 mb-2">対策ポイント</h4>
                  <p className="text-yellow-600">ケース問題の練習、論理的な話し方、MECE思考、仮説思考の習得</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <TrendingUp className="w-6 h-6 text-red-600 mr-2" />
                IT・テック業界
              </h3>
              <div className="space-y-4 text-sm">
                <div className="bg-red-50 p-3 rounded">
                  <h4 className="font-semibold text-red-700 mb-2">重視される要素</h4>
                  <ul className="space-y-1 text-red-600">
                    <li>• 技術への興味・理解（35%）</li>
                    <li>• 変化への適応力（30%）</li>
                    <li>• 創造性・発想力（20%）</li>
                    <li>• 学習意欲（15%）</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">よく聞かれる質問</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• なぜIT業界なのか？</li>
                    <li>• 最新技術についてどう思うか？</li>
                    <li>• 新しいサービスを企画してください</li>
                    <li>• プログラミング経験はあるか？</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-700 mb-2">対策ポイント</h4>
                  <p className="text-green-600">
                    技術トレンドの把握、プログラミング学習、創造的なアイデア、変化への対応経験
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6">業界研究のポイント</h3>
              <div className="grid grid-cols-3 gap-8 text-sm">
                <div>
                  <h4 className="text-lg font-bold mb-4">基本情報の収集</h4>
                  <ul className="space-y-2">
                    <li>• 業界の市場規模・成長性</li>
                    <li>• 主要企業とその特徴</li>
                    <li>• ビジネスモデルの理解</li>
                    <li>• 業界の課題・トレンド</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-4">深掘り分析</h4>
                  <ul className="space-y-2">
                    <li>• 競合他社との差別化要因</li>
                    <li>• 今後の事業展開・戦略</li>
                    <li>• 求められる人材像</li>
                    <li>• キャリアパス・働き方</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-4">情報収集方法</h4>
                  <ul className="space-y-2">
                    <li>• 企業HP・IR情報</li>
                    <li>• 業界誌・ニュース</li>
                    <li>• OB・OG訪問</li>
                    <li>• インターンシップ</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InterviewDayPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-rose-50 to-pink-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">面接当日の流れ</h2>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">面接の基本的な流れ</h3>
              <div className="space-y-4">
                {[
                  { time: "0-5分", phase: "アイスブレイク", content: "自己紹介・雑談" },
                  { time: "5-15分", phase: "自己PR・ガクチカ", content: "基本的な質問" },
                  { time: "15-25分", phase: "志望動機・深掘り", content: "企業・業界への理解" },
                  { time: "25-30分", phase: "逆質問・クロージング", content: "質問・今後の流れ" },
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-16 text-sm font-semibold text-blue-600">{item.time}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{item.phase}</div>
                      <div className="text-sm text-gray-600">{item.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">緊張対策・メンタル管理</h3>
              <div className="space-y-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-semibold text-blue-700 mb-2">事前準備</h4>
                  <ul className="space-y-1 text-blue-600">
                    <li>• 模擬面接を複数回実施</li>
                    <li>• 想定質問の回答を準備</li>
                    <li>• 会場までの道のりを確認</li>
                    <li>• 前日は早めに就寝</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-700 mb-2">当日の心構え</h4>
                  <ul className="space-y-1 text-green-600">
                    <li>• 深呼吸でリラックス</li>
                    <li>• 「対話」だと思って臨む</li>
                    <li>• 完璧を求めすぎない</li>
                    <li>• 笑顔を心がける</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <h4 className="font-semibold text-yellow-700 mb-2">緊張した時の対処法</h4>
                  <ul className="space-y-1 text-yellow-600">
                    <li>• 「少し緊張しています」と正直に言う</li>
                    <li>• ゆっくりと話すことを意識</li>
                    <li>• 水を一口飲んで落ち着く</li>
                    <li>• 相手の目を見て話す</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">オンライン面接対策</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-purple-50 p-3 rounded">
                  <h4 className="font-semibold text-purple-700 mb-2">技術的準備</h4>
                  <ul className="space-y-1 text-purple-600">
                    <li>• カメラ・マイクのテスト</li>
                    <li>• 安定したネット環境</li>
                    <li>• 照明・背景の確認</li>
                    <li>• アプリの操作方法習得</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">注意点</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• カメラ目線を意識</li>
                    <li>• 身振り手振りは控えめに</li>
                    <li>• 通知音をオフに</li>
                    <li>• 家族に協力を依頼</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">グループ面接対策</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-orange-50 p-3 rounded">
                  <h4 className="font-semibold text-orange-700 mb-2">基本戦略</h4>
                  <ul className="space-y-1 text-orange-600">
                    <li>• 他の学生の話をよく聞く</li>
                    <li>• 差別化を意識する</li>
                    <li>• 協調性を示す</li>
                    <li>• 発言のタイミングを見極める</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">注意点</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• 他者を否定しない</li>
                    <li>• 発言を独占しない</li>
                    <li>• 消極的すぎない</li>
                    <li>• 面接官全員を見る</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">面接後のフォロー</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-semibold text-green-700 mb-2">当日中にやること</h4>
                  <ul className="space-y-1 text-green-600">
                    <li>• 面接内容の振り返り</li>
                    <li>• 良かった点・改善点の整理</li>
                    <li>• お礼メールの送信（必要に応じて）</li>
                    <li>• 次回面接の準備開始</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold text-gray-700 mb-2">結果待ちの過ごし方</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• 他社の選考も並行して進める</li>
                    <li>• 一喜一憂しすぎない</li>
                    <li>• 面接スキルの向上に努める</li>
                    <li>• 体調管理を怠らない</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function WorksheetPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-yellow-50 to-orange-50 p-12">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 mb-8">実践ワークシート</h2>

        <div className="grid grid-cols-2 gap-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">自己分析ワーク</h3>
              <div className="space-y-4 text-sm">
                <div className="bg-blue-50 p-4 rounded">
                  <h4 className="font-bold text-blue-700 mb-2">強みの棚卸し</h4>
                  <div className="space-y-2">
                    <p>1. これまでの成功体験を3つ書き出す</p>
                    <p>2. 共通する行動パターンを見つける</p>
                    <p>3. それを一言で表現する</p>
                    <p>4. 具体的なエピソードで裏付ける</p>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <h4 className="font-bold text-green-700 mb-2">価値観の整理</h4>
                  <div className="space-y-2">
                    <p>1. 人生で大切にしていることは？</p>
                    <p>2. 仕事で重視したいことは？</p>
                    <p>3. どんな環境で力を発揮できる？</p>
                    <p>4. 将来どうなっていたい？</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">企業研究ワーク</h3>
              <div className="space-y-4 text-sm">
                <div className="bg-purple-50 p-4 rounded">
                  <h4 className="font-bold text-purple-700 mb-2">基本情報の整理</h4>
                  <div className="space-y-2">
                    <p>1. 事業内容・サービス</p>
                    <p>2. 業界での立ち位置</p>
                    <p>3. 企業の強み・特徴</p>
                    <p>4. 競合他社との違い</p>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded">
                  <h4 className="font-bold text-red-700 mb-2">深掘り調査</h4>
                  <div className="space-y-2">
                    <p>1. 今後の事業展開・戦略</p>
                    <p>2. 求める人物像</p>
                    <p>3. 企業文化・価値観</p>
                    <p>4. 働く環境・制度</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6">面接前チェックリスト</h3>
              <div className="grid grid-cols-3 gap-8 text-sm">
                <div>
                  <h4 className="text-lg font-bold mb-4">準備編</h4>
                  <ul className="space-y-2">
                    <li>□ 企業研究完了</li>
                    <li>□ 自己PR準備完了</li>
                    <li>□ ガクチカ準備完了</li>
                    <li>□ 志望動機準備完了</li>
                    <li>□ 逆質問3つ準備</li>
                    <li>□ 想定質問への回答準備</li>
                    <li>□ 模擬面接実施</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-4">当日編</h4>
                  <ul className="space-y-2">
                    <li>□ 身だしなみチェック</li>
                    <li>□ 持ち物確認</li>
                    <li>□ 会場・時間確認</li>
                    <li>□ 履歴書・ES持参</li>
                    <li>□ スマホをマナーモード</li>
                    <li>□ 緊張対策実施</li>
                    <li>□ 最終確認完了</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-4">心構え編</h4>
                  <ul className="space-y-2">
                    <li>□ 結論ファーストを意識</li>
                    <li>□ 具体例を準備</li>
                    <li>□ 笑顔と姿勢を意識</li>
                    <li>□ 相手の目を見て話す</li>
                    <li>□ 自信を持って臨む</li>
                    <li>□ 対話を楽しむ気持ち</li>
                    <li>□ 学びの姿勢を持つ</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ConclusionPage() {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-100 p-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-gray-800 mb-6">まとめ</h2>
          <p className="text-xl text-gray-600">面接成功への道のり - あなたの可能性を最大限に引き出すために</p>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-12">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-3xl font-bold mb-8 text-center">面接成功の5つの柱</h3>
              <div className="grid grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold mb-3">準備力</h4>
                  <p className="text-sm opacity-90 leading-relaxed">徹底した企業研究と自己分析が成功の基盤</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold mb-3">伝達力</h4>
                  <p className="text-sm opacity-90 leading-relaxed">結論ファーストで具体的に話す技術</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold mb-3">人間力</h4>
                  <p className="text-sm opacity-90 leading-relaxed">誠実さと成長意欲を示す姿勢</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold mb-3">成長力</h4>
                  <p className="text-sm opacity-90 leading-relaxed">学びと改善を継続する力</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold mb-3">適応力</h4>
                  <p className="text-sm opacity-90 leading-relaxed">状況に応じて柔軟に対応する能力</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-12">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Rocket className="w-8 h-8 text-blue-600 mr-3" />
                面接で大切な心構え
              </h3>
              <div className="space-y-4 text-gray-700">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-semibold">完璧を求めすぎない</p>
                    <p className="text-sm text-gray-600">失敗を恐れず、素直な姿勢で臨む</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-semibold">対話を楽しむ</p>
                    <p className="text-sm text-gray-600">面接は相互理解の場だと捉える</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-semibold">自分らしさを大切に</p>
                    <p className="text-sm text-gray-600">等身大の自分で勝負する</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-semibold">学びの姿勢を持つ</p>
                    <p className="text-sm text-gray-600">毎回の面接から成長する</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Trophy className="w-8 h-8 text-yellow-600 mr-3" />
                継続的な成長のために
              </h3>
              <div className="space-y-4 text-gray-700">
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <p className="font-semibold">振り返りを習慣化</p>
                    <p className="text-sm text-gray-600">毎回の面接後に改善点を整理</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <p className="font-semibold">模擬面接を継続</p>
                    <p className="text-sm text-gray-600">友人や先輩と練習を重ねる</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <p className="font-semibold">業界研究を深める</p>
                    <p className="text-sm text-gray-600">常に最新情報をキャッチアップ</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <ArrowRight className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <p className="font-semibold">ネットワークを活用</p>
                    <p className="text-sm text-gray-600">OB・OG訪問で生の声を聞く</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-xl">
          <CardContent className="p-10 text-center">
            <div className="flex items-center justify-center mb-6">
              <Heart className="w-12 h-12 mr-4" />
              <h3 className="text-3xl font-bold">最後に</h3>
            </div>
            <div className="text-lg space-y-6 max-w-4xl mx-auto">
              <p>
                面接は「自分を知ってもらう貴重な機会」です。
                <br />
                この資料で学んだことを活かし、<span className="font-bold text-yellow-300">自信を持って</span>
                挑戦してください。
              </p>
              <p>
                あなたの努力と準備は必ず実を結びます。
                <br />
                <span className="font-bold text-yellow-300">素直で誠実な姿勢</span>で臨むことが最も大切です。
              </p>
              <p className="text-2xl font-bold mt-8">あなたの就職活動の成功を心から願っています！</p>
            </div>
            <div className="mt-8 flex items-center justify-center space-x-4">
              <Award className="w-8 h-8 text-yellow-300" />
              <span className="text-lg font-semibold">頑張れ、未来のビジネスパーソン！</span>
              <Award className="w-8 h-8 text-yellow-300" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function Page() {
  const [currentPage, setCurrentPage] = useState(0)

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const CurrentPageComponent = pages[currentPage].component

  return (
    <div className="w-full h-screen bg-white relative">
      {/* ヘッダー */}
      <div className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-bold">人物面接 頻出質問100選 完全攻略ガイド</h1>
          <Badge variant="secondary" className="bg-gray-600 text-white">
            {currentPage + 1} / {pages.length}
          </Badge>
        </div>
        <div className="flex items-center space-x-4">
          {/* 学生転職ボタン */}
          <a
            href="https://学生転職.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            学生転職でスカウトを受け取る
          </a>
          <div className="flex items-center space-x-2">
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              className="bg-gray-700 border border-gray-600 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded text-sm flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              前へ
            </button>
            <button
              onClick={nextPage}
              disabled={currentPage === pages.length - 1}
              className="bg-gray-700 border border-gray-600 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded text-sm flex items-center"
            >
              次へ
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>
        <CurrentPageComponent setCurrentPage={setCurrentPage} />
      </div>

      {/* フッター */}
      <div className="bg-gray-100 px-6 py-2 flex items-center justify-between">
        <div className="text-sm text-gray-600">{pages[currentPage].title}</div>
        <div className="flex space-x-1">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentPage ? "bg-blue-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
