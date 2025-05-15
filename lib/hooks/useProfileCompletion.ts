/* ------------------------------------------------------------------
   hooks/use-profile-completion.ts
   - RPC 版（calculate_profile_completion）
------------------------------------------------------------------ */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Completion = {
  score   : number;   // 0–100
  missing : string[]; // 未入力キー配列
};

/**  
 * プロフィール完成度を返すカスタムフック  
 * - ログイン状態が変わったら自動で再フェッチ  
 * - Realtime で student_profiles が UPDATE されたら自動反映  
 */
export function useProfileCompletion() {
  const [comp, setComp] = useState<Completion | null>(null);

  /* 1) 初回 & ログイン切替 -------------------------- */
  useEffect(() => {
    const fetchCompletion = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setComp(null); return; }

      const { data, error } = await supabase
      .rpc("calculate_profile_completion",
        { p_user_id: user.id })      
        .single<Completion>();

      if (error) console.error("RPC error:", error);
      else       setComp(data);
    };

    /** 初回呼び出し */
    fetchCompletion();

    /** セッションが変わったら再取得 */
    const { data: sub } = supabase.auth.onAuthStateChange(
      () => fetchCompletion(),
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  /* 2) Realtime：student_profiles UPDATE を監視 ------ */
  useEffect(() => {
    let currentUid: string | null = null;  
    const channel = supabase
      .channel("public:student_profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "student_profiles" },
        async () => {
        /* user.id を都度取得（null 安全） */
          const { data: { user } } = await supabase.auth.getUser();
          const uid = user?.id ?? currentUid;
          if (!uid) return;

          currentUid = uid;                            // 更新

          const { data, error } = await supabase
            .rpc("calculate_profile_completion", { p_user_id: uid })
            .single<Completion>();

          if (error) console.error("Realtime RPC error:", error);
          else       setComp(data);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return comp;
}
