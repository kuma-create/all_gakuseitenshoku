import React, { useState, useEffect, useRef, useTransition } from 'react';
import Image from 'next/image';
import { 
  ArrowRight, 
  ArrowUp,
  Brain,
  Target,
  BarChart3,
  ChevronDown,
  Sparkles,
  Zap,
  Star,
  Check,
  X,
  Calendar,
  BookOpen,
  Users2,
  Shield,
  Award,
  TrendingUp,
  Building,
  GraduationCap,
  Clock,
  MessageCircle,
  FileText,
  Briefcase,
  ChevronRight,
  ExternalLink,
  Quote,
  Lock,
  Globe,
  Phone,
  Mail,
  Send,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Route, User } from '../App';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion, useSpring } from 'framer-motion';

interface LandingPageProps {
  navigate: (route: Route) => void;
  user: User | null;
}

export function LandingPage({ navigate, user }: LandingPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Enhanced smartphone preview component with detailed UI for each feature
  const SmartphonePreview: React.FC<{ 
    icon: React.ElementType; 
    title: string; 
    color: string;
    type: 'analysis' | 'case' | 'score';
  }> = ({ icon: Icon, title, color, type }) => {
    const renderContent = () => {
      switch (type) {
        case 'analysis':
          return (
            <div className="p-4 h-full bg-gradient-to-br from-white to-gray-50">
              {/* App Header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs text-gray-500">AI自己分析</div>
              </div>
              
              {/* Chat Messages */}
              <div className="space-y-3 mb-4">
                <div className="bg-gray-100 rounded-xl p-3">
                  <div className="text-xs text-gray-600 mb-1">IPO大学 AI</div>
                  <div className="text-sm">あなたの大学時代で一番頑張ったことを教えてください</div>
                </div>
                
                <div className={`bg-gradient-to-r ${color} text-white rounded-xl p-3 ml-8`}>
                  <div className="text-sm">サークル活動でイベント企画を...</div>
                </div>
                
                <div className="bg-gray-100 rounded-xl p-3">
                  <div className="text-xs text-gray-600 mb-1">IPO大学 AI</div>
                  <div className="text-sm">素晴らしいですね！そこから得た学びや成長について詳しく...</div>
                </div>
              </div>
              
              {/* Input Area */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-gray-100 rounded-xl p-2 flex items-center">
                  <input className="flex-1 bg-transparent text-xs" placeholder="回答を入力..." />
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                    <Send className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
          
        case 'case':
          return (
            <div className="p-4 h-full bg-gradient-to-br from-white to-gray-50">
              {/* App Header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs text-gray-500">ケース問題</div>
              </div>
              
              {/* Case Title */}
              <div className="mb-4">
                <div className="text-sm font-bold text-gray-900 mb-1">コンビニの売上向上策</div>
                <div className="text-xs text-gray-600">難易度: ★★★☆☆</div>
              </div>
              
              {/* Problem Statement */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <div className="text-xs text-gray-700 leading-relaxed">
                  あなたはコンビニチェーンのコンサルタントです。既存店舗の売上が前年比10%減少しています。原因を分析し、具体的な改善策を提示してください。
                </div>
              </div>
              
              {/* Timer */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-600">残り時間: 15:30</span>
                </div>
                <div className={`px-2 py-1 rounded-full bg-gradient-to-r ${color} text-white text-xs`}>
                  解答中
                </div>
              </div>
              
              {/* Answer Area Preview */}
              <div className="bg-white border rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-2">解答を入力してください...</div>
                <div className="text-xs text-gray-700">
                  1. 現状分析<br/>
                  - 顧客数の減少<br/>
                  - 客単価の低下<br/>
                  2. 原因仮説...
                </div>
              </div>
            </div>
          );
          
        case 'score':
          return (
            <div className="p-4 h-full bg-gradient-to-br from-white to-gray-50">
              {/* App Header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs text-gray-500">キャリアスコア</div>
              </div>
              
              {/* Total Score */}
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-gray-900">78</div>
                <div className="text-xs text-gray-600">総合スコア</div>
                <div className="flex items-center justify-center mt-1">
                  <ArrowUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">+12 先週比</span>
                </div>
              </div>
              
              {/* Radar Chart Mock */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center justify-center">
                <div className="relative w-24 h-24">
                  {/* Simple radar chart visualization */}
                  <div className="absolute inset-0 border-2 border-gray-200 rounded-full"></div>
                  <div className="absolute inset-2 border border-gray-200 rounded-full"></div>
                  <div className="absolute inset-4 border border-gray-200 rounded-full"></div>
                  <div className={`absolute inset-0 border-2 border-transparent rounded-full`} 
                       style={{borderTopColor: '#3b82f6', borderRightColor: '#10b981', borderBottomColor: '#f59e0b', borderLeftColor: '#ef4444'}}></div>
                </div>
              </div>
              
              {/* Score Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">自己分析力</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-1 bg-gray-200 rounded-full">
                      <div className="w-9 h-1 bg-blue-500 rounded-full"></div>
                    </div>
                    <span className="text-xs font-medium">85</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">論理的思考</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-1 bg-gray-200 rounded-full">
                      <div className="w-8 h-1 bg-green-500 rounded-full"></div>
                    </div>
                    <span className="text-xs font-medium">72</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">企業研究</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-1 bg-gray-200 rounded-full">
                      <div className="w-10 h-1 bg-yellow-500 rounded-full"></div>
                    </div>
                    <span className="text-xs font-medium">91</span>
                  </div>
                </div>
              </div>
            </div>
          );
          
        default:
          return <div>未対応の機能</div>;
      }
    };

    return (
      <div
        className={
          `relative mx-auto w-[280px] h-[560px] mb-8 transform ` +
          `rotate-0 ` +
          `transition-transform duration-500 ease-out`
        }
      >
        {/* soft glow */}
        <div className="absolute -inset-3 rounded-[28px] bg-gradient-to-r from-black/10 to-black/5 blur-xl pointer-events-none"></div>

        {/* Content canvas (no phone bezel) */}
        <div className="relative w-full h-full rounded-[28px] overflow-hidden shadow-2xl bg-white">
          {renderContent()}
        </div>
      </div>
    );
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const heroRef = useRef(null);

  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const bgYRaw = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [0, 80]
  );
  const textYRaw = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [0, 120]
  );
  const backgroundY = useSpring(bgYRaw, { stiffness: 120, damping: 20, mass: 0.2 });
  const textY = useSpring(textYRaw, { stiffness: 120, damping: 20, mass: 0.2 });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Prefetch likely next pages to reduce click latency
    try {
      router.prefetch('/ipo/analysis');
      router.prefetch('/ipo/dashboard');
    } catch (_) {
      // no-op if router isn't available in some envs
    }
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Enhanced features with big numbers design
  const featuresHighlight = [
    {
      number: "01",
      icon: Brain,
      title: "AI自己分析で\n強みを発見！",
      description: "AIが経験を整理し、あなただけの強みと価値観を言語化します。面接で自信を持って話せるように。",
      image: <SmartphonePreview icon={Brain} title="AI自己分析" color="from-sky-500 to-cyan-600" type="analysis" />,
      gradient: "from-sky-500 to-cyan-600",
      bgGradient: "from-sky-50 to-cyan-50"
    },
    {
      number: "02",
      icon: Target,
      title: "ケース問題で\n論理思考を鍛える！",
      description: "マッキンゼー・BCG等の実問題でケース面接対策。AI採点で弱点が一目で分かります。",
      image: <SmartphonePreview icon={Target} title="ケース問題" color="from-orange-500 to-red-500" type="case" />,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50"
    },
    {
      number: "03",
      icon: BarChart3,
      title: "データで現在地を\n可視化！",
      description: "8つの指標でキャリアスコアを算出。同学年との比較で客観的に実力を把握できます。",
      image: <SmartphonePreview icon={BarChart3} title="キャリアスコア" color="from-emerald-500 to-teal-600" type="score" />,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50"
    }
  ];

  // Simplified features without pricing and buttons
  const features = [
    {
      icon: Brain,
      title: "AI自己分析・壁打ち",
      description: "AIが過去の経験を整理し、強み・価値観を自動で言語化。24時間いつでも自己分析の相談ができる壁打ち機能付き。",
      gradient: "from-sky-500 to-cyan-600",
    },
    {
      icon: Target,
      title: "ケースグランプリ",
      description: "マッキンゼー・BCG等のコンサルティングファームの実問題を収録。AI採点機能で弱点を特定し、効率的に論理的思考力を向上。",
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: BarChart3,
      title: "キャリアスコア",
      description: "自己分析力・論理的思考・企業研究力など8つの指標で就活力をスコア化。同学年との比較データで客観的な現在地を把握。",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      icon: Calendar,
      title: "スマートカレンダー",
      description: "ES締切・面接日程を一元管理。企業別の準備チェックリストを自動生成し、Googleカレンダーとの同期でスケジュール漏れを防止。",
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      icon: BookOpen,
      title: "業界・企業図鑑",
      description: "500社以上の企業データ、社員インタビュー動画、年収・働き方情報を網羅。業界研究から企業分析まで効率的に実施可能。",
      gradient: "from-green-500 to-emerald-600",
    },
    {
      icon: Users2,
      title: "適職診断システム",
      description: "心理学のBig5理論に基づく科学的な性格診断。職種適性・チーム適性・キャリア志向を分析し、最適な業界・職種をマッチング。",
      gradient: "from-purple-500 to-pink-600",
    }
    ,{
      icon: FileText,
      title: "ピアレビュー（相互添削）",
      description: "学生同士でES・自己PRをレビューし合い、具体的な改善提案を得られる機能。評価基準テンプレと良い例・悪い例の提示で学習効率を最大化。",
      gradient: "from-gray-400 to-gray-500",
      comingSoon: true
    }
  ];

  const testimonials = [
    {
      name: '田中 美咲',
      university: '早稲田大学 商学部',
      company: 'マッキンゼー・アンド・カンパニー',
      avatar: '👩‍🎓',
      avatarUrl: '/32127676_l.jpg',
      universityLogoText: '早稲田',
      companyLogoText: 'McKinsey',
      quote: 'AIの自己分析で、自分でも気づかなかった強みを発見できました。ケース問題で論理的思考も鍛えられ、面接で自信を持って話せるように。第一志望のコンサルティングファームに内定できました。',
      rating: 5,
      improvement: 'ケーススコア: 45→87点'
    },
    {
      name: '佐藤 健太',
      university: '東京大学 工学部',
      company: 'PwC',
      avatar: '👨‍💻',
      avatarUrl: '/31518346_l.jpg',
      universityLogoText: '東京',
      companyLogoText: 'PwC',
      quote: 'エンジニア志望でしたが、ビジネス思考も重要だと気づきました。業界図鑑で企業研究も効率的にでき、技術面接で他の候補者と差別化できました。',
      rating: 5,
      improvement: 'キャリアスコア: 52→91点'
    },
    {
      name: '山田 花音',
      university: '慶應義塾大学 経済学部',
      company: 'サイバーエージェント',
      avatar: '👩‍💼',
      avatarUrl: '/32782795_l.jpg',
      universityLogoText: '慶應',
      companyLogoText: 'CA',
      quote: '最初は何をしたいか全く分からない状態でした。AIとの対話で自分の価値観が明確になり、本当にやりたい仕事を見つけられました。ベンチャー企業で新規事業に挑戦しています。',
      rating: 5,
      improvement: '自己分析スコア: 38→94点'
    }
  ];

  const universities = [
    '東京大学', '京都大学', '早稲田大学', '慶應義塾大学', '一橋大学',
    '東京工業大学', '大阪大学', '名古屋大学', '九州大学', '東北大学',
    '北海道大学', '筑波大学', '神戸大学', '上智大学', '立教大学',
    '明治大学', '青山学院大学', '中央大学', '法政大学', '関西大学',
    '関西学院大学', '同志社大学', '立命館大学', '日本大学', '近畿大学'
  ];

  const companies = [
    'マッキンゼー', 'BCG', 'ベイン', 'デロイト', 'PwC', 'EY',
    'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix',
    'ゴールドマン・サックス', 'モルガン・スタンレー', 'JP Morgan',
    'トヨタ自動車', 'ソニー', 'パナソニック', '日立製作所',
    'ソフトバンク', 'NTT', 'KDDI', '楽天', 'メルカリ',
    'サイバーエージェント', 'DeNA', 'リクルート', '電通', '博報堂'
  ];

  const faqs = [
    {
      question: '本当に全機能が無料ですか？追加料金はありませんか？',
      answer: 'はい。IPO大学の機能（AI自己分析・ケース問題・キャリアスコア・スマートカレンダー・業界/企業図鑑・適職診断など）はすべて無料でご利用いただけます。クレジットカード登録は不要で、機能制限や隠れ課金もありません。'
    },
    {
      question: '今後、有料化されたりしませんか？',
      answer: 'コア機能は恒久的に無料で提供します。将来的に企業スポンサーによる特集やイベント連携などのB2B収益化を行いますが、学生ユーザーの主要機能に料金が発生することは想定していません。'
    },
    {
      question: 'AIの分析はどれくらい正確ですか？根拠はありますか？',
      answer: '分析は心理学のBig5理論などの知見を参考に開発しています。画面上に根拠や注意点を明示し、最終判断はご自身で行えるように設計しています。AIの結果は“補助輪”としてご活用ください。'
    },
    {
      question: '個人情報やデータは安全に管理されますか？',
      answer: '通信はSSLで暗号化し、RLS（行レベルセキュリティ）を有効化したDB上で適切に管理しています。個人情報保護法に準拠し、第三者への提供は行いません。退会時にはデータを削除します。'
    },
    {
      question: '学生転職との連携は無料ですか？',
      answer: 'はい。プロフィール・職歴・PRの同期は無料でご利用いただけます。1クリックで最新情報を反映し、重複入力を削減します。'
    },
    {
      question: '地方大学でも効果はありますか？',
      answer: 'オンライン前提の学習設計のため、地域差なくご活用いただけます。自己分析・ケース問題・面接想定問答を自分のペースで学べます。'
    }
  ];

  const handleGetStarted = () => {
    if (isPending) return;
    startTransition(() => {
      if (user) {
        navigate('/ipo/dashboard');
      } else {
        navigate('/ipo/analysis');
      }
    });
  };

  // Mock jobs (hero preview) — images use seeded placeholders
  const mockJobs = [
    {
      id: 'j1',
      title: '新規事業アシスタント',
      company: 'メルカリ',
      location: '東京',
      imageUrl: 'https://picsum.photos/seed/ipo-job-1/320/200'
    },
    {
      id: 'j2',
      title: 'プロダクトマネージャーインターン',
      company: '楽天',
      location: '東京',
      imageUrl: 'https://picsum.photos/seed/ipo-job-2/320/200'
    },
    {
      id: 'j3',
      title: '戦略コンサルタントアナリスト',
      company: 'BCG',
      location: '東京',
      imageUrl: 'https://picsum.photos/seed/ipo-job-3/320/200'
    }
  ];
  // Minimal hero mock to avoid runtime ReferenceError
  const HeroMockContent: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        {/* Top Visual: Full-width Image (smaller, tilted, no frame) */}
        <div className="md:col-span-3 flex justify-center">
          <div className="relative w-full max-w-3xl">
            {/* soft purple glow */}
            <div className="absolute -inset-8 rounded-[28px] bg-cyan-400/20 blur-3xl pointer-events-none"></div>
            <Image
              src="/Untitled design (10).png"
              alt="キャリアスコア詳細モック"
              width={800}
              height={600}
              sizes="(max-width: 768px) 90vw, (max-width: 1280px) 60vw, 720px"
              className="relative w-full h-auto object-contain max-h-[360px] md:max-h-[420px] transform rotate-0 transition-transform duration-500 ease-out"
              loading="eager"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Fixed Header */}
      <motion.header 
        className={`fixed top-0 w-full z-50 transform-gpu transition-all duration-500 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm' 
            : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate('/ipo')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center space-x-3">
                <Image
                  src="/IPO大学.png"
                  alt="IPO大学ロゴ"
                  width={160}
                  height={48}
                  className="h-8 sm:h-10 md:h-12 w-auto"
                  priority
                />
              </div>
            </motion.div>
            
            <div className="flex items-center space-x-6">
              {user ? (
                <Button
                  onClick={() => navigate('/ipo/dashboard')}
                  size="lg"
                  className="focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  ダッシュボード
                </Button>
              ) : (
                <>
                  <button
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded"
                    onClick={() => navigate('/ipo/analysis')}
                  >
                    ログイン
                  </button>
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700  shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    1分で無料ではじめる
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 md:pt-36 lg:pt-40 pb-16 md:pb-24"
      >
        {/* Background Effects */}
        <motion.div
          className="absolute inset-0 opacity-20 md:opacity-40 transform-gpu"
          style={{ y: backgroundY }}
        >
          <div className="hidden md:block absolute top-20 left-10 w-64 h-64 bg-sky-300 rounded-full mix-blend-multiply blur-lg"></div>
          <div className="hidden md:block absolute top-40 right-10 w-64 h-64 bg-cyan-300 rounded-full mix-blend-multiply blur-lg"></div>
          <div className="hidden md:block absolute bottom-20 left-1/2 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply blur-lg"></div>
        </motion.div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            className="transform-gpu"
            style={{ y: textY }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
              <span className="bg-gradient-to-r from-sky-600 via-cyan-600 to-cyan-600 bg-clip-text text-transparent">
                散らばった就活を、ここで一元化
              </span>
              <br />
              <span className="text-gray-900">AIが自己分析・ES・面接まで伴走する就活ツール</span>
            </h1>

            <p className="mt-2 md:mt-4 text-xl lg:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              メモやカレンダーに分散した情報をひとつに集約。AIが
              <strong>自己分析 → ES下書き → 面接対策 → スケジュール管理</strong>
              まで自動でサポートします。
              <br className="hidden sm:block" />
              "迷い"を減らし、やることがすぐ分かる。
            </p>

            {/* Hero Mock Content - New Component */}
            <motion.div 
              className="mt-12 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <HeroMockContent navigate={navigate} />
            </motion.div>

            <div className="flex items-center justify-center mb-12">
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="text-lg px-8 py-4 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" /> 読み込み中...
                  </>
                ) : (
                  <>
                    今すぐ無料で始める
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 transform-gpu"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </motion.div>
      </section>

      {/* Features Highlight Section with Big Numbers */}
      <section className="py-32 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="mb-6">
              <span className="text-lg text-gray-600 font-medium">さらにうれしい</span>
            </div>
            <h2 className="text-5xl lg:text-6xl font-bold mb-6">
              IPO大学の
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent mx-4">
                3
              </span>
              つの特長
            </h2>
          </motion.div>

          <div className="space-y-32">
            {featuresHighlight.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className={`relative ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center bg-gradient-to-r ${feature.bgGradient} rounded-3xl p-8 lg:p-16 shadow-xl`}>
                  {/* Text Content */}
                  <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                    <div className="flex items-center mb-8">
                      <div className={`text-8xl lg:text-9xl font-black bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent opacity-90 mr-6`}>
                        {feature.number}
                      </div>
                    </div>
                    
                    <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 whitespace-pre-line leading-tight">
                      {feature.title}
                    </h3>
                    
                    <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                      {feature.description}
                    </p>
                    
                    <Button
                      size="lg"
                      className={`bg-gradient-to-r ${feature.gradient} hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-4`}
                      onClick={() => navigate(features.find(f => f.icon === feature.icon)?.route || '/ipo/analysis')}
                    >
                      今すぐ試す
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>

                  {/* Visual */}
                  <div className={`flex justify-center ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                    {feature.image}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Simplified Features Grid Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                6つの機能
              </span>
              <span className="text-gray-900">で就活を科学的にサポート</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              AI技術と豊富なデータを組み合わせた、他にはない包括的な就活支援
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group cursor-pointer transform-gpu will-change-transform h-full"
              >
                <Card className={`relative h-full border-0 shadow-xl bg-white transition-all duration-500 overflow-hidden ${feature.comingSoon ? 'opacity-60 pointer-events-none' : 'hover:shadow-2xl'}`}>
                  {feature.comingSoon && (
                    <span className="absolute top-3 right-3 text-[10px] tracking-wide font-semibold px-2 py-1 rounded-md bg-gray-900 text-white">
                      COMING&nbsp;SOON
                    </span>
                  )}
                  <CardContent className="p-6 h-full flex flex-col">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 mb-6`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Universities Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              全国の学生が利用
            </h2>
            <p className="text-xl text-gray-600">
              国公立・私立を問わず、幅広い大学の学生が活用中です
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-4 text-center">
            {universities.map((university, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-sm font-medium text-gray-700">{university}</div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-500">...その他全国の大学</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-cyan-50 opacity-50"></div>
        
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              ユーザーの声
            </h2>
            <p className="text-xl text-gray-600">
              IPO大学を活用した先輩たちの体験談
            </p>
          </motion.div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="overflow-hidden shadow-2xl">
                  <CardContent className="p-8 lg:p-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                      <div className="text-center lg:text-left">
                        <div className="mb-4 flex items-center justify-center lg:justify-start">
                          {testimonials[currentTestimonial].avatarUrl ? (
                            <img
                              src={testimonials[currentTestimonial].avatarUrl}
                              alt={`${testimonials[currentTestimonial].name} の顔写真（イメージ）`}
                              className="w-20 h-20 rounded-full object-cover border border-gray-200"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-6xl">{testimonials[currentTestimonial].avatar}</div>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {testimonials[currentTestimonial].name}
                        </h3>
                        <p className="text-gray-600 mb-3">{testimonials[currentTestimonial].university}</p>
                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md border text-xs text-gray-700 bg-white">
                            {testimonials[currentTestimonial].universityLogoText}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-md border text-xs text-gray-700 bg-white">
                            {testimonials[currentTestimonial].companyLogoText}
                          </span>
                        </div>
                        <div className="flex justify-center lg:justify-start mb-4">
                          {Array.from({ length: testimonials[currentTestimonial].rating }, (_, i) => (
                            <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                          ))}
                        </div>
                        {testimonials[currentTestimonial].improvement && (
                          <div className="text-sm bg-green-50 px-2 py-1 rounded text-green-700 inline-flex">
                            {testimonials[currentTestimonial].improvement}
                          </div>
                        )}
                      </div>
                      
                      <div className="lg:col-span-2">
                        <Quote className="w-8 h-8 text-sky-400 mb-4" />
                        <blockquote className="text-lg text-gray-700 leading-relaxed">
                          "{testimonials[currentTestimonial].quote}"
                        </blockquote>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation dots */}
            <div className="flex justify-center mt-6 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentTestimonial 
                      ? 'bg-sky-600' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              よくある質問
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 pr-4">
                        {faq.question}
                      </h3>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          openFaq === index ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>
                  <AnimatePresence>
                    {openFaq === index && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-0 text-gray-600 leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-r from-sky-600 to-cyan-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              今すぐ始めて、就活を変えよう
            </h2>
            <p className="text-xl mb-12 opacity-90">
              無料で今すぐ試そう
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="text-lg px-8 py-4 bg-white text-sky-600 hover:bg-gray-50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" /> 読み込み中...
                  </>
                ) : (
                  <>
                    無料で始める
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
              
              <div className="flex items-center space-x-4 text-sm opacity-75">
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-1" />
                  全機能ずっと無料
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-1" />
                  1分で登録完了
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-sky-600 to-cyan-600 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">IPO大学</span>
              </div>
              <p className="text-gray-400 mb-6">
                AIが伴走する、新しい就活支援プラットフォーム
              </p>
              <div className="flex space-x-4">
                <div className="text-gray-400 hover:text-white cursor-pointer">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">サービス</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => navigate('/ipo/analysis')} className="hover:text-white">AI自己分析</button></li>
                <li><button onClick={() => navigate('/ipo/case')} className="hover:text-white">ケース問題</button></li>
                <li><button onClick={() => navigate('/ipo/dashboard')} className="hover:text-white">キャリアスコア</button></li>
                <li><button onClick={() => navigate('/ipo/calendar')} className="hover:text-white">カレンダー</button></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">サポート</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button className="hover:text-white">ヘルプセンター</button></li>
                <li><button className="hover:text-white">お問い合わせ</button></li>
                <li><button onClick={() => navigate('/terms')} className="hover:text-white">利用規約</button></li>
                <li><button onClick={() => navigate('/legal')} className="hover:text-white">プライバシーポリシー</button></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 IPO大学. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}