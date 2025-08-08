"use client";
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Brain, 
  TrendingUp, 
  Target, 
  Star, 
  BookOpen,
  CheckCircle,
  Clock,
  BarChart3,
  MessageCircle,
  Calendar,
  Zap,
  Loader2,
  AlertCircle,
  Play,
  Award,
  Menu,
  X,
  Plus,
  Lightbulb,
  Users,
  Settings
} from 'lucide-react';
// Local Route type to satisfy navigate prop
type Route = string;
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AIChat } from '@/components/analysis/AIChat';
import { LifeChart } from '@/components/analysis/LifeChart';
import { FutureVision } from '@/components/analysis/FutureVision';
import { StrengthAnalysis } from '@/components/analysis/StrengthAnalysis';
import { SimpleExperienceReflection } from '@/components/analysis/SimpleExperienceReflection';
import { AnalysisOverview } from '@/components/analysis/AnalysisOverview';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface AnalysisPageProps {
  navigate: (route: Route) => void;
}

interface AnalysisProgress {
  aiChat: number;
  lifeChart: number;
  futureVision: number;
  strengthAnalysis: number;
  experienceReflection: number;
}

const analysisTools = [
  {
    id: 'overview',
    title: '分析概要',
    subtitle: '全体進捗',
    description: 'あなたの自己分析の進捗状況を確認',
    icon: BarChart3,
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    longDescription: '全体の進捗状況と次に取り組むべき項目を確認できます。',
    benefits: ['全体像の把握', '進捗の可視化', '次のステップ提案'],
    estimatedTime: '5分',
    difficulty: '簡単'
  },
  {
    id: 'aiChat',
    title: 'AI対話分析',
    subtitle: 'AI壁打ち',
    description: 'AIとの対話で深い自己理解を実現',
    icon: MessageCircle,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    longDescription: 'AIがあなたの悩みや思考を整理し、新たな視点を提供します。',
    benefits: ['客観的視点の獲得', '思考の整理', '深い自己洞察'],
    estimatedTime: '15-30分',
    difficulty: '簡単',
    badge: 'AI'
  },
  {
    id: 'lifeChart',
    title: 'ライフチャート',
    subtitle: '人生振り返り',
    description: '人生の重要な出来事を時系列で振り返る',
    icon: TrendingUp,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    longDescription: '過去の経験から成長パターンや価値観を発見します。',
    benefits: ['成長パターン分析', 'ターニングポイント発見', '価値観の明確化'],
    estimatedTime: '20-40分',
    difficulty: '普通'
  },
  {
    id: 'strengthAnalysis',
    title: '強み・弱み分析',
    subtitle: '能力診断',
    description: '客観的な視点で自分の特性を分析',
    icon: Star,
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    longDescription: '多角的な質問で強みと改善点を明確にします。',
    benefits: ['強みの発見', '成長領域の特定', '具体的改善策'],
    estimatedTime: '20-35分',
    difficulty: '普通'
  },
  {
    id: 'experienceReflection',
    title: '経験の整理',
    subtitle: '経験の棚卸し',
    description: '学生時代の経験をシンプルに整理',
    icon: BookOpen,
    color: 'from-sky-500 to-cyan-600',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    longDescription: '就活で活用できる経験を分かりやすく整理・構造化します。',
    benefits: ['経験の体系化', 'スキルの発見', '就活準備完了'],
    estimatedTime: '15-25分',
    difficulty: '簡単'
  },
  {
    id: 'futureVision',
    title: '将来ビジョン',
    subtitle: 'キャリア設計',
    description: '理想の将来像とキャリアプランを設計',
    icon: Target,
    color: 'from-pink-500 to-red-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    longDescription: '5年後、10年後の目標を明確化し、具体的な行動計画を作成します。',
    benefits: ['目標の明確化', 'アクションプラン', 'モチベーション向上'],
    estimatedTime: '25-45分',
    difficulty: '普通',
    badge: 'HOT'
  }
];

export function AnalysisPage({ navigate }: AnalysisPageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress>({
    aiChat: 25,
    lifeChart: 60,
    futureVision: 10,
    strengthAnalysis: 80,
    experienceReflection: 40,
  });
  const [userId] = useState(() => {
    const stored = localStorage.getItem('ipo-user-id');
    if (stored) return stored;
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('ipo-user-id', newId);
    return newId;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updateProgress = async (updates: Partial<AnalysisProgress>) => {
    try {
      const newProgress = { ...progress, ...updates };
      setProgress(newProgress);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setShowMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const overallProgress = Math.round(
    Object.values(progress).reduce((sum, value) => sum + value, 0) / Object.keys(progress).length
  );

  const getCurrentTool = () => {
    return analysisTools.find(tool => tool.id === activeTab) || analysisTools[0];
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AnalysisOverview progress={progress} onNavigateToTool={setActiveTab} />;
      case 'aiChat':
        return <AIChat userId={userId} onProgressUpdate={(progress: number) => updateProgress({ aiChat: progress })} />;
      case 'lifeChart':
        return <LifeChart userId={userId} onProgressUpdate={(progress: number) => updateProgress({ lifeChart: progress })} />;
      case 'futureVision':
        return <FutureVision onProgressUpdate={(progress: number) => updateProgress({ futureVision: progress })} />;
      case 'strengthAnalysis':
        return <StrengthAnalysis userId={userId} onProgressUpdate={(progress: number) => updateProgress({ strengthAnalysis: progress })} />;
      case 'experienceReflection':
        return <SimpleExperienceReflection userId={userId} onProgressUpdate={(progress: number) => updateProgress({ experienceReflection: progress })} />;
      default:
        return <AnalysisOverview progress={progress} onNavigateToTool={setActiveTab} />;
    }
  };

  const currentTool = getCurrentTool();

  // Mobile Bottom Sheet Navigation
  const MobileBottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className={`w-10 h-10 bg-gradient-to-r ${currentTool.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <currentTool.icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate">{currentTool.title}</h3>
            <p className="text-xs text-gray-500 truncate">{currentTool.subtitle}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMobileMenu(true)}
          className="flex-shrink-0 ml-3"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // Mobile Menu Sheet
  const MobileMenuSheet = () => (
    <AnimatePresence>
      {showMobileMenu && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto md:hidden"
          >
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">分析ツール</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="mt-3">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <BarChart3 className="w-4 h-4" />
                    <span>総合進捗 {overallProgress}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Award className="w-4 h-4" />
                    <span>{Object.values(progress).filter(p => p >= 100).length}/5 完了</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {analysisTools.map((tool) => {
                const isActive = activeTab === tool.id;
                const toolProgress = progress[tool.id as keyof AnalysisProgress] || 0;
                const IconComponent = tool.icon;
                
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleTabChange(tool.id)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      isActive 
                        ? 'bg-blue-50 border-2 border-blue-200' 
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${tool.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`font-semibold truncate ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                            {tool.title}
                          </h3>
                          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                            {tool.badge && (
                              <Badge className="text-xs px-2 py-1 bg-blue-100 text-blue-700">
                                {tool.badge}
                              </Badge>
                            )}
                            <Badge className={`text-xs ${
                              tool.difficulty === '簡単' ? 'bg-green-100 text-green-700' :
                              tool.difficulty === '普通' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {tool.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tool.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{tool.estimatedTime}</span>
                          </div>
                          <div className="text-xs font-medium text-blue-600">
                            {toolProgress >= 100 ? '完了' : `${toolProgress}%`}
                          </div>
                        </div>
                        <Progress value={toolProgress} className="mt-2 h-1" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-bold text-foreground mb-2">エラーが発生しました</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            ページを更新
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ipo/dashboard')}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                aria-label="ダッシュボードに戻る"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
                  自己分析プラットフォーム
                </h1>
                <p className="text-sm text-muted-foreground hidden md:block">
                  多角的なアプローチで自分自身を深く理解しましょう
                </p>
              </div>
            </div>
            
            {/* Desktop Progress */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">総合進捗</div>
                <div className="text-lg font-bold text-foreground">{overallProgress}%</div>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted opacity-20"
                  />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - overallProgress / 100)}`}
                    className="text-primary transition-all duration-1000 ease-out"
                    initial={{ strokeDashoffset: `${2 * Math.PI * 28}` }}
                    animate={{ strokeDashoffset: `${2 * Math.PI * 28 * (1 - overallProgress / 100)}` }}
                    transition={{ duration: 1, ease: "easeInOut", delay: 0.5 }}
                  />
                </svg>
                <Brain className="w-6 h-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
            </div>

            {/* Mobile Progress */}
            <div className="flex md:hidden items-center space-x-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">進捗</div>
                <div className="text-sm font-bold text-foreground">{overallProgress}%</div>
              </div>
              <div className="w-10 h-10 relative">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted opacity-20"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - overallProgress / 100)}`}
                    className="text-primary transition-all duration-1000 ease-out"
                  />
                </svg>
                <Brain className="w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:block max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="sticky top-[120px] z-40 bg-background/80 backdrop-blur-sm pb-4 mb-6">
            <TabsList className="grid w-full grid-cols-6 h-12">
              {analysisTools.map((tool) => (
                <TabsTrigger 
                  key={tool.id}
                  value={tool.id} 
                  className="flex items-center space-x-2 text-xs"
                >
                  <tool.icon className="w-4 h-4" />
                  <span className="hidden lg:block">{tool.title}</span>
                  <span className="lg:hidden">{tool.subtitle}</span>
                  {tool.badge && (
                    <Badge className="text-xs px-1 py-0 h-4 ml-1">
                      {tool.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {analysisTools.map((tool) => (
                <TabsContent key={tool.id} value={tool.id} className="mt-0">
                  {renderContent()}
                </TabsContent>
              ))}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Components */}
      <MobileBottomNav />
      <MobileMenuSheet />
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const navigate = (route: string) => router.push(route);
  return <AnalysisPage navigate={navigate} />;
}