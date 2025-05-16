/* ───────────────────────────────────────────────────────
   lib/use-completion.ts
────────────────────────────────────────────────────── */
"use client";

import { useEffect, useState } from "react";
import { supabase }            from "@/lib/supabase/client";
import type { Database }       from "@/lib/supabase/types";

type RawCompletion = { score: number; missing: string[] };
export type CompletionScope = "overall" | "profile" | "resume";

/* 呼び出す RPC 名 */
type CompletionFn = "calculate_profile_completion" | "calculate_resume_completion";

export type MissingField = {
  key: string;
  label: string;
  href: string;
};

/* 英語カラム → 日本語ラベル & アンカー */
const JP_MAP: Record<string, { label: string; href: string }> = {
  full_name:       { label: "氏名",        href: "/student/profile#full_name" },
  avatar_url:      { label: "プロフィール写真", href: "/student/profile#avatar_url" },
  location:        { label: "所在地",      href: "/student/profile#location" },
  graduation_year: { label: "卒業予定年",  href: "/student/profile#graduation_year" },
  about:           { label: "自己紹介文",  href: "/student/profile#about" },
  desired_job_title: { label: "希望職種", href: "/resume#desired_job_title" },
  summary:           { label: "概要",     href: "/resume#summary" },
  skills:            { label: "スキル",   href: "/resume#skills" },
  experiences:       { label: "経験",     href: "/resume#experiences" },
  educations:        { label: "学歴",     href: "/resume#educations" },
};

const mapMissing = (arr: string[]): MissingField[] =>
  arr.filter(k => JP_MAP[k]).map(k => ({ key: k, ...JP_MAP[k] }));

/* ===================================================================== */
export const useCompletion = (scope: CompletionScope = "overall") => {
  const [score,   setScore]   = useState<number | null>(null);
  const [missing, setMissing] = useState<MissingField[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      /* 個別 RPC 呼び出し（キャストがポイント） */
      const fetchOne = async (name: CompletionFn) => {
        const { data, error } = await supabase
          .rpc(
            name as keyof Database["public"]["Functions"], // ← ここで型を合わせる
            { p_user_id: user.id },
          )
          .single<RawCompletion>();

        if (error || !data) throw error ?? new Error("no data");
        return data;
      };

      if (scope === "profile") {
        const p = await fetchOne("calculate_profile_completion");
        setScore(p.score);
        setMissing(mapMissing(p.missing));
      } else if (scope === "resume") {
        const r = await fetchOne("calculate_resume_completion");
        setScore(r.score);
        setMissing(mapMissing(r.missing));
      } else {
        const [p, r] = await Promise.all([
          fetchOne("calculate_profile_completion"),
          fetchOne("calculate_resume_completion"),
        ]);
        setScore(Math.round(p.score * 0.7 + r.score * 0.3));
        setMissing(mapMissing([...new Set([...p.missing, ...r.missing])]));
      }
    })().catch(console.error);
  }, [scope]);

  return { score, missing };
};
