import React, { useState } from 'react';
import { Target, Calendar, Lightbulb, Save, Eye } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';

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

export function FutureVision({ onProgressUpdate }: FutureVisionProps) {
  const [visions, setVisions] = useState<Record<string, VisionData>>({
    '5年後': {
      timeframe: '5年後',
      career: '',
      lifestyle: '',
      relationships: '',
      skills: '',
      values: '',
      achievements: '',
      challenges: '',
      learnings: ''
    },
    '10年後': {
      timeframe: '10年後',
      career: '',
      lifestyle: '',
      relationships: '',
      skills: '',
      values: '',
      achievements: '',
      challenges: '',
      learnings: ''
    },
    '20年後': {
      timeframe: '20年後',
      career: '',
      lifestyle: '',
      relationships: '',
      skills: '',
      values: '',
      achievements: '',
      challenges: '',
      learnings: ''
    }
  });

  const [activeTimeframe, setActiveTimeframe] = useState<'5年後' | '10年後' | '20年後'>('5年後');

  const updateVision = (field: keyof Omit<VisionData, 'timeframe'>, value: string) => {
    setVisions(prev => ({
      ...prev,
      [activeTimeframe]: {
        ...prev[activeTimeframe],
        [field]: value
      }
    }));

    // Calculate progress
    const allVisions = Object.values(visions);
    const totalFields = allVisions.length * 8; // 8 fields per vision
    const filledFields = allVisions.reduce((count, vision) => {
      return count + Object.values(vision).filter(v => v && v !== vision.timeframe).length;
    }, 0);
    
    const progress = Math.round((filledFields / totalFields) * 100);
    onProgressUpdate(progress);
  };

  const getCompletionRate = (vision: VisionData) => {
    const fields = Object.values(vision).filter(v => v && v !== vision.timeframe);
    return Math.round((fields.length / 8) * 100);
  };

  const prompts = {
    career: '理想のキャリア、職業、ポジション、働き方について詳しく書いてください',
    lifestyle: 'どんな場所でどんな生活をしていたいか、ライフスタイルを描いてください',
    relationships: '家族、友人、パートナーとの関係性はどうありたいですか',
    skills: '身につけていたいスキル、専門性、資格などを挙げてください',
    values: '大切にしたい価値観、信念、人生の軸は何ですか',
    achievements: '達成したい目標、成し遂げたいことを具体的に書いてください',
    challenges: '乗り越えたい課題、挑戦してみたいことは何ですか',
    learnings: '学び続けたいこと、成長したい分野を教えてください'
  };

  const fieldLabels = {
    career: 'キャリア・仕事',
    lifestyle: 'ライフスタイル',
    relationships: '人間関係',
    skills: 'スキル・能力',
    values: '価値観',
    achievements: '目標・成果',
    challenges: '挑戦・課題',
    learnings: '学習・成長'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">将来ビジョン設計</h2>
            <p className="text-sm text-muted-foreground">5年後、10年後、20年後の理想の姿を具体的に描いてみましょう</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline">
              完了率: {Math.round(Object.values(visions).reduce((sum, v) => sum + getCompletionRate(v), 0) / 3)}%
            </Badge>
            <Button className="flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>保存</span>
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Object.entries(visions).map(([timeframe, vision]) => (
            <div key={timeframe} className="p-4 bg-muted rounded-lg text-center">
              <div className="text-lg font-bold text-foreground">{getCompletionRate(vision)}%</div>
              <div className="text-sm text-muted-foreground">{timeframe}</div>
            </div>
          ))}
        </div>
      </Card>

      <Tabs value={activeTimeframe} onValueChange={(value) => setActiveTimeframe(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="5年後" className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>5年後</span>
          </TabsTrigger>
          <TabsTrigger value="10年後" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>10年後</span>
          </TabsTrigger>
          <TabsTrigger value="20年後" className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>20年後</span>
          </TabsTrigger>
        </TabsList>

        {Object.entries(visions).map(([timeframe, vision]) => (
          <TabsContent key={timeframe} value={timeframe} className="mt-6">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="font-bold text-foreground mb-4">{timeframe}のビジョン</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="font-medium text-foreground">{label}</label>
                        <Lightbulb 
                          className="w-4 h-4 text-muted-foreground cursor-help" 
                          title={prompts[field as keyof typeof prompts]}
                        />
                      </div>
                      <textarea
                        value={vision[field as keyof Omit<VisionData, 'timeframe'>]}
                        onChange={(e) => updateVision(field as keyof Omit<VisionData, 'timeframe'>, e.target.value)}
                        placeholder={prompts[field as keyof typeof prompts]}
                        rows={4}
                        className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Vision Summary */}
              {getCompletionRate(vision) > 50 && (
                <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
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
      <Card className="p-6">
        <h3 className="font-bold text-foreground mb-4">💡 ビジョン作成のヒント</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">効果的なビジョンの特徴</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 具体的で詳細に描かれている</li>
              <li>• 感情に訴えかける内容になっている</li>
              <li>• 実現可能性と挑戦性のバランスが取れている</li>
              <li>• 自分の価値観と一致している</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">考える際のポイント</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
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