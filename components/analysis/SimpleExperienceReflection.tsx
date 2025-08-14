import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Edit3, Save, Download, Star, Calendar, TrendingUp, CheckCircle, X, Sparkles, ChevronRight, ChevronDown, Brain, FileText } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { motion, AnimatePresence } from 'framer-motion';

import { SimpleExperience, SimpleExperienceProps, ExperienceTemplate } from './types/simpleExperienceTypes';
import { categoryConfig, experienceTemplates, commonSkills, quickQuestions } from './constants/simpleExperienceConstants';

// 初期フォーム状態を定数として定義
const initialFormData: Partial<SimpleExperience> = {
  title: '',
  description: '',
  category: 'club',
  period: '',
  isJobHuntRelevant: true,
  details: {},
  isPrivate: false
};

export function SimpleExperienceReflection({ userId, onProgressUpdate }: SimpleExperienceProps) {
  const [experiences, setExperiences] = useState<SimpleExperience[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingExperience, setEditingExperience] = useState<SimpleExperience | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExperienceTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const [formData, setFormData] = useState<Partial<SimpleExperience>>(initialFormData);
  
  // onProgressUpdateの安定した参照を保持
  const onProgressUpdateRef = useRef(onProgressUpdate);
  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);


  // 進捗更新の最適化 - useRefで安定した参照を使用
  const updateProgress = useCallback((experiences: SimpleExperience[]) => {
    const progress = Math.min(100, experiences.length * 20 + 
      experiences.filter(e => e.completeness > 50).length * 10);
    onProgressUpdateRef.current(progress);
  }, []);

  // 進捗更新 - 配列の長さと完成度の高い経験数のみを監視
  const experiencesLength = experiences.length;
  const highCompletenessCount = useMemo(() => 
    experiences.filter(e => e.completeness > 50).length, 
    [experiences]
  );

  useEffect(() => {
    updateProgress(experiences);
  }, [experiencesLength, highCompletenessCount, updateProgress]);

  const loadExperiences = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('ipo_experiences')
        .select('*')
        .eq('user_id', userId)
        // NOTE: order by a column that actually exists in the table. Many schemas have `updated_at`, not `last_updated`.
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to load experiences:', error?.message || error, error);
        setExperiences([]);
        return;
      }

      // Ensure data conforms to SimpleExperience[]
      const rows = (data || []).map((row: any) => ({
        id: String(row.id),
        title: row.title ?? '',
        description: row.description ?? '',
        category: row.category ?? 'club',
        period: row.period ?? row.period_text ?? '',
        isJobHuntRelevant: (row.is_job_hunt_relevant ?? row.isJobHuntRelevant) ?? true,
        details: row.details ?? {},
        completeness: row.completeness ?? 0,
        lastUpdated:
          row.last_updated
          ?? (row.updated_at ? row.updated_at.split('T')[0] : '')
          ?? (row.lastUpdated ? String(row.lastUpdated) : ''),
        isPrivate: (row.is_private ?? row.isPrivate) ?? false,
      }));

      setExperiences(rows);
    } catch (e: any) {
      console.error('Failed to load experiences (exception):', e?.message || e, e);
      setExperiences([]);
      return;
    }
  }, [userId]);

  // 初回データロード
  useEffect(() => {
    loadExperiences();
  }, [loadExperiences]);

  const calculateCompleteness = useCallback((experience: Partial<SimpleExperience>): number => {
    let score = 0;
    if (experience.title) score += 20;
    if (experience.description && experience.description.length > 50) score += 20;
    if (experience.period) score += 10;
    if (experience.details?.challenge) score += 15;
    if (experience.details?.action) score += 15;
    if (experience.details?.result) score += 10;
    if (experience.details?.skills && experience.details.skills.length > 0) score += 10;
    
    return Math.min(100, score);
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setEditingExperience(null);
    setSelectedTemplate(null);
    setShowAdvanced(false);
    setShowDialog(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.title || !formData.description) return;

    // DBに存在するカラムのみに絞る
    const payloadDb: any = {
      user_id: userId,
      title: formData.title!,
      description: formData.description!,
      // テーブルの category は text。未指定時は 'general' に寄せる
      category: formData.category ?? 'general',
      // updated_at を明示更新
      updated_at: new Date().toISOString(),
    };

    // skills は text[] のみ許容。details.skills があればそれを使用
    if (Array.isArray(formData.details?.skills)) {
      payloadDb.skills = formData.details!.skills;
    }

    // months / started_on / ended_on は今回は送らない（未使用のため）
    // 送るときは整数/ISO日付(YYYY-MM-DD)に整形して payloadDb に追加する

    let error: any = null;

    if (editingExperience?.id != null) {
      // id は bigserial（数値）。string の場合は数値化
      const idNum = Number(editingExperience.id);
      const { error: e } = await supabase
        .from('ipo_experiences')
        .update(payloadDb)
        .eq('id', idNum)
        .select()
        .single();
      error = e;
    } else {
      const { error: e } = await supabase
        .from('ipo_experiences')
        .insert(payloadDb)
        .select()
        .single();
      error = e;
    }

    if (error) {
      console.error('Failed to save experience:', error);
      return;
    }

    await loadExperiences();
    resetForm();
  }, [formData, editingExperience, userId, loadExperiences, resetForm]);

  const handleTemplateSelect = useCallback((template: ExperienceTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      category: template.category,
      title: template.titleTemplate,
      description: template.descriptionTemplate
    }));
  }, []);

  const generateSTAR = useCallback(() => {
    if (!formData.description) return;
    
    // Simple AI-like generation based on description
    const description = formData.description;
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        challenge: `${description}において発生した課題`,
        action: `この課題に対して具体的な取り組みを実施`,
        result: `取り組みの結果、目標を達成することができました`
      }
    }));
  }, [formData.description]);

  const suggestSkills = useCallback(() => {
    const category = formData.category || 'club';
    const template = experienceTemplates.find(t => t.category === category);
    if (template) {
      setFormData(prev => ({
        ...prev,
        details: {
          ...prev.details,
          skills: template.suggestedSkills
        }
      }));
    }
  }, [formData.category]);

  // フォーム更新ハンドラーを最適化
  const updateFormField = useCallback(<T extends keyof SimpleExperience>(
    field: T, 
    value: SimpleExperience[T]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateDetailField = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      details: {
        ...prev.details,
        [field]: value
      }
    }));
  }, []);

  // 統計値をメモ化
  const statistics = useMemo(() => {
    const jobHuntCount = experiences.filter(e => e.isJobHuntRelevant).length;
    const completedCount = experiences.filter(e => e.completeness > 70).length;
    const averageCompleteness = experiences.length > 0 
      ? Math.round(experiences.reduce((sum, e) => sum + e.completeness, 0) / experiences.length)
      : 0;

    return { jobHuntCount, completedCount, averageCompleteness };
  }, [experiences]);

  return (
    <div className="w-full md:max-w-4xl md:mx-auto space-y-6 px-2 sm:px-4">
      {/* Header */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">経験の整理</h2>
            <p className="text-gray-600">
              学生時代の経験をシンプルに整理して、就活で活用しましょう
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'cards' ? 'list' : 'cards')}>
              {viewMode === 'cards' ? 'リスト表示' : 'カード表示'}
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              経験を追加
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
        <Card className="p-2.5 sm:p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">{experiences.length}</div>
          <div className="text-sm text-gray-600">総経験数</div>
        </Card>
        <Card className="p-2.5 sm:p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">{statistics.jobHuntCount}</div>
          <div className="text-sm text-gray-600">就活活用</div>
        </Card>
        <Card className="p-2.5 sm:p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-1">{statistics.completedCount}</div>
          <div className="text-sm text-gray-600">完成度高</div>
        </Card>
        <Card className="p-2.5 sm:p-4 text-center">
          <div className="text-2xl font-bold text-orange-600 mb-1">{statistics.averageCompleteness}%</div>
          <div className="text-sm text-gray-600">平均完成度</div>
        </Card>
      </div>

      {/* Experiences */}
      {experiences.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">最初の経験を追加しましょう</h3>
          <p className="text-gray-600 mb-6">学生時代に力を入れたことから始めてみてください</p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            経験を追加
          </Button>
        </Card>
      ) : (
        <div className={`grid gap-4 sm:gap-6 ${viewMode === 'cards' ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          {experiences.map((experience, index) => {
            const config = categoryConfig[experience.category];
            const IconComponent = config.icon;
            
            return (
              <motion.div
                key={experience.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-3 xs:p-4 sm:p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                  <div className="flex items-start justify-between mb-3 sm:mb-4 flex-wrap gap-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <Badge className={`text-xs mb-1 ${config.color}`}>
                          {config.label}
                        </Badge>
                        {experience.isJobHuntRelevant && (
                          <Badge className="text-xs bg-green-100 text-green-700 ml-2">
                            就活活用
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setFormData(experience);
                        setEditingExperience(experience);
                        setShowDialog(true);
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{experience.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{experience.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      {experience.period}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {experience.completeness}%
                    </div>
                  </div>
                  
                  {experience.details?.skills && experience.details.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {experience.details.skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {experience.details.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{experience.details.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) {
          resetForm();
        }
        setShowDialog(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExperience ? '経験を編集' : '新しい経験を追加'}
            </DialogTitle>
            <DialogDescription>
              まずは基本情報から入力してください。詳細は後から追加できます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-2 sm:px-0">
            {/* Template Selection */}
            {!editingExperience && (
              <div>
                <Label className="text-sm sm:text-base mb-3 block">テンプレートを選ぶ（任意）</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {experienceTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`p-3 sm:p-4 rounded-lg border-2 text-left transition-all ${
                        selectedTemplate?.id === template.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900 mb-1">{template.name}</div>
                      <div className="text-sm text-gray-500">
                        {categoryConfig[template.category].description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm sm:text-base">タイトル *</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => updateFormField('title', e.target.value)}
                  placeholder="例：テニスサークル代表"
                  className="h-10 text-sm md:h-9 md:text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm sm:text-base">カテゴリー</Label>
                  <Select value={formData.category || 'club'} onValueChange={(value) => updateFormField('category', value as any)}>
                    <SelectTrigger className="h-10 text-sm md:h-9 md:text-base">
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

                <div>
                  <Label htmlFor="period" className="text-sm sm:text-base">期間</Label>
                  <Input
                    id="period"
                    value={formData.period || ''}
                    onChange={(e) => updateFormField('period', e.target.value)}
                    placeholder="例：2022年4月〜2023年3月"
                    className="h-10 text-sm md:h-9 md:text-base"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm sm:text-base">説明 *</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  placeholder="この経験について説明してください..."
                  rows={4}
                  className="h-10 text-sm md:h-9 md:text-base"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {(formData.description?.length || 0)}/500文字
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="jobHuntRelevant"
                  checked={formData.isJobHuntRelevant ?? true}
                  onCheckedChange={(checked) => updateFormField('isJobHuntRelevant', checked)}
                />
                <Label htmlFor="jobHuntRelevant" className="text-sm sm:text-base">就活で活用する</Label>
              </div>
            </div>

            {/* Advanced Details */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span>詳細情報を追加</span>
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="role" className="text-sm sm:text-base">役割</Label>
                        <Input
                          id="role"
                          value={formData.details?.role || ''}
                          onChange={(e) => updateDetailField('role', e.target.value)}
                          placeholder="例：代表"
                          className="h-10 text-sm md:h-9 md:text-base"
                        />
                      </div>
                      <div>
                        <Label htmlFor="organization" className="text-sm sm:text-base">組織・団体</Label>
                        <Input
                          id="organization"
                          value={formData.details?.organization || ''}
                          onChange={(e) => updateDetailField('organization', e.target.value)}
                          placeholder="例：東京大学テニスサークル"
                          className="h-10 text-sm md:h-9 md:text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="challenge" className="text-sm sm:text-base">困難・課題</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={generateSTAR}
                          className="text-xs"
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          AI生成
                        </Button>
                      </div>
                      <Textarea
                        id="challenge"
                        value={formData.details?.challenge || ''}
                        onChange={(e) => updateDetailField('challenge', e.target.value)}
                        placeholder="どのような困難や課題がありましたか？"
                        rows={2}
                        className="h-10 text-sm md:h-9 md:text-base"
                      />
                    </div>

                    <div>
                      <Label htmlFor="action" className="text-sm sm:text-base">取り組み・行動</Label>
                      <Textarea
                        id="action"
                        value={formData.details?.action || ''}
                        onChange={(e) => updateDetailField('action', e.target.value)}
                        placeholder="どのような行動や取り組みを行いましたか？"
                        rows={2}
                        className="h-10 text-sm md:h-9 md:text-base"
                      />
                    </div>

                    <div>
                      <Label htmlFor="result" className="text-sm sm:text-base">結果・成果</Label>
                      <Textarea
                        id="result"
                        value={formData.details?.result || ''}
                        onChange={(e) => updateDetailField('result', e.target.value)}
                        placeholder="どのような結果や成果が得られましたか？"
                        rows={2}
                        className="h-10 text-sm md:h-9 md:text-base"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm sm:text-base">身についたスキル</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={suggestSkills}
                          className="text-xs"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          候補表示
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(formData.details?.skills || []).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center space-x-1 text-[11px] sm:text-sm">
                            <span>{skill}</span>
                            <button
                              onClick={() => {
                                const newSkills = formData.details?.skills?.filter((_, i) => i !== index) || [];
                                updateDetailField('skills', newSkills);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {commonSkills.filter(skill => !(formData.details?.skills || []).includes(skill)).map(skill => (
                          <button
                            key={skill}
                            onClick={() => {
                              const newSkills = [...(formData.details?.skills || []), skill];
                              updateDetailField('skills', newSkills);
                            }}
                            className="text-[11px] sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button variant="outline" onClick={resetForm} className="h-10 px-4 sm:h-9">
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={!formData.title || !formData.description} className="h-10 px-4 sm:h-9">
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