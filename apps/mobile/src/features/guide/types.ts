export type GuideStep = { id: string; orderNo: number; title: string; description?: string };
export type GuideTaskKind = "text" | "choice" | "file" | "rating";
export type GuideTask = {
  id: string; stepId: string; orderNo: number; title: string;
  kind: GuideTaskKind; helper?: string; schemaJson?: any; done?: boolean;
};
export type TaskSubmissionContent = { [k: string]: any };