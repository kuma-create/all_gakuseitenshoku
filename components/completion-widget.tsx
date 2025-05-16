/* ───────────────────────────────────────────────────────
   components/completion-widget.tsx
   - 完成度プログレスバー & 欠落項目バッジ
────────────────────────────────────────────────────── */
"use client";

import Link from "next/link";
import { Progress }            from "@/components/ui/progress";
import { Badge }               from "@/components/ui/badge";
import { useCompletion, CompletionScope } from "@/lib/use-completion";

export function CompletionWidget({ scope = "overall" as CompletionScope }) {
  const { score, missing } = useCompletion(scope);

  if (score === null) return null;          // ローディング中は非表示

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          完成度
          {scope === "profile"
            ? "（プロフィール）"
            : scope === "resume"
            ? "（レジュメ）"
            : ""}
        </p>
        <span className="text-sm font-semibold">{score}%</span>
      </div>

      <Progress value={score} />

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
