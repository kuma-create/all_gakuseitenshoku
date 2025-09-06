import { create } from "zustand";
import { GuideStep, GuideTask, TaskSubmissionContent } from "./types";
import { mockSteps, mockTasks } from "./mock";

type Submission = { taskId: string; content: TaskSubmissionContent; status: "draft"|"done"; updatedAt: string };
type State = {
  steps: GuideStep[];
  tasks: GuideTask[];
  submissions: Record<string, Submission>;
  setSubmission: (taskId: string, content: TaskSubmissionContent) => void;
  markDone: (taskId: string) => void;
};

export const useGuideStore = create<State>((set, get) => ({
  steps: mockSteps,
  tasks: mockTasks,
  submissions: {},
  setSubmission: (taskId, content) => {
    const updated: Submission = { taskId, content, status: "draft", updatedAt: new Date().toISOString() };
    set((s) => ({ submissions: { ...s.submissions, [taskId]: updated } }));
  },
  markDone: (taskId) => {
    const cur = get().submissions[taskId] ?? { taskId, content: {}, status: "draft", updatedAt: new Date().toISOString() };
    set((s) => ({ submissions: { ...s.submissions, [taskId]: { ...cur, status: "done", updatedAt: new Date().toISOString() } } }));
    // 将来：ここでSupabase保存 & 自動転記API呼び出し
  },
}));