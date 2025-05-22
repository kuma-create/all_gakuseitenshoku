/* ────────────────────────────────────────────
   lib/hooks/use-student-profile.ts
   “学生プロフィール” を取得／編集／保存する共通フック
─────────────────────────────────────────── */
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

/* ---------- 型 ---------- */
type Row    = Database["public"]["Tables"]["student_profiles"]["Row"];
type Insert = Database["public"]["Tables"]["student_profiles"]["Insert"];
type Local  = Partial<Row> & { __editing?: boolean };

/* ---------- ユーティリティ ---------- */
function normalize(record: Local): Insert {
  // supabase へ送る直前に：
  //   ""  → null
  //   空配列 → null
  //   number 列に NaN → null
  // へ変換して 400 を防ぐ
  const cleaned: any = {};
  Object.entries(record).forEach(([k, v]) => {
    // 空文字 → null
    if (v === "") {
      cleaned[k] = null;
    // 配列は空配列 ({}::text[]) のまま送る。
    // NOT NULL の text[] カラムで null にすると制約違反になるため。
    // NaN → null
    } else if (typeof v === "number" && Number.isNaN(v)) {
      cleaned[k] = null;
    } else {
      cleaned[k] = v;
    }
  });
  return cleaned as Insert;
}

/* ===================================================================== */
export function useStudentProfile() {
  /* state -------------------------------------------------------------- */
  const [data,    setData]    = useState<Local>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<Error | null>(null);

  /* fetch -------------------------------------------------------------- */
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("認証エラー: ユーザー情報を取得できません");

      const { data: profile, error: selErr } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<Row>();

      if (selErr) throw selErr;

      // まだレコードが無い場合は「空のローカル状態」で OK
      setData(profile ?? {});
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  /* ローカル編集用 ----------------------------------------------------- */
  const updateLocal = (patch: Partial<Local>) =>
    setData((d) => ({ ...d, ...patch }));

  const resetLocal = () =>
    setData((d) => {
      const { __editing: _omit, ...rest } = d as Local;
      return rest;
    });

  /* save --------------------------------------------------------------- */
  const save = async () => {
    setSaving(true); setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("認証情報がありません");

      // __editing は DB に存在しない列なので除去
      const { __editing: _omit, ...record } = data as Local;
      // interests は NOT NULL 制約。null の場合は空配列に補正
      if (record.interests == null) record.interests = [];

      const payload: Insert = normalize({
        ...record,          // ← __editing を含まない
        user_id: user.id,   // upsert 衝突キー
      });

      const { error: upErr } = await supabase
        .from("student_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (upErr) throw upErr;

      // 保存成功 → 編集モード解除 & 再フェッチ
      await fetchProfile();
    } catch (e: any) {
      setError(e);
      throw e;                 // 呼び出し側 (handleSave) で捕捉
    } finally {
      setSaving(false);
    }
  };

  /* return ------------------------------------------------------------- */
  return {
    data,
    loading,
    saving,
    error,
    editing: Boolean(data.__editing),
    updateLocal,
    resetLocal,
    save,
  };
}