/* ────────────────────────────────────────────
   lib/hooks/use-student-profile.ts
─────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

/* ---------- 型 ---------- */
type Row    = Database["public"]["Tables"]["student_profiles"]["Row"];
type Insert = Database["public"]["Tables"]["student_profiles"]["Insert"];
type Local  = Partial<Row> & { __editing?: boolean };

/* ===================================================================== */
export function useStudentProfile() {
  /* state -------------------------------------------------------------- */
  const [data,    setData]    = useState<Local>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<Error | null>(null);

  /* fetch -------------------------------------------------------------- */
  const fetchProfile = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("認証エラー (未ログイン)");

      const { data: row, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<Row>();
      if (error) throw error;

      setData(row ?? { user_id: user.id, __editing: true });
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  /* local update ------------------------------------------------------- */
  const updateLocal = useCallback(
    (patch: Partial<Local>) => setData((p) => ({ ...p, ...patch })),
    [],
  );

  const resetLocal  = useCallback(fetchProfile, [fetchProfile]);

  /* save --------------------------------------------------------------- */
  const save = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("認証エラー (未ログイン)");

      const payload: Insert = { ...(data as Insert), user_id: user.id };
      const { error } = await supabase
        .from("student_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      setData((p) => ({ ...p, __editing: false }));
    } catch (e: any) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }, [data]);

  /* return ------------------------------------------------------------- */
  return {
    data:     data as Row & { __editing?: boolean },
    loading, error, saving,
    editing: !!data.__editing,
    updateLocal, resetLocal, save,
  };
}
