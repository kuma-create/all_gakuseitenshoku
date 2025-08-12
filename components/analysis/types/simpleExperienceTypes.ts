// シンプル化された経験管理のための型定義

export interface SimpleExperience {
  id: string;
  title: string;
  description: string;
  category: 'study' | 'club' | 'work' | 'volunteer' | 'personal' | 'other';
  period: string; // "2022年4月〜2023年3月" のような文字列
  isJobHuntRelevant: boolean;
  
  // 詳細情報（オプショナル）
  details?: {
    role?: string;
    organization?: string;
    teamSize?: string;
    challenge?: string;
    action?: string;
    result?: string;
    skills?: string[];
    learnings?: string[];
  };
  
  // メタデータ
  completeness: number; // 0-100%
  lastUpdated: string;
  isPrivate: boolean;
}

export interface ExperienceTemplate {
  id: string;
  name: string;
  category: SimpleExperience['category'];
  titleTemplate: string;
  descriptionTemplate: string;
  suggestedSkills: string[];
  exampleQuestions: string[];
}

export interface SimpleExperienceProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
}