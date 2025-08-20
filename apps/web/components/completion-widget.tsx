/* ------------------------------------------------------------------
   components/completion-widget.tsx
   – 進捗バー + 未入力項目バッジ
------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Badge }    from "@/components/ui/badge";
import { useCompletion, CompletionScope } from "@/lib/use-completion";

export function CompletionWidget({
  scope = "profile",
}: {
  scope?: CompletionScope;
}) {
  /* 完成度と未入力項目を取得 */
  const { score, missing } = useCompletion(scope);

  /* score === null はローディング中なので描画しない */
  if (score === null) return null;

  /* スコープ別ラベル */
  const label =
    scope === "profile" ? "（プロフィール）"
    : scope === "resume" ? "（レジュメ）"
    : "";

  return (
    <div className="space-y-3">
      {/* 見出し + 数値 */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">完成度{label}</p>
        <span className="text-sm font-semibold">{score}%</span>
      </div>

      {/* プログレスバー */}
      <Progress value={score} />

      {/* 未入力フィールドのバッジ */}
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {missing.map((m) => (
            <Link href={m.href} key={m.key}>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted transition"
              >
                {m.label} を入力
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
