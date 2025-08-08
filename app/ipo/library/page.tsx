"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Building, 
  Users, 
  ExternalLink, 
  Star, 
  Heart, 
  TrendingUp, 
  ArrowLeft, 
  Bookmark,
  MapPin,
  Clock,
  DollarSign,
  BarChart3,
  Target,
  Zap,
  Award,
  Briefcase,
  GraduationCap,
  Eye,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  Globe,
  Code,
  Palette,
  Calculator,
  FileText,
  ShoppingCart,
  Stethoscope,
  Hammer,
  Truck,
  Megaphone,
  Camera,
  Shield,
  Lightbulb,
  Minus,
  BookOpen,
  Home,
  Phone,
  Mail,
  Share2,
  Download,
  ThumbsUp,
  MessageCircle,
  TrendingDown,
  CheckCircle,
  PlayCircle,
  User,
  Quote,
  Compass,
  Map
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '@/utils/api';


interface LibraryItem {
  id: string;
  name: string;
  type: 'industry' | 'occupation';
  icon: React.ReactNode;
  description: string;
  tags: string[];
  popularity: number;
  trend: 'up' | 'stable' | 'down';
  trendScore: number;
  isFavorite?: boolean;
  viewCount?: number;
  details: {
    overview: string;
    keySkills: string[];
    careerPath: Array<{
      level: string;
      title: string;
      experience: string;
      salary: string;
      description: string;
    }>;
    averageSalary: string;
    salaryRange: {
      min: number;
      max: number;
      median: number;
    };
    workStyle: string[];
    companies: Array<{
      name: string;
      type: string;
      size: string;
      logo?: string;
    }>;
    marketTrend: {
      growth: number;
      demand: number;
      future: string;
    };
    education: {
      required: string[];
      preferred: string[];
      certifications: string[];
    };
    workEnvironment: {
      remote: number; // 0-100%
      flexibility: string;
      overtime: string;
      culture: string[];
    };
    regions: Array<{
      name: string;
      jobCount: number;
      averageSalary: number;
    }>;
    relatedFields: string[];
    dayInLife: string[];
    challenges: string[];
    rewards: string[];
    interviews: Array<{
      name: string;
      role: string;
      company: string;
      quote: string;
      advice: string;
    }>;
  };
}

interface UserData {
  favorites: string[];
  views: Record<string, number>;
  searchHistory: string[];
}

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'industry' | 'occupation'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'trend' | 'salary' | 'name'>('popularity');
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [userData, setUserData] = useState<UserData>({ favorites: [], views: {}, searchHistory: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId] = useState(() => {
    const stored = localStorage.getItem('ipo-user-id');
    if (stored) return stored;
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('ipo-user-id', newId);
    return newId;
  });
  const router = useRouter();
  const navigateFn = React.useCallback((route: string) => {
    router.push(route);
  }, [router]);

  const libraryItems: LibraryItem[] = [
    {
      id: '1',
      name: 'IT・ソフトウェア',
      type: 'industry',
      icon: <Code className="w-6 h-6" />,
      description: 'システム開発からAI・機械学習まで、テクノロジーで社会を変革する業界',
      tags: ['成長性', 'リモートワーク', '高収入', 'グローバル'],
      popularity: 95,
      trend: 'up',
      trendScore: 8.7,
      details: {
        overview: 'IT・ソフトウェア業界は急速な技術革新により継続的に成長している分野です。クラウド、AI、IoT、ブロックチェーンなどの最新技術を活用し、様々な業界のデジタル変革（DX）を支援します。コロナ禍を経てリモートワークが普及し、働き方の柔軟性が高い業界として注目されています。近年では、SaaS企業の急速な成長、AI技術の社会実装、Web3.0やメタバースなど新領域の発展により、エンジニアの需要は過去最高水準に達しています。',
        keySkills: ['プログラミング', '論理的思考', '問題解決能力', '新技術習得意欲', 'コミュニケーション', 'プロジェクト管理', 'データベース設計', 'セキュリティ'],
        careerPath: [
          {
            level: 'エントリー',
            title: 'ジュニアエンジニア',
            experience: '0-2年',
            salary: '300-500万円',
            description: '基本的なプログラミングスキルを習得し、チームの指導の下で開発業務を担当'
          },
          {
            level: 'ミドル',
            title: 'シニアエンジニア',
            experience: '3-7年',
            salary: '500-800万円',
            description: '独立して複雑な機能開発を担当し、ジュニアメンバーの指導も行う'
          },
          {
            level: 'シニア',
            title: 'テックリード・アーキテクト',
            experience: '8-12年',
            salary: '800-1200万円',
            description: 'システム全体の設計を担当し、技術的な意思決定をリード'
          },
          {
            level: 'エキスパート',
            title: 'CTO・エンジニアリングマネージャー',
            experience: '13年以上',
            salary: '1200-2000万円',
            description: '組織全体の技術戦略を策定し、エンジニア組織を統括'
          }
        ],
        averageSalary: '400-1000万円',
        salaryRange: {
          min: 300,
          max: 2000,
          median: 650
        },
        workStyle: ['フレックス勤務', 'リモートワーク可', '私服OK', '学習支援制度', '副業OK'],
        companies: [
          { name: 'Google Japan', type: '外資系', size: '大企業', logo: '🔍' },
          { name: 'サイバーエージェント', type: '日系', size: '大企業', logo: '🎯' },
          { name: 'メルカリ', type: 'スタートアップ', size: '中企業', logo: '🛒' },
          { name: 'LINE', type: '日系', size: '大企業', logo: '💬' },
          { name: '楽天', type: '日系', size: '大企業', logo: '🛍️' },
          { name: 'freee', type: 'スタートアップ', size: '中企業', logo: '📊' },
          { name: 'SmartNews', type: 'スタートアップ', size: '中企業', logo: '📰' },
          { name: 'チームラボ', type: '日系', size: '中企業', logo: '🎨' }
        ],
        marketTrend: {
          growth: 95,
          demand: 92,
          future: '2030年まで年率8-12%の成長が予想され、特にAI・機械学習、クラウド、セキュリティ分野の需要が急拡大'
        },
        education: {
          required: ['基本的なプログラミング知識', 'コンピュータサイエンスの基礎'],
          preferred: ['情報系学位', '実務経験', 'ポートフォリオ'],
          certifications: ['基本情報技術者', 'AWS認定', 'Google Cloud認定', 'Microsoft Azure認定', 'Oracle認定']
        },
        workEnvironment: {
          remote: 85,
          flexibility: 'フレックスタイム制度充実',
          overtime: '月20-40時間程度',
          culture: ['技術志向', '学習重視', 'フラット', 'イノベーション']
        },
        regions: [
          { name: '東京', jobCount: 15420, averageSalary: 680 },
          { name: '大阪', jobCount: 3240, averageSalary: 580 },
          { name: '愛知', jobCount: 2100, averageSalary: 550 },
          { name: '福岡', jobCount: 1560, averageSalary: 480 },
          { name: '札幌', jobCount: 890, averageSalary: 450 }
        ],
        relatedFields: ['データサイエンス', 'プロダクトマネジメント', 'デザイン', 'コンサルティング'],
        dayInLife: [
          '9:00 - スタンドアップミーティング',
          '9:30 - コードレビュー・設計検討',
          '10:30 - プログラミング・開発作業',
          '12:00 - ランチ',
          '13:00 - 開発作業続行',
          '15:00 - チームミーティング',
          '16:00 - テスト・デバッグ',
          '17:30 - ドキュメント作成',
          '18:00 - 技術勉強・情報収集'
        ],
        challenges: ['技術の変化が激しく継続学習が必要', '長時間集中する必要がある', 'バグやトラブル対応', '仕様変更への対応'],
        rewards: ['新しい技術に触れられる', '論理的思考力が身につく', '高収入', '働き方の自由度が高い', '社会にインパクトを与えられる'],
        interviews: [
          {
            name: '田中 雄太',
            role: 'シニアエンジニア',
            company: 'メルカリ',
            quote: '毎日新しい技術に触れられて、自分の成長を実感できる仕事です。',
            advice: 'まずは一つの言語を深く学んで、そこから広げていくのがおすすめです。'
          },
          {
            name: '佐藤 美紀',
            role: 'テックリード',
            company: 'freee',
            quote: 'チームで一つのプロダクトを作り上げる達成感は何物にも代えがたいです。',
            advice: 'コミュニケーション能力も同じくらい重要。技術だけでなく人との関わりも大切にしてください。'
          }
        ]
      }
    },
    {
      id: '2',
      name: 'コンサルティング',
      type: 'industry',
      icon: <BarChart3 className="w-6 h-6" />,
      description: '企業の経営課題解決をサポートし、戦略立案から実行まで伴走する業界',
      tags: ['高収入', '成長機会', 'グローバル', '論理思考'],
      popularity: 88,
      trend: 'up',
      trendScore: 7.9,
      details: {
        overview: 'クライアント企業の経営課題を特定し、解決策を提案・実行する専門性の高い業界です。戦略、オペレーション、IT、人事など多様な領域での支援を行い、企業の成長と変革を支援します。近年はDXコンサルティングの需要が急増しています。',
        keySkills: ['論理的思考', 'プレゼンテーション', 'プロジェクト管理', '業界知識', 'リーダーシップ', 'データ分析', '問題解決', 'コミュニケーション'],
        careerPath: [
          {
            level: 'エントリー',
            title: 'アナリスト',
            experience: '0-2年',
            salary: '500-700万円',
            description: 'データ収集・分析、資料作成などのサポート業務を担当'
          },
          {
            level: 'ミドル',
            title: 'コンサルタント',
            experience: '3-5年',
            salary: '700-1000万円',
            description: 'プロジェクトの一部を独立して担当し、クライアントとの調整も行う'
          },
          {
            level: 'シニア',
            title: 'シニアコンサルタント',
            experience: '6-10年',
            salary: '1000-1500万円',
            description: 'プロジェクト全体をリードし、チームマネジメントも担当'
          },
          {
            level: 'エキスパート',
            title: 'パートナー',
            experience: '11年以上',
            salary: '1500-3000万円',
            description: '顧客開拓、事業戦略策定、組織運営の責任者'
          }
        ],
        averageSalary: '500-1500万円',
        salaryRange: {
          min: 500,
          max: 3000,
          median: 1000
        },
        workStyle: ['成果主義', '出張多め', 'メンター制度', '海外駐在機会', '研修充実'],
        companies: [
          { name: 'マッキンゼー', type: '外資系', size: '大企業', logo: '🏛️' },
          { name: 'BCG', type: '外資系', size: '大企業', logo: '🌟' },
          { name: 'ベイン', type: '外資系', size: '大企業', logo: '⚡' },
          { name: 'デロイト', type: '外資系', size: '大企業', logo: '🔷' },
          { name: 'アクセンチュア', type: '外資系', size: '大企業', logo: '🚀' },
          { name: 'PwC', type: '外資系', size: '大企業', logo: '🌐' },
          { name: 'KPMG', type: '外資系', size: '大企業', logo: '📈' },
          { name: 'EY', type: '外資系', size: '大企業', logo: '🎯' }
        ],
        marketTrend: {
          growth: 85,
          demand: 88,
          future: 'DX推進、ESG経営、グローバル展開支援の需要が拡大。特にテクノロジー関連コンサルティングの成長が著しい'
        },
        education: {
          required: ['大学卒業', '論理的思考力', 'プレゼンテーション能力'],
          preferred: ['MBA', '海外経験', '業界経験', '語学力'],
          certifications: ['PMP', '中小企業診断士', 'MBA', 'CPA', 'データサイエンス関連資格']
        },
        workEnvironment: {
          remote: 40,
          flexibility: 'プロジェクトベース',
          overtime: '月60-80時間程度',
          culture: ['成果主義', '学習重視', 'グローバル', '競争的']
        },
        regions: [
          { name: '東京', jobCount: 8940, averageSalary: 1200 },
          { name: '大阪', jobCount: 1230, averageSalary: 980 },
          { name: '愛知', jobCount: 560, averageSalary: 920 },
          { name: '福岡', jobCount: 340, averageSalary: 850 }
        ],
        relatedFields: ['戦略企画', 'プロジェクトマネジメント', '投資銀行', 'シンクタンク'],
        dayInLife: [
          '8:00 - メール確認・1日の計画',
          '9:00 - チームミーティング',
          '10:00 - 資料作成・データ分析',
          '12:00 - ランチミーティング',
          '14:00 - クライアント打ち合わせ',
          '16:00 - 提案書作成',
          '18:00 - チーム内レビュー',
          '19:30 - 個人作業・調査',
          '21:00 - 翌日準備'
        ],
        challenges: ['激務でワークライフバランスが難しい', '高いレベルのアウトプットが求められる', '常に新しい知識の習得が必要', 'プレッシャーが大きい'],
        rewards: ['高収入', '急速な成長機会', '多様な業界・企業を知れる', 'グローバルな環境', '論理的思考力が身につく'],
        interviews: [
          {
            name: '山田 健太',
            role: 'コンサルタント',
            company: 'デロイト',
            quote: '毎日が学びの連続で、自分の可能性を広げられる環境です。',
            advice: '論理的思考力とコミュニケーション能力を磨くことが最も重要です。'
          },
          {
            name: '井上 さくら',
            role: 'シニアコンサルタント',
            company: 'アクセンチュア',
            quote: 'クライアントの成功を支援できることにやりがいを感じています。',
            advice: '業界を問わず様々なことに興味を持ち、常に学び続ける姿勢が大切です。'
          }
        ]
      }
    },
    {
      id: '3',
      name: 'プロダクトマネージャー',
      type: 'occupation',
      icon: <Target className="w-6 h-6" />,
      description: 'プロダクトの企画から開発、マーケティングまでを総合的にマネジメント',
      tags: ['戦略思考', 'チーム連携', '市場分析', 'リーダーシップ'],
      popularity: 82,
      trend: 'up',
      trendScore: 8.3,
      details: {
        overview: 'プロダクトのビジョン策定から開発プロセス、市場投入まで、プロダクトライフサイクル全体を管理する職種です。ユーザーニーズの把握、競合分析、機能優先度の決定、開発チームとの連携など、プロダクト成功のための総合的な責任を担います。',
        keySkills: ['戦略思考', 'データ分析', 'UI/UX理解', 'プロジェクト管理', '市場調査', 'コミュニケーション', 'ビジネス企画', 'テクノロジー理解'],
        careerPath: [
          {
            level: 'エントリー',
            title: 'アソシエイトPM',
            experience: '0-2年',
            salary: '450-650万円',
            description: 'プロダクト分析、競合調査、開発サポートなどの基本業務を担当'
          },
          {
            level: 'ミドル',
            title: 'プロダクトマネージャー',
            experience: '3-6年',
            salary: '650-900万円',
            description: '特定機能やプロダクトの責任者として、企画から実装までを統括'
          },
          {
            level: 'シニア',
            title: 'シニアPM',
            experience: '7-10年',
            salary: '900-1300万円',
            description: '複数プロダクトの責任者、またはPMチームのリード'
          },
          {
            level: 'エキスパート',
            title: 'プロダクトディレクター',
            experience: '11年以上',
            salary: '1300-2000万円',
            description: 'プロダクト戦略全体の責任者、組織のプロダクト方針を決定'
          }
        ],
        averageSalary: '600-1200万円',
        salaryRange: {
          min: 450,
          max: 2000,
          median: 850
        },
        workStyle: ['クロスファンクション', 'データドリブン', '意思決定権限', '学習重視', 'ユーザー中心'],
        companies: [
          { name: 'メルカリ', type: 'スタートアップ', size: '中企業', logo: '🛒' },
          { name: 'SmartNews', type: 'スタートアップ', size: '中企業', logo: '📰' },
          { name: 'freee', type: 'スタートアップ', size: '中企業', logo: '📊' },
          { name: 'サイボウズ', type: '日系', size: '中企業', logo: '👥' },
          { name: 'クックパッド', type: '日系', size: '中企業', logo: '🍳' },
          { name: 'LINE', type: '日系', size: '大企業', logo: '💬' },
          { name: 'Google', type: '外資系', size: '大企業', logo: '🔍' },
          { name: 'Microsoft', type: '外資系', size: '大企業', logo: '🪟' }
        ],
        marketTrend: {
          growth: 92,
          demand: 89,
          future: 'デジタル化の進展により、あらゆる業界でプロダクトマネジメント人材の需要が急拡大'
        },
        education: {
          required: ['大学卒業', 'ビジネス企画経験', 'データ分析能力'],
          preferred: ['MBA', 'エンジニア経験', 'デザイン経験', 'マーケティング経験'],
          certifications: ['PMP', 'Google Analytics認定', 'Salesforce認定', 'Scrum Master認定']
        },
        workEnvironment: {
          remote: 70,
          flexibility: 'フレックス制度充実',
          overtime: '月30-50時間程度',
          culture: ['データ重視', 'ユーザー中心', 'アジャイル', 'イノベーション']
        },
        regions: [
          { name: '東京', jobCount: 4560, averageSalary: 920 },
          { name: '大阪', jobCount: 670, averageSalary: 780 },
          { name: '愛知', jobCount: 320, averageSalary: 740 },
          { name: '福岡', jobCount: 280, averageSalary: 680 }
        ],
        relatedFields: ['マーケティング', 'ビジネス企画', 'UI/UXデザイン', 'データ分析'],
        dayInLife: [
          '9:00 - メトリクス確認・分析',
          '9:30 - スタンドアップミーティング',
          '10:00 - ユーザーインタビュー',
          '11:30 - 機能仕様検討',
          '13:00 - ランチ',
          '14:00 - 開発チームミーティング',
          '15:30 - 競合分析・市場調査',
          '17:00 - ステークホルダー報告',
          '18:30 - 戦略検討・企画作成'
        ],
        challenges: ['多部門との調整が必要', '不確実性の中での意思決定', '技術とビジネス両方の理解が必要', 'KPI達成のプレッシャー'],
        rewards: ['プロダクトの成長を直接実感', '多様なスキルが身につく', '戦略的思考力が向上', 'ユーザーへのインパクト', 'キャリアの選択肢が広い'],
        interviews: [
          {
            name: '高橋 大輔',
            role: 'プロダクトマネージャー',
            company: 'freee',
            quote: 'ユーザーの課題を解決するプロダクトを作れることが最大のやりがいです。',
            advice: 'ユーザーの声を直接聞く機会を大切にし、データと感情の両方を理解することが重要です。'
          },
          {
            name: '加藤 理恵',
            role: 'シニアPM',
            company: 'SmartNews',
            quote: 'グローバルなユーザーに価値を届けるスケールの大きさが魅力です。',
            advice: '技術的な知識も重要ですが、それ以上にユーザーへの共感力を磨いてください。'
          }
        ]
      }
    }
  ];

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Try to load from API first, fall back to localStorage
        try {
          const data = (await apiService.getUserData(userId)) as Partial<UserData> | null;
          const normalized: UserData = {
            favorites: Array.isArray(data?.favorites) ? (data!.favorites as string[]) : [],
            views: (data?.views && typeof data.views === 'object') ? (data.views as Record<string, number>) : {},
            searchHistory: Array.isArray(data?.searchHistory) ? (data!.searchHistory as string[]) : [],
          };
          setUserData(normalized);
        } catch (apiError) {
          console.warn('API not available, using localStorage:', apiError);
          // Fallback to localStorage
          const storedData = localStorage.getItem(`ipo-library-data-${userId}`);
          if (storedData) {
            const parsed = JSON.parse(storedData) as Partial<UserData>;
            const normalizedFromStorage: UserData = {
              favorites: Array.isArray(parsed?.favorites) ? (parsed!.favorites as string[]) : [],
              views: (parsed?.views && typeof parsed.views === 'object') ? (parsed.views as Record<string, number>) : {},
              searchHistory: Array.isArray(parsed?.searchHistory) ? (parsed!.searchHistory as string[]) : [],
            };
            setUserData(normalizedFromStorage);
          } else {
            setUserData({ favorites: [], views: {}, searchHistory: [] });
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        setUserData({ favorites: [], views: {}, searchHistory: [] });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let items = libraryItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = selectedFilter === 'all' || item.type === selectedFilter;
      
      return matchesSearch && matchesFilter;
    });

    items.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.popularity - a.popularity;
        case 'trend':
          return b.trendScore - a.trendScore;
        case 'salary':
          return b.details.salaryRange.median - a.details.salaryRange.median;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return items;
  }, [searchQuery, selectedFilter, sortBy]);

  const toggleFavorite = async (itemId: string) => {
    try {
      setSaving(true);
      const isFavorite = userData.favorites.includes(itemId);
      const newFavorites = isFavorite 
        ? userData.favorites.filter(id => id !== itemId)
        : [...userData.favorites, itemId];
      
      const newUserData = { ...userData, favorites: newFavorites };
      setUserData(newUserData);
      
      // Try to save to API, fallback to localStorage
      try {
        await apiService.updateUserData(userId, newUserData);
      } catch (apiError) {
        console.warn('API save failed, using localStorage:', apiError);
        localStorage.setItem(`ipo-library-data-${userId}`, JSON.stringify(newUserData));
      }
    } catch (error) {
      console.error('Failed to update favorite:', error);
    } finally {
      setSaving(false);
    }
  };

  const recordView = async (itemId: string) => {
    try {
      const newViews = { ...userData.views, [itemId]: (userData.views[itemId] || 0) + 1 };
      const newUserData = { ...userData, views: newViews };
      setUserData(newUserData);
      
      // Try to save to API, fallback to localStorage
      try {
        await apiService.updateUserData(userId, newUserData);
      } catch (apiError) {
        console.warn('API save failed, using localStorage:', apiError);
        localStorage.setItem(`ipo-library-data-${userId}`, JSON.stringify(newUserData));
      }
    } catch (error) {
      console.error('Failed to record view:', error);
    }
  };

  const handleItemClick = (item: LibraryItem) => {
    setSelectedItem(item);
    setSelectedTab('overview');
    recordView(item.id);
  };

  const getTrendIcon = (trend: 'up' | 'stable' | 'down') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderDetailView = () => {
    if (!selectedItem) return null;

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <Button
            variant="ghost"
            onClick={() => setSelectedItem(null)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              シェア
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              レポート
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFavorite(selectedItem.id)}
              disabled={saving}
            >
              <Heart className={`w-4 h-4 mr-2 ${userData.favorites.includes(selectedItem.id) ? 'fill-red-500 text-red-500' : ''}`} />
              {userData.favorites.includes(selectedItem.id) ? 'お気に入り済み' : 'お気に入り'}
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  {selectedItem.icon}
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      {selectedItem.type === 'industry' ? '業界' : '職種'}
                    </Badge>
                    {getTrendIcon(selectedItem.trend)}
                    <span className="text-sm">トレンドスコア: {selectedItem.trendScore}</span>
                  </div>
                  <h1 className="text-3xl font-bold mb-2">{selectedItem.name}</h1>
                  <p className="text-xl text-white/90 mb-4">{selectedItem.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="bg-white/20 text-white border-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold">#{selectedItem.popularity}</div>
                <div className="text-sm opacity-80">人気度</div>
              </div>
            </div>
          </div>
          
          {/* Key Stats */}
          <div className="p-6 border-b">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedItem.details.averageSalary}</div>
                <div className="text-sm text-gray-600">平均年収</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{selectedItem.details.workEnvironment.remote}%</div>
                <div className="text-sm text-gray-600">リモート可能</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{selectedItem.details.regions.reduce((sum, region) => sum + region.jobCount, 0).toLocaleString()}</div>
                <div className="text-sm text-gray-600">求人数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{selectedItem.details.companies.length}社</div>
                <div className="text-sm text-gray-600">主要企業</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="career">キャリア</TabsTrigger>
            <TabsTrigger value="salary">年収</TabsTrigger>
            <TabsTrigger value="companies">企業</TabsTrigger>
            <TabsTrigger value="skills">スキル</TabsTrigger>
            <TabsTrigger value="work">働き方</TabsTrigger>
            <TabsTrigger value="regions">地域</TabsTrigger>
            <TabsTrigger value="interviews">インタビュー</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>業界・職種概要</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{selectedItem.details.overview}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>市場トレンド</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>成長性</span>
                      <span className="font-semibold">{selectedItem.details.marketTrend.growth}%</span>
                    </div>
                    <Progress value={selectedItem.details.marketTrend.growth} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>需要</span>
                      <span className="font-semibold">{selectedItem.details.marketTrend.demand}%</span>
                    </div>
                    <Progress value={selectedItem.details.marketTrend.demand} className="h-2" />
                  </div>
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">将来予測</h4>
                    <p className="text-sm text-gray-600">{selectedItem.details.marketTrend.future}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>1日の流れ</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedItem.details.dayInLife.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">{activity}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">やりがい・報酬</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedItem.details.rewards.map((reward, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <ThumbsUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{reward}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">課題・困難</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedItem.details.challenges.map((challenge, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{challenge}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="career" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <span>キャリアパス</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {selectedItem.details.careerPath.map((path, index) => (
                    <div key={index} className="relative">
                      {index < selectedItem.details.careerPath.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-16 bg-blue-200"></div>
                      )}
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg">{path.title}</h3>
                            <Badge variant="outline">{path.salary}</Badge>
                          </div>
                          <div className="flex items-center space-x-4 mb-2 text-sm text-gray-600">
                            <span>{path.level}</span>
                            <span>•</span>
                            <span>{path.experience}</span>
                          </div>
                          <p className="text-gray-700">{path.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5" />
                    <span>年収分布</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>最低</span>
                      <span className="font-semibold">{selectedItem.details.salaryRange.min}万円</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>中央値</span>
                      <span className="font-semibold text-blue-600">{selectedItem.details.salaryRange.median}万円</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>最高</span>
                      <span className="font-semibold">{selectedItem.details.salaryRange.max}万円</span>
                    </div>
                    <div className="mt-6">
                      <div className="h-4 bg-gray-200 rounded-full relative">
                        <div 
                          className="h-4 bg-blue-500 rounded-full absolute left-0"
                          style={{ 
                            width: `${((selectedItem.details.salaryRange.median - selectedItem.details.salaryRange.min) / (selectedItem.details.salaryRange.max - selectedItem.details.salaryRange.min)) * 100}%` 
                          }}
                        ></div>
                        <div 
                          className="w-3 h-3 bg-blue-600 rounded-full absolute top-0.5 border-2 border-white"
                          style={{ 
                            left: `${((selectedItem.details.salaryRange.median - selectedItem.details.salaryRange.min) / (selectedItem.details.salaryRange.max - selectedItem.details.salaryRange.min)) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>地域別年収</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedItem.details.regions.map((region, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{region.name}</span>
                        <span className="font-semibold">{region.averageSalary}万円</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="companies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>主要企業</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedItem.details.companies.map((company, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{company.logo}</div>
                          <div>
                            <h3 className="font-semibold">{company.name}</h3>
                            <div className="flex space-x-2 text-xs">
                              <Badge variant="outline">{company.type}</Badge>
                              <Badge variant="outline">{company.size}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>必要スキル</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedItem.details.keySkills.map((skill, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="w-5 h-5" />
                    <span>学歴・資格</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">必須要件</h4>
                    <div className="space-y-1">
                      {selectedItem.details.education.required.map((req, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm">{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">優遇要件</h4>
                    <div className="space-y-1">
                      {selectedItem.details.education.preferred.map((pref, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">{pref}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">関連資格</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.details.education.certifications.map((cert, index) => (
                        <Badge key={index} variant="outline">{cert}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="work" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Home className="w-5 h-5" />
                    <span>働く環境</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>リモートワーク可能率</span>
                      <span className="font-semibold">{selectedItem.details.workEnvironment.remote}%</span>
                    </div>
                    <Progress value={selectedItem.details.workEnvironment.remote} className="h-2" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">柔軟性</h4>
                    <p className="text-sm text-gray-600">{selectedItem.details.workEnvironment.flexibility}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">残業時間</h4>
                    <p className="text-sm text-gray-600">{selectedItem.details.workEnvironment.overtime}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">企業文化</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.details.workEnvironment.culture.map((culture, index) => (
                        <Badge key={index} variant="outline">{culture}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>働き方の特徴</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedItem.details.workStyle.map((style, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">{style}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="regions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Map className="w-5 h-5" />
                  <span>地域別データ</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">地域</th>
                        <th className="text-right py-2">求人数</th>
                        <th className="text-right py-2">平均年収</th>
                        <th className="text-right py-2">相対的位置</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItem.details.regions.map((region, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 font-medium">{region.name}</td>
                          <td className="py-3 text-right">{region.jobCount.toLocaleString()}</td>
                          <td className="py-3 text-right">{region.averageSalary}万円</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end">
                              <Progress 
                                value={(region.averageSalary / Math.max(...selectedItem.details.regions.map(r => r.averageSalary))) * 100} 
                                className="w-20 h-2" 
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Compass className="w-5 h-5" />
                  <span>関連分野</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.details.relatedFields.map((field, index) => (
                    <Badge key={index} variant="outline" className="cursor-pointer hover:bg-blue-50">
                      {field}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interviews" className="space-y-6">
            {selectedItem.details.interviews.map((interview, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-12 h-12" title={interview.name}>
                      <User className="w-6 h-6" />
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">{interview.name}</h3>
                        <Badge variant="outline">{interview.role}</Badge>
                        <Badge variant="outline">{interview.company}</Badge>
                      </div>
                      <blockquote className="text-gray-700 mb-4 pl-4 border-l-4 border-blue-200 italic">
                        <Quote className="w-4 h-4 inline mr-2 text-blue-400" />
                        {interview.quote}
                      </blockquote>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">💡 アドバイス</h4>
                        <p className="text-blue-800 text-sm">{interview.advice}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  if (selectedItem) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          {renderDetailView()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">業界・職種ライブラリ</h1>
          <p className="text-lg text-gray-600">500社以上の詳細データと社員インタビューで、あなたの理想のキャリアを見つけよう</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="業界名・職種名・スキルで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as typeof selectedFilter)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">すべて</option>
                <option value="industry">業界</option>
                <option value="occupation">職種</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="popularity">人気順</option>
                <option value="trend">トレンド順</option>
                <option value="salary">年収順</option>
                <option value="name">名前順</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-6" onClick={() => handleItemClick(item)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          {item.icon}
                        </div>
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {item.type === 'industry' ? '業界' : '職種'}
                          </Badge>
                          <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                            {item.name}
                          </h3>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(item.trend)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          disabled={saving}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Heart className={`w-4 h-4 ${userData.favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">{item.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="secondary">+{item.tags.length - 3}</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{userData.views[item.id] || 0}回閲覧</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4" />
                          <span>人気度{item.popularity}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {filteredAndSortedItems.length === 0 && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">検索結果が見つかりません</h3>
            <p className="text-gray-600">別のキーワードで検索してみてください</p>
          </div>
        )}
      </div>
    </div>
  );
}