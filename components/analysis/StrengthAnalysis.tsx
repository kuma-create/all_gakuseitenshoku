import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Target, AlertCircle, CheckCircle, Eye, Download, Plus, Edit3, Save, X, BookOpen, Users, Lightbulb, Award, Zap, Brain, Trash2 } from 'lucide-react';
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
import { supabase } from '@/lib/supabase/client';

interface StrengthAnalysisProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
}

interface Strength {
  id: string | number;
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
  id: string | number;
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

// Helper to coerce DB values to Strength['category'] literal type
const STRENGTH_CATEGORIES = [
  'technical',
  'soft',
  'leadership',
  'communication',
  'problem-solving',
  'creativity',
] as const;
type StrengthCategoryLiteral = typeof STRENGTH_CATEGORIES[number];
const asStrengthCategory = (v: any): StrengthCategoryLiteral =>
  (STRENGTH_CATEGORIES as readonly string[]).includes(String(v))
    ? (v as StrengthCategoryLiteral)
    : 'soft';

// Helper for weakness categories literal type
const WEAKNESS_CATEGORIES = ['technical','soft','experience','knowledge'] as const;
type WeaknessCategoryLiteral = typeof WEAKNESS_CATEGORIES[number];
const asWeaknessCategory = (v: any): WeaknessCategoryLiteral =>
  (WEAKNESS_CATEGORIES as readonly string[]).includes(String(v))
    ? (v as WeaknessCategoryLiteral)
    : 'soft';

// Small utility for chip-style input handling
const parseCommaInput = (v: string) =>
  v.split(',').map(s => s.trim()).filter(Boolean);

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

  // Local dialog tab controls
  const [strengthDialogTab, setStrengthDialogTab] = useState<'basic'|'evidence'|'relevance'>('basic');
  const [weaknessDialogTab, setWeaknessDialogTab] = useState<'basic'|'plan'|'progress'>('basic');

  // Temp inputs for adding evidence and improvement plan items
  const [evidenceDraft, setEvidenceDraft] = useState<Partial<Evidence>>({ title: '', description: '', context: '', outcome: '', skills: [], source: 'self' });
  const [evidenceSkillInput, setEvidenceSkillInput] = useState('');

  const [improveDraft, setImproveDraft] = useState<Partial<ActionPlan>>({ action: '', timeline: '', resources: [], success_metrics: [], priority: 'medium', status: 'not_started' });
  const [improveResInput, setImproveResInput] = useState('');
  const [improveMetricInput, setImproveMetricInput] = useState('');

  // Simple inputs for job relevance
  const [relIndustriesInput, setRelIndustriesInput] = useState('');
  const [relPositionsInput, setRelPositionsInput] = useState('');
  const [relKeywordsInput, setRelKeywordsInput] = useState('');

  useEffect(() => {
    if (!userId) return;
    loadAnalysisData();
  }, [userId]);

  useEffect(() => {
    const progress = Math.min(100, strengths.length * 10 + weaknesses.length * 8 + 
      strengths.filter(s => s.evidence.length > 0).length * 5);
    onProgressUpdate(progress);
  }, [strengths, weaknesses]);

  const loadAnalysisData = async () => {
    // strengths
    const { data: sData, error: sErr } = await supabase
      .from('ipo_strengths')
      .select('id,label,kind,score,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (sErr) {
      console.error('load strengths error:', sErr);
    }

    const strengthsFromDb: Strength[] = (sData || []).map((row: any) => ({
      id: row.id,
      name: row.label,                    // label → name
      category: asStrengthCategory(row.kind), // kind → category, coerced
      level: row.score ?? 0,              // score → level
      evidence: [],
      description: '',
      developmentPlan: '',
      jobRelevance: { industries: [], positions: [], keywords: [] },
      validated: false,
      selfAssessment: row.score ?? 0,
      feedbackScore: undefined,
    }));

    // weaknesses
    const { data: wData, error: wErr } = await supabase
      .from('ipo_weaknesses')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (wErr) {
      console.error('load weaknesses error:', wErr);
    }

    const weaknessesFromDb: Weakness[] = (wData || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      category: asWeaknessCategory(row.category),
      impact: row.impact ?? 0,
      improvementPlan: row.improvement_plan || [],
      description: row.description || '',
      progressTracking: row.progress_tracking || { milestones: [], currentProgress: 0 },
      jobImpact: row.job_impact || { affectedRoles: [], mitigationStrategies: [] },
    }));

    setStrengths(strengthsFromDb);
    setWeaknesses(weaknessesFromDb);
  };

  const handleSaveStrength = async () => {
    if (!newStrength.name) return;

    const payload = {
      user_id: userId,
      kind: (newStrength.category as any) || 'soft',
      label: newStrength.name || '',
      score: newStrength.level ?? 3,
    };

    if (editingStrength?.id) {
      const { data, error } = await supabase
        .from('ipo_strengths')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', typeof editingStrength.id === 'number' ? editingStrength.id : Number(editingStrength.id))
        .select()
        .single();

      if (error) {
        console.error('update strength error:', error);
      } else if (data) {
        const updated: Strength = {
          id: data.id,
          name: data.label,
          category: asStrengthCategory(data.kind),
          level: data.score ?? 0,
          evidence: [],
          description: '',
          developmentPlan: '',
          jobRelevance: { industries: [], positions: [], keywords: [] },
          validated: false,
          selfAssessment: data.score ?? 0,
          feedbackScore: undefined,
        };
        setStrengths(prev => prev.map(s => String(s.id) === String(editingStrength.id) ? updated : s));
      }
    } else {
      const { data, error } = await supabase
        .from('ipo_strengths')
        .insert({ ...payload })
        .select()
        .single();

      if (error) {
        console.error('insert strength error:', error);
      } else if (data) {
        const created: Strength = {
          id: data.id,
          name: data.label,
          category: asStrengthCategory(data.kind),
          level: data.score ?? 0,
          evidence: [],
          description: '',
          developmentPlan: '',
          jobRelevance: { industries: [], positions: [], keywords: [] },
          validated: false,
          selfAssessment: data.score ?? 0,
          feedbackScore: undefined,
        };
        setStrengths(prev => [created, ...prev]);
      }
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

  const handleDeleteStrength = async (id: string|number) => {
    const { error } = await supabase.from('ipo_strengths').delete().eq('id', Number(id));
    if (error) {
      console.error('delete strength error:', error);
      return;
    }
    setStrengths(prev => prev.filter(s => String(s.id) !== String(id)));
  };

  const handleSaveWeakness = async () => {
    if (!newWeakness.name) return;
    const payload = {
      user_id: userId,
      name: newWeakness.name || '',
      category: (newWeakness.category as any) || 'soft',
      impact: newWeakness.impact ?? 3,
      description: newWeakness.description || '',
      improvement_plan: newWeakness.improvementPlan || [],
      progress_tracking: newWeakness.progressTracking || { milestones: [], currentProgress: 0 },
      job_impact: newWeakness.jobImpact || { affectedRoles: [], mitigationStrategies: [] },
    };

    if (editingWeakness?.id) {
      const { data, error } = await supabase
        .from('ipo_weaknesses')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', Number(editingWeakness.id))
        .select().single();
      if (error) {
        console.error('update weakness error:', error);
      } else if (data) {
        const updated: Weakness = {
          id: data.id,
          name: data.name,
          category: asWeaknessCategory(data.category),
          impact: data.impact ?? 0,
          improvementPlan: data.improvement_plan || [],
          description: data.description || '',
          progressTracking: data.progress_tracking || { milestones: [], currentProgress: 0 },
          jobImpact: data.job_impact || { affectedRoles: [], mitigationStrategies: [] },
        };
        setWeaknesses(prev => prev.map(w => String(w.id) === String(editingWeakness.id) ? updated : w));
      }
    } else {
      const { data, error } = await supabase
        .from('ipo_weaknesses')
        .insert({ ...payload })
        .select().single();
      if (error) {
        console.error('insert weakness error:', error);
      } else if (data) {
        const created: Weakness = {
          id: data.id,
          name: data.name,
          category: asWeaknessCategory(data.category),
          impact: data.impact ?? 0,
          improvementPlan: data.improvement_plan || [],
          description: data.description || '',
          progressTracking: data.progress_tracking || { milestones: [], currentProgress: 0 },
          jobImpact: data.job_impact || { affectedRoles: [], mitigationStrategies: [] },
        };
        setWeaknesses(prev => [created, ...prev]);
      }
    }
    resetWeaknessForm();
    setShowWeaknessDialog(false);
  };

  const handleDeleteWeakness = async (id: string|number) => {
    const { error } = await supabase.from('ipo_weaknesses').delete().eq('id', Number(id));
    if (error) {
      console.error('delete weakness error:', error);
      return;
    }
    setWeaknesses(prev => prev.filter(w => String(w.id) !== String(id)));
  };

  const resetWeaknessForm = () => {
    setNewWeakness({
      name: '',
      category: 'soft',
      impact: 3,
      improvementPlan: [],
      description: '',
      progressTracking: { milestones: [], currentProgress: 0 },
      jobImpact: { affectedRoles: [], mitigationStrategies: [] }
    });
    setEditingWeakness(null);
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
                  const score = strengths.length ? (relevantStrengths.length / strengths.length) * 100 : 0;
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
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteStrength(strength.id)}>
                            <Trash2 className="w-4 h-4" />
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
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">弱み・改善計画</h3>
                  <Button onClick={() => { setShowWeaknessDialog(true); setEditingWeakness(null); }}>
                    <Plus className="w-4 h-4 mr-2" /> 弱みを追加
                  </Button>
                </div>
                <div className="grid gap-6">
                  {weaknesses.map((w, idx) => {
                    const cfg = weaknessCategories[w.category];
                    return (
                      <motion.div key={w.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay: idx*0.05}}>
                        <Card className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 bg-gradient-to-r ${cfg.color} rounded-xl flex items-center justify-center`}>
                              <cfg.icon className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-lg font-bold text-gray-900">{w.name}</h4>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" onClick={() => { setEditingWeakness(w); setNewWeakness(w); setShowWeaknessDialog(true); }}>
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => handleDeleteWeakness(w.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-gray-600 mb-4">{w.description}</p>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-sm text-gray-600">影響度</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm">{w.impact}/5</span>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-600">改善進捗</Label>
                                  <div className="mt-1">
                                    <Progress value={w.progressTracking.currentProgress} className="h-2" />
                                    <div className="text-xs text-gray-500 mt-1">{w.progressTracking.currentProgress}%</div>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-600">改善計画数</Label>
                                  <div className="text-lg font-medium text-gray-900 mt-1">{w.improvementPlan.length} 件</div>
                                </div>
                              </div>

                              {w.improvementPlan.length > 0 && (
                                <div className="mt-4">
                                  <Label className="text-sm text-gray-600 mb-2 block">改善計画</Label>
                                  <ul className="space-y-2">
                                    {w.improvementPlan.map((ap, i) => (
                                      <li key={ap.id || i} className="p-3 bg-orange-50 rounded border border-orange-200">
                                        <div className="flex items-center justify-between">
                                          <div className="font-medium text-orange-900">{ap.action}</div>
                                          <Badge className="text-xs" variant="outline">{ap.priority}</Badge>
                                        </div>
                                        <div className="text-xs text-orange-700 mt-1">{ap.timeline}</div>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
          {viewMode === 'framework' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">業界別評価</h3>
                <Select value={selectedIndustry} onValueChange={(v) => setSelectedIndustry(v)}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(industryFrameworks).map(ind => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {(industryFrameworks[selectedIndustry] || []).map((fw, i) => (
                  <div key={i} className="p-4 rounded-lg border bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-900">{fw.name}</div>
                        <div className="text-sm text-gray-600">{fw.description}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {fw.skills.map((s, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <Badge className={`text-xs ${fw.priority==='high'?'bg-red-100 text-red-700':fw.priority==='medium'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>{fw.priority}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <Label className="text-sm text-gray-600">要求レベル: {fw.requiredLevel}/5</Label>
                        <Progress value={fw.requiredLevel*20} className="h-2 mt-1" />
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">あなたのレベル: {fw.yourLevel}/5</Label>
                        <Progress value={fw.yourLevel*20} className="h-2 mt-1" />
                        <div className="text-xs text-gray-500 mt-1">ギャップ: {fw.gap}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
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
            <Tabs value={strengthDialogTab} onValueChange={(v)=>setStrengthDialogTab(v as any)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="evidence">エビデンス</TabsTrigger>
                <TabsTrigger value="relevance">関連付け</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="strength-name">強み名 *</Label>
                    <Input id="strength-name" value={newStrength.name} onChange={(e)=>setNewStrength(p=>({...p, name:e.target.value}))} placeholder="例: リーダーシップ、問題解決能力" />
                  </div>
                  <div>
                    <Label htmlFor="strength-category">カテゴリー</Label>
                    <Select value={newStrength.category} onValueChange={(value)=>setNewStrength(p=>({...p, category:value as any}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(strengthCategories).map(([key, cfg])=> (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2"><cfg.icon className="w-4 h-4" /><span>{cfg.label}</span></div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="strength-description">詳細説明</Label>
                  <Textarea id="strength-description" value={newStrength.description} onChange={(e)=>setNewStrength(p=>({...p, description:e.target.value}))} placeholder="この強みについて詳しく説明してください..." rows={3} />
                </div>
                <div>
                  <Label>スキルレベル: {newStrength.level}/5</Label>
                  <Slider value={[newStrength.level || 3]} onValueChange={(v)=>setNewStrength(p=>({...p, level:v[0]}))} min={1} max={5} step={1} className="mt-2" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1"><span>初心者(1)</span><span>中級(3)</span><span>エキスパート(5)</span></div>
                </div>
              </TabsContent>

              <TabsContent value="evidence" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>タイトル</Label>
                    <Input value={evidenceDraft.title || ''} onChange={(e)=>setEvidenceDraft(p=>({...p, title:e.target.value}))} />
                  </div>
                  <div>
                    <Label>ソース</Label>
                    <Select value={evidenceDraft.source || 'self'} onValueChange={(v)=>setEvidenceDraft(p=>({...p, source: v as Evidence['source']}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['self','peer','mentor','achievement'].map(s=> <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>コンテクスト</Label>
                    <Input value={evidenceDraft.context || ''} onChange={(e)=>setEvidenceDraft(p=>({...p, context:e.target.value}))} />
                  </div>
                  <div>
                    <Label>アウトカム</Label>
                    <Input value={evidenceDraft.outcome || ''} onChange={(e)=>setEvidenceDraft(p=>({...p, outcome:e.target.value}))} />
                  </div>
                </div>
                <div>
                  <Label>詳細</Label>
                  <Textarea value={evidenceDraft.description || ''} onChange={(e)=>setEvidenceDraft(p=>({...p, description:e.target.value}))} rows={3} />
                </div>
                <div>
                  <Label>スキル（カンマ区切り）</Label>
                  <Input value={evidenceSkillInput} onChange={(e)=>setEvidenceSkillInput(e.target.value)} placeholder="例: 分析力, プレゼンテーション" />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={()=>{
                      const ev: Evidence = {
                        id: crypto.randomUUID(),
                        title: evidenceDraft.title || '無題',
                        description: evidenceDraft.description || '',
                        context: evidenceDraft.context || '',
                        outcome: evidenceDraft.outcome || '',
                        skills: parseCommaInput(evidenceSkillInput),
                        source: (evidenceDraft.source || 'self') as Evidence['source'],
                      };
                      setNewStrength(p=>({...p, evidence: [...(p.evidence||[]), ev]}));
                      setEvidenceDraft({ title:'', description:'', context:'', outcome:'', skills: [], source:'self' });
                      setEvidenceSkillInput('');
                    }}
                    variant="outline"
                  >追加</Button>
                </div>
                {(newStrength.evidence || []).length > 0 && (
                  <div className="space-y-2">
                    {(newStrength.evidence || []).map((ev, i)=> (
                      <div key={ev.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                        <div className="font-medium text-blue-900">{ev.title}</div>
                        <div className="text-sm text-blue-800">{ev.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="relevance" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>関連業界（カンマ区切り）</Label>
                    <Input value={relIndustriesInput} onChange={(e)=>setRelIndustriesInput(e.target.value)} />
                  </div>
                  <div>
                    <Label>関連職種（カンマ区切り）</Label>
                    <Input value={relPositionsInput} onChange={(e)=>setRelPositionsInput(e.target.value)} />
                  </div>
                  <div>
                    <Label>キーワード（カンマ区切り）</Label>
                    <Input value={relKeywordsInput} onChange={(e)=>setRelKeywordsInput(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={()=>{
                    setNewStrength(p=>({
                      ...p,
                      jobRelevance: {
                        industries: parseCommaInput(relIndustriesInput),
                        positions: parseCommaInput(relPositionsInput),
                        keywords: parseCommaInput(relKeywordsInput),
                      }
                    }));
                  }}>反映</Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={()=>setShowStrengthDialog(false)}>キャンセル</Button>
              <Button onClick={handleSaveStrength} disabled={!newStrength.name}>
                <Save className="w-4 h-4 mr-2" /> 保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weakness Dialog */}
      <Dialog open={showWeaknessDialog} onOpenChange={setShowWeaknessDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWeakness ? '弱みを編集' : '新しい弱みを追加'}</DialogTitle>
            <DialogDescription>影響度と改善計画を整理しましょう</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Tabs value={weaknessDialogTab} onValueChange={(v)=>setWeaknessDialogTab(v as any)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="plan">改善計画</TabsTrigger>
                <TabsTrigger value="progress">進捗</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>弱み名 *</Label>
                    <Input value={newWeakness.name} onChange={(e)=>setNewWeakness(p=>({...p, name:e.target.value}))} placeholder="例: 業界知識の不足" />
                  </div>
                  <div>
                    <Label>カテゴリー</Label>
                    <Select value={newWeakness.category} onValueChange={(v)=>setNewWeakness(p=>({...p, category: v as any}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(weaknessCategories).map(k=> (
                          <SelectItem key={k} value={k}>{weaknessCategories[k as keyof typeof weaknessCategories].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>詳細説明</Label>
                  <Textarea value={newWeakness.description} onChange={(e)=>setNewWeakness(p=>({...p, description:e.target.value}))} rows={3} />
                </div>
                <div>
                  <Label>影響度: {newWeakness.impact}/5</Label>
                  <Slider value={[newWeakness.impact || 3]} onValueChange={(v)=>setNewWeakness(p=>({...p, impact:v[0]}))} min={1} max={5} step={1} className="mt-2" />
                </div>
              </TabsContent>

              <TabsContent value="plan" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>アクション</Label>
                    <Input value={improveDraft.action || ''} onChange={(e)=>setImproveDraft(p=>({...p, action:e.target.value}))} />
                  </div>
                  <div>
                    <Label>タイムライン</Label>
                    <Input value={improveDraft.timeline || ''} onChange={(e)=>setImproveDraft(p=>({...p, timeline:e.target.value}))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>リソース（カンマ区切り）</Label>
                    <Input value={improveResInput} onChange={(e)=>setImproveResInput(e.target.value)} />
                  </div>
                  <div>
                    <Label>成功指標（カンマ区切り）</Label>
                    <Input value={improveMetricInput} onChange={(e)=>setImproveMetricInput(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>優先度</Label>
                    <Select value={improveDraft.priority || 'medium'} onValueChange={(v)=>setImproveDraft(p=>({...p, priority: v as ActionPlan['priority']}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['high','medium','low'].map(x=> <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>ステータス</Label>
                    <Select value={improveDraft.status || 'not_started'} onValueChange={(v)=>setImproveDraft(p=>({...p, status: v as ActionPlan['status']}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['not_started','in_progress','completed'].map(x=> <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={()=>{
                    const item: ActionPlan = {
                      id: crypto.randomUUID(),
                      action: improveDraft.action || '未設定',
                      timeline: improveDraft.timeline || '',
                      resources: parseCommaInput(improveResInput),
                      success_metrics: parseCommaInput(improveMetricInput),
                      priority: (improveDraft.priority || 'medium') as ActionPlan['priority'],
                      status: (improveDraft.status || 'not_started') as ActionPlan['status'],
                    };
                    setNewWeakness(p=>({ ...p, improvementPlan: [...(p.improvementPlan||[]), item] }));
                    setImproveDraft({ action:'', timeline:'', resources: [], success_metrics: [], priority:'medium', status:'not_started' });
                    setImproveResInput('');
                    setImproveMetricInput('');
                  }}>追加</Button>
                </div>
                {(newWeakness.improvementPlan || []).length > 0 && (
                  <div className="space-y-2">
                    {(newWeakness.improvementPlan || []).map((ap, i)=> (
                      <div key={ap.id || i} className="p-3 bg-orange-50 rounded border border-orange-200">
                        <div className="font-medium text-orange-900">{ap.action}</div>
                        <div className="text-xs text-orange-700">{ap.timeline}</div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="progress" className="space-y-4 pt-4">
                <div>
                  <Label>現在の進捗: {newWeakness.progressTracking?.currentProgress || 0}%</Label>
                  <Slider value={[newWeakness.progressTracking?.currentProgress || 0]} onValueChange={(v)=>setNewWeakness(p=>({...p, progressTracking: { ...(p.progressTracking||{milestones:[], currentProgress:0}), currentProgress: v[0] }}))} min={0} max={100} step={5} className="mt-2" />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={()=>setShowWeaknessDialog(false)}>キャンセル</Button>
              <Button onClick={handleSaveWeakness} disabled={!newWeakness.name}><Save className="w-4 h-4 mr-2"/>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}