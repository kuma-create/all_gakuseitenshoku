import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit3, Trash2, TrendingUp, TrendingDown, Calendar, Star, Award, Users, BookOpen, Heart, Target, Save, Download, Eye, EyeOff, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';

interface LifeChartProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
}

interface LifeEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  age: number;
  category: 'academic' | 'personal' | 'work' | 'challenge' | 'achievement' | 'relationship' | 'discovery';
  emotionalLevel: number; // -5 to 5 scale
  impactLevel: number; // 1 to 5 scale
  skills: string[];
  learnings: string[];
  values: string[];
  isPrivate: boolean;
  starFramework?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  jobHuntRelevance: {
    relevant: boolean;
    industries: string[];
    jobTypes: string[];
    keywords: string[];
  };
}

interface Insight {
  type: 'pattern' | 'strength' | 'value' | 'growth';
  title: string;
  description: string;
  evidence: string[];
  jobHuntApplication: string;
}

const categoryConfig = {
  academic: { label: '学業・勉強', icon: BookOpen, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  personal: { label: '個人的成長', icon: Heart, color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50', textColor: 'text-pink-700' },
  work: { label: '仕事・インターン', icon: Target, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  challenge: { label: '困難・挑戦', icon: TrendingUp, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  achievement: { label: '成果・達成', icon: Award, color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  relationship: { label: '人間関係', icon: Users, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
  discovery: { label: '発見・気づき', icon: Star, color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700' }
};

const skillSuggestions = [
  'リーダーシップ', 'チームワーク', 'コミュニケーション', '問題解決', '論理的思考', '創造性',
  'プレゼンテーション', '計画立案', '実行力', '継続力', '協調性', '主体性', '責任感',
  'ストレス耐性', '柔軟性', '向上心', '分析力', '企画力', '営業力', '語学力'
];

const valueSuggestions = [
  '成長', '挑戦', '誠実さ', '協調', '革新', '安定', '自由', '貢献', '品質', '効率',
  '多様性', '公平性', '持続可能性', '専門性', '創造性', '信頼', '尊重', '情熱'
];

const industryOptions = [
  'IT・ソフトウェア', 'コンサルティング', '金融・銀行', '商社', 'メーカー', '小売・流通',
  '広告・マーケティング', 'メディア', '教育', '医療・ヘルスケア', '不動産', '物流',
  '公務員', 'NPO・NGO', 'スタートアップ', '研究・開発'
];

// 初期フォーム状態を定数として定義
const initialFormState = {
  title: '',
  description: '',
  date: '',
  age: 18,
  category: 'personal' as const,
  emotionalLevel: 0,
  impactLevel: 3,
  skills: [] as string[],
  learnings: [] as string[],
  values: [] as string[],
  isPrivate: false,
  starFramework: {
    situation: '',
    task: '',
    action: '',
    result: ''
  },
  jobHuntRelevance: {
    relevant: false,
    industries: [] as string[],
    jobTypes: [] as string[],
    keywords: [] as string[]
  }
};

export function LifeChart({ userId, onProgressUpdate }: LifeChartProps) {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LifeEvent | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'timeline' | 'analysis'>('chart');
  const [showPrivateEvents, setShowPrivateEvents] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Object.keys(categoryConfig));
  const [currentAge, setCurrentAge] = useState(22);
  const [isMobile, setIsMobile] = useState(false);

  const [newEvent, setNewEvent] = useState<Partial<LifeEvent>>(initialFormState);

  // モバイル検出を最初に1回だけ実行
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // データロードは初回のみ実行
  useEffect(() => {
    loadLifeEvents();
  }, []); // userIdを依存配列から削除

  // 進捗更新は events と insights が変更された時のみ
  const updateProgress = useCallback((events: LifeEvent[], insights: Insight[]) => {
    const progress = Math.min(100, events.length * 10 + insights.length * 5);
    onProgressUpdate(progress);
  }, [onProgressUpdate]);

  useEffect(() => {
    if (events.length > 0) {
      updateProgress(events, insights);
    }
  }, [events.length, insights.length, updateProgress]); // events.length のみに変更

  const loadLifeEvents = useCallback(() => {
    // Mock data for demonstration
    const mockEvents: LifeEvent[] = [
      {
        id: '1',
        title: '大学受験',
        description: '第一志望の大学に合格。受験勉強を通じて計画性と継続力を身につけた。',
        date: '2021-03-15',
        age: 18,
        category: 'academic',
        emotionalLevel: 4,
        impactLevel: 5,
        skills: ['計画立案', '継続力', 'ストレス耐性'],
        learnings: ['目標に向かって努力する大切さ', '計画的に取り組むことの重要性'],
        values: ['成長', '挑戦'],
        isPrivate: false,
        starFramework: {
          situation: '高校3年時、第一志望の難関大学合格を目指していた',
          task: '限られた時間で効率的に学力を向上させる必要があった',
          action: '年間学習計画を立て、毎日12時間の勉強を継続。苦手科目は個別指導も活用',
          result: '模試での偏差値が15ポイント向上し、第一志望に合格'
        },
        jobHuntRelevance: {
          relevant: true,
          industries: ['コンサルティング', '金融・銀行'],
          jobTypes: ['企画職', '営業職'],
          keywords: ['計画性', '継続力', '目標達成']
        }
      },
      {
        id: '2',
        title: 'サークル代表就任',
        description: '100名規模のサークルで代表に就任。メンバーのモチベーション向上と活動の活性化を実現。',
        date: '2022-04-01',
        age: 19,
        category: 'achievement',
        emotionalLevel: 3,
        impactLevel: 4,
        skills: ['リーダーシップ', 'チームワーク', 'コミュニケーション'],
        learnings: ['多様な価値観を持つ人々をまとめる難しさ', 'リーダーとしての責任の重さ'],
        values: ['協調', '責任感', 'チームワーク'],
        isPrivate: false,
        starFramework: {
          situation: '100名規模のテニスサークルでメンバーの参加率が低下していた',
          task: '代表として組織の活性化とメンバーのモチベーション向上を図る',
          action: 'アンケート調査を実施し、新入生歓迎イベントや技術向上プログラムを企画・実行',
          result: '参加率が30%から80%に向上し、新入生の定着率も大幅に改善'
        },
        jobHuntRelevance: {
          relevant: true,
          industries: ['全業界'],
          jobTypes: ['営業職', '企画職', 'マネジメント職'],
          keywords: ['リーダーシップ', '組織運営', 'チームビルディング']
        }
      }
    ];

    setEvents(mockEvents);
    
    // インサイトも同時に生成
    const mockInsights: Insight[] = [
      {
        type: 'pattern',
        title: '継続的な挑戦志向',
        description: 'ライフチャートを通じて、常に新しいことに挑戦し続けるパターンが見えます。',
        evidence: ['大学受験での高い目標設定', 'サークル代表への立候補'],
        jobHuntApplication: '新規事業や成長企業で力を発揮できる可能性が高い'
      }
    ];
    
    setInsights(mockInsights);
  }, []);

  const handleSaveEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.date) return;

    const event: LifeEvent = {
      id: editingEvent?.id || Date.now().toString(),
      title: newEvent.title!,
      description: newEvent.description || '',
      date: newEvent.date!,
      age: newEvent.age || 18,
      category: newEvent.category as any || 'personal',
      emotionalLevel: newEvent.emotionalLevel || 0,
      impactLevel: newEvent.impactLevel || 3,
      skills: newEvent.skills || [],
      learnings: newEvent.learnings || [],
      values: newEvent.values || [],
      isPrivate: newEvent.isPrivate || false,
      starFramework: newEvent.starFramework || {
        situation: '',
        task: '',
        action: '',
        result: ''
      },
      jobHuntRelevance: newEvent.jobHuntRelevance || {
        relevant: false,
        industries: [],
        jobTypes: [],
        keywords: []
      }
    };

    setEvents(prev => {
      if (editingEvent) {
        return prev.map(e => e.id === editingEvent.id ? event : e);
      } else {
        return [...prev, event];
      }
    });

    resetForm();
  }, [newEvent, editingEvent]);

  const resetForm = useCallback(() => {
    setNewEvent(initialFormState);
    setEditingEvent(null);
    setShowEventDialog(false);
  }, []);

  const handleEditEvent = useCallback((event: LifeEvent) => {
    setNewEvent(event);
    setEditingEvent(event);
    setShowEventDialog(true);
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    if (confirm('このライフイベントを削除しますか？')) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }
  }, []);

  // 表示用のイベントをメモ化
  const displayEvents = useMemo(() => {
    return events
      .filter(event => showPrivateEvents || !event.isPrivate)
      .filter(event => selectedCategories.includes(event.category))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, showPrivateEvents, selectedCategories]);

  const exportForJobHunt = useCallback(() => {
    const relevantEvents = events.filter(e => e.jobHuntRelevance.relevant);
    const exportData = {
      summary: `${relevantEvents.length}つの主要経験を通じた成長ストーリー`,
      events: relevantEvents.map(event => ({
        title: event.title,
        period: event.date,
        category: categoryConfig[event.category].label,
        starFramework: event.starFramework,
        skills: event.skills,
        values: event.values,
        industries: event.jobHuntRelevance.industries,
        keywords: event.jobHuntRelevance.keywords
      })),
      insights: insights,
      strengthKeywords: [...new Set(relevantEvents.flatMap(e => e.skills))],
      valueKeywords: [...new Set(relevantEvents.flatMap(e => e.values))]
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-chart-job-hunt-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [events, insights]);

  // フォーム更新ハンドラーを最適化
  const updateFormField = useCallback(<T extends keyof typeof newEvent>(
    field: T, 
    value: typeof newEvent[T]
  ) => {
    setNewEvent(prev => ({ ...prev, [field]: value }));
  }, []);

  const renderChartView = () => {
    const maxAge = Math.max(...displayEvents.map(e => e.age), currentAge);
    const minAge = Math.min(...displayEvents.map(e => e.age), 15);

    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">人生グラフ</h3>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={() => setShowPrivateEvents(!showPrivateEvents)}>
                {showPrivateEvents ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="ml-2">{showPrivateEvents ? 'プライベート表示' : 'プライベート非表示'}</span>
              </Button>
            </div>
          </div>

          <div className="relative">
            {/* Chart Container */}
            <div className="h-80 relative border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white">
              {/* Y-axis (Emotional Level) */}
              <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
                <span>+5</span>
                <span>+3</span>
                <span>0</span>
                <span>-3</span>
                <span>-5</span>
              </div>

              {/* X-axis (Age) */}
              <div className="absolute bottom-0 left-12 right-0 h-8 flex justify-between items-end text-xs text-gray-500">
                {Array.from({ length: maxAge - minAge + 1 }, (_, i) => minAge + i).map(age => (
                  <span key={age} className="relative">
                    {age}歳
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-px h-72 bg-gray-200"></div>
                  </span>
                ))}
              </div>

              {/* Grid lines */}
              <div className="absolute left-12 right-0 top-4 bottom-8">
                {[-5, -3, 0, 3, 5].map(level => (
                  <div
                    key={level}
                    className="absolute w-full h-px bg-gray-200"
                    style={{ top: `${((5 - level) / 10) * 100}%` }}
                  />
                ))}
              </div>

              {/* Events */}
              <div className="absolute left-12 right-0 top-4 bottom-8">
                {displayEvents.map((event, index) => {
                  const x = ((event.age - minAge) / (maxAge - minAge)) * 100;
                  const y = ((5 - event.emotionalLevel) / 10) * 100;
                  const config = categoryConfig[event.category];

                  return (
                    <motion.div
                      key={event.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                      style={{ left: `${x}%`, top: `${y}%` }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleEditEvent(event)}
                    >
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${config.color} border-2 border-white shadow-lg`}></div>
                      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-white p-2 rounded-lg shadow-lg border border-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="font-medium text-sm">{event.title}</div>
                        <div className="text-xs text-gray-500">{event.age}歳 • {config.label}</div>
                        <div className="text-xs text-gray-700 mt-1 max-w-40 truncate">{event.description}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Category Filters */}
        <Card className="p-4">
          <h4 className="font-medium mb-3">カテゴリーフィルター</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryConfig).map(([key, config]) => {
              const isSelected = selectedCategories.includes(key);
              const IconComponent = config.icon;
              
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedCategories(prev => prev.filter(cat => cat !== key));
                    } else {
                      setSelectedCategories(prev => [...prev, key]);
                    }
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all ${
                    isSelected 
                      ? `${config.bgColor} border-current ${config.textColor}` 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm">{config.label}</span>
                  <Badge variant="outline" className="ml-1 text-xs">
                    {events.filter(e => e.category === key).length}
                  </Badge>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  const renderTimelineView = () => {
    return (
      <div className="space-y-4">
        {displayEvents.map((event, index) => {
          const config = categoryConfig[event.category];
          const IconComponent = config.icon;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${config.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={config.bgColor + ' ' + config.textColor}>
                          {config.label}
                        </Badge>
                        {event.jobHuntRelevance.relevant && (
                          <Badge className="bg-green-100 text-green-700">就活関連</Badge>
                        )}
                        {event.isPrivate && (
                          <Badge variant="outline">プライベート</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{event.date} ({event.age}歳)</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {event.emotionalLevel > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : event.emotionalLevel < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : (
                          <Minus className="w-4 h-4 text-gray-400" />
                        )}
                        <span>感情レベル: {event.emotionalLevel > 0 ? '+' : ''}{event.emotionalLevel}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>影響度: {event.impactLevel}/5</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-4 leading-relaxed">{event.description}</p>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditEvent(event)}>
                          <Edit3 className="w-4 h-4 mr-1" />
                          編集
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          削除
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Event Dialog Component
  const EventDialog = () => (
    <Dialog open={showEventDialog} onOpenChange={(open) => {
      if (!open) {
        resetForm();
      }
      setShowEventDialog(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEvent ? 'ライフイベントを編集' : '新しいライフイベントを追加'}
          </DialogTitle>
          <DialogDescription>
            人生の重要な出来事を記録し、就活で活用できる形で整理しましょう
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="title">タイトル *</Label>
              <Input
                id="title"
                value={newEvent.title || ''}
                onChange={(e) => updateFormField('title', e.target.value)}
                placeholder="例: 大学受験、サークル代表就任"
              />
            </div>
            <div>
              <Label htmlFor="date">日付 *</Label>
              <Input
                id="date"
                type="date"
                value={newEvent.date || ''}
                onChange={(e) => updateFormField('date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="age">年齢</Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="100"
                value={newEvent.age || 18}
                onChange={(e) => updateFormField('age', parseInt(e.target.value) || 18)}
              />
            </div>
            <div>
              <Label htmlFor="category">カテゴリー</Label>
              <Select 
                value={newEvent.category || 'personal'} 
                onValueChange={(value) => updateFormField('category', value as any)}
              >
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
            <Label htmlFor="description">詳細説明</Label>
            <Textarea
              id="description"
              value={newEvent.description || ''}
              onChange={(e) => updateFormField('description', e.target.value)}
              placeholder="この出来事について詳しく説明してください..."
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={newEvent.isPrivate || false}
              onChange={(e) => updateFormField('isPrivate', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isPrivate">プライベート（他人に公開しない）</Label>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button variant="outline" onClick={resetForm}>
              キャンセル
            </Button>
            <Button onClick={handleSaveEvent} disabled={!newEvent.title || !newEvent.date}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">ライフチャート</h2>
            <p className="text-gray-600">
              人生の重要な出来事を整理し、就活で活用できるエピソードを発見しましょう
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={exportForJobHunt}>
              <Download className="w-4 h-4 mr-2" />
              就活用エクスポート
            </Button>
            <Button onClick={() => setShowEventDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              イベント追加
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">{events.length}</div>
          <div className="text-sm text-gray-600">総イベント数</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {events.filter(e => e.jobHuntRelevance.relevant).length}
          </div>
          <div className="text-sm text-gray-600">就活関連</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-1">
            {[...new Set(events.flatMap(e => e.skills))].length}
          </div>
          <div className="text-sm text-gray-600">スキル種類</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600 mb-1">{insights.length}</div>
          <div className="text-sm text-gray-600">インサイト</div>
        </Card>
      </div>

      {/* View Toggle */}
      <Card className="p-4">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chart">グラフ表示</TabsTrigger>
            <TabsTrigger value="timeline">タイムライン</TabsTrigger>
            <TabsTrigger value="analysis">分析・インサイト</TabsTrigger>
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
          {viewMode === 'chart' && renderChartView()}
          {viewMode === 'timeline' && renderTimelineView()}
          {viewMode === 'analysis' && (
            <div className="text-center py-12">
              <p className="text-gray-600">分析・インサイト機能を実装中...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Event Dialog */}
      <EventDialog />
    </div>
  );
}