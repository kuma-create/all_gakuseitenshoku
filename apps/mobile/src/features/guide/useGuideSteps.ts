import { useMemo } from "react";
import { useGuideStore } from "./store";
import { GuideTask } from "./types";

export const useGuideSteps = () => {
  const steps = useGuideStore((s) => s.steps);
  const tasks = useGuideStore((s) => s.tasks);
  const submissions = useGuideStore((s) => s.submissions);

  const tasksByStep = useMemo(() => {
    const map: Record<string, (GuideTask & { done: boolean })[]> = {};
    steps.forEach((st) => (map[st.id] = []));
    tasks.forEach((t) => {
      const sub = submissions[t.id];
      map[t.stepId].push({ ...t, done: sub?.status === "done" });
    });
    return map;
  }, [steps, tasks, submissions]);

  const progressByStep = useMemo(() => {
    const p: Record<string, number> = {};
    for (const st of steps) {
      const arr = tasksByStep[st.id] ?? [];
      const total = arr.length || 1;
      const done = arr.filter((t) => t.done).length;
      p[st.id] = done / total;
    }
    return p;
  }, [steps, tasksByStep]);

  const goToFirstPending = (stepId: string) => {
    const arr = tasksByStep[stepId] ?? [];
    const target = arr.find((t) => !t.done) ?? arr[0];
    return `/guide/${target?.id}`;
  };

  return { steps, tasksByStep, progressByStep, goToFirstPending };
};