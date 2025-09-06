import { GuideStep, GuideTask } from "./types";

export const mockSteps: GuideStep[] = [
  { id: "s1", orderNo: 1, title: "Step.1 自己分析", description: "強み・価値観を1つだけ書けばOK" },
  { id: "s2", orderNo: 2, title: "Step.2 企業研究", description: "興味タグを選ぶだけ" },
  { id: "s3", orderNo: 3, title: "Step.3 ES 準備", description: "設問テンプレで下書き" },
];

export const mockTasks: GuideTask[] = [
  { id: "t1", stepId: "s1", orderNo: 1, title: "ガクチカ300字（まずは100字でも）", kind: "text",
    helper: "“困難→行動→成果→学び”の順で1〜3文でOK" },
  { id: "t2", stepId: "s2", orderNo: 1, title: "興味のある業界（3つまで）", kind: "choice",
    helper: "例：コンサル、SaaS、メーカー など", schemaJson: { options: ["コンサル","SaaS","メーカー","広告","金融"] } },
  { id: "t3", stepId: "s3", orderNo: 1, title: "志望動機テンプレ（素案）", kind: "text",
    helper: "なぜ業界／なぜ会社／自分の強みがどう活きるか を1文ずつ" },
];