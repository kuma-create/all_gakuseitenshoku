import { useMemo, useState, useEffect } from "react";
import { useGuideStore } from "./store";
import { TaskSubmissionContent } from "./types";

export const useTask = (taskId?: string) => {
  const tasks = useGuideStore((s) => s.tasks);
  const submissions = useGuideStore((s) => s.submissions);
  const setSubmission = useGuideStore((s) => s.setSubmission);
  const markDoneStore = useGuideStore((s) => s.markDone);

  const task = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
  const [content, setContent] = useState<TaskSubmissionContent>(submissions[taskId ?? ""]?.content ?? {});

  useEffect(() => {
    const cur = submissions[taskId ?? ""];
    if (cur) setContent(cur.content);
  }, [submissions, taskId]);

  const save = async () => {
    if (!taskId) return;
    setSubmission(taskId, content);
    // 将来：Supabase upsert
  };
  const markDone = async () => {
    if (!taskId) return;
    await save();
    markDoneStore(taskId);
    // 将来：Supabase & 自動転記トリガ
  };

  return { task, content, setContent, save, markDone };
};