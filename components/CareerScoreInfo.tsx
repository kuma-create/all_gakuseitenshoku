import React, { useState } from 'react';
import { 
  HelpCircle, TrendingUp, Users, Target, Award, Zap, 
  CheckCircle, BarChart3, Calendar, Star, ArrowRight,
  X, Info, BookOpen, Brain, Heart
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

interface CareerScoreInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CareerScoreInfo({ isOpen, onClose }: CareerScoreInfoProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const scoreComponents = [
    {
      name: '自己分析',
      weight: 25,
      description: '強み・弱み・価値観・将来ビジョンの明確さ',
      icon: Brain,
      color: 'bg-blue-100 text-blue-700',
      factors: [
        '強み・弱みの明確化（3つ以上）',
        '価値観の整理（3つ以上）',
        '将来ビジョンの具体性',
        '経験の質と量',
        'ライフチャートの完成度'
      ]
    },
    {
      name: '選考実績',
      weight: 30,
      description: '応募・選考の進捗と成果',
      icon: Target,
      color: 'bg-green-100 text-green-700',
      factors: [
        '応募企業数と質',
        '選考通過率',
        '最終面接・内定率',
        '企業からの評価',
        '選考での学習・改善'
      ]
    },
    {
      name: '学習活動',
      weight: 25,
      description: 'ケース練習や継続的な学習',
      icon: BookOpen,
      color: 'bg-purple-100 text-purple-700',
      factors: [
        'ケース問題の練習量・正答率',
        '継続的な学習習慣',
        'スキルアセスメント結果',
        '業界・企業研究の深さ',
        '面接練習の回数'
      ]
    },
    {
      name: '外部評価',
      weight: 20,
      description: 'ピアレビューや第三者評価',
      icon: Users,
      color: 'bg-orange-100 text-orange-700',
      factors: [
        'ピアレビューの評価',
        'メンターからのフィードバック',
        'ネットワーキング活動',
        '他者からの推薦・評価',
        'コミュニティ参加度'
      ]
    }
  ];

  const dimensions = [
    {
      name: 'Communication',
      label: 'コミュニケーション',
      description: '相手に分かりやすく伝える力',
      icon: Users,
      color: 'text-blue-600',
      factors: [
        'プレゼンテーション能力',
        '論理的な説明力',
        '傾聴・共感力',
        'チームワーク',
        '言語化能力'
      ],
      tips: [
        'ピアレビューを積極的に活用しよう',
        'プレゼンテーション機会を増やそう',
        'フィードバックを素直に受け入れよう'
      ]
    },
    {
      name: 'Logic',
      label: '論理的思考',
      description: '構造化して考え、問題を解決する力',
      icon: Brain,
      color: 'text-green-600',
      factors: [
        'ケース問題解決力',
        '分析的思考',
        '仮説思考',
        'データ活用力',
        '問題の構造化'
      ],
      tips: [
        'ケース問題を継続的に練習しよう',
        'フレームワークを身につけよう',
        '結論ファーストを意識しよう'
      ]
    },
    {
      name: 'Leadership',
      label: 'リーダーシップ',
      description: 'チームを牽引し、影響を与える力',
      icon: Award,
      color: 'text-purple-600',
      factors: [
        'チーム運営経験',
        'イニシアチブ',
        '影響力',
        '責任感',
        '変革推進力'
      ],
      tips: [
        'リーダーシップ経験を整理しよう',
        'チームでの成果を具体化しよう',
        '他者への影響を言語化しよう'
      ]
    },
    {
      name: 'Fit',
      label: '適合性',
      description: '企業・業界との適合度',
      icon: Heart,
      color: 'text-red-600',
      factors: [
        '業界理解の深さ',
        '企業文化との適合',
        '価値観の一致',
        'キャリアビジョン',
        '志望動機の明確さ'
      ],
      tips: [
        '業界・企業研究を深めよう',
        '自分の価値観を明確にしよう',
        '長期的なキャリアを描こう'
      ]
    },
    {
      name: 'Vitality',
      label: '活力',
      description: '継続的な成長と適応力',
      icon: Zap,
      color: 'text-yellow-600',
      factors: [
        '学習継続性',
        '成長マインド',
        '困難克服力',
        '適応力',
        'エネルギー'
      ],
      tips: [
        '継続的な学習習慣を身につけよう',
        '挫折から学ぶ姿勢を持とう',
        '新しいことにチャレンジしよう'
      ]
    }
  ];

  const scoreLevels = [
    { range: '90-100', label: 'Outstanding', description: '非常に優秀、トップ企業も狙える', color: 'bg-green-500' },
    { range: '80-89', label: 'Excellent', description: '優秀、多くの企業で評価される', color: 'bg-blue-500' },
    { range: '70-79', label: 'Good', description: '良好、継続的な改善で更なる向上が期待', color: 'bg-purple-500' },
    { range: '60-69', label: 'Fair', description: '標準的、重点分野での改善が必要', color: 'bg-orange-500' },
    { range: '50-59', label: 'Developing', description: '発展途上、基礎力強化が重要', color: 'bg-yellow-500' },
    { range: '0-49', label: 'Needs Improvement', description: '改善が必要、基本から見直しを', color: 'bg-red-500' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>キャリアスコアについて</span>
          </DialogTitle>
          <DialogDescription>
            あなたのキャリア開発の進捗を5つの軸で総合的に評価します
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="overview">概要</TabsTrigger>
              <TabsTrigger value="calculation">計算方法</TabsTrigger>
              <TabsTrigger value="dimensions">5つの軸</TabsTrigger>
              <TabsTrigger value="improvement">改善のヒント</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-10 h-10 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">キャリアスコアとは？</h3>
                      <p className="text-gray-600 max-w-2xl mx-auto">
                        就活における様々な活動とスキルを定量化し、あなたの現在地と成長の方向性を明確にするためのスコアシステムです。
                        AI分析により、個人の強み・弱みを特定し、具体的な改善アクションを提案します。
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <h4 className="font-bold text-gray-900 flex items-center">
                            <Target className="w-5 h-5 mr-2 text-blue-600" />
                            スコアの目的
                          </h4>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                            <div>
                              <h5 className="font-medium">現在地の把握</h5>
                              <p className="text-sm text-gray-600">自分の就活準備度を客観視</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                            <div>
                              <h5 className="font-medium">成長の可視化</h5>
                              <p className="text-sm text-gray-600">継続的な改善を数値で確認</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                            <div>
                              <h5 className="font-medium">行動指針の提供</h5>
                              <p className="text-sm text-gray-600">AIが最適な次のアクションを提案</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <h4 className="font-bold text-gray-900 flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                            スコアレベル
                          </h4>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {scoreLevels.map((level, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full ${level.color}`} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">{level.range}</span>
                                  <Badge variant="outline" className="text-xs">{level.label}</Badge>
                                </div>
                                <p className="text-xs text-gray-600">{level.description}</p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="calculation" className="space-y-6 mt-0">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">スコア計算の仕組み</h3>
                      <p className="text-gray-600">
                        4つの主要カテゴリを総合的に評価し、100点満点で算出します
                      </p>
                    </div>

                    <div className="grid gap-4">
                      {scoreComponents.map((component, index) => {
                        const Icon = component.icon;
                        return (
                          <Card key={index} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-start space-x-4">
                                <div className={`w-12 h-12 rounded-lg ${component.color} flex items-center justify-center`}>
                                  <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-gray-900">{component.name}</h4>
                                    <Badge className="bg-blue-100 text-blue-700">
                                      重み: {component.weight}%
                                    </Badge>
                                  </div>
                                  <p className="text-gray-600 mb-3">{component.description}</p>
                                  <div className="mb-3">
                                    <Progress value={component.weight} className="h-2" />
                                  </div>
                                  <div className="space-y-1">
                                    <h5 className="font-medium text-sm text-gray-800">評価要素:</h5>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-600">
                                      {component.factors.map((factor, i) => (
                                        <li key={i} className="flex items-center space-x-2">
                                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                          <span>{factor}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-3">
                          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-blue-900 mb-2">計算式</h4>
                            <p className="text-blue-800 text-sm leading-relaxed">
                              <strong>総合スコア = </strong>
                              自己分析(25%) + 選考実績(30%) + 学習活動(25%) + 外部評価(20%)
                            </p>
                            <p className="text-blue-700 text-xs mt-2">
                              各カテゴリは0-100点で評価され、重み付き平均により総合スコアが算出されます。
                              スコアは日々の活動により継続的に更新されます。
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="dimensions" className="space-y-6 mt-0">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">5つの評価軸</h3>
                      <p className="text-gray-600">
                        就活で重要な5つの能力を多角的に評価します
                      </p>
                    </div>

                    <div className="grid gap-6">
                      {dimensions.map((dimension, index) => {
                        const Icon = dimension.icon;
                        return (
                          <Card key={index} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-start space-x-4">
                                <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center`}>
                                  <Icon className={`w-6 h-6 ${dimension.color}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-gray-900">{dimension.label}</h4>
                                    <Badge variant="outline">{dimension.name}</Badge>
                                  </div>
                                  <p className="text-gray-600 mb-4">{dimension.description}</p>
                                  
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div>
                                      <h5 className="font-medium text-sm text-gray-800 mb-2">評価要素:</h5>
                                      <ul className="space-y-1 text-sm text-gray-600">
                                        {dimension.factors.map((factor, i) => (
                                          <li key={i} className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                            <span>{factor}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    
                                    <div>
                                      <h5 className="font-medium text-sm text-gray-800 mb-2">改善のコツ:</h5>
                                      <ul className="space-y-1 text-sm text-green-700">
                                        {dimension.tips.map((tip, i) => (
                                          <li key={i} className="flex items-start space-x-2">
                                            <ArrowRight className="w-3 h-3 mt-1 text-green-600" />
                                            <span>{tip}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="improvement" className="space-y-6 mt-0">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">スコア向上のコツ</h3>
                      <p className="text-gray-600">
                        継続的な改善でキャリアスコアを向上させましょう
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <h4 className="font-bold text-gray-900 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                            短期的な改善（1-2週間）
                          </h4>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <h5 className="font-medium text-blue-900">自己分析の完成</h5>
                            <p className="text-sm text-blue-700">強み・弱み・価値観を明確化し、ライフチャートを作成</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <h5 className="font-medium text-green-900">ケース問題練習</h5>
                            <p className="text-sm text-green-700">毎日1問ずつケース問題を解いて論理的思考力を向上</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <h5 className="font-medium text-purple-900">ピアレビュー参加</h5>
                            <p className="text-sm text-purple-700">他の就活生との相互レビューでコミュニケーション力向上</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <h4 className="font-bold text-gray-900 flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                            中長期的な改善（1-3ヶ月）
                          </h4>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-3 bg-orange-50 rounded-lg">
                            <h5 className="font-medium text-orange-900">選考実績の蓄積</h5>
                            <p className="text-sm text-orange-700">多様な企業に応募し、面接経験を積んで実践力を向上</p>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg">
                            <h5 className="font-medium text-red-900">業界研究の深化</h5>
                            <p className="text-sm text-red-700">志望業界の理解を深め、企業との適合性を高める</p>
                          </div>
                          <div className="p-3 bg-yellow-50 rounded-lg">
                            <h5 className="font-medium text-yellow-900">継続的な学習</h5>
                            <p className="text-sm text-yellow-700">定期的な活動で学習習慣を身につけ、成長マインドを育成</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                      <CardContent className="p-6">
                        <div className="text-center">
                          <Star className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-900 mb-2">成功のポイント</h4>
                          <p className="text-gray-700 mb-4">
                            キャリアスコアは一朝一夕では向上しません。継続的な取り組みと自己反省が重要です。
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Target className="w-4 h-4 text-blue-600" />
                              </div>
                              <h5 className="font-medium">目標設定</h5>
                              <p className="text-gray-600">具体的で達成可能な目標を立てる</p>
                            </div>
                            <div className="text-center">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Calendar className="w-4 h-4 text-green-600" />
                              </div>
                              <h5 className="font-medium">継続性</h5>
                              <p className="text-gray-600">毎日少しずつでも続ける</p>
                            </div>
                            <div className="text-center">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <TrendingUp className="w-4 h-4 text-purple-600" />
                              </div>
                              <h5 className="font-medium">振り返り</h5>
                              <p className="text-gray-600">定期的に進捗を確認し改善する</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <Button onClick={onClose}>
            理解しました
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}