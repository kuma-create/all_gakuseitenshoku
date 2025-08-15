// Minimal Json type for Supabase jsonb
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Target, Calendar, Lightbulb, Save, Eye, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { supabase } from '@/lib/supabase/client';

interface FutureVisionProps {
  onProgressUpdate: (progress: number) => void;
}

interface VisionData {
  timeframe: '5年後' | '10年後' | '20年後';
  career: string;
  lifestyle: string;
  relationships: string;
  skills: string;
  values: string;
  achievements: string;
  challenges: string;
  learnings: string;
}

type Timeframe = '5年後' | '10年後' | '20年後';

const EMPTY_VISION: Record<Timeframe, VisionData> = {
  '5年後': { timeframe: '5年後', career: '', lifestyle: '', relationships: '', skills: '', values: '', achievements: '', challenges: '', learnings: '' },
  '10年後': { timeframe: '10年後', career: '', lifestyle: '', relationships: '', skills: '', values: '', achievements: '', challenges: '', learnings: '' },
  '20年後': { timeframe: '20年後', career: '', lifestyle: '', relationships: '', skills: '', values: '', achievements: '', challenges: '', learnings: '' },
};

export function FutureVision({ onProgressUpdate }: FutureVisionProps) {
  const [visions, setVisions] = useState<Record<Timeframe, VisionData>>(EMPTY_VISION);
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('5年後');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --------- helpers ---------
  const prompts = {
    career: '理想のキャリア、職業、ポジション、働き方について詳しく書いてください',
    lifestyle: 'どんな場所でどんな生活をしていたいか、ライフスタイルを描いてください',
    relationships: '家族、友人、パートナーとの関係性はどうありたいですか',
    skills: '身につけていたいスキル、専門性、資格などを挙げてください',
    values: '大切にしたい価値観、信念、人生の軸は何ですか',
    achievements: '達成したい目標、成し遂げたいことを具体的に書いてください',
    challenges: '乗り越えたい課題、挑戦してみたいことは何ですか',
    learnings: '学び続けたいこと、成長したい分野を教えてください',
  } as const;

  const fieldLabels = {
    career: 'キャリア・仕事',
    lifestyle: 'ライフスタイル',
    relationships: '人間関係',
    skills: 'スキル・能力',
    values: '価値観',
    achievements: '目標・成果',
    challenges: '挑戦・課題',
    learnings: '学習・成長',
  } as const;

  const allFieldsCount = 3 * 8; // 3 timeframes x 8 fields

  const overallCompletion = useMemo(() => {
    const filled = Object.values(visions).reduce((sum, v) => {
      const n = Object.entries(v).filter(([k, val]) => k !== 'timeframe' && Boolean(val)).length;
      return sum + n;
    }, 0);
    return Math.round((filled / allFieldsCount) * 100);
  }, [visions]);

  // propagate completion to parent
  useEffect(() => {
    onProgressUpdate(overallCompletion);
  }, [overallCompletion, onProgressUpdate]);

  const getCompletionRate = (vision: VisionData) => {
    const n = Object.entries(vision).filter(([k, val]) => k !== 'timeframe' && Boolean(val)).length;
    return Math.round((n / 8) * 100);
  };

  // --------- load current user & data ---------
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ipo_future_vision')
        .select('action_plan')
        .eq('user_id', uid)
        .maybeSingle();

      if (!error && data) {
        // Expecting { action_plan: { visions: Record<Timeframe, VisionData> } }
        const ap = (data as any)?.action_plan ?? {};
        const stored = ap?.visions as Record<Timeframe, VisionData> | undefined;

        if (stored && typeof stored === 'object') {
          // Merge with EMPTY_VISION to ensure all keys exist
          const merged = { ...EMPTY_VISION } as Record<Timeframe, VisionData>;
          (Object.keys(merged) as Timeframe[]).forEach((tf) => {
            merged[tf] = {
              ...merged[tf],
              ...(stored[tf] ?? {}),
              timeframe: tf,
            } as VisionData;
          });
          setVisions(merged);
        }
      }
      setLoading(false);
    })();
  }, []);

  // --------- save (debounced) ---------
  const saveAllToJson = async (current: Record<Timeframe, VisionData>) => {
    if (!userId) return;
    setSaving('saving');
    const payload: { user_id: string; action_plan: Json; updated_at: string } = {
      user_id: userId,
      action_plan: ({ visions: current } as unknown) as Json,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('ipo_future_vision')
      .upsert(payload, { onConflict: 'user_id' });
    if (error) {
      console.error('save future_visions error', error);
      setSaving('error');
    } else {
      setSaving('saved');
      setTimeout(() => setSaving('idle'), 1500);
    }
  };

  const saveAll = async () => {
    await saveAllToJson(visions);
  };

  const scheduleSave = (nextState: Record<Timeframe, VisionData>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveAllToJson(nextState);
    }, 800);
  };

  const updateVision = (field: keyof Omit<VisionData, 'timeframe'>, value: string) => {
    setVisions((prev) => {
      const next = {
        ...prev,
        [activeTimeframe]: { ...prev[activeTimeframe], [field]: value },
      } as Record<Timeframe, VisionData>;
      scheduleSave(next);
      return next;
    });
  };

  // --------- UI ---------
  return (
    <div className="w-full md:max-w-4xl md:mx-auto space-y-4 sm:space-y-6 px-2 sm:px-4 pb-16 sm:pb-0">
      <Card className="p-2.5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">将来ビジョン設計</h2>
            <p className="text-sm text-muted-foreground">5年後、10年後、20年後の理想の姿を具体的に描いてみましょう</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end">
            <Badge variant="outline">
              完了率: {overallCompletion}%
            </Badge>
            <Button className="flex items-center space-x-2" onClick={saveAll} disabled={!userId || loading}>
              {saving === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving === 'saving' ? '保存中...' : saving === 'saved' ? '保存済み' : '保存'}</span>
            </Button>
          </div>
        </div>

        {!userId && (
          <div className="flex items-center gap-2 text-yellow-600 text-sm mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>ログインユーザーが確認できません。保存するにはログインしてください。</span>
          </div>
        )}

        {/* Progress Overview */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          {Object.entries(visions).map(([timeframe, vision]) => (
            <div key={timeframe} className="p-4 bg-muted rounded-lg text-center">
              <div className="text-base sm:text-lg font-bold text-foreground">{getCompletionRate(vision)}%</div>
              <div className="text-[11px] sm:text-sm text-muted-foreground">{timeframe}</div>
            </div>
          ))}
        </div>
      </Card>

      <Tabs value={activeTimeframe} onValueChange={(value) => setActiveTimeframe(value as Timeframe)}>
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex min-w-max gap-2 text-sm sm:text-base">
            <TabsTrigger value="5年後" className="flex items-center space-x-2 px-3 py-2 whitespace-nowrap">
              <Target className="w-4 h-4" />
              <span>5年後</span>
            </TabsTrigger>
            <TabsTrigger value="10年後" className="flex items-center space-x-2 px-3 py-2 whitespace-nowrap">
              <Calendar className="w-4 h-4" />
              <span>10年後</span>
            </TabsTrigger>
            <TabsTrigger value="20年後" className="flex items-center space-x-2 px-3 py-2 whitespace-nowrap">
              <Eye className="w-4 h-4" />
              <span>20年後</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {Object.entries(visions).map(([timeframe, vision]) => (
          <TabsContent key={timeframe} value={timeframe as Timeframe} className="mt-6">
            <div className="space-y-6">
              <Card className="p-2.5 sm:p-6">
                <h3 className="font-bold text-foreground mb-4">{timeframe}のビジョン</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="font-medium text-[13px] sm:text-sm text-foreground">{label}</label>
                        <span
                          className="inline-flex items-center"
                          title={prompts[field as keyof typeof prompts]}
                        >
                          <Lightbulb className="w-4 h-4 text-muted-foreground cursor-help" />
                        </span>
                      </div>
                      <textarea
                        value={vision[field as keyof Omit<VisionData, 'timeframe'>] as string}
                        onChange={(e) => updateVision(field as keyof Omit<VisionData, 'timeframe'>, e.target.value)}
                        placeholder={prompts[field as keyof typeof prompts]}
                        rows={4}
                        className="w-full px-2 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed text-sm sm:text-base min-h-[96px] md:min-h-[120px] placeholder:text-muted-foreground"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Vision Summary */}
              {getCompletionRate(vision) > 50 && (
                <Card className="p-2.5 sm:p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <h4 className="font-bold text-foreground mb-3">🎯 {timeframe}のビジョンサマリー</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {vision.career && (
                      <p><strong>キャリア：</strong>{vision.career.substring(0, 100)}...</p>
                    )}
                    {vision.lifestyle && (
                      <p><strong>ライフスタイル：</strong>{vision.lifestyle.substring(0, 100)}...</p>
                    )}
                    {vision.values && (
                      <p><strong>価値観：</strong>{vision.values.substring(0, 100)}...</p>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Inspiration Section */}
      <Card className="p-2.5 sm:p-6">
        <h3 className="font-bold text-foreground mb-4">💡 ビジョン作成のヒント</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">効果的なビジョンの特徴</h4>
            <ul className="text-[12px] sm:text-sm text-muted-foreground space-y-1">
              <li>• 具体的で詳細に描かれている</li>
              <li>• 感情に訴えかける内容になっている</li>
              <li>• 実現可能性と挑戦性のバランスが取れている</li>
              <li>• 自分の価値観と一致している</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">考える際のポイント</h4>
            <ul className="text-[12px] sm:text-sm text-muted-foreground space-y-1">
              <li>• 「なぜそうありたいのか」理由も考える</li>
              <li>• 数字や期限を入れて具体化する</li>
              <li>• 周りの人への影響も含めて考える</li>
              <li>• 定期的に見直し、更新する</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}