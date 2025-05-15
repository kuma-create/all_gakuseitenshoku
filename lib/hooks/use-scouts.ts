/* ------------------------------------------------------------------
   hooks/use-scouts.ts  – 修正版
------------------------------------------------------------------ */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ScoutRow = {
  id: string;
  created_at: string;
  company: {
    id: string;
    name: string;
    logo: string | null;          // ← logo_url → logo
  };
  student: {
    id: string;
    full_name: string;            // ← display_name → full_name
    avatar_url: string | null;    // profile_image の人はここも変える
  };
};

export const useScouts = (companyId?: string) => {
  const [rows, setRows]     = useState<ScoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const fetch = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("scouts")
        .select(
          `
          id,
          created_at,
          company:companies(id,name,logo),
          student:student_profiles(id,full_name,avatar_url)
        `,
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        setError(error.message);
      } else {
        setError(null);
        setRows(data as ScoutRow[]);
      }
      setLoading(false);
    };

    fetch();
  }, [companyId]);

  return { rows, loading, error };
};
