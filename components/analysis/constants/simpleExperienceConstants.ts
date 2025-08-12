import { BookOpen, Users, Briefcase, Heart, Star, HelpCircle } from 'lucide-react';
import { ExperienceTemplate } from '../types/simpleExperienceTypes';

export const categoryConfig = {
  study: { 
    label: '学業・研究', 
    icon: BookOpen, 
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'ゼミ、卒論、研究活動など'
  },
  club: { 
    label: 'サークル・部活', 
    icon: Users, 
    color: 'bg-green-50 text-green-700 border-green-200',
    description: 'サークル活動、部活動、学生団体など'
  },
  work: { 
    label: '仕事・インターン', 
    icon: Briefcase, 
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'アルバイト、インターンシップなど'
  },
  volunteer: { 
    label: 'ボランティア', 
    icon: Heart, 
    color: 'bg-pink-50 text-pink-700 border-pink-200',
    description: 'ボランティア活動、社会貢献など'
  },
  personal: { 
    label: '個人活動', 
    icon: Star, 
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    description: '趣味、個人プロジェクト、資格取得など'
  },
  other: { 
    label: 'その他', 
    icon: HelpCircle, 
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    description: 'その他の活動や経験'
  }
};

export const experienceTemplates: ExperienceTemplate[] = [
  {
    id: 'club-leader',
    name: 'サークル・部活のリーダー',
    category: 'club',
    titleTemplate: '○○サークルで代表/副代表を務めた経験',
    descriptionTemplate: '○名規模の○○サークルで代表を務め、○○という課題に取り組みました。',
    suggestedSkills: ['リーダーシップ', 'チームワーク', '企画力', '調整力'],
    exampleQuestions: [
      'どのような課題がありましたか？',
      'メンバーをどうまとめましたか？',
      'どのような成果が得られましたか？'
    ]
  },
  {
    id: 'internship',
    name: 'インターンシップ',
    category: 'work',
    titleTemplate: '○○企業でのインターンシップ',
    descriptionTemplate: '○○企業で○週間のインターンシップに参加し、○○プロジェクトに取り組みました。',
    suggestedSkills: ['問題解決', 'チームワーク', '実行力', '学習力'],
    exampleQuestions: [
      'どのような業務を担当しましたか？',
      '困難だったことは何ですか？',
      'どのような学びがありましたか？'
    ]
  },
  {
    id: 'research',
    name: '研究・ゼミ',
    category: 'study',
    titleTemplate: '○○に関する研究活動',
    descriptionTemplate: 'ゼミで○○について研究し、○○という発見/成果を得ました。',
    suggestedSkills: ['分析力', '論理的思考', '継続力', 'プレゼンテーション'],
    exampleQuestions: [
      'なぜそのテーマを選んだのですか？',
      'どのような手法で研究しましたか？',
      'どのような発見がありましたか？'
    ]
  },
  {
    id: 'volunteer',
    name: 'ボランティア活動',
    category: 'volunteer',
    titleTemplate: '○○ボランティア活動',
    descriptionTemplate: '○○のボランティア活動に参加し、○○に貢献しました。',
    suggestedSkills: ['協調性', 'コミュニケーション', '責任感', '向上心'],
    exampleQuestions: [
      'なぜその活動に参加したのですか？',
      'どのような困難がありましたか？',
      'どのような意味がありましたか？'
    ]
  }
];

export const commonSkills = [
  'リーダーシップ', 'チームワーク', 'コミュニケーション', '問題解決', 
  '企画力', '実行力', '分析力', 'プレゼンテーション', '調整力', '継続力',
  '責任感', '向上心', '主体性', '協調性', '創造性', '学習力'
];

export const quickQuestions = [
  '最も困難だったことは何ですか？',
  'どのような工夫をしましたか？',
  '何を学びましたか？',
  '周りの人にどのような影響を与えましたか？',
  '今後どのように活かしたいですか？'
];