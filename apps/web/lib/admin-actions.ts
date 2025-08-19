import { supabase } from "@/lib/supabase/client";

export async function freezeStudent(id: string) {
  return supabase
    .from("student_profiles")
    .update({ status: "凍結" })
    .eq("id", id);
}

export async function approveCompany(id: string) {
  return supabase
    .from("companies")
    .update({ status: "承認済み" })
    .eq("id", id);
}

/* 他のアクションも追加で */