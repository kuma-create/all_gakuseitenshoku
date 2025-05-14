/* -------------------------------------------------
   use-job-interest.ts – “興味あり” の取得・更新
--------------------------------------------------*/
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types";

/** -------------------------------------------------
 * @param jobId      対象求人 ID
 * @param studentId  ログイン学生のユーザー ID
 * ------------------------------------------------- */
export function useJobInterest(
  jobId?: string | null,
  studentId?: string | null,
) {
  const [loading, setLoading] = useState(true);
  const [interested, setInterested] = useState(false);

  /* --------- 初期取得 --------- */
  useEffect(() => {
    if (!jobId || !studentId) return;
    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("job_interests")
        .select("id")
        .eq("job_id", jobId)
        .eq("student_id", studentId)
        .maybeSingle();

      if (error) console.error(error);
      setInterested(!!data);
      setLoading(false);
    })();
  }, [jobId, studentId]);

  /* --------- トグル --------- */
  const toggle = useCallback(async () => {
    if (!jobId || !studentId) return;

    if (interested) {
      /* --- 削除 --- */
      const { error } = await supabase
        .from("job_interests")
        .delete()
        .eq("job_id", jobId)
        .eq("student_id", studentId);

      if (error) console.error(error);
      else setInterested(false);
    } else {
      /* --- 追加 --- */
      const { error } = await supabase
        .from("job_interests")
        .insert({ job_id: jobId, student_id: studentId });

      if (error) console.error(error);
      else setInterested(true);
    }
  }, [jobId, studentId, interested]);

  return { loading, interested, toggle };
}
