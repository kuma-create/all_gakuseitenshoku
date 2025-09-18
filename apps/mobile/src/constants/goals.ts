// Use require() so TS doesn't need a *.png module declaration
// (React Native bundler resolves these at runtime)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const goals1 = require('../../assets/images/goals1.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const goals2 = require('../../assets/images/goals2.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const goals3 = require('../../assets/images/goals3.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const goals4 = require('../../assets/images/goals4.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const goals5 = require('../../assets/images/goals5.png');
// app/onboarding/constants/goals.ts
export type GoalKey =
  | 'self_analysis'
  | 'manage_process'
  | 'practice_case_webtest'
  | 'see_industries_roles'
  | 'headhunting';

export const GOALS: {
  key: GoalKey;
  title: string;
  bullets: string[];
  icon: any;
  accent?: string; // Tailwind/Style用
}[] = [
  {
    key: 'self_analysis',
    title: '自己分析',
    bullets: ['AIと壁打ち', 'ノートで思考を整理'],
    icon: goals1,
    accent: '#F59E0B',
  },
  {
    key: 'manage_process',
    title: '選考状況を管理',
    bullets: ['企業情報や日程を管理', 'よく使うESを管理'],
    icon: goals2,
    accent: '#10B981',
  },
  {
    key: 'practice_case_webtest',
    title: 'ケースやWebテストの練習',
    bullets: ['ケース問題解いてみる', 'Webを疑似体験する'],
    icon: goals3,
    accent: '#3B82F6',
  },
  {
    key: 'see_industries_roles',
    title: '業界や職種情報を見る',
    bullets: ['業界や職種を知る', '適性診断を行う'],
    icon: goals4,
    accent: '#0EA5E9',
  },
  {
    key: 'headhunting',
    title: 'ヘッドハンティングを受けたい',
    bullets: ['※選択すると学生転職へ'],
    icon: goals5,
    accent: '#6366F1',
  },
];