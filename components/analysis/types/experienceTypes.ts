export interface Experience {
  id: string;
  title: string;
  category: 'academic' | 'extracurricular' | 'work' | 'volunteer' | 'personal' | 'project';
  period: {
    start: string;
    end: string;
    duration: string;
  };
  organization: string;
  role: string;
  teamSize?: number;
  description: string;
  challenges: Challenge[];
  achievements: Achievement[];
  skills: string[];
  learnings: string[];
  starFramework: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  quantifiedResults: QuantifiedResult[];
  jobHuntRelevance: {
    priority: 'high' | 'medium' | 'low';
    targetIndustries: string[];
    targetPositions: string[];
    keywords: string[];
    esUsage: boolean;
    interviewUsage: boolean;
  };
  reflectionDepth: number;
  completeness: number;
  isPrivate: boolean;
}

export interface Challenge {
  id: string;
  description: string;
  difficulty: number;
  approach: string;
  outcome: string;
  skillsUsed: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  impact: string;
  metrics?: string;
  recognition?: string;
}

export interface QuantifiedResult {
  id: string;
  metric: string;
  before: string;
  after: string;
  improvement: string;
  context: string;
}

export interface ESTemplate {
  question: string;
  answer: string;
  characterCount: number;
  keywords: string[];
  structure: 'STAR' | 'PREP' | 'Story';
}

export interface ExperienceReflectionProps {
  userId: string;
  onProgressUpdate: (progress: number) => void;
}