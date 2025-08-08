/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useEffect, useState } from 'react';
import { Play, Clock, Award, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { supabase } from '@/lib/supabase/client';


interface Problem {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'webtest' | 'case';
  time: number;
  category: string;
  solved: boolean;
}

export default function CasePage() {
  const [activeTab, setActiveTab] = useState<'webtest' | 'case'>('webtest');
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // 1) 認証ユーザー
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        setAuthUserId(user?.id ?? null);

        // 2) 問題リスト取得（公開問題＋自分の作成した問題を含む想定）
        const { data: rows, error: probErr } = await supabase
          .from('ipo_problems')
          .select('id, title, difficulty, type, time, category')
          .order('created_at', { ascending: true });
        if (probErr) throw probErr;

        // 3) 自分が正解済みの問題ID集合
        let solvedSet = new Set<string>();
        if (user && rows && rows.length) {
          const ids = rows.map(r => String(r.id));
          const { data: subs, error: subErr } = await supabase
            .from('ipo_problem_submissions')
            .select('problem_id, is_correct')
            .eq('user_id', user.id)
            .in('problem_id', ids);
          if (subErr) throw subErr;
          solvedSet = new Set((subs ?? []).filter(s => s.is_correct).map(s => String(s.problem_id)));
        }

        const mapped: Problem[] = (rows ?? []).map((r: any) => ({
          id: String(r.id),
          title: r.title,
          difficulty: r.difficulty,
          type: r.type,
          time: r.time ?? 0,
          category: r.category ?? 'その他',
          solved: solvedSet.has(String(r.id)),
        }));
        setProblems(mapped);
        setError(null);
      } catch (e: any) {
        console.error(e);
        setError('問題の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredProblems = problems.filter(p => p.type === activeTab);
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800'
  };

  const difficultyLabels = {
    easy: '初級',
    medium: '中級',
    hard: '上級'
  };

  const handleSolveProblem = (problem: Problem) => {
    setSelectedProblem(problem);
    setUserAnswer('');
    setShowResult(false);
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !selectedProblem) return;
    // 仮スコア（現状はモック採点）
    const score = Math.floor(Math.random() * 30) + 70;
    const is_correct = score >= 80; // 80点以上を正解扱い
    try {
      if (!authUserId) {
        setShowResult(true);
        return;
      }
      await supabase.from('ipo_problem_submissions').insert({
        user_id: authUserId,
        problem_id: selectedProblem.id,
        answer_text: userAnswer,
        score,
        is_correct,
        meta: { source: 'case_page' }
      });
      if (is_correct) {
        setProblems(prev => prev.map(p => p.id === selectedProblem.id ? { ...p, solved: true } : p));
      }
    } catch (e) {
      console.error(e);
      setError('解答の保存に失敗しました');
    } finally {
      setShowResult(true);
    }
  };

  const mockFeedback = {
    score: Math.floor(Math.random() * 30) + 70,
    feedback: '素晴らしい回答です！論理的な構造と具体的な施策が評価できます。さらに定量的な根拠があると完璧でした。',
    strengths: ['構造化された思考', '具体的な施策提示', '現実的な視点'],
    improvements: ['データによる裏付け', '優先順位の明確化', 'リスク要因の検討']
  };

  if (selectedProblem) {
    return (
      <div className="bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={() => setSelectedProblem(null)}
                className="text-sky-600 hover:text-sky-700 mb-2 flex items-center"
              >
                ← 問題一覧に戻る
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{selectedProblem.title}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[selectedProblem.difficulty]}`}>
                  {difficultyLabels[selectedProblem.difficulty]}
                </span>
                <span className="text-sm text-gray-500 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {selectedProblem.time}分
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-gray-900">問題文</h2>
              </CardHeader>
              <CardContent>
                {selectedProblem.type === 'case' ? (
                  <div className="space-y-4">
                    <p className="text-gray-700 leading-relaxed">
                      あなたは大手コンサルティング会社のアナリストです。
                      クライアントである地方のコンビニエンスストアチェーン（50店舗）から、
                      「売上が前年同期比で10%減少している。どのような改善策を提案するか？」
                      という相談を受けました。
                    </p>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <h4 className="font-medium text-gray-900 mb-2">与えられた情報：</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• 地方部に50店舗展開（平均店舗面積150㎡）</li>
                        <li>• 主な顧客層：30-60代の地域住民</li>
                        <li>• 近隣に大型スーパー2店舗が新規オープン</li>
                        <li>• 人口減少率：年間2%</li>
                        <li>• デジタル決済導入率：30%</li>
                      </ul>
                    </div>
                    <p className="text-gray-700">
                      <strong>設問：</strong>
                      売上回復のための具体的な改善策を、優先順位をつけて3つ提案してください。
                      それぞれの施策について、実行方法と期待効果を明記してください。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      次の文章で使われている「革新」と最も近い意味の言葉を選んでください。
                    </p>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="text-gray-900">
                        「この技術は業界に大きな<strong>革新</strong>をもたらした。」
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                        A. 変化
                      </div>
                      <div className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                        B. 改革
                      </div>
                      <div className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                        C. 発展
                      </div>
                      <div className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                        D. 進歩
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-bold text-gray-900">解答欄</h2>
              </CardHeader>
              <CardContent>
                {!showResult ? (
                  <div className="space-y-4">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder={selectedProblem.type === 'case' ? 
                        "あなたの提案を詳しく記入してください...\n\n1. 提案内容\n2. 実行方法\n3. 期待効果\n\nの構成で記載することをお勧めします。" :
                        "選択肢を選んで理由も記入してください..."
                      }
                      rows={selectedProblem.type === 'case' ? 12 : 6}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                    />
                    <Button 
                      onClick={handleSubmitAnswer}
                      disabled={!userAnswer.trim()}
                      className="w-full"
                    >
                      採点する
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="w-8 h-8" />
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-2">
                        {mockFeedback.score}点
                      </div>
                      <p className="text-gray-600">100点満点</p>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">総評</h3>
                      <p className="text-gray-700 leading-relaxed">{mockFeedback.feedback}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-green-700 mb-2">良い点</h4>
                        <ul className="space-y-1">
                          {mockFeedback.strengths.map((strength, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-center">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-orange-700 mb-2">改善点</h4>
                        <ul className="space-y-1">
                          {mockFeedback.improvements.map((improvement, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-center">
                              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2" />
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button variant="outline" onClick={() => setSelectedProblem(null)} className="flex-1">
                        問題一覧に戻る
                      </Button>
                      <Button onClick={() => {
                        setShowResult(false);
                        setUserAnswer('');
                      }} className="flex-1">
                        再チャレンジ
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && <div className="mb-4 text-sm text-muted-foreground">読み込み中...</div>}
        {error && !loading && <div className="mb-4 text-sm text-red-600">{error}</div>}
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">ケースグランプリ</h1>
          <p className="text-muted-foreground">実践的な問題で論理思考力を鍛えましょう</p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('webtest')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'webtest'
                    ? 'border-sky-500 text-sky-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Webテスト ({problems.filter(p => p.type === 'webtest').length}問)
              </button>
              <button
                onClick={() => setActiveTab('case')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'case'
                    ? 'border-sky-500 text-sky-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ケース問題 ({problems.filter(p => p.type === 'case').length}問)
              </button>
            </nav>
          </div>
        </div>

        {/* Problem List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProblems.map((problem) => (
            <Card key={problem.id} className="relative hover:shadow-md hover:border-sky-200 transition-shadow">
              <CardContent className="p-6">
                {problem.solved && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
                
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 mb-2 pr-8">{problem.title}</h3>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[problem.difficulty]}`}>
                      {difficultyLabels[problem.difficulty]}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {problem.category}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {problem.time}分
                  </div>
                </div>

                <Button
                  onClick={() => handleSolveProblem(problem)}
                  className="w-full flex items-center justify-center space-x-2"
                  variant={problem.solved ? "outline" : "default"}
                >
                  <Play className="w-4 h-4" />
                  <span>{problem.solved ? '再チャレンジ' : '解く'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}