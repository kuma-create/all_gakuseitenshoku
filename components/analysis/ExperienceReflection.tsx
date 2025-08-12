import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Save, Download, Star, Calendar, TrendingUp, CheckCircle, X, Eye, EyeOff, Filter } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';

import { ExperienceReflectionProps, Experience } from './types/experienceTypes';
import { categoryConfig, skillSuggestions, commonESQuestions, industryOptions, positionOptions } from './constants/experienceConstants';
import { calculateCompleteness, generateESAnswer } from './utils/experienceUtils';

import { supabase } from '@/lib/supabase/client';

// --- DB <-> UI mappers ---
const fromRow = (row: any): Experience => ({
  id: row.id,
  title: row.title ?? '',
  category: row.category ?? 'extracurricular',
  period: row.period ?? { start: '', end: '', duration: '' },
  organization: row.organization ?? '',
  role: row.role ?? '',
  teamSize: row.team_size ?? undefined,
  description: row.description ?? '',
  challenges: row.challenges ?? [],
  achievements: row.achievements ?? [],
  skills: row.skills ?? [],
  learnings: row.learnings ?? [],
  starFramework: row.star_framework ?? { situation: '', task: '', action: '', result: '' },
  quantifiedResults: row.quantified_results ?? [],
  jobHuntRelevance: row.job_hunt_relevance ?? {
    priority: 'medium',
    targetIndustries: [],
    targetPositions: [],
    keywords: [],
    esUsage: false,
    interviewUsage: false,
  },
  reflectionDepth: row.reflection_depth ?? 3,
  completeness: row.completeness ?? 0,
  isPrivate: row.is_private ?? false,
});

const toRow = (exp: Partial<Experience>, userId: string) => ({
  id: exp.id,
  user_id: userId,
  title: exp.title,
  category: exp.category,
  period: exp.period,                 // JSONB
  organization: exp.organization,
  role: exp.role,
  team_size: exp.teamSize,
  description: exp.description,
  challenges: exp.challenges,         // JSONB
  achievements: exp.achievements,     // JSONB
  skills: exp.skills,                 // JSONB
  learnings: exp.learnings,           // JSONB
  star_framework: exp.starFramework,  // JSONB
  quantified_results: exp.quantifiedResults, // JSONB
  job_hunt_relevance: exp.jobHuntRelevance,  // JSONB
  reflection_depth: exp.reflectionDepth,
  completeness: exp.completeness,
  is_private: exp.isPrivate,
});

export function ExperienceReflection({ userId, onProgressUpdate }: ExperienceReflectionProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'experiences' | 'gakuchika' | 'templates'>('overview');
  const [showExperienceDialog, setShowExperienceDialog] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPrivate, setShowPrivate] = useState(true);

  const [newExperience, setNewExperience] = useState<Partial<Experience>>({
    title: '',
    category: 'extracurricular',
    period: { start: '', end: '', duration: '' },
    organization: '',
    role: '',
    teamSize: undefined,
    description: '',
    challenges: [],
    achievements: [],
    skills: [],
    learnings: [],
    starFramework: { situation: '', task: '', action: '', result: '' },
    quantifiedResults: [],
    jobHuntRelevance: {
      priority: 'medium',
      targetIndustries: [],
      targetPositions: [],
      keywords: [],
      esUsage: false,
      interviewUsage: false
    },
    reflectionDepth: 3,
    completeness: 0,
    isPrivate: false
  });

  useEffect(() => {
    if (!userId) return;
    loadExperiences();
  }, [userId]);

  useEffect(() => {
    const progress = Math.min(100, 
      experiences.length * 15 + 
      experiences.filter(e => e.completeness > 80).length * 10 +
      experiences.filter(e => e.jobHuntRelevance.priority === 'high').length * 5
    );
    onProgressUpdate(progress);
  }, [experiences]);

  const loadExperiences = async () => {
    const { data, error } = await supabase
      .from('ipo_experiences')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('loadExperiences error', error);
      setExperiences([]);
      return;
    }
    setExperiences((data ?? []).map(fromRow));
  };

  const handleSaveExperience = async () => {
    if (!newExperience.title) return;

    const completeness = calculateCompleteness(newExperience);

    const experience: Partial<Experience> = {
      title: newExperience.title!,
      category: (newExperience.category as any) || 'extracurricular',
      period: newExperience.period || { start: '', end: '', duration: '' },
      organization: newExperience.organization || '',
      role: newExperience.role || '',
      teamSize: newExperience.teamSize,
      description: newExperience.description || '',
      challenges: newExperience.challenges || [],
      achievements: newExperience.achievements || [],
      skills: newExperience.skills || [],
      learnings: newExperience.learnings || [],
      starFramework: newExperience.starFramework || { situation: '', task: '', action: '', result: '' },
      quantifiedResults: newExperience.quantifiedResults || [],
      jobHuntRelevance: newExperience.jobHuntRelevance || {
        priority: 'medium',
        targetIndustries: [],
        targetPositions: [],
        keywords: [],
        esUsage: false,
        interviewUsage: false,
      },
      reflectionDepth: newExperience.reflectionDepth || 3,
      completeness,
      isPrivate: newExperience.isPrivate || false,
    };
    if (editingExperience?.id) {
      experience.id = editingExperience.id;
    }

    // Persist to Supabase
    const payload = toRow(experience, userId) as any;

    try {
      if (editingExperience && editingExperience.id) {
        // update/upsert existing row by id
        const { error } = await supabase
          .from('ipo_experiences')
          .upsert(payload, { onConflict: 'id' })
          .select();
        if (error) throw error;
      } else {
        // new insert: let DB generate id
        delete payload.id;
        const { error } = await supabase
          .from('ipo_experiences')
          .insert(payload)
          .select();
        if (error) throw error;
      }

      await loadExperiences();
    } catch (e) {
      console.error('save experience error', e);
    }

    resetForm();
    setShowExperienceDialog(false);
  };

  const resetForm = () => {
    setNewExperience({
      title: '',
      category: 'extracurricular',
      period: { start: '', end: '', duration: '' },
      organization: '',
      role: '',
      teamSize: undefined,
      description: '',
      challenges: [],
      achievements: [],
      skills: [],
      learnings: [],
      starFramework: { situation: '', task: '', action: '', result: '' },
      quantifiedResults: [],
      jobHuntRelevance: {
        priority: 'medium',
        targetIndustries: [],
        targetPositions: [],
        keywords: [],
        esUsage: false,
        interviewUsage: false
      },
      reflectionDepth: 3,
      completeness: 0,
      isPrivate: false
    });
    setEditingExperience(null);
  };

  const getFilteredExperiences = () => {
    return experiences
      .filter(exp => selectedCategory === 'all' || exp.category === selectedCategory)
      .filter(exp => showPrivate || !exp.isPrivate)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (a.jobHuntRelevance.priority !== b.jobHuntRelevance.priority) {
          return priorityOrder[b.jobHuntRelevance.priority] - priorityOrder[a.jobHuntRelevance.priority];
        }
        return b.completeness - a.completeness;
      });
  };

  const renderOverview = () => {
    const highPriorityExperiences = experiences.filter(e => e.jobHuntRelevance.priority === 'high');
    const completedExperiences = experiences.filter(e => e.completeness > 80);
    const avgCompleteness = experiences.length > 0 ? 
      experiences.reduce((sum, e) => sum + e.completeness, 0) / experiences.length : 0;

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{experiences.length}</div>
            <div className="text-sm text-gray-600">総経験数</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{highPriorityExperiences.length}</div>
            <div className="text-sm text-gray-600">就活重要度高</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{completedExperiences.length}</div>
            <div className="text-sm text-gray-600">完成度80%以上</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">{Math.round(avgCompleteness)}%</div>
            <div className="text-sm text-gray-600">平均完成度</div>
          </Card>
        </div>

        {/* Top Experiences */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-6">就活で活用予定の主要経験</h3>
          <div className="space-y-4">
            {highPriorityExperiences.slice(0, 3).map((experience, index) => {
              const config = categoryConfig[experience.category];
              return (
                <motion.div
                  key={experience.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-r ${config.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <config.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-blue-900">{experience.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-green-100 text-green-700">優先度高</Badge>
                          <Badge className={`${config.bgColor} ${config.textColor}`}>
                            {config.label}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-blue-700 text-sm mb-3">{experience.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-blue-800">期間:</span>
                          <div className="text-blue-600">{experience.period.duration}</div>
                        </div>
                        <div>
                          <span className="font-medium text-blue-800">完成度:</span>
                          <div className="text-blue-600">{experience.completeness}%</div>
                        </div>
                        <div>
                          <span className="font-medium text-blue-800">スキル数:</span>
                          <div className="text-blue-600">{experience.skills.length}個</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* Category Distribution */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-6">経験の分野別分布</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(categoryConfig).map(([key, config]) => {
              const count = experiences.filter(e => e.category === key).length;
              const IconComponent = config.icon;
              
              return (
                <motion.div
                  key={key}
                  className="p-4 bg-gray-50 rounded-lg text-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className={`w-12 h-12 bg-gradient-to-r ${config.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{config.label}</h4>
                  <div className="text-2xl font-bold text-gray-700">{count}</div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  const renderExperiencesView = () => {
    const filteredExperiences = getFilteredExperiences();

    return (
      <div className="space-y-6">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="カテゴリーを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => setShowPrivate(!showPrivate)}>
              {showPrivate ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              {showPrivate ? 'プライベート表示' : 'プライベート非表示'}
            </Button>
            
            <Button onClick={() => setShowExperienceDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              経験を追加
            </Button>
          </div>
        </Card>

        {/* Experience List */}
        <div className="space-y-6">
          {filteredExperiences.map((experience, index) => {
            const config = categoryConfig[experience.category];
            return (
              <motion.div
                key={experience.id}
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
                        <h4 className="text-xl font-bold text-gray-900">{experience.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${config.bgColor} ${config.textColor}`}>
                            {config.label}
                          </Badge>
                          {experience.jobHuntRelevance.priority === 'high' && (
                            <Badge className="bg-green-100 text-green-700">優先度高</Badge>
                          )}
                          {experience.isPrivate && (
                            <Badge variant="outline">プライベート</Badge>
                          )}
                          <Button variant="outline" size="sm" onClick={() => {
                            setNewExperience(experience);
                            setEditingExperience(experience);
                            setShowExperienceDialog(true);
                          }}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">組織:</span>
                          <div className="text-gray-900">{experience.organization}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">役割:</span>
                          <div className="text-gray-900">{experience.role}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">期間:</span>
                          <div className="text-gray-900">{experience.period.duration}</div>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-4">{experience.description}</p>

                      {/* STAR Framework Preview */}
                      {experience.starFramework.situation && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                          <h5 className="font-medium text-blue-900 mb-2">STAR法での整理</h5>
                          <p className="text-sm text-blue-700">{experience.starFramework.situation}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm mb-4">
                        <div>
                          <span className="font-medium text-gray-600">スキル:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {experience.skills.slice(0, 3).map((skill, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                            {experience.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{experience.skills.length - 3}</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>完成度 {experience.completeness}%</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4" />
                            <span>反省深度 {experience.reflectionDepth}/5</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          最終更新: {(() => {
                            const anyExp: any = experience as any;
                            return anyExp.updated_at ? new Date(anyExp.updated_at).toLocaleDateString() : new Date().toLocaleDateString();
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ガクチカ・経験整理</h2>
            <p className="text-gray-600">
              学生時代の経験を就活で効果的に活用できる形で整理しましょう
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              ESテンプレート出力
            </Button>
          </div>
        </div>
      </Card>

      {/* View Toggle */}
      <Card className="p-4">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="experiences">経験詳細</TabsTrigger>
            <TabsTrigger value="gakuchika">ガクチカ生成</TabsTrigger>
            <TabsTrigger value="templates">ESテンプレート</TabsTrigger>
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
          {viewMode === 'experiences' && renderExperiencesView()}
          {viewMode === 'gakuchika' && (
            <div className="text-center py-12">
              <p className="text-gray-600">ガクチカ生成機能を実装中...</p>
            </div>
          )}
          {viewMode === 'templates' && (
            <div className="text-center py-12">
              <p className="text-gray-600">ESテンプレート機能を実装中...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Experience Dialog */}
      <Dialog open={showExperienceDialog} onOpenChange={setShowExperienceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExperience ? '経験を編集' : '新しい経験を追加'}
            </DialogTitle>
            <DialogDescription>
              STAR法を活用して就活で使える経験を整理しましょう
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  value={newExperience.title}
                  onChange={(e) => setNewExperience(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="例: サークル代表として組織改革"
                />
              </div>
              <div>
                <Label htmlFor="category">カテゴリー</Label>
                <Select value={newExperience.category} onValueChange={(value) => setNewExperience(prev => ({ ...prev, category: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
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
              <Label htmlFor="description">概要説明</Label>
              <Textarea
                id="description"
                value={newExperience.description}
                onChange={(e) => setNewExperience(prev => ({ ...prev, description: e.target.value }))}
                placeholder="この経験について簡潔に説明してください..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setShowExperienceDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveExperience} disabled={!newExperience.title}>
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