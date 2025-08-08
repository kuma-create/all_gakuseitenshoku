import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Target, AlertCircle, CheckCircle, Eye, Download, Plus, Edit3, Save, X, BookOpen, Users, Lightbulb, Award, Zap, Brain } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

interface StrengthAnalysisProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
}

interface Strength {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'leadership' | 'communication' | 'problem-solving' | 'creativity';
  level: number; // 1-5
  evidence: Evidence[];
  description: string;
  developmentPlan: string;
  jobRelevance: {
    industries: string[];
    positions: string[];
    keywords: string[];
  };
  validated: boolean;
  selfAssessment: number;
  feedbackScore?: number;
}

interface Weakness {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'experience' | 'knowledge';
  impact: number; // 1-5
  improvementPlan: ActionPlan[];
  description: string;
  progressTracking: {
    milestones: Milestone[];
    currentProgress: number;
  };
  jobImpact: {
    affectedRoles: string[];
    mitigationStrategies: string[];
  };
}

interface Evidence {
  id: string;
  title: string;
  description: string;
  context: string;
  outcome: string;
  skills: string[];
  quantifiedResult?: string;
  source: 'self' | 'peer' | 'mentor' | 'achievement';
}

interface ActionPlan {
  id: string;
  action: string;
  timeline: string;
  resources: string[];
  success_metrics: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed';
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  deadline: string;
  completed: boolean;
  evidence?: string;
}

interface CompetencyFramework {
  name: string;
  description: string;
  skills: string[];
  requiredLevel: number;
  yourLevel: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
}

const strengthCategories = {
  technical: { label: '技術スキル', icon: Zap, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  soft: { label: 'ソフトスキル', icon: Users, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  leadership: { label: 'リーダーシップ', icon: Target, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
  communication: { label: 'コミュニケーション', icon: Users, color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50', textColor: 'text-pink-700' },
  'problem-solving': { label: '問題解決', icon: Brain, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  creativity: { label: '創造性', icon: Lightbulb, color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' }
};

const weaknessCategories = {
  technical: { label: '技術面', icon: Zap, color: 'from-red-500 to-red-600' },
  soft: { label: 'ソフトスキル', icon: Users, color: 'from-orange-500 to-orange-600' },
  experience: { label: '経験不足', icon: BookOpen, color: 'from-yellow-500 to-yellow-600' },
  knowledge: { label: '知識・理解', icon: Brain, color: 'from-purple-500 to-purple-600' }
};

const industryFrameworks: { [key: string]: CompetencyFramework[] } = {
  'IT・ソフトウェア': [
    {
      name: 'プログラミング基礎',
      description: 'アルゴリズム、データ構造、コーディング',
      skills: ['論理的思考', 'プログラミング', '問題解決'],
      requiredLevel: 4,
      yourLevel: 3,
      gap: 1,
      priority: 'high'
    },
    {
      name: 'チーム開発',
      description: 'バージョン管理、コードレビュー、協働',
      skills: ['チームワーク', 'コミュニケーション', '協調性'],
      requiredLevel: 4,
      yourLevel: 4,
      gap: 0,
      priority: 'medium'
    }
  ],
  'コンサルティング': [
    {
      name: '論理的思考',
      description: '構造化思考、仮説構築、論理展開',
      skills: ['分析力', '論理的思考', '仮説検証'],
      requiredLevel: 5,
      yourLevel: 4,
      gap: 1,
      priority: 'high'
    },
    {
      name: 'クライアントコミュニケーション',
      description: '顧客理解、提案力、関係構築',
      skills: ['コミュニケーション', 'プレゼンテーション', '営業力'],
      requiredLevel: 4,
      yourLevel: 3,
      gap: 1,
      priority: 'high'
    }
  ]
};

const strengthSuggestions = [
  'リーダーシップ', 'チームワーク', 'コミュニケーション', '問題解決能力', '論理的思考',
  '創造性', 'プレゼンテーション', '計画立案', '実行力', '継続力', '協調性', '主体性',
  '責任感', 'ストレス耐性', '柔軟性', '向上心', '分析力', '企画力', '営業力', '語学力'
];

export function StrengthAnalysis({ userId, onProgressUpdate }: StrengthAnalysisProps) {
  const [strengths, setStrengths] = useState<Strength[]>([]);
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'strengths' | 'weaknesses' | 'framework'>('overview');
  const [showStrengthDialog, setShowStrengthDialog] = useState(false);
  const [showWeaknessDialog, setShowWeaknessDialog] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState('IT・ソフトウェア');
  const [editingStrength, setEditingStrength] = useState<Strength | null>(null);
  const [editingWeakness, setEditingWeakness] = useState<Weakness | null>(null);

  const [newStrength, setNewStrength] = useState<Partial<Strength>>({
    name: '',
    category: 'soft',
    level: 3,
    evidence: [],
    description: '',
    developmentPlan: '',
    jobRelevance: { industries: [], positions: [], keywords: [] },
    validated: false,
    selfAssessment: 3
  });

  const [newWeakness, setNewWeakness] = useState<Partial<Weakness>>({
    name: '',
    category: 'soft',
    impact: 3,
    improvementPlan: [],
    description: '',
    progressTracking: { milestones: [], currentProgress: 0 },
    jobImpact: { affectedRoles: [], mitigationStrategies: [] }
  });

  useEffect(() => {
    loadAnalysisData();
  }, [userId]);

  useEffect(() => {
    const progress = Math.min(100, strengths.length * 10 + weaknesses.length * 8 + 
      strengths.filter(s => s.evidence.length > 0).length * 5);
    onProgressUpdate(progress);
  }, [strengths, weaknesses]);

  const loadAnalysisData = () => {
    // Mock data
    const mockStrengths: Strength[] = [
      {
        id: '1',
        name: 'リーダーシップ',
        category: 'leadership',
        level: 4,
        description: 'チームを牽引し、目標達成に向けてメンバーを導く能力',
        developmentPlan: '大規模プロジェクトでのリーダー経験を積む',
        jobRelevance: {
          industries: ['コンサルティング', '金融・銀行', 'IT・ソフトウェア'],
          positions: ['プロジェクトマネージャー', '企画職', '営業職'],
          keywords: ['チーム管理', 'プロジェクト推進', '目標達成']
        },
        validated: true,
        selfAssessment: 4,
        feedbackScore: 4,
        evidence: [
          {
            id: '1-1',
            title: 'サークル代表としての組織運営',
            description: '100名規模のテニスサークルで代表を務め、活動の活性化を実現',
            context: 'メンバーの参加率低下と新入生の定着率悪化が課題',
            outcome: '参加率を30%から80%に向上、新入生定着率90%達成',
            skills: ['リーダーシップ', 'チームビルディング', '課題解決'],
            quantifiedResult: '参加率150%向上、定着率40%改善',
            source: 'self'
          },
          {
            id: '1-2',
            title: 'インターンでのチームリーダー',
            description: '新規事業提案プロジェクトでチームリーダーを担当',
            context: '多様なバックグラウンドを持つ5名のチーム',
            outcome: '最終プレゼンで2位入賞、提案が実際に検討段階に進行',
            skills: ['リーダーシップ', '調整力', 'プレゼンテーション'],
            quantifiedResult: '5チーム中2位の成績',
            source: 'achievement'
          }
        ]
      },
      {
        id: '2',
        name: '問題解決能力',
        category: 'problem-solving',
        level: 4,
        description: '複雑な問題を構造化し、効果的な解決策を見つけ出す能力',
        developmentPlan: 'より高度な分析手法を学習し、データドリブンな問題解決を強化',
        jobRelevance: {
          industries: ['コンサルティング', 'IT・ソフトウェア', '金融・銀行'],
          positions: ['コンサルタント', 'アナリスト', '企画職'],
          keywords: ['論理的思考', '分析力', '課題解決']
        },
        validated: true,
        selfAssessment: 4,
        feedbackScore: 4,
        evidence: [
          {
            id: '2-1',
            title: '研究プロジェクトでの課題解決',
            description: 'ゼミの研究で複雑なデータ分析問題を解決',
            context: '従来手法では解決困難な統計問題',
            outcome: '新しいアプローチで問題を解決、学会発表に採択',
            skills: ['分析力', '創造性', '継続力'],
            quantifiedResult: '学会発表採択、研究効率30%向上',
            source: 'achievement'
          }
        ]
      }
    ];

    const mockWeaknesses: Weakness[] = [
      {
        id: '1',
        name: '英語力',
        category: 'technical',
        impact: 4,
        description: '国際的な環境での業務に必要な英語コミュニケーション能力が不足',
        improvementPlan: [
          {
            id: '1-1',
            action: 'TOEIC900点達成',
            timeline: '6ヶ月',
            resources: ['オンライン英会話', 'TOEIC対策講座', '英語学習アプリ'],
            success_metrics: ['TOEIC Score 900+', '英語でのプレゼンテーション実施'],
            priority: 'high',
            status: 'in_progress'
          },
          {
            id: '1-2',
            action: 'ビジネス英語の実践',
            timeline: '3ヶ月',
            resources: ['国際インターンシップ', '英語ディスカッションクラブ'],
            success_metrics: ['英語でのミーティング参加', 'ビジネス文書作成'],
            priority: 'medium',
            status: 'not_started'
          }
        ],
        progressTracking: {
          milestones: [
            {
              id: '1-m1',
              title: 'TOEIC700点達成',
              description: '基礎的なビジネス英語力の習得',
              deadline: '2025-03-01',
              completed: true,
              evidence: 'TOEIC Score: 720点'
            },
            {
              id: '1-m2',
              title: 'TOEIC800点達成',
              description: '中級レベルのビジネス英語力',
              deadline: '2025-05-01',
              completed: false
            }
          ],
          currentProgress: 60
        },
        jobImpact: {
          affectedRoles: ['グローバル企業での勤務', '外資系企業', '海外展開企業'],
          mitigationStrategies: ['国内ポジションからキャリアスタート', '英語サポート体制のある企業選択']
        }
      }
    ];

    setStrengths(mockStrengths);
    setWeaknesses(mockWeaknesses);
  };

  const handleSaveStrength = () => {
    if (!newStrength.name) return;

    const strength: Strength = {
      id: editingStrength?.id || Date.now().toString(),
      name: newStrength.name!,
      category: newStrength.category as any || 'soft',
      level: newStrength.level || 3,
      evidence: newStrength.evidence || [],
      description: newStrength.description || '',
      developmentPlan: newStrength.developmentPlan || '',
      jobRelevance: newStrength.jobRelevance || { industries: [], positions: [], keywords: [] },
      validated: newStrength.validated || false,
      selfAssessment: newStrength.selfAssessment || 3
    };

    if (editingStrength) {
      setStrengths(prev => prev.map(s => s.id === editingStrength.id ? strength : s));
    } else {
      setStrengths(prev => [...prev, strength]);
    }

    resetStrengthForm();
    setShowStrengthDialog(false);
  };

  const resetStrengthForm = () => {
    setNewStrength({
      name: '',
      category: 'soft',
      level: 3,
      evidence: [],
      description: '',
      developmentPlan: '',
      jobRelevance: { industries: [], positions: [], keywords: [] },
      validated: false,
      selfAssessment: 3
    });
    setEditingStrength(null);
  };

  const getOverallScore = () => {
    const strengthScore = strengths.reduce((sum, s) => sum + s.level, 0) / strengths.length || 0;
    const validatedStrengths = strengths.filter(s => s.validated).length;
    const evidenceCount = strengths.reduce((sum, s) => sum + s.evidence.length, 0);
    
    return {
      overall: Math.round(strengthScore * 20), // Convert to percentage
      validated: Math.round((validatedStrengths / strengths.length) * 100) || 0,
      evidence: evidenceCount
    };
  };

  const renderOverview = () => {
    const score = getOverallScore();
    const topStrengths = strengths.slice(0, 3);
    const topWeaknesses = weaknesses.slice(0, 3);

    return (
      <div className="space-y-6">
        {/* Overall Scores */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-6">総合評価</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-3xl font-bold text-blue-700 mb-2">{score.overall}%</div>
              <div className="text-sm text-blue-600 mb-2">総合強みスコア</div>
              <Progress value={score.overall} className="h-2" />
            </motion.div>

            <motion.div
              className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-3xl font-bold text-green-700 mb-2">{score.validated}%</div>
              <div className="text-sm text-green-600 mb-2">検証済み強み</div>
              <Progress value={score.validated} className="h-2" />
            </motion.div>

            <motion.div
              className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl"
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-3xl font-bold text-purple-700 mb-2">{score.evidence}</div>
              <div className="text-sm text-purple-600 mb-2">エビデンス数</div>
              <div className="text-xs text-purple-500 mt-1">具体的な根拠</div>
            </motion.div>
          </div>
        </Card>

        {/* Top Strengths */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">トップ強み</h3>
            <Button variant="outline" onClick={() => setViewMode('strengths')}>
              すべて見る
            </Button>
          </div>
          <div className="grid gap-4">
            {topStrengths.map((strength, index) => {
              const config = strengthCategories[strength.category];
              return (
                <motion.div
                  key={strength.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${config.color} rounded-xl flex items-center justify-center`}>
                    <config.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{strength.name}</h4>
                    <p className="text-sm text-gray-600">{strength.description}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">レベル {strength.level}/5</span>
                      </div>
                      <Badge className={`text-xs ${config.bgColor} ${config.textColor}`}>
                        {config.label}
                      </Badge>
                      {strength.validated && (
                        <Badge className="text-xs bg-green-100 text-green-700">検証済み</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">{strength.evidence.length}</div>
                    <div className="text-xs text-gray-500">エビデンス</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Improvement Areas */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">改善エリア</h3>
            <Button variant="outline" onClick={() => setViewMode('weaknesses')}>
              すべて見る
            </Button>
          </div>
          <div className="grid gap-4">
            {topWeaknesses.map((weakness, index) => {
              const config = weaknessCategories[weakness.category];
              return (
                <motion.div
                  key={weakness.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-4 p-4 bg-orange-50 rounded-lg border border-orange-200"
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${config.color} rounded-xl flex items-center justify-center`}>
                    <config.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{weakness.name}</h4>
                    <p className="text-sm text-gray-600">{weakness.description}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">影響度 {weakness.impact}/5</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm">改善率 {weakness.progressTracking.currentProgress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">{weakness.improvementPlan.length}</div>
                    <div className="text-xs text-gray-500">改善計画</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Job Hunt Readiness */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-6">就活準備度</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">強みの業界適合性</h4>
              <div className="space-y-2">
                {Object.keys(industryFrameworks).map(industry => {
                  const relevantStrengths = strengths.filter(s => 
                    s.jobRelevance.industries.includes(industry)
                  );
                  const score = (relevantStrengths.length / strengths.length) * 100;
                  
                  return (
                    <div key={industry} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{industry}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(score)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">改善優先度</h4>
              <div className="space-y-2">
                {weaknesses.map(weakness => (
                  <div key={weakness.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{weakness.name}</span>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={`text-xs ${
                          weakness.impact >= 4 ? 'bg-red-100 text-red-700' :
                          weakness.impact >= 3 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}
                      >
                        {weakness.impact >= 4 ? '高' : weakness.impact >= 3 ? '中' : '低'}
                      </Badge>
                      <span className="text-xs text-gray-500">{weakness.progressTracking.currentProgress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderStrengthsView = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">強み一覧</h3>
          <Button onClick={() => setShowStrengthDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            強みを追加
          </Button>
        </div>

        <div className="grid gap-6">
          {strengths.map((strength, index) => {
            const config = strengthCategories[strength.category];
            return (
              <motion.div
                key={strength.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className={`w-14 h-14 bg-gradient-to-r ${config.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <config.icon className="w-7 h-7 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xl font-bold text-gray-900">{strength.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${config.bgColor} ${config.textColor}`}>
                            {config.label}
                          </Badge>
                          {strength.validated && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              検証済み
                            </Badge>
                          )}
                          <Button variant="outline" size="sm" onClick={() => {
                            setNewStrength(strength);
                            setEditingStrength(strength);
                            setShowStrengthDialog(true);
                          }}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4">{strength.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <Label className="text-sm text-gray-600">スキルレベル</Label>
                          <div className="flex items-center space-x-3 mt-1">
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map(level => (
                                <Star
                                  key={level}
                                  className={`w-4 h-4 ${
                                    level <= strength.level 
                                      ? 'text-yellow-500 fill-current' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">{strength.level}/5</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm text-gray-600">エビデンス</Label>
                          <div className="text-lg font-medium text-gray-900 mt-1">
                            {strength.evidence.length}件
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm text-gray-600">就活関連度</Label>
                          <div className="text-lg font-medium text-gray-900 mt-1">
                            {strength.jobRelevance.industries.length}業界
                          </div>
                        </div>
                      </div>

                      {/* Evidence */}
                      {strength.evidence.length > 0 && (
                        <div className="mb-4">
                          <Label className="text-sm text-gray-600 mb-2 block">具体的なエビデンス</Label>
                          <div className="space-y-3">
                            {strength.evidence.map((evidence, i) => (
                              <div key={evidence.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <h5 className="font-medium text-blue-900 mb-1">{evidence.title}</h5>
                                <p className="text-sm text-blue-700 mb-2">{evidence.description}</p>
                                {evidence.quantifiedResult && (
                                  <div className="flex items-center space-x-2">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">{evidence.quantifiedResult}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Job Relevance */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm text-gray-600">関連業界</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {strength.jobRelevance.industries.map((industry, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{industry}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">関連職種</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {strength.jobRelevance.positions.map((position, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{position}</Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">キーワード</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {strength.jobRelevance.keywords.map((keyword, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{keyword}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">強み・弱み分析</h2>
            <p className="text-gray-600">
              客観的な自己評価と具体的なエビデンスで就活を有利に進めましょう
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              レポート出力
            </Button>
          </div>
        </div>
      </Card>

      {/* View Toggle */}
      <Card className="p-4">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="strengths">強み詳細</TabsTrigger>
            <TabsTrigger value="weaknesses">弱み・改善</TabsTrigger>
            <TabsTrigger value="framework">業界別評価</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {viewMode === 'overview' && renderOverview()}
          {viewMode === 'strengths' && renderStrengthsView()}
          {viewMode === 'weaknesses' && (
            <div className="text-center py-12">
              <p className="text-gray-600">弱み・改善計画の詳細ビューを実装中...</p>
            </div>
          )}
          {viewMode === 'framework' && (
            <div className="text-center py-12">
              <p className="text-gray-600">業界別評価フレームワークを実装中...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Strength Dialog */}
      <Dialog open={showStrengthDialog} onOpenChange={setShowStrengthDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStrength ? '強みを編集' : '新しい強みを追加'}
            </DialogTitle>
            <DialogDescription>
              具体的なエビデンスとともに強みを整理しましょう
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strength-name">強み名 *</Label>
                <Input
                  id="strength-name"
                  value={newStrength.name}
                  onChange={(e) => setNewStrength(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例: リーダーシップ、問題解決能力"
                />
              </div>
              <div>
                <Label htmlFor="strength-category">カテゴリー</Label>
                <Select value={newStrength.category} onValueChange={(value) => setNewStrength(prev => ({ ...prev, category: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(strengthCategories).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <config.icon className="w-4 h-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="strength-description">詳細説明</Label>
              <Textarea
                id="strength-description"
                value={newStrength.description}
                onChange={(e) => setNewStrength(prev => ({ ...prev, description: e.target.value }))}
                placeholder="この強みについて詳しく説明してください..."
                rows={3}
              />
            </div>

            <div>
              <Label>スキルレベル: {newStrength.level}/5</Label>
              <Slider
                value={[newStrength.level || 3]}
                onValueChange={(value) => setNewStrength(prev => ({ ...prev, level: value[0] }))}
                min={1}
                max={5}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>初心者(1)</span>
                <span>中級(3)</span>
                <span>エキスパート(5)</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setShowStrengthDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveStrength} disabled={!newStrength.name}>
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}