import { BookOpen, Users, Target, Award, Lightbulb, Star } from 'lucide-react';

export const categoryConfig = {
  academic: { label: '学業・研究', icon: BookOpen, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  extracurricular: { label: '課外活動', icon: Users, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  work: { label: '仕事・インターン', icon: Target, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
  volunteer: { label: 'ボランティア', icon: Award, color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50', textColor: 'text-pink-700' },
  personal: { label: '個人的取組み', icon: Lightbulb, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  project: { label: 'プロジェクト', icon: Star, color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700' }
};

export const skillSuggestions = [
  'リーダーシップ', 'チームワーク', 'コミュニケーション', '問題解決', '企画力', '実行力',
  '分析力', 'プレゼンテーション', '交渉力', '調整力', '創造性', '継続力', '責任感',
  '向上心', '主体性', '協調性', '柔軟性', 'ストレス耐性', '計画性', '行動力'
];

export const commonESQuestions = [
  '学生時代に力を入れたことを教えてください。（400文字以内）',
  'あなたが困難を乗り越えた経験について教えてください。（300文字以内）',
  'チームで成果を出した経験について教えてください。（350文字以内）',
  'リーダーシップを発揮した経験について教えてください。（400文字以内）',
  '目標を達成するために工夫したことを教えてください。（300文字以内）',
  '新しいことに挑戦した経験について教えてください。（350文字以内）'
];

export const industryOptions = [
  'IT・ソフトウェア', 'コンサルティング', '金融・銀行', '商社', 'メーカー', '小売・流通',
  '広告・マーケティング', 'メディア', '教育', '医療・ヘルスケア', '不動産', '物流',
  '公務員', 'NPO・NGO', 'スタートアップ', '研究・開発'
];

export const positionOptions = [
  '営業職', '企画職', 'コンサルタント', 'エンジニア', 'マーケティング', '人事',
  '経理・財務', '法務', '研究開発', 'プロジェクトマネージャー', 'デザイナー', 'アナリスト'
];