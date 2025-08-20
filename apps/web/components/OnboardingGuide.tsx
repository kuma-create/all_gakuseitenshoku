import React, { useState } from 'react';
import { 
  Play, CheckCircle, ArrowRight, ArrowLeft, X, BookOpen, Target,
  Users, Calendar, TrendingUp, Star, Award, Brain, Heart, Zap,
  FileText, PenTool, BarChart3, Settings, Clock, Lightbulb,
  MessageSquare, Search, Filter, Plus, Eye, Edit3, Briefcase,
  ChevronRight, ChevronLeft, Home, Sparkles, Gift, Rocket,
  ArrowDown, Timer, CheckCircle2, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from './ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

type Route =
  | '/ipo'
  | '/ipo/analysis'
  | '/ipo/dashboard'
  | '/ipo/case'
  | '/ipo/case/case'
  | '/ipo/case/business'
  | '/ipo/case/webtest'
  | '/ipo/library'
  | '/ipo/selection';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (route: Route) => void;
  currentStep?: number;
  onStepComplete?: (step: number) => void;
}

interface QuickAction {
  title: string;
  description: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  route: Route;
  priority: 'high' | 'medium' | 'low';
}

interface GuideStep {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  quickDescription: string;
  icon: React.ComponentType<{ className?: string }>;
  route?: Route;
  estimatedTime: string;
  difficulty: '初心者' | '中級者' | '上級者';
  prerequisite?: number[];
  tasks: Array<{
    title: string;
    description: string;
    estimatedTime: string;
    difficulty: '初心者' | '中級者' | '上級者';
  }>;
  tips: string[];
  completionCriteria: string;
  nextStepHint: string;
}

const quickActions: QuickAction[] = [
  {
    title: '自己分析の空欄を1つ埋める',
    description: 'ノート/ライフチャート/強み弱みのいずれか1項目を入力。AIのヒントは“補助”として使えます',
    time: '3分',
    icon: Edit3,
    route: '/ipo/analysis',
    priority: 'high'
  },
  {
    title: 'ケース問題を1問解く',
    description: 'まずはケースで1問だけ挑戦。解法の考え方も確認できます',
    time: '10分',
    icon: PenTool,
    route: '/ipo/case',
    priority: 'medium'
  },
  {
    title: '業界ライブラリをチェック',
    description: '気になる業界・職種を3つ保存してみましょう',
    time: '5分',
    icon: Search,
    route: '/ipo/library',
    priority: 'medium'
  }
];

const guideSteps: GuideStep[] = [
  {
    id: 1,
    title: '自己分析の基礎',
    shortTitle: '自己分析',
    description: '自己分析ノート・ライフチャート・強み/弱み・経験の整理・将来ビジョンの5領域の「空欄」を少しずつ埋めていきます。AIとの対話は“補助”として、ヒントや言い換え提案に使いましょう。',
    quickDescription: 'ノート/ライフチャート/強み弱みを入力（AIは補助）',
    icon: Brain,
    route: '/ipo/analysis',
    estimatedTime: '30分',
    difficulty: '初心者',
    tasks: [
      {
        title: '自己分析ノートを1項目書く',
        description: 'テンプレの問いに1つ答えます。必要に応じてAIの提案を採用してOK',
        estimatedTime: '3分',
        difficulty: '初心者'
      },
      {
        title: '強みと弱みを3つずつ書く',
        description: '各項目を短文でOK。できれば具体的なエピソードを1つ添えると良いです',
        estimatedTime: '10分',
        difficulty: '初心者'
      },
      {
        title: 'ライフチャート/経験の整理を1件入力',
        description: '出来事・感情・学びを1件だけ登録してみましょう',
        estimatedTime: '5分',
        difficulty: '初心者'
      }
    ],
    tips: [
      '完璧を目指さず、まずは1項目だけ埋めるところから',
      'AIは発想支援として使い、最終表現は自分の言葉に整える',
      '短くてOK。後からいくらでも更新できます'
    ],
    completionCriteria: '自己分析の空欄補充率を20%以上にする（5領域のいずれか合計5項目以上を入力）',
    nextStepHint: '目標（将来ビジョン）を仮置きしてみましょう'
  },
  {
    id: 2,
    title: '将来ビジョンの設計',
    shortTitle: '目標設定',
    description: '3年後・5年後の目標を仮置きします。現時点の仮説でOK。後から更新できます。',
    quickDescription: '3年後・5年後の目標を設定',
    icon: Target,
    route: '/ipo/analysis',
    estimatedTime: '25分',
    difficulty: '初心者',
    prerequisite: [1],
    tasks: [
      {
        title: '3年後の目標を設定',
        description: '就職後の最初のマイルストーンを具体化します',
        estimatedTime: '10分',
        difficulty: '初心者'
      },
      {
        title: '5年後の目標を考える',
        description: '中期的なキャリアの方向性を描きます',
        estimatedTime: '15分',
        difficulty: '初心者'
      }
    ],
    tips: [
      'まずは大まかに。現実性よりも方向性の言語化を優先',
      '少し挑戦的な目標の方が行動に落とし込みやすい',
      'いつでも上書きできます'
    ],
    completionCriteria: '3年後・5年後の目標を保存',
    nextStepHint: '関心のある業界・職種を広く見てみましょう'
  },
  {
    id: 3,
    title: '業界・企業研究（ライブラリ）',
    shortTitle: '業界研究',
    description: 'ライブラリから業界・職種・企業の基本情報を効率的に収集します。',
    quickDescription: '業界・職種ライブラリで気になる分野を保存',
    icon: Search,
    route: '/ipo/library',
    estimatedTime: '45分',
    difficulty: '中級者',
    prerequisite: [2],
    tasks: [
      {
        title: '気になる業界を3つ保存',
        description: '業界ページを開き、保存ボタンでブックマークしましょう',
        estimatedTime: '15分',
        difficulty: '初心者'
      },
      {
        title: '主要企業を調べる',
        description: '各業界で代表的な企業を5社程度ピックアップし、メモを残します',
        estimatedTime: '30分',
        difficulty: '中級者'
      }
    ],
    tips: [
      '最初は幅広く。意外な発見がモチベーションになります',
      '規模や知名度だけでなく、事業内容や成長領域に注目',
      'ニュースで見かける企業から入るのも◎'
    ],
    completionCriteria: '3業界を保存し、各業界で主要企業を5社以上メモ',
    nextStepHint: '選考対策（ケース/面接/テスト）を始めましょう'
  },
  {
    id: 4,
    title: '選考対策の基礎練習（ケース/面接/テスト）',
    shortTitle: '選考対策',
    description: 'ケース問題・面接想定・Webテストをバランスよく体験します。',
    quickDescription: 'ケース1問＋面接想定＋Webテスト体験',
    icon: PenTool,
    route: '/ipo/case',
    estimatedTime: '60分',
    difficulty: '中級者',
    prerequisite: [1, 3],
    tasks: [
      {
        title: 'ケース問題を1問解く',
        description: '基礎的な問題で思考プロセスを確認します',
        estimatedTime: '10分',
        difficulty: '中級者'
      },
      {
        title: '面接の想定質問に答える',
        description: 'よくある質問に短文で回答を作成',
        estimatedTime: '20分',
        difficulty: '初心者'
      },
      {
        title: 'Webテストを10問解く',
        description: '時間は気にせず、出題形式に慣れましょう',
        estimatedTime: '15分',
        difficulty: '初心者'
      }
    ],
    tips: [
      'ケースは正解よりプロセス。分解→仮説→試算の型を意識',
      '面接は具体エピソードが命。1つの話を磨き込む',
      'テストは“慣れ”が最重要。短時間でも頻度高く'
    ],
    completionCriteria: 'ケース1問＋想定質問10個＋Webテスト10問に取り組む',
    nextStepHint: '応募企業のリストアップとスケジュール管理へ'
  },
  {
    id: 5,
    title: '応募管理の開始',
    shortTitle: '応募開始',
    description: '応募企業のリスト化と選考スケジュールの登録を行います。',
    quickDescription: '応募企業リスト作成と選考スケジュール登録',
    icon: Briefcase,
    route: '/ipo/selection',
    estimatedTime: '30分',
    difficulty: '中級者',
    prerequisite: [3, 4],
    tasks: [
      {
        title: '応募企業リストを作る',
        description: '第一志望5社＋練習5社をリストアップ',
        estimatedTime: '20分',
        difficulty: '初心者'
      },
      {
        title: '選考スケジュールを登録',
        description: '面接・締切などの日程を入力（通知設定は任意）',
        estimatedTime: '10分',
        difficulty: '初心者'
      }
    ],
    tips: [
      '練習企業から始めて、受け答えの感覚を掴む',
      '日程の抜け漏れは致命傷。カレンダー管理を徹底',
      '量と質のバランスを意識して応募数を調整'
    ],
    completionCriteria: '10社以上を登録し、選考管理の初期設定を完了',
    nextStepHint: 'ダッシュボードで状況を見える化し、改善サイクルへ'
  },
  {
    id: 6,
    title: '継続的な改善（ダッシュボード）',
    shortTitle: 'スコア向上',
    description: 'ダッシュボードで「自己分析の空欄補充率」とスコアを確認し、苦手分野を改善します。',
    quickDescription: '空欄補充率とスコアを見ながら改善',
    icon: TrendingUp,
    route: '/ipo/dashboard',
    estimatedTime: '継続',
    difficulty: '中級者',
    prerequisite: [1, 2, 3, 4, 5],
    tasks: [
      {
        title: 'ダッシュボードを週1で確認',
        description: '自己分析の空欄補充率・分析概要をチェック',
        estimatedTime: '5分',
        difficulty: '初心者'
      },
      {
        title: '苦手分野の改善',
        description: 'スコアの低い分野の入力や練習を優先的に実施',
        estimatedTime: '継続',
        difficulty: '中級者'
      }
    ],
    tips: [
      '小さな更新を高頻度で。継続が最大の近道',
      '他の就活生の取り組みも参考にしてみる',
      '長期戦。休息とメリハリもスキルです'
    ],
    completionCriteria: '空欄補充率80%以上を達成し、ケース/面接/応募を各1回以上アップデート',
    nextStepHint: '就活は継続的なプロセス。改善サイクルを回し続けましょう'
  }
];

export function OnboardingGuide({ 
  isOpen, 
  onClose, 
  navigate, 
  currentStep = 1,
  onStepComplete 
}: OnboardingGuideProps) {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showTaskDetail, setShowTaskDetail] = useState<{ stepId: number; taskIndex: number } | null>(null);
  const [viewMode, setViewMode] = useState<'quick' | 'detailed'>('quick');

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
      onStepComplete?.(stepId);
    }
  };

  const navigateToStep = (step: GuideStep) => {
    if (step.route) {
      navigate(step.route);
      onClose();
    }
  };

  const navigateToQuickAction = (action: QuickAction) => {
    navigate(action.route);
    onClose();
  };

  const progressPercentage = (completedSteps.length / guideSteps.length) * 100;
  const currentStepData = guideSteps.find(step => step.id === activeStep);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '初心者': return 'bg-green-100 text-green-700 border-green-200';
      case '中級者': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case '上級者': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const canStartStep = (stepId: number) => {
    const step = guideSteps.find(s => s.id === stepId);
    if (!step?.prerequisite) return true;
    return step.prerequisite.every(prereq => completedSteps.includes(prereq));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50" />
        <DialogContent className="p-0 w-[98vw] max-w-[98vw] h-[96vh] max-h-[96vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden min-h-0">
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                      就活成功への6ステップガイド
                    </h1>
                    <p className="text-gray-600">
                      何から始めればいいかわからない？大丈夫です。順番に進めていきましょう！
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('quick')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        viewMode === 'quick' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      かんたん
                    </button>
                    <button
                      onClick={() => setViewMode('detailed')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        viewMode === 'detailed' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      詳細
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">進捗状況</span>
                <span className="text-gray-600">
                  {completedSteps.length} / {guideSteps.length} ステップ完了
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Progress value={progressPercentage} className="flex-1 h-2" />
                <span className="font-bold text-blue-600 min-w-[50px]">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>

            {/* Quick Start Mode */}
            {viewMode === 'quick' && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
                {/* Quick Actions */}
                <div className="mb-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Timer className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      まず何をすればいいの？
                    </h2>
                    <p className="text-gray-600 text-lg">
                      迷ったらここから始めましょう。3分でできることからスタート！
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {quickActions.map((action, index) => (
                      <Card 
                        key={index}
                        className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-blue-300"
                        onClick={() => navigateToQuickAction(action)}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <action.icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex items-center justify-center space-x-2 mb-2">
                            <h3 className="font-bold text-gray-900">{action.title}</h3>
                            <Badge className={`${getPriorityColor(action.priority)} text-xs`}>
                              {action.priority === 'high' ? '最優先' : action.priority === 'medium' ? '推奨' : '余裕があれば'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-4">{action.description}</p>
                          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mb-4">
                            <Clock className="w-3 h-3" />
                            <span>{action.time}</span>
                          </div>
                          <Button size="sm" className="w-full">
                            <Play className="w-4 h-4 mr-2" />
                            今すぐ始める
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Simplified Step Flow */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                    📋 全体の流れ（6ステップ）
                  </h2>
                  
                  <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {guideSteps.map((step, index) => {
                        const isCompleted = completedSteps.includes(step.id);
                        const canStart = canStartStep(step.id);
                        const isActive = step.id === activeStep;
                        
                        return (
                          <Card 
                            key={step.id}
                            className={`cursor-pointer transition-all duration-200 ${
                              isCompleted 
                                ? 'bg-green-50 border-green-200 shadow-md' 
                                : canStart 
                                  ? 'hover:shadow-lg border-blue-200 hover:border-blue-300' 
                                  : 'bg-gray-50 border-gray-200 opacity-60'
                            }`}
                            onClick={() => canStart && setActiveStep(step.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isCompleted 
                                    ? 'bg-green-500 text-white' 
                                    : canStart 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-gray-300 text-gray-600'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle className="w-5 h-5" />
                                  ) : (
                                    <step.icon className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-xs font-bold px-2 py-1 bg-gray-200 text-gray-700 rounded">
                                      ステップ {step.id}
                                    </span>
                                    {isCompleted && (
                                      <Badge className="bg-green-100 text-green-700 text-xs">完了</Badge>
                                    )}
                                    {!canStart && (
                                      <Badge className="bg-gray-100 text-gray-600 text-xs">要前提</Badge>
                                    )}
                                  </div>
                                  <h3 className="font-semibold text-gray-900 mb-1">{step.shortTitle}</h3>
                                  <p className="text-xs text-gray-600 mb-2">{step.quickDescription}</p>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{step.estimatedTime}</span>
                                    </div>
                                    <Badge className={`${getDifficultyColor(step.difficulty)} text-xs`}>
                                      {step.difficulty}
                                    </Badge>
                                  </div>
                                  {canStart && step.route && (
                                    <Button 
                                      size="sm" 
                                      className="w-full mt-3"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigateToStep(step);
                                      }}
                                    >
                                      <ArrowUpRight className="w-3 h-3 mr-1" />
                                      始める
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Mode */}
            {viewMode === 'detailed' && (
              <div className="flex-1 overflow-hidden flex min-h-0">
                {/* Step Navigation Sidebar */}
                <div className="w-72 border-r bg-gray-50/50 flex flex-col min-h-0 overflow-y-auto overscroll-contain">
                  <div className="p-4 border-b bg-white">
                    <h3 className="font-bold text-gray-900">ステップ一覧</h3>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <div className="space-y-1 p-3">
                      {guideSteps.map((step) => {
                        const Icon = step.icon;
                        const isActive = step.id === activeStep;
                        const isCompleted = completedSteps.includes(step.id);
                        const canStart = canStartStep(step.id);
                        
                        return (
                          <button
                            key={step.id}
                            onClick={() => canStart && setActiveStep(step.id)}
                            disabled={!canStart}
                            className={`w-full text-left p-3 rounded-lg transition-all ${
                              isActive 
                                ? 'bg-blue-100 border border-blue-200 shadow-sm' 
                                : canStart
                                  ? 'hover:bg-white hover:shadow-sm'
                                  : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isCompleted 
                                  ? 'bg-green-500 text-white' 
                                  : isActive 
                                    ? 'bg-blue-500 text-white' 
                                    : canStart
                                      ? 'bg-gray-200 text-gray-600'
                                      : 'bg-gray-100 text-gray-400'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <Icon className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                                    isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                                  }`}>
                                    {step.id}
                                  </span>
                                  {isCompleted && (
                                    <Badge className="bg-green-100 text-green-700 text-xs">完了</Badge>
                                  )}
                                  {!canStart && (
                                    <AlertCircle className="w-3 h-3 text-orange-500" />
                                  )}
                                </div>
                                <h4 className={`font-medium text-sm mb-1 ${
                                  isActive ? 'text-blue-900' : canStart ? 'text-gray-900' : 'text-gray-500'
                                }`}>
                                  {step.title}
                                </h4>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {step.description}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{step.estimatedTime}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Main Content for Detailed Mode */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white">
                  <AnimatePresence mode="wait">
                    {currentStepData && (
                      <motion.div
                        key={currentStepData.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="p-6 h-full"
                      >
                        {/* Step Header */}
                        <div className="mb-6">
                          <div className="flex items-start space-x-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <currentStepData.icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                ステップ {currentStepData.id}: {currentStepData.title}
                              </h2>
                              <p className="text-gray-600 leading-relaxed">
                                {currentStepData.description}
                              </p>
                              
                              {/* Prerequisites Warning */}
                              {currentStepData.prerequisite && !canStartStep(currentStepData.id) && (
                                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                  <div className="flex items-center space-x-2">
                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm font-medium text-orange-800">
                                      前提条件: ステップ {currentStepData.prerequisite.join(', ')} を完了してください
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {canStartStep(currentStepData.id) && (
                            <div className="flex items-center space-x-3">
                              {currentStepData.route && (
                                <Button 
                                  onClick={() => navigateToStep(currentStepData)}
                                  className="flex items-center space-x-2"
                                >
                                  <Play className="w-4 h-4" />
                                  <span>実際に始める</span>
                                </Button>
                              )}
                              
                              <Button 
                                variant="outline"
                                onClick={() => handleStepComplete(currentStepData.id)}
                                disabled={completedSteps.includes(currentStepData.id)}
                              >
                                {completedSteps.includes(currentStepData.id) ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                    完了済み
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    完了にする
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Rest of detailed content similar to before but with prerequisite checks */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2" />
                                実行タスク
                              </h3>
                              <div className="space-y-3">
                                {currentStepData.tasks.map((task, index) => (
                                  <Card 
                                    key={index} 
                                    className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-blue-400"
                                    onClick={() => setShowTaskDetail({ stepId: currentStepData.id, taskIndex: index })}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2 mb-2">
                                            <h4 className="font-medium text-gray-900">{task.title}</h4>
                                            <Badge className={`${getDifficultyColor(task.difficulty)} text-xs px-2 py-1`}>
                                              {task.difficulty}
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                                            <div className="flex items-center space-x-1">
                                              <Clock className="w-3 h-3" />
                                              <span>目安: {task.estimatedTime}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                                成功のコツ
                              </h3>
                              <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                                <CardContent className="p-4">
                                  <ul className="space-y-2">
                                    {currentStepData.tips.map((tip, index) => (
                                      <li key={index} className="flex items-start space-x-2 text-sm">
                                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                                        <span className="text-yellow-800">{tip}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            </div>

                            <div className="space-y-4">
                              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                                <CardContent className="p-4">
                                  <h4 className="font-medium text-green-900 mb-2 flex items-center">
                                    <Award className="w-4 h-4 mr-2" />
                                    完了の目安
                                  </h4>
                                  <p className="text-sm text-green-800">{currentStepData.completionCriteria}</p>
                                </CardContent>
                              </Card>

                              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                                <CardContent className="p-4">
                                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                                    <ArrowRight className="w-4 h-4 mr-2" />
                                    次のステップ
                                  </h4>
                                  <p className="text-sm text-blue-800">{currentStepData.nextStepHint}</p>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Navigation Footer */}
            <div className="flex-shrink-0 border-t p-4 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                  disabled={activeStep === 1 || viewMode === 'quick'}
                  className="flex items-center space-x-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>前のステップ</span>
                </Button>

                <div className="text-center">
                  {viewMode === 'detailed' && (
                    <div className="text-gray-600">
                      ステップ {activeStep} / {guideSteps.length}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => setActiveStep(Math.min(guideSteps.length, activeStep + 1))}
                  disabled={activeStep === guideSteps.length || viewMode === 'quick'}
                  className="flex items-center space-x-2"
                >
                  <span>次のステップ</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Task Detail Modal */}
            {showTaskDetail && (
              <Dialog 
                open={!!showTaskDetail} 
                onOpenChange={() => setShowTaskDetail(null)}
              >
                <DialogPortal>
                  <DialogOverlay />
                  <DialogContent className="p-0 w-full max-w-2xl rounded-lg border shadow-lg">
                    <div className="p-6">
                      <div className="flex items-center justify-start mb-4">
                        <h3 className="text-lg font-bold">
                          {currentStepData?.tasks[showTaskDetail.taskIndex]?.title}
                        </h3>
                      </div>
                      
                      {currentStepData && (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3">
                            <Badge className={`${getDifficultyColor(currentStepData.tasks[showTaskDetail.taskIndex].difficulty)} px-3 py-1`}>
                              {currentStepData.tasks[showTaskDetail.taskIndex].difficulty}
                            </Badge>
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>目安時間: {currentStepData.tasks[showTaskDetail.taskIndex].estimatedTime}</span>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">説明</h4>
                            <p className="text-gray-700 leading-relaxed">
                              {currentStepData.tasks[showTaskDetail.taskIndex].description}
                            </p>
                          </div>

                          <div className="flex justify-end space-x-3">
                            <Button variant="outline" onClick={() => setShowTaskDetail(null)}>
                              閉じる
                            </Button>
                            {currentStepData.route && (
                              <Button onClick={() => {
                                navigateToStep(currentStepData);
                                setShowTaskDetail(null);
                              }}>
                                実際に始める
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </DialogPortal>
              </Dialog>
            )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

export default OnboardingGuide;