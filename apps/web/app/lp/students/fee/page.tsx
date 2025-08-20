"use client"

import { useState, useEffect, useRef } from "react"
import {
  ChevronDown,
  Calculator,
  Users,
  Clock,
  Target,
  Star,
  ArrowRight,
  TrendingUp,
  Award,
  CheckCircle,
  Sparkles,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import Image from "next/image"
import heroImg from "@/public/shukatu.jpg";

import { useRouter } from "next/navigation"
import Script from "next/script";

// Lazy‑load salary estimator only when needed
const loadEstimator = () =>
  import("@/lib/salaryEstimator").then((mod) => mod.estimateSalary)

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSalaryResult, setShowSalaryResult] = useState(false)
  const [salaryResult, setSalaryResult] = useState<any>(null)
  const [salaryData, setSalaryData] = useState({
    role: "",
    hours: "",
    leadership: "",
    year: "",
  })
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const router = useRouter()

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" })
    }
  }

  const scrollToFullSimulator = () => {
    const element = document.getElementById("full-simulator")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Scroll animation effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in")
          }
        })
      },
      { threshold: 0.1 },
    )

    const sections = document.querySelectorAll(".scroll-animate")
    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  const handleSalaryCalculate = async () => {
    if (
      !salaryData.role ||
      !salaryData.hours ||
      !salaryData.leadership ||
      !salaryData.year
    ) {
      return
    }

    const estimateSalary = await loadEstimator()
    const result = estimateSalary(salaryData)
    setSalaryResult(result)
    setShowSalaryResult(true)
  }

  const benefits = [
    {
      icon: <Target className="w-6 h-6 text-red-600" />,
      title: "職歴で判断する給与",
      description: "これまでの一律給与を廃止 あなたのスキルに合った給与を",
      image: "/salary.jpg?height=300&width=400",
    },
    {
      icon: <Users className="w-6 h-6 text-red-600" />,
      title: "あなただけのポジション",
      description: "スキルがあればポジション確約・経営企画ポジションでのオファーも",
      image: "/position.jpg?height=300&width=400",
    },
    {
      icon: <Clock className="w-6 h-6 text-red-600" />,
      title: "あなたの今の現在地がわかる",
      description: "オファーを通して実際のあなたの市場感がわかる",
      image: "/ave.jpg?height=300&width=400",
    },
  ]

  const steps = [
    {
      number: "01",
      title: "無料登録",
      description: "簡単に登録可能！まだ職歴がない、インターンを始めたばかりでも登録可能です！あなたの市場価値を調べよう",
      image: "/new_enroll.png?height=200&width=300",
    },
    {
      number: "02",
      title: "経歴入力",
      description: "これまでの長期インターンの経験やビジネス経験をしっかり記入しましょう。企業はあなたの職歴に興味を持ってヘッドハンティング！",
      image: "/syokureki.png?height=200&width=300",
    },
    {
      number: "03",
      title: "オファー受信",
      description: "あなただけのオファーレターを手に入れましょう。給与とポジションが書かれたオファーで選考優遇を",
      image: "/offer.jpg?height=200&width=300",
    },
  ]

  const successStories = [
    {

      quote: "卒業と同時にPMとして年収620万円のオファーを獲得！新卒採用をスキップできました。",
      offer: "¥620万円",
      role: "PM",
      name: "田中 明美",
      university: "早稲田大学",
      background: "/32782795_l.jpg?height=300&width=400",
    },
    {

      quote: "スタートアップ経験でシニア開発者ポジションに。技術力が正当に評価されました。",
      offer: "¥580万円",
      role: "エンジニア",
      name: "佐藤 美咲",
      university: "慶應義塾大学",
      background: "/32127676_l.jpg?height=300&width=400",
    },
    {

      quote: "インターンシップのおかげでジュニアポジションをスキップ。即戦力として採用。",
      offer: "¥750万円",
      role: "コンサルタント",
      name: "山田 慎太郎",
      university: "東京大学",
      background: "/31518346_l.jpg?height=300&width=400",
    },
  ]

  // Static list of partner company logos (place your logo files in /public/logos)
  const companyLogos = [
    { src: "/marui_logo.png", alt: "丸井グループ" },
    { src: "/sansan_log.png", alt: "sansan" },
    { src: "/masoken_logo.jpeg", alt: "M&A総研" },
    { src: "/tailor.webp", alt: "テイラー" },
    { src: "/next.jpeg", alt: "ネクストビート" },
    { src: "/vc.png", alt: "ビジョンコンサル" },
  ] as const;

  const faqs = [
    {
      question: "学生向けサービスは本当に無料ですか？",
      answer: "はい、完全無料です。",
    },
    {
      question: "どのような経験が対象になりますか？",
      answer:
        "インターンシップ、アルバイト、フリーランス、スタートアップ経験、または重要な個人プロジェクトが対象です。",
    },
    {
      question: "年収シミュレーターの精度はどの程度ですか？",
      answer:
        "10,000件以上の実際のオファーデータに基づいています。結果は推定値であり、企業によって異なる場合があります。",
    },
    {
      question: "情報系の学生である必要がありますか？",
      answer: "いいえ、ビジネス、デザイン、文系など、すべての専攻の学生と連携しています。",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Meta Pixel Code */}
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1367684414304232');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=1367684414304232&ev=PageView&noscript=1"
        />
      </noscript>
      {/* End Meta Pixel Code */}

      {/* Hero Section */}
      <section className="pt-12 pb-10 md:pb-16">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-medium">
                  <Sparkles className="w-4 h-4 mr-2" />
                  長期インターン経験のある学生が利用中
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
                  新卒で年収
                  <span className="block text-red-600">600万円以上</span>
                </h1>

                <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                  学生時代の経験を
                  <br />
                  <span className="font-semibold text-gray-900">真の市場価値</span>に変える
                </p>

                <p className="text-lg text-gray-500 leading-relaxed max-w-lg">
                  新卒一括採用をスキップ。インターンシップ、プロジェクト、起業経験に基づいて
                  あなたにふさわしい年収とポジションを獲得しよう。
                </p>
              </div>

              {/* Mobile Image */}
              <div className="block lg:hidden">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-6">
                  <Image
                    src={heroImg}
                    alt="成功した学生"
                    width={500}
                    height={600}
                    placeholder="blur"
                    priority
                    sizes="(min-width: 1024px) 500px, 100vw"
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold text-lg"
                  onClick={scrollToFullSimulator}
                >
                  私の市場価値を知る
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-100">
                <div>
                  <div className="text-2xl font-bold text-gray-900 whitespace-nowrap">3ヶ月から</div>
                  <div className="text-sm text-gray-500">職歴経験</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 whitespace-nowrap">95%</div>
                  <div className="text-sm text-gray-500">満足度</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 whitespace-nowrap">620万円</div>
                  <div className="text-sm text-gray-500">平均年収</div>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative mb-8 lg:mb-0 hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src={heroImg}
                  alt="成功した学生"
                  width={500}
                  height={600}
                  placeholder="blur"
                  priority
                  sizes="(min-width: 1024px) 500px, 100vw"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">内定獲得</div>
                    <div className="text-sm text-gray-500">年収620万円</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">市場価値</div>
                    <div className="text-sm text-gray-500">+40% UP</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section id="features" className="py-12 md:py-16 scroll-animate opacity-0">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              なぜ<span className="text-red-600">学生転職</span>なのか
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              長期インターンなどの職歴を用いて、初任給もポジションも上げていこう
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border border-gray-100 bg-white rounded-2xl overflow-hidden"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={benefit.image || "/placeholder.svg"}
                    alt={benefit.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {benefit.icon}
                    <h3 className="text-lg font-bold ml-3 text-gray-900">{benefit.title}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* CTA Button */}
          <div className="text-center mt-16">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg font-semibold text-lg"
              onClick={() => router.push("/signup")}
            >
              無料で登録する
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50 scroll-animate opacity-0">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">簡単3ステップ</h2>
            <p className="text-xl text-gray-600">わずか数分で始められる、シンプルで効果的なプロセス</p>
          </div>

          <div className="space-y-12">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                } items-center gap-12`}
              >
                <div className="flex-1 space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center text-lg font-bold">
                      {step.number}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed max-w-md">{step.description}</p>
                </div>

                <div className="flex-1">
                  <img
                    src={step.image || "/placeholder.svg"}
                    alt={step.title}
                    className="w-full max-w-md mx-auto rounded-2xl shadow-lg"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full Salary Simulator */}
      <section id="full-simulator" className="py-20 scroll-animate opacity-0">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">詳細年収シミュレーター</h2>
            <p className="text-xl text-gray-600">あなたの経験を詳しく入力して、正確な推定年収を確認しましょう</p>
          </div>

          <Card className="shadow-xl border border-gray-100 bg-white rounded-2xl">
            <CardContent className="p-8 md:p-12">
              <div className="flex items-center mb-8">
                <div className="p-3 bg-red-100 rounded-xl mr-4">
                  <Calculator className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">あなたの市場価値を計算</h3>
                  <p className="text-gray-600">10,000件を超える データから算出</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="role" className="text-base font-semibold text-gray-700">
                    希望職種
                  </Label>
                  <Select
                    value={salaryData.role}
                    onValueChange={(value) => setSalaryData({ ...salaryData, role: value })}
                  >
                    <SelectTrigger className="h-12 text-base border border-gray-200 focus:border-red-500 rounded-lg">
                      <SelectValue placeholder="目指している職種を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineer">ソフトウェアエンジニア</SelectItem>
                      <SelectItem value="pm">プロダクトマネージャー</SelectItem>
                      <SelectItem value="designer">UXデザイナー</SelectItem>
                      <SelectItem value="data">データサイエンティスト</SelectItem>
                      <SelectItem value="consultant">コンサルタント</SelectItem>
                      <SelectItem value="trading">商社</SelectItem>
                      <SelectItem value="other">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold text-gray-700">月間インターンシップ時間</Label>
                  <RadioGroup
                    value={salaryData.hours}
                    onValueChange={(value) => setSalaryData({ ...salaryData, hours: value })}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {["0-20時間", "20-40時間", "40時間以上"].map((option, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-red-300 transition-colors"
                      >
                        <RadioGroupItem
                          value={["0-20", "20-40", "40+"][idx]}
                          id={`hours${idx}`}
                          className="text-red-600"
                        />
                        <Label htmlFor={`hours${idx}`} className="text-base cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold text-gray-700">リーダーシップ経験</Label>
                  <RadioGroup
                    value={salaryData.leadership}
                    onValueChange={(value) => setSalaryData({ ...salaryData, leadership: value })}
                    className="grid grid-cols-2 gap-4"
                  >
                    {["はい", "いいえ"].map((option, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:border-red-300 transition-colors"
                      >
                        <RadioGroupItem value={["yes", "no"][idx]} id={`lead${idx}`} className="text-red-600" />
                        <Label htmlFor={`lead${idx}`} className="text-base cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>


                <div className="space-y-3">
                  <Label htmlFor="year" className="text-base font-semibold text-gray-700">
                    現在の学年
                  </Label>
                  <Select
                    value={salaryData.year}
                    onValueChange={(value) => setSalaryData({ ...salaryData, year: value })}
                  >
                    <SelectTrigger className="h-12 text-base border border-gray-200 focus:border-red-500 rounded-lg">
                      <SelectValue placeholder="現在の学年を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1年生</SelectItem>
                      <SelectItem value="2">2年生</SelectItem>
                      <SelectItem value="3">3年生</SelectItem>
                      <SelectItem value="4">4年生</SelectItem>
                      <SelectItem value="grad">大学院生</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSalaryCalculate}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-4 rounded-lg font-semibold"
                >
                  年収を計算する
                  <Calculator className="ml-2 w-5 h-5" />
                </Button>

                {/* Result Panel */}
                {showSalaryResult && salaryResult && (
                  <div className="mt-8 p-8 bg-green-50 rounded-2xl border border-green-200">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        計算完了
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-2">推定年収</h4>
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {salaryResult.minSalary}万円 - {salaryResult.maxSalary}万円
                      </div>
                      <div className="text-lg text-gray-600">
                        平均: <span className="font-bold text-gray-900">{salaryResult.averageSalary}万円</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-xl">
                        <div className="flex items-center mb-3">
                          <Award className="w-5 h-5 text-red-500 mr-2" />
                          <h5 className="font-semibold text-gray-900">推奨ポジション</h5>
                        </div>
                        <p className="text-lg font-bold text-red-600">{salaryResult.position}レベル</p>
                      </div>

                      <div className="bg-white p-6 rounded-xl">
                        <div className="flex items-center mb-3">
                          <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                          <h5 className="font-semibold text-gray-900">評価要因</h5>
                        </div>
                        <ul className="space-y-1">
                          {salaryResult.factors.slice(0, 3).map((factor: string, index: number) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <Button
                        onClick={() => router.push("/signup")}
                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold"
                      >
                        この条件で企業を探す
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Success Stories */}
      <section id="success-stories" className="py-20 bg-gray-50 scroll-animate opacity-0">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">成功事例</h2>
            <p className="text-xl text-gray-600">実際に理想のキャリアを実現した先輩たちの声</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {successStories.map((story, index) => (
              <Card
                key={index}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={story.background || "public/32782795_l.jpg"}
                    alt="Background"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {story.offer} / {story.role}
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900">{story.name}</h4>
                      <p className="text-sm text-gray-500">{story.university}</p>
                    </div>
                  </div>

                  <blockquote className="text-gray-700 leading-relaxed">
                    "{story.quote.length > 80 ? story.quote.substring(0, 80) + "..." : story.quote}"
                  </blockquote>

                  <div className="flex mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 scroll-animate opacity-0">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">よくある質問</h2>
            <p className="text-xl text-gray-600">気になる疑問にお答えします</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card
                key={index}
                className="border border-gray-200 hover:border-red-200 transition-colors duration-300 rounded-xl"
              >
                <CardContent className="p-0">
                  <button
                    className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors duration-300 rounded-xl"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    <span className="font-semibold text-lg text-gray-900 pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-red-600 transition-transform duration-300 flex-shrink-0 ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                      {faq.answer}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-red-600 text-white scroll-animate opacity-0">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            あなたの真の市場価値を
            <br />
            解き放つ準備はできていますか？
          </h2>

          <p className="text-xl mb-12 opacity-90 max-w-2xl mx-auto leading-relaxed">
            今すぐ始めて、理想のキャリアへの第一歩を踏み出しましょう
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-white text-red-600 hover:bg-gray-100 text-xl px-12 py-4 rounded-lg font-semibold"
              onClick={() => router.push("/signup")}
            >
              無料で始める
              <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-2 border-white text-white hover:bg-white hover:text-red-600 text-xl px-10 py-4 rounded-lg font-semibold bg-transparent"
              onClick={scrollToFullSimulator}
            >
              年収シミュレーターを試す
            </Button>
          </div>
        </div>
      </section>

     

      {/* Mobile-only Sticky CTA Bar */}
      <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg"
          onClick={() => setIsModalOpen(true)}
        >
          無料で市場価値を診断する →
        </Button>
      </div>

      {/* Sign-up Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg border-0 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900 mb-2">
              結果を見るためにサインアップ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-gray-600 text-center leading-relaxed">
              無料アカウントを作成して、推定年収範囲を確認し、
              <br />
              パーソナライズされた求人推薦を受け取りましょう。
            </p>
            <div className="space-y-4">
              <Input
                placeholder="メールアドレス"
                type="email"
                className="h-12 text-base border border-gray-200 focus:border-red-500 rounded-lg"
              />
              <Input
                placeholder="氏名"
                className="h-12 text-base border border-gray-200 focus:border-red-500 rounded-lg"
              />
              <Input
                placeholder="大学名"
                className="h-12 text-base border border-gray-200 focus:border-red-500 rounded-lg"
              />
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700 text-lg py-4 rounded-lg font-semibold">
              アカウント作成して結果を見る
            </Button>
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              サインアップすることで、利用規約とプライバシーポリシーに同意したものとみなされます
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* @ts-ignore – styled-jsx global props */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 600ms ease-out forwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .scroll-animate {
          transition: opacity 600ms ease-out, transform 600ms ease-out;
        }
      `}</style>
    </div>
  )
}
