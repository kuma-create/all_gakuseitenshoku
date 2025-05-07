// lib/supabase/client.ts

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * ブラウザ上で使うためのシングルトン Supabase クライアント。
 * クッキー認証は不要なので @supabase/supabase-js の createClient を直呼び。
 */
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
