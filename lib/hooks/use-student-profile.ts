/* ────────────────────────────────────────────
   lib/hooks/use-student-profile.ts
   “学生プロフィール” を取得／編集／保存する共通フック
─────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

/* ---------- 型 ---------- */
type Row    = Database["public"]["Tables"]["student_profiles"]["Row"];
type Insert = Database["public"]["Tables"]["student_profiles"]["Insert"];

/** 編集モードフラグをローカル状態にだけ持たせる */
type LocalState = Partial<Row> & { __editing?: boolean };

export function useStudentProfile() {
  /* ------------------ state ------------------ */
  const [data   , setData]   = useState<LocalState>({});
  const [loading, setLoading] = useState(true);
  const [saving , setSaving]  = useState(false);
  const [error  , setError]   = useState<Error | null>(null);

  /* ------------------ fetch ------------------ */
  const fetchMyProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      /* 認証ユーザー取得 */
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("認証エラー (未ログイン)");

      /* レコード取得 */
      const { data: row, error } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<Row>();

      if (error) throw error;

      /* レコードが無ければ空オブジェクトで初期化して編集モード */
      if (row) {
        setData(row);
      } else {
        setData({ user_id: user.id, __editing: true });
      }
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMyProfile(); }, [fetchMyProfile]);

  /* ------------------ helpers ------------------ */
  const updateLocal = useCallback(
    (patch: Partial<LocalState>) => setData((prev) => ({ ...prev, ...patch })),
    [],
  );

  const resetLocal = useCallback(() => {
    /* サーバーに合わせてリロード */
    fetchMyProfile();
  }, [fetchMyProfile]);

  /* ------------------ save ------------------ */
  const save = useCallback(async () => {
    if (!data) return;

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("認証エラー (未ログイン)");

      const payload: Insert = { ...(data as Insert), user_id: user.id };

      const { error } = await supabase
        .from("student_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      /* 保存完了 → 編集終了 */
      setData((prev) => ({ ...prev, __editing: false }));
    } catch (e: any) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }, [data]);

  return {
    /* 返却値 */
    data:       data           as Row & { __editing?: boolean }, // 取得後は完全型
    loading,
    error,
    saving,
    editing: !!data.__editing,
    /* actions */
    updateLocal,
    resetLocal,
    save,
  };
}
