import { createClient as createBrowserSupabaseClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Factory that returns a typed Supabase client
export const createClient = () =>
  createBrowserSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

/* -------------------------------------------------
   HMR が走っても再生成されないよう globalThis に保存
--------------------------------------------------*/
declare global {
  /* eslint-disable no-var */
  var __supabase__: SupabaseClient<Database> | undefined;
}

const supabase =
  globalThis.__supabase__ ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__supabase__ = supabase;
}

export { supabase };
export default supabase;
