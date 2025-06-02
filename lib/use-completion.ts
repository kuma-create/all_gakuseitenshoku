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

  /* ===================================================================== */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setScore(0);
            setMissing([]);
          }
          return;
        }

        /* 個別 RPC 呼び出し（キャストがポイント） */
        const fetchOne = async (name: CompletionFn) => {
          const { data, error } = await supabase
            .rpc(
              name as keyof Database["public"]["Functions"],
              { p_user_id: user.id },
            )
            .single();

          if (error) {
            console.error(`[useCompletion] RPC ${name} error:`, error);
            return { score: 0, missing: [] } as RawCompletion;
          }

          // data には numeric / string / object どれかが来る可能性がある
          const row = Array.isArray(data) ? data[0] : data;
          const parsed = parseCompletion(row);
          console.log(`[useCompletion] ${name} returned:`, parsed);
          return parsed;
        };

        if (scope === "profile") {
          const p = await fetchOne("calculate_profile_completion");
          if (!cancelled) {
            const pScore = toNumber(p.score);        // 0‑1 → %
            setScore(Math.round(pScore * 100));
            setMissing(mapMissing(p.missing ?? []));
          }
        } else if (scope === "resume") {
          const r = await fetchOne("calculate_resume_completion");
          if (!cancelled) {
            const rScore = toNumber(r.score);
            setScore(Math.round(rScore * 100));
            setMissing(mapMissing(r.missing ?? []));
          }
        } else {
          const [p, r] = await Promise.all([
            fetchOne("calculate_profile_completion"),
            fetchOne("calculate_resume_completion"),
          ]);
          if (!cancelled) {
            const pScore = toNumber(p.score);
            const rScore = toNumber(r.score);
            const merged  = [...new Set([...(p.missing ?? []), ...(r.missing ?? [])])];
            const weighted = pScore * 0.7 + rScore * 0.3;   // 0‑1 scale
            setScore(Math.round(weighted * 100));           // convert to %
            setMissing(mapMissing(merged));
          }
        }
      } catch (err) {
        console.error("useCompletion error:", err);
        if (!cancelled) {
          /* 失敗時は 0 % 表示 & 未入力項目なし */
          setScore(0);
          setMissing([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope]);

  return { score, missing };
};
