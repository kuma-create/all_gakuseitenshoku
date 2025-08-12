import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type Role = "student" | "company" | "company_admin" | "admin";

export function useUserRole(userId?: string | null) {
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (active && data?.role) setRole(data.role as Role);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [userId]);

  return { role, loading };
}
