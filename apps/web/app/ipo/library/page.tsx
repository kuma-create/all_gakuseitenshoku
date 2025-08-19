"use client";
import React, { useState, useEffect, useMemo, useCallback, startTransition, useRef } from 'react';
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
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

const makeIcon = (type: 'industry' | 'occupation') => {
  return type === 'industry' ? <Building className="w-6 h-6" /> : <Briefcase className="w-6 h-6" />;
};

// 表示時に「万円」を自動付与（既に単位が含まれている場合はそのまま）
const withManEn = (v: string) => (v ? (/[万円]/.test(v) ? v : `${v}万円`) : '');


interface LibraryItem {
  id: string;
  name: string;
  type: 'industry' | 'occupation';
  icon: React.ReactNode;
  imageUrl?: string;
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
  searchHistory: string[];
}

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'industry' | 'occupation'>('all');
  const [sortBy, setSortBy] = useState<'trend' | 'salary' | 'name'>('trend');
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [userData, setUserData] = useState<UserData>({ favorites: [], searchHistory: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Grid専用のローディング（ユーザーデータとは独立）
  const [itemsLoading, setItemsLoading] = useState(true);
  // Prefer Supabase auth user id. Fallback to localStorage (read-only mode).
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        if (data?.user?.id) {
          setUserId(data.user.id);
          setIsAuthed(true);
        } else {
          const stored = typeof window !== 'undefined' ? localStorage.getItem('ipo-user-id') : null;
          if (stored) {
            setUserId(stored);
          } else {
            const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            if (typeof window !== 'undefined') localStorage.setItem('ipo-user-id', newId);
            setUserId(newId);
          }
          setIsAuthed(false);
        }
      } catch {
        // fallback to local id
        const stored = typeof window !== 'undefined' ? localStorage.getItem('ipo-user-id') : null;
        if (stored) {
          setUserId(stored);
        } else {
          const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          if (typeof window !== 'undefined') localStorage.setItem('ipo-user-id', newId);
          setUserId(newId);
        }
        setIsAuthed(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const router = useRouter();
  const navigateFn = React.useCallback((route: string) => {
    router.push(route);
  }, [router]);

  // PDF出力用に詳細ビューのDOMを参照
  const detailRef = useRef<HTMLDivElement | null>(null);


  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    setItemsLoading(true);
    (async () => {
      try {
        // Local row type to decouple from possibly stale generated Supabase types
        type IpoLibraryItemRow = {
          id: string | number;
          name: string;
          type: 'industry' | 'occupation' | string;
          description: string | null;
          tags: string[] | null;
          popularity: number | null;
          trend: 'up' | 'stable' | 'down' | null;
          trend_score: number | null;
          image_url?: string | null; // カード用のサムネ (任意)
          details: any | null;       // details 内に image_url がある場合も考慮
        };

        const { data, error } = await supabase
          .from('ipo_library_items')
          .select('*');
        const rows = (data as unknown as IpoLibraryItemRow[]) ?? [];

        if (error) {
          console.warn('[library] Fetch error:', error.message);
          if (isMounted) setLibraryItems([]);
          if (isMounted) setItemsLoading(false);
          return;
        }
        if (!rows || rows.length === 0) {
          if (isMounted) setLibraryItems([]);
          if (isMounted) setItemsLoading(false);
          return;
        }

        const mapped: LibraryItem[] = rows.map((row: IpoLibraryItemRow) => ({
          id: String(row.id),
          name: row.name,
          type: (row.type === 'industry' || row.type === 'occupation') ? row.type : 'industry',
          icon: makeIcon((row.type === 'industry' || row.type === 'occupation') ? row.type : 'industry'),
          imageUrl: (row as any).image_url ?? (row as any)?.details?.image_url ?? undefined,
          description: row.description ?? '',
          tags: Array.isArray(row.tags) ? row.tags : [],
          popularity: Number(row.popularity ?? 0),
          trend: (row.trend === 'up' || row.trend === 'stable' || row.trend === 'down') ? row.trend : 'stable',
          trendScore: Number(row.trend_score ?? 0),
          details: row.details ?? {
            overview: '',
            keySkills: [],
            careerPath: [],
            averageSalary: '',
            salaryRange: { min: 0, max: 0, median: 0 },
            workStyle: [],
            companies: [],
            marketTrend: { growth: 0, demand: 0, future: '' },
            education: { required: [], preferred: [], certifications: [] },
            workEnvironment: { remote: 0, flexibility: '', overtime: '', culture: [] },
            regions: [],
            relatedFields: [],
            dayInLife: [],
            challenges: [],
            rewards: [],
            interviews: [],
          },
        }));

        if (isMounted) setLibraryItems(mapped);
        if (isMounted) setItemsLoading(false);
      } catch (e: any) {
        console.warn('[library] Exception:', e?.message);
        if (isMounted) setLibraryItems([]);
        if (isMounted) setItemsLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, []);

  // Helper to save user data to Supabase
  const saveUserDataSupabase = async (payload: UserData) => {
    // Only persist when Supabase session exists (RLS policy will require auth)
    if (!isAuthed || !userId || userId.startsWith('user_')) {
      return false;
    }
    try {
      const { error } = await supabase
        .from('ipo_library_user_data')
        .upsert({ user_id: userId, favorites: payload.favorites, search_history: payload.searchHistory });
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn('[library] saveUserDataSupabase failed:', (e as Error).message);
      return false;
    }
  };

  // Load user data
  useEffect(() => {
    // Skip querying when未ログイン or ローカルID（uuid列にtextをぶつけない）
    if (!userId || !isAuthed || userId.startsWith('user_')) {
      setUserData({ favorites: [], searchHistory: [] });
      setLoading(false);
      return;
    }
    const loadUserData = async () => {
      try {
        setLoading(true);
        const { data: sbData, error: sbErr } = await supabase
          .from('ipo_library_user_data')
          .select('favorites,search_history')
          .eq('user_id', userId!)
          .maybeSingle();

        if (!sbErr && sbData) {
          const normalized: UserData = {
            favorites: Array.isArray(sbData.favorites) ? (sbData.favorites as string[]) : [],
            searchHistory: Array.isArray(sbData.search_history) ? (sbData.search_history as string[]) : [],
          };
          setUserData(normalized);
        } else {
          setUserData({ favorites: [], searchHistory: [] });
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        setUserData({ favorites: [], searchHistory: [] });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userId, isAuthed]);

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
  }, [searchQuery, selectedFilter, sortBy, libraryItems]);

  const toggleFavorite = useCallback(async (itemId: string) => {
    try {
      setSaving(true);
      const isFavorite = userData.favorites.includes(itemId);
      const newFavorites = isFavorite 
        ? userData.favorites.filter(id => id !== itemId)
        : [...userData.favorites, itemId];
      const newUserData = { ...userData, favorites: newFavorites };
      setUserData(newUserData);
      await saveUserDataSupabase(newUserData);
    } catch (error) {
      console.error('Failed to update favorite:', error);
    } finally {
      setSaving(false);
    }
  }, [userData]);

  const handleItemClick = useCallback((item: LibraryItem) => {
    startTransition(() => {
      setSelectedItem(item);
      setSelectedTab('overview');
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (!selectedItem) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = `${selectedItem.name} | 業界・職種ライブラリ`;
    const text = selectedItem.description ? selectedItem.description.slice(0, 120) : title;
    try {
      // Prefer Web Share API if available
      // @ts-ignore - navigator.share may not exist in some TS lib targets
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('リンクをコピーしました');
      }
    } catch (e) {
      console.warn('[library] share failed:', (e as Error)?.message);
    }
  }, [selectedItem]);


  // 依存ライブラリなしでPDF化（印刷ダイアログ）: 詳細セクションだけを別ウィンドウに描画して print()
  const handlePrintPdf = useCallback(() => {
    if (!selectedItem || !detailRef.current) return;
    try {
      const html = detailRef.current.innerHTML;
      const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
      if (!win) return;
      // Tailwind をCDNで読み込み（印刷用に最低限のスタイルを反映）
      win.document.write(`
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${selectedItem.name} レポート</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: A4; margin: 16mm; }
              @media print {
                .no-print { display: none !important; }
              }
              /* 画像や角丸が印刷で欠けないように */
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body class="bg-white">
            <div class="print-container">${html}</div>
            <script>
              window.onload = function () { setTimeout(function(){ window.print(); window.close(); }, 200); };
            </script>
          </body>
        </html>
      `);
      win.document.close();
    } catch (e) {
      console.warn('[library] print pdf failed:', (e as Error)?.message);
    }
  }, [selectedItem, detailRef]);

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

  const truncateText = (text: string, max: number = 120) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  };

  const renderDetailView = () => {
    if (!selectedItem) return null;

    return (
      <div className="space-y-8 max-w-full overflow-x-visible" ref={detailRef}>
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-2 sm:flex-nowrap min-w-0">
          <Button
            variant="ghost"
            onClick={() => setSelectedItem(null)}
            className="mb-2 sm:mb-4 -ml-2 sm:ml-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          
          <div className="flex space-x-2 sm:ml-auto flex-wrap min-w-0">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              シェア
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFavorite(selectedItem.id)}
              disabled={saving || !isAuthed}
            >
              <Heart className={`w-4 h-4 mr-2 ${userData.favorites.includes(selectedItem.id) ? 'fill-red-500 text-red-500' : ''}`} />
              {userData.favorites.includes(selectedItem.id) ? 'お気に入り済み' : 'お気に入り'}
              {!isAuthed && <span className="ml-2 text-xs text-gray-500">(ログインで保存)</span>}
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <Card className="overflow-hidden w-full max-w-full">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-8 max-w-full box-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  {selectedItem.icon}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      {selectedItem.type === 'industry' ? '業界' : '職種'}
                    </Badge>
                    {getTrendIcon(selectedItem.trend)}
                    <span className="text-sm">トレンドスコア: {selectedItem.trendScore}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2 truncate">{selectedItem.name}</h1>
                  <p className="text-base sm:text-xl text-white/90 mb-4 break-words break-all">{selectedItem.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="bg-white/20 text-white border-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Key Stats */}
          <div className="p-4 sm:p-6 border-b max-w-full">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{withManEn(selectedItem.details.averageSalary)}</div>
                <div className="text-xs sm:text-sm text-gray-600">平均年収</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-600">{selectedItem.details.workEnvironment.remote}%</div>
                <div className="text-xs sm:text-sm text-gray-600">リモート可能</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-orange-600">{selectedItem.details.companies.length}社</div>
                <div className="text-xs sm:text-sm text-gray-600">主要企業</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full min-w-0 max-w-[100vw]">
          <TabsList className="w-full max-w-full max-w-[100vw] flex flex-nowrap gap-1 overflow-x-auto min-w-0 overscroll-x-contain pl-2 pr-2">
            {/* ← 先頭スペーサー */}
            <div aria-hidden className="w-8 shrink-0" />

            <TabsTrigger value="overview"   className="whitespace-nowrap px-3 py-2 text-sm shrink-0 first:ml-1">概要</TabsTrigger>
            <TabsTrigger value="career"     className="whitespace-nowrap px-3 py-2 text-sm shrink-0 first:ml-1">キャリア</TabsTrigger>
            <TabsTrigger value="salary"     className="whitespace-nowrap px-3 py-2 text-sm shrink-0 first:ml-1">年収</TabsTrigger>
            <TabsTrigger value="companies"  className="whitespace-nowrap px-3 py-2 text-sm shrink-0 first:ml-1">企業</TabsTrigger>
            <TabsTrigger value="skills"     className="whitespace-nowrap px-3 py-2 text-sm shrink-0 first:ml-1">スキル</TabsTrigger>
            <TabsTrigger value="work"       className="whitespace-nowrap px-3 py-2 text-sm shrink-0 first:ml-1">働き方</TabsTrigger>
            <TabsTrigger value="regions"    className="whitespace-nowrap px-3 py-2 text-sm shrink-0 first:ml-1">地域</TabsTrigger>
            <TabsTrigger value="interviews" className="whitespace-nowrap px-3 py-2 text-sm shrink-0 first:ml-1">インタビュー</TabsTrigger>
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
      <div className="min-h-screen bg-gray-50 overflow-x-hidden max-w-[100vw]">
        <div className="mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-screen-sm sm:max-w-5xl w-full max-w-full max-w-[100vw]">
          {renderDetailView()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden max-w-[100vw]">
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-screen-sm sm:max-w-6xl w-full max-w-full max-w-[100vw]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">業界・職種ライブラリ</h1>
          <p className="text-base sm:text-lg text-gray-600">500社以上の詳細データと社員インタビューで、あなたの理想のキャリアを見つけよう</p>
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
            
            <div className="flex gap-2 flex-wrap">
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
                <option value="trend">トレンド順</option>
                <option value="salary">年収順</option>
                <option value="name">名前順</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {itemsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-full">
            {filteredAndSortedItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-4 sm:p-6" onClick={() => handleItemClick(item)}>
                    <div className="flex items-start justify-between mb-4 min-w-0">
                      <div className="flex items-center space-x-3 min-w-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              // フォールバック: 画像読み込み失敗時はアイコン表示
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                              const sibling = target.nextElementSibling as HTMLElement | null;
                              if (sibling) sibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors" style={{ display: item.imageUrl ? 'none' as const : 'flex' }}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <Badge variant="outline" className="mb-2">
                            {item.type === 'industry' ? '業界' : '職種'}
                          </Badge>
                          <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors truncate">
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
                          disabled={saving || !isAuthed}
                          title={isAuthed ? 'お気に入りに追加' : 'ログインすると保存できます'}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                        >
                          <Heart className={`w-4 h-4 ${userData.favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed break-words break-all">{truncateText(item.description, 120)}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="secondary">+{item.tags.length - 3}</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-end text-sm text-gray-500">
                        <ChevronRight className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {filteredAndSortedItems.length === 0 && !itemsLoading && (
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