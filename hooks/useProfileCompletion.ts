"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";

type Completion = {
  score: number;
  missing: string[];
};

export const useProfileCompletion = () => {
  const [data, setData] = useState<Completion | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .rpc("calculate_profile_completion", { p_user_id: user.id })
        .single<Completion>();                 // ←★ここだけ変更

      if (error) console.error(error);
      else setData(data);
    })();
  }, []);

  return data;
};
