"use client";
import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Users, Target, Calendar, Star, Plus, ArrowUp, ArrowDown, Minus, HelpCircle, BookOpen, Rocket, Gift } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CareerRadarChart } from '@/components/charts/CareerRadarChart';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CareerScore } from '@/utils/careerScore';
import { CareerScoreInfo } from '@/components/CareerScoreInfo';
import { OnboardingGuide } from '@/components/OnboardingGuide';

interface DashboardPageProps {
  navigate?: (route: string) => void;
}

interface PeerReview {
  id: string;
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
}


export function DashboardPage({ navigate }: DashboardPageProps) {
  const [peerReviews, setPeerReviews] = useState<PeerReview[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ reviewer: '', rating: 5, comment: '' });
  const [careerScore, setCareerScore] = useState<CareerScore | null>(null);
  const [scoreHistory, setScoreHistory] = useState<Array<{ date: string; overall: number }>>([]);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [completedOnboardingSteps, setCompletedOnboardingSteps] = useState<number[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [analysisCompletion, setAnalysisCompletion] = useState(0);

  const router = useRouter();
  // Run a callback when the main thread is idle (fallback to setTimeout)
  const runIdle = (cb: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // @ts-ignore
      (window as any).requestIdleCallback(cb);
    } else {
      setTimeout(cb, 0);
    }
  };

  // Prefetch common routes to make client navigation snappier
  useEffect(() => {
    runIdle(() => {
      router.prefetch('/ipo/analysis');
      router.prefetch('/ipo/case');
      router.prefetch('/ipo/calendar');
    });
  }, [router]);

  const navigateFn = React.useCallback((route: string) => {
    if (navigate) {
      navigate(route);
    } else {
      router.push(route);
    }
  }, [navigate, router]);

  useEffect(() => {
    // キャリアスコア計算
    // const score = calculateDemoCareerScore();
    // setCareerScore(score);
    // スコア履歴の取得（実際のアプリではユーザーIDを使用）
    // const history = getScoreHistory('demo-user');
    // setScoreHistory(history);
    // スコア履歴の保存
    // saveScoreHistory(score, 'demo-user');

    // 初回利用チェック
    const hasVisited = localStorage.getItem('ipo-has-visited');
    if (!hasVisited) {
      setIsFirstTime(true);
      localStorage.setItem('ipo-has-visited', 'true');
    }

    // オンボーディング進捗の取得
    const savedProgress = localStorage.getItem('ipo-onboarding-progress');
    if (savedProgress) {
      setCompletedOnboardingSteps(JSON.parse(savedProgress));
    }

    // --- Supabaseからデータ取得例 ---
    // 実際のアプリでは下記のようにデータを取得
    // （ダミー用のasync即時関数で囲む）
    (async () => {
      try {
        // 1) supabase client取得
        // @ts-ignore
        const { createClient } = await import('@supabase/supabase-js');
        // 必要に応じてenvなどからURL/KEY取得
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;
        const supabase = createClient(supabaseUrl, supabaseKey);
        // 2) 認証ユーザー取得
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;


        // 4) Peerレビュー一覧
        const { data: reviewRows, error: reviewErr } = await supabase
          .from('ipo_peer_reviews')
          .select('id, reviewer, rating, comment, reviewed_at')
          .eq('user_id', user.id)
          .order('reviewed_at', { ascending: false });
        if (reviewErr) {
          console.warn('Failed to load peer reviews', reviewErr);
        } else if (reviewRows) {
          setPeerReviews(reviewRows.map((r: any) => ({
            id: String(r.id),
            reviewer: r.reviewer ?? '匿名',
            rating: Number(r.rating ?? 0),
            comment: r.comment ?? '',
            date: (r.reviewed_at ?? '').slice(0, 10),
          })));
        }

        // 5) キャリアスコア履歴
        const { data: historyRows, error: historyErr } = await supabase
          .from('ipo_career_score')
          .select('scored_at, overall')
          .eq('user_id', user.id)
          .order('scored_at', { ascending: true });
        if (historyErr) throw historyErr;
        setScoreHistory((historyRows ?? []).map((r: any) => ({
          date: (r.scored_at ?? '').slice(0, 10),
          overall: r.overall ?? 0,
        })));

        // 6) 自己分析完了度（5要素の平均％）
        const { data: progRow, error: progErr } = await supabase
          .from('ipo_analysis_progress')
          .select('ai_chat, life_chart, future_vision, strength_analysis, experience_reflection')
          .eq('user_id', user.id)
          .maybeSingle();
        if (progErr) throw progErr;
        if (progRow) {
          const a = progRow.ai_chat ?? 0;
          const b = progRow.life_chart ?? 0;
          const c = progRow.future_vision ?? 0;
          const d = progRow.strength_analysis ?? 0;
          const e = progRow.experience_reflection ?? 0;
          const avg = Math.round((a + b + c + d + e) / 5);
          setAnalysisCompletion(avg);
        } else {
          setAnalysisCompletion(0);
        }
        // 7) キャリアスコア最新
        const { data: scoreRow } = await supabase
          .from('ipo_career_score')
          .select('*')
          .eq('user_id', user.id)
          .order('scored_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (scoreRow) {
          setCareerScore({
            overall: scoreRow.overall ?? 0,
            breakdown: (scoreRow.breakdown ?? {}) as CareerScore['breakdown'],
            trend: (scoreRow.trend ?? undefined) as CareerScore['trend'],
            insights: (scoreRow.insights ?? undefined) as CareerScore['insights'],
            lastUpdated: (scoreRow.scored_at ?? new Date().toISOString()),
          });
        }
      } catch (e) {
        // fallback: 0%
        setAnalysisCompletion(0);
      }
    })();
  }, []);
  
  const handleOnboardingStepComplete = (stepId: number) => {
    const updated = [...completedOnboardingSteps, stepId];
    setCompletedOnboardingSteps(updated);
    localStorage.setItem('ipo-onboarding-progress', JSON.stringify(updated));
  };

  // キャリアスコアデータ（計算されたものを使用、フォールバック付き）
  const careerScoreData = careerScore?.breakdown ?? {
    Communication: 0,
    Logic: 0,
    Leadership: 0,
    Fit: 0,
    Vitality: 0,
  };
  
  // 前回からの変化を計算
  const getScoreChange = () => {
    if (!careerScore || scoreHistory.length < 2) return null;
    const current = careerScore.overall;
    const previous = scoreHistory[scoreHistory.length - 2]?.overall || current;
    return current - previous;
  };
  
  const scoreChange = getScoreChange();
  const getTrendIcon = () => {
    if (!careerScore) return <Minus className="w-4 h-4 text-gray-500" />;
    switch (careerScore.trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };


  const handleAddReview = useCallback(() => {
    if (!newReview.reviewer.trim() || !newReview.comment.trim()) return;

    const review: PeerReview = {
      id: Date.now().toString(),
      reviewer: newReview.reviewer,
      rating: newReview.rating,
      comment: newReview.comment,
      date: new Date().toISOString().split('T')[0]
    };

    startTransition(() => {
      setPeerReviews(prev => [review, ...prev]);
      setNewReview({ reviewer: '', rating: 5, comment: '' });
      setShowReviewModal(false);
    });
  }, [newReview]);


  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">ダッシュボード</h1>
              <p className="text-muted-foreground">あなたのキャリア開発の進捗を確認しましょう</p>
            </div>
            <div className="flex items-center space-x-3">
              {completedOnboardingSteps.length < 6 && (
                <Button
                  variant="outline"
                  onClick={() => startTransition(() => setShowOnboardingGuide(true))}
                  className="flex items-center space-x-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>進め方ガイド</span>
                  {completedOnboardingSteps.length > 0 && (
                    <Badge className="bg-orange-100 text-orange-700 ml-1">
                      {completedOnboardingSteps.length}/6
                    </Badge>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* First Time User Welcome */}
        {isFirstTime && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      🎉 IPO Universityへようこそ！
                    </h3>
                    <p className="text-gray-700 mb-4">
                      就活成功への6ステップガイドで、効率的にキャリア開発を進めましょう。
                      自己分析から選考対策まで、あなたの就活を徹底サポートします。
                    </p>
                    <div className="flex items-center space-x-3">
                      <Button 
                        onClick={() => {
                          startTransition(() => {
                            setShowOnboardingGuide(true);
                            setIsFirstTime(false);
                          });
                        }}
                        className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      >
                        <Rocket className="w-4 h-4" />
                        <span>ガイドを開始する</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => startTransition(() => setIsFirstTime(false))}
                        className="text-gray-600"
                      >
                        後で確認する
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Header Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">キャリアスコア</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold text-gray-900">
                      {careerScore?.overall ?? 0}
                    </p>
                    {getTrendIcon()}
                    {scoreChange && (
                      <span className={`text-sm ${scoreChange > 0 ? 'text-green-600' : scoreChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {scoreChange > 0 ? '+' : ''}{scoreChange}
                      </span>
                    )}
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
              <ProgressBar progress={careerScore?.overall ?? 0} className="mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">自己分析完了度</p>
                  <p className="text-2xl font-bold text-gray-900">{analysisCompletion}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-sky-500" />
              </div>
              <ProgressBar progress={analysisCompletion} className="mt-4" />
            </CardContent>
          </Card>


          <Card className="opacity-60 pointer-events-none relative">
            <span className="absolute top-3 right-3 text-[10px] tracking-wide font-semibold px-2 py-1 rounded-md bg-gray-900 text-white">
              COMING&nbsp;SOON
            </span>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Peerレビュー</p>
                  <p className="text-2xl font-bold text-gray-900">- 件</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <div className="flex items-center mt-2">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600 ml-1">
                  平均 -
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Career Score Radar */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">キャリアスコア詳細</h2>
                    <p className="text-gray-600">5つの軸であなたの強みを可視化</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScoreInfo(true)}
                      className="flex items-center space-x-1"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>詳細を見る</span>
                    </Button>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{careerScore?.overall ?? 0}</div>
                      <div className="text-sm text-gray-500">総合スコア</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CareerRadarChart data={careerScoreData} />
                <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  {Object.entries(careerScoreData).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="font-bold text-lg text-gray-900">{value}</div>
                      <div className="text-gray-600">{key}</div>
                    </div>
                  ))}
                </div>
                
                {/* AI インサイト */}
                {careerScore?.insights && (
                  <div className="mt-6 space-y-4">
                    {careerScore.insights.strengths.length > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2">💪 あなたの強み</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          {careerScore.insights.strengths.map((strength, index) => (
                            <li key={index}>• {strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {careerScore.insights.improvements.length > 0 && (
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <h4 className="font-medium text-orange-800 mb-2">🎯 改善ポイント</h4>
                        <ul className="text-sm text-orange-700 space-y-1">
                          {careerScore.insights.improvements.map((improvement, index) => (
                            <li key={index}>• {improvement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {careerScore.insights.recommendations.length > 0 && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">💡 おすすめアクション</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          {careerScore.insights.recommendations.map((recommendation, index) => (
                            <li key={index}>• {recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Peer Reviews */}
            <Card className="opacity-60 pointer-events-none relative">
              <span className="absolute top-3 right-3 text-[10px] tracking-wide font-semibold px-2 py-1 rounded-md bg-gray-900 text-white">
                COMING&nbsp;SOON
              </span>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Peerレビュー</h2>
                    <p className="text-gray-600">同世代からのフィードバック</p>
                  </div>
                  <Button onClick={() => startTransition(() => setShowReviewModal(true))} className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>レビューを書く</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {peerReviews.map((review) => (
                    <div key={review.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{review.reviewer}</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-gray-900">クイックアクション</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigateFn('/ipo/analysis')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  AI自己分析を続ける
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigateFn('/ipo/case')}
                >
                  <Target className="w-4 h-4 mr-2" />
                  ケース問題を解く
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigateFn('/ipo/calendar')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  今週の予定を確認
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowReviewModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <h3 className="text-lg font-bold text-gray-900">レビューを書く</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    レビュアー名
                  </label>
                  <input
                    type="text"
                    value={newReview.reviewer}
                    onChange={(e) => setNewReview(prev => ({ ...prev, reviewer: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="あなたの名前"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    評価
                  </label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setNewReview(prev => ({ ...prev, rating }))}
                        className={`w-8 h-8 ${
                          rating <= newReview.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                        }`}
                      >
                        <Star className="w-full h-full" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    コメント
                  </label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="フィードバックを書いてください..."
                  />
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setShowReviewModal(false)} className="flex-1">
                    キャンセル
                  </Button>
                  <Button onClick={handleAddReview} className="flex-1">
                    投稿する
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Career Score Info Dialog */}
      <CareerScoreInfo
        isOpen={showScoreInfo}
        onClose={() => setShowScoreInfo(false)}
      />

      {/* Onboarding Guide */}
      <OnboardingGuide
        isOpen={showOnboardingGuide}
        onClose={() => setShowOnboardingGuide(false)}
        navigate={navigateFn}
        currentStep={completedOnboardingSteps.length + 1}
        onStepComplete={handleOnboardingStepComplete}
      />
    </div>
  );
}
export default DashboardPage;