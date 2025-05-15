"use client";

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";          // 追加
import { useProfileCompletion } from "@/lib/hooks/useProfileCompletion";
import { Check, X } from "lucide-react";

/* 日本語ラベル */
const labels: Record<string, string> = {
  last_name: "苗字",
  first_name: "名前",
  phone: "電話番号",
  gender: "性別",
  birth_date: "生年月日",
  postal_code: "郵便番号",
  prefecture: "都道府県",
  city: "市区町村",
  address_line: "番地・建物名",
  university: "大学名",
  faculty: "学部名",
  department: "学科名",
  work_summary: "職務経歴概要",
  company1: "1社目の経歴",
  skill_or_qualification: "スキルまたは資格",
};

export function ProfileCompletionCard() {
  const completion = useProfileCompletion();
  if (!completion) return null;

  const { score, missing } = completion;

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      {/* ヘッダー部 */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">プロフィール完成度</h3>
        <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium">
          {score}%
        </span>
      </div>

      {/* 進捗バー */}
      <Progress value={score} className="mb-4 h-3" />

      {/* 本文 */}
      {missing.length > 0 ? (
        <>
          <p className="mb-2 text-sm text-gray-700">
            あと <strong>{missing.length}</strong> 項目で 100% になります
          </p>

          <ul className="space-y-1 text-sm">
            {missing.map((k) => (
              <li key={k} className="flex items-center gap-1 text-red-600">
                <X size={14} /> {labels[k] ?? k} が未入力です
              </li>
            ))}
          </ul>

          {/* ←──── ここが追加部分 ────→ */}
          <Button
            asChild
            size="sm"
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            {/* step=1 にクエリを付けて最初のタブを開く例 */}
            <Link href="/onboarding/profile?step=1">プロフィールを編集</Link>
          </Button>
        </>
      ) : (
        <p className="flex items-center gap-1 text-sm text-emerald-600">
          <Check size={14} /> 完璧です！
        </p>
      )}
    </div>
  );
}
