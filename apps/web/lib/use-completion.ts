/* ───────────────────────────────────────────────────────
   lib/use-completion.ts
────────────────────────────────────────────────────── */
"use client";

import { useEffect, useState } from "react";
import { supabase }            from "@/lib/supabase/client";
import type { Database }       from "@/lib/supabase/types";

/** -------- numeric helper --------
 * Supabase numeric/decimal comes back as string.
 * Cast safely to number; null/undefined -> 0
 */
const toNumber = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "string" ? parseFloat(v) : v;

/** -------- completion parser --------
 * RPC が数値だけ返す場合と {score, missing[]} のレコードを返す場合
 * の両方を吸収して RawCompletion 形に整える
 */
const parseCompletion = (row: unknown): RawCompletion => {
  if (row == null) return { score: 0, missing: [] };
  if (typeof row === "number" || typeof row === "string") {
    return { score: row, missing: [] };
  }
  if (typeof row === "object" && "score" in row) {
    const r = row as any;
    return { score: r.score ?? 0, missing: r.missing ?? [] };
  }
  // fallback
  return { score: 0, missing: [] };
};

type RawCompletion = {
  score: number | string | null;
  missing?: string[] | null;
};
export type CompletionScope = "overall" | "profile" | "resume" | "work_history";

/* 呼び出す RPC 名 */
type CompletionFn =
  | "calculate_profile_completion"
  | "calculate_resume_completion"
  | "calculate_work_history_completion";

export type MissingField = {
  key: string;
  label: string;
  href: string;
};

/* 英語カラム → 日本語ラベル & アンカー */
const JP_MAP: Record<string, { label: string; href: string }> = {
  full_name:       { label: "氏名",        href: "/student/profile#full_name" },
  avatar_url:      { label: "プロフィール写真", href: "/student/profile#avatar_url" },
  prefecture:      { label: "所在地",      href: "/student/profile#prefecture" },
  graduation_month: { label: "卒業予定月", href: "/student/profile#graduation_month" },
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

  /* ===================================================================== */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        /* 1️⃣ 認証ユーザー取得 -------------------------------------------------- */
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) { setScore(0); setMissing([]); }
          return;
        }
        const uid = user.id;

        /* 2️⃣ student_profiles & resumes を並列取得 ----------------------------- */
        const [{ data: sp }, { data: rs }] = await Promise.all([
          supabase
            .from("student_profiles")
            .select(`
              last_name, first_name, last_name_kana, first_name_kana,
              birth_date, gender, address_line,
              pr_title, pr_text, about,
              desired_positions, work_style_options,
              preferred_industries, desired_locations
            `)
            .eq("user_id", uid)
            .maybeSingle(),
          supabase
            .from("resumes")
            .select("form_data, work_experiences")
            .eq("user_id", uid)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        /* safety casts */
        const form  = (rs?.form_data as any) ?? {};
        const works = Array.isArray(rs?.work_experiences)
          ? (rs!.work_experiences as any[])
          : [];

        /* ---------- helpers ---------- */
        const filled = (v: any) =>
          Array.isArray(v) ? v.length > 0 : v != null && v !== "";

        const pct = (arr: any[]) =>
          Math.round((arr.filter(filled).length / arr.length) * 100);

        /* ==========  プロフィール ========== */
        const pBasic = [
          sp?.last_name, sp?.first_name,
          sp?.last_name_kana, sp?.first_name_kana,
          sp?.birth_date, sp?.gender, sp?.address_line,
        ];
        const pPR  = [sp?.pr_title, sp?.pr_text, sp?.about];
        const pPref = [
          sp?.desired_positions,
          sp?.work_style_options,
          sp?.preferred_industries,
          sp?.desired_locations,
        ];
        const profilePct = Math.round((pct(pBasic) + pct(pPR) + pct(pPref)) / 3);

        /* ==========  履歴書フォーム ========== */
        const rBasic = [
          form.basic?.lastName, form.basic?.firstName,
          form.basic?.lastNameKana, form.basic?.firstNameKana,
          form.basic?.birthdate,  form.basic?.gender,
          form.basic?.address,
        ];
        const rPR = [
          form.pr?.title, form.pr?.content, form.pr?.motivation,
        ];
        const condArrKeys = ["jobTypes","locations","industries","workPreferences"];
        const rCondArr = condArrKeys.map((k) => (form.conditions?.[k] ?? []).length > 0);
        const rCondScalar = filled(form.conditions?.workStyle);
        const resumeFormPct = Math.round(
          (pct(rBasic) + pct(rPR) +
           Math.round(((rCondArr.filter(Boolean).length + (rCondScalar ? 1 : 0)) / 5) * 100)
          ) / 3
        );

        /* ==========  職務経歴書（work_experiences） ========== */
        let totalReq = 0, totalFilled = 0;
        works.forEach((w) => {
          totalReq += 6;
          if (filled(w.company))      totalFilled++;
          if (filled(w.position))     totalFilled++;
          if (filled(w.startDate))    totalFilled++;
          if (filled(w.description))  totalFilled++;
          if (filled(w.achievements)) totalFilled++;
          if (w.isCurrent || filled(w.endDate)) totalFilled++;
        });
        const workPct = totalReq ? Math.round((totalFilled / totalReq) * 100) : 0;

        /* ========== scope 別スコア ========== */
        let finalScore = 0;
        if (scope === "profile") {
          finalScore = profilePct;
        } else if (scope === "resume") {
          finalScore = resumeFormPct;
        } else if (scope === "work_history") {
          finalScore = workPct;
        } else {
          const resumeOverall = works.length === 0
            ? resumeFormPct
            : Math.round(resumeFormPct * 0.7 + workPct * 0.3);

          finalScore = Math.round(profilePct * 0.7 + resumeOverall * 0.3);
        }

        if (!cancelled) {
          setScore(finalScore);
          setMissing([]);          /* フロント版では missing 未対応 */
        }
      } catch (err) {
        console.error("useCompletion (front calc) error:", err);
        if (!cancelled) { setScore(0); setMissing([]); }
      }
    })();

    return () => { cancelled = true; };
  }, [scope]);

  return { score, missing };
};
