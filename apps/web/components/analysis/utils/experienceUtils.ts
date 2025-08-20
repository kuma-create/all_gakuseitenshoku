import { Experience } from '../types/experienceTypes';

export const calculateCompleteness = (experience: Partial<Experience>): number => {
  let score = 0;
  if (experience.title) score += 10;
  if (experience.description) score += 10;
  if (experience.starFramework?.situation) score += 15;
  if (experience.starFramework?.task) score += 15;
  if (experience.starFramework?.action) score += 15;
  if (experience.starFramework?.result) score += 15;
  if (experience.skills && experience.skills.length > 0) score += 10;
  if (experience.quantifiedResults && experience.quantifiedResults.length > 0) score += 10;
  
  return score;
};

export const generateESAnswer = (experience: Experience, questionLimit: number = 400): string => {
  const { starFramework } = experience;
  let answer = '';
  
  if (starFramework.situation) {
    answer += `${starFramework.situation}`;
  }
  if (starFramework.task) {
    answer += `そこで私は${starFramework.task}`;
  }
  if (starFramework.action) {
    answer += `具体的には、${starFramework.action}`;
  }
  if (starFramework.result) {
    answer += `その結果、${starFramework.result}`;
  }
  
  return answer.substring(0, questionLimit);
};

export const getMockExperiences = (): Experience[] => [
  {
    id: '1',
    title: 'テニスサークル代表として組織改革',
    category: 'extracurricular',
    period: { start: '2022-04', end: '2023-03', duration: '1年間' },
    organization: '○○大学テニスサークル',
    role: '代表',
    teamSize: 100,
    description: '100名規模のテニスサークルで代表を務め、活動の活性化と組織改革を実行',
    challenges: [
      {
        id: '1-c1',
        description: 'メンバーの参加率低下（30%）と新入生の離脱率の高さ（60%）',
        difficulty: 4,
        approach: 'アンケート調査による課題分析と段階的な改善策の実施',
        outcome: '参加率80%、新入生定着率90%を達成',
        skillsUsed: ['分析力', '企画力', 'リーダーシップ']
      }
    ],
    achievements: [
      {
        id: '1-a1',
        title: '組織活性化による参加率大幅改善',
        description: 'イベント企画と技術向上プログラムの導入',
        impact: 'サークル全体のモチベーション向上と技術レベル向上',
        metrics: '参加率30%→80%、新入生定着率40%→90%',
        recognition: '学生活動表彰において優秀団体賞を受賞'
      }
    ],
    skills: ['リーダーシップ', 'チームビルディング', '企画力', '問題解決', 'コミュニケーション'],
    learnings: [
      '多様な価値観を持つメンバーをまとめることの重要性',
      'データに基づく課題分析の有効性',
      '継続的な改善サイクルの大切さ'
    ],
    starFramework: {
      situation: '100名規模のテニスサークルで、メンバーの参加率低下（30%）と新入生の高い離脱率（60%）が問題となっていた',
      task: '代表として組織の活性化を図り、全メンバーが楽しく参加できる環境を作ることが求められた',
      action: 'メンバーへのアンケート調査を実施し、課題を分析。新入生歓迎イベントの充実、技術向上プログラムの導入、定期的なフィードバック体制を構築した',
      result: '参加率を80%まで向上させ、新入生定着率を90%に改善。学生活動表彰で優秀団体賞を受賞'
    },
    quantifiedResults: [
      {
        id: '1-q1',
        metric: '参加率',
        before: '30%',
        after: '80%',
        improvement: '150%向上',
        context: '週3回の練習における平均参加率'
      },
      {
        id: '1-q2',
        metric: '新入生定着率',
        before: '40%',
        after: '90%',
        improvement: '50ポイント改善',
        context: '4-6月期の新入生継続参加率'
      }
    ],
    jobHuntRelevance: {
      priority: 'high',
      targetIndustries: ['コンサルティング', '金融・銀行', 'IT・ソフトウェア', '商社'],
      targetPositions: ['営業職', '企画職', 'コンサルタント', 'プロジェクトマネージャー'],
      keywords: ['リーダーシップ', '組織運営', 'チームビルディング', '問題解決', '成果創出'],
      esUsage: true,
      interviewUsage: true
    },
    reflectionDepth: 5,
    completeness: 95,
    isPrivate: false
  },
  {
    id: '2',
    title: 'IT企業でのインターンシップ',
    category: 'work',
    period: { start: '2023-08', end: '2023-08', duration: '2週間' },
    organization: '株式会社○○テック',
    role: 'インターン生',
    teamSize: 5,
    description: 'スタートアップ企業で新規事業提案プロジェクトに参加',
    challenges: [
      {
        id: '2-c1',
        description: '2週間という短期間で市場調査から事業提案まで完成させる必要があった',
        difficulty: 4,
        approach: '効率的なタスク分担と毎日の進捗共有によるスピード重視の進行',
        outcome: '期限内に高品質な提案書を完成し、5チーム中2位を獲得',
        skillsUsed: ['計画性', 'チームワーク', '分析力']
      }
    ],
    achievements: [
      {
        id: '2-a1',
        title: '新規事業提案で上位入賞',
        description: 'EdTech分野の新規サービス提案',
        impact: '実際に会社で検討段階に進む提案となった',
        metrics: '5チーム中2位、提案採用率40%',
        recognition: 'CEOから直接フィードバックを受ける'
      }
    ],
    skills: ['市場分析', 'プレゼンテーション', 'チームワーク', '企画力', '実行力'],
    learnings: [
      'ビジネスの現場におけるスピード感の重要性',
      '顧客視点での事業設計の難しさと重要性',
      'チームでの役割分担と連携の大切さ'
    ],
    starFramework: {
      situation: 'IT企業の2週間インターンシップで、新規事業提案プロジェクトに5名チームで参加',
      task: '市場調査からビジネスモデル設計、収益予測まで含む事業提案書を2週間で作成',
      action: '担当領域を明確化し、毎朝の進捗共有と夕方の振り返りを実施。市場調査、競合分析、顧客インタビューを効率的に実行',
      result: '最終プレゼンで5チーム中2位を獲得。提案内容が実際に会社の検討段階に進んだ'
    },
    quantifiedResults: [
      {
        id: '2-q1',
        metric: 'プレゼンテーション順位',
        before: '5チーム参加',
        after: '2位獲得',
        improvement: '上位40%の成績',
        context: '最終プレゼンテーション大会'
      }
    ],
    jobHuntRelevance: {
      priority: 'high',
      targetIndustries: ['IT・ソフトウェア', 'コンサルティング', 'スタートアップ'],
      targetPositions: ['企画職', 'コンサルタント', '営業職'],
      keywords: ['新規事業', '市場分析', 'チーム連携', 'プレゼンテーション'],
      esUsage: true,
      interviewUsage: true
    },
    reflectionDepth: 4,
    completeness: 85,
    isPrivate: false
  }
];