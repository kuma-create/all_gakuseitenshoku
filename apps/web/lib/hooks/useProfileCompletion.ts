"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Completion = { score: number; missing: string[] };

export function useProfileCompletion() {
  const [comp, setComp] = useState<Completion | null>(null);

  /* ① 初回 & ログイン切替 ------------------------------- */
  useEffect(() => {
    const fetchCompletion = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setComp(null); return; }

      const { data, error } = await supabase
        .rpc("calculate_profile_completion", { p_user_id: user.id })
        .single<Completion>();

      if (error) console.error("RPC error:", error);
      else       setComp(data);
    };

    fetchCompletion(); // 初回

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(() => fetchCompletion());

    return () => subscription.unsubscribe();
  }, []); // supabase はシングルトン

  /* ② Realtime 監視 ------------------------------------ */
  useEffect(() => {
    let currentUid: string | null = null;

    async function getUid() {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? currentUid;
    }

    const channel = supabase
      .channel("profile-completion")
      .on(
        "postgres_changes",
        {
          event : "UPDATE",
          schema: "public",
          table : "student_profiles",
          // 最初はフィルタが付けられないので placeholder
        },
        async (payload) => {
          const uid = await getUid();
          if (!uid) return;
          // 自分の行以外ならスキップ
          if (payload.new.user_id !== uid) return;

          const { data, error } = await supabase
            .rpc("calculate_profile_completion",{ p_user_id: uid })
            .single<Completion>();

          if (error) console.error("Realtime RPC error:", error);
          else       setComp(data);
        },
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, []);

  return comp;
}
