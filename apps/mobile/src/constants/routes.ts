export const ROLE_DEST = {
  // 学生のみログインする前提のデフォルト遷移先
  student: "/(student)/dashboard",
} as const;

// 型補助（必要なら使用）
export type AppRole = keyof typeof ROLE_DEST;

// 学生のみなのでデフォルトも学生の遷移先に固定
export const DEFAULT_DEST = ROLE_DEST.student;
