/* ------------------------------------------------------------------
   components/ProfileCompletionCard.tsx
   - プロフィール完成度ウィジェット（Skeleton & 早期 return 排除版）
------------------------------------------------------------------ */
"use client";

import React from "react";
import Link   from "next/link";
import { Progress } from "@/components/ui/progress";
import { Button   } from "@/components/ui/button";
import { useCompletion } from "@/lib/use-completion";
import { Check, X } from "lucide-react";

/* ----------- 日本語ラベル辞書 ----------- */
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

/* ================================================================
   ProfileCompletionCard
================================================================ */
export function ProfileCompletionCard() {
  /* ① フックは常にトップレベルで呼び出す */
  const { score, missing = [] } = useCompletion("overall"); // score === null → 読み込み中

  /* ② 読み込み中 Skeleton – 早期 return を避ける */
  if (score === null) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between animate-pulse">
          <div className="h-6 w-32 rounded bg-gray-100" />
          <div className="h-6 w-10 rounded bg-gray-100" />
        </div>
        <Progress value={0} className="mb-4 h-3 animate-pulse" />
        <p className="h-4 w-3/4 rounded bg-gray-100" />
        <ul className="mt-2 space-y-1">
          <li className="h-4 w-2/3 rounded bg-gray-100" />
          <li className="h-4 w-1/2 rounded bg-gray-100" />
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      {/* ヘッダー */}
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
            {missing.map((f) => (
              <li key={f.key} className="flex items-center gap-1 text-red-600">
                <X size={14} /> {labels[f.key] ?? f.label ?? f.key} が未入力です
              </li>
            ))}
          </ul>

          {/* 編集ボタン */}
          <Button
            asChild
            size="sm"
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            <Link href="/student/profile">プロフィールを編集</Link>
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
