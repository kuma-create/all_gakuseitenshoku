/* ------------------------------------------------------------------
   components/ProfileCompletionCard.tsx
   - プロフィール完成度ウィジェット（Skeleton & 早期 return 排除版）
------------------------------------------------------------------ */
"use client";

import Link   from "next/link";
import { Progress } from "@/components/ui/progress";
import { Button   } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
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

type MissingField = { key: string; label?: string; href?: string };

/* ================================================================
   ProfileCompletionCard
================================================================ */
export function ProfileCompletionCard() {
  const [loading, setLoading] = useState(true);
  const [score,   setScore]   = useState<number>(0);
  const [missing, setMissing] = useState<MissingField[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // ---- fetch resume row ----
      const { data: resume } = await supabase
        .from("resumes")
        .select("form_data, work_experiences")
        .eq("user_id", user.id)
        .single();

      /* ---------- 履歴書 (profile) 進捗 ---------- */
      // form_data は JSON 型なので型を緩くキャストして扱う
      const form = (resume?.form_data as any) ?? {};
      const isFilled = (v: any) =>
        Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "";

      const pct = (arr: any[]) =>
        Math.round((arr.filter(isFilled).length / arr.length) * 100);

      const basic = [
        form.last_name, form.first_name, form.postal_code,
        form.prefecture, form.city, form.address_line,
        form.birth_date, form.gender,
      ];
      const pr   = [form.pr_title, form.pr_text, form.about];
      const pref = [
        form.desired_positions,
        form.work_style_options,
        form.preferred_industries,
        form.desired_locations,
      ];

      const resumePct = Math.round((pct(basic) + pct(pr) + pct(pref)) / 3);

      /* ---------- 職務経歴書 (work) 進捗 ---------- */
      // work_experiences も JSON 配列なので any[] として扱う
      const works = (resume?.work_experiences as any[]) ?? [];
      let total = 0, filled = 0;
      const missSet = new Set<string>();

      works.forEach(w => {
        const check = (k: string, v: any) => {
          total += 1;
          if (v && String(v).trim() !== "") filled += 1;
          else missSet.add(k);
        };
        check("company",     w?.company);
        check("position",    w?.position);
        check("startDate",   w?.startDate);
        check("endDate",     w?.endDate || (w?.isCurrent ? "current" : ""));
        check("description", w?.description);
      });
      const workPct = total ? Math.round((filled / total) * 100) : 0;

      /* ---------- 加重平均 70:30 ---------- */
      const overall = Math.round(resumePct * 0.7 + workPct * 0.3);

      setScore(overall);
      setMissing(Array.from(missSet).map(k => ({ key: k })));
      setLoading(false);
    })();
  }, []);

  if (loading) {
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
