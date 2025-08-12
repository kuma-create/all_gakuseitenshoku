import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type AuthError } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: {
    storage: AsyncStorage,         // RNではCookieではなくAsyncStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,     // Expo Routerでは常にfalse
    flowType: "pkce",              // OAuthを使う場合に推奨
  },
});

/**
 * リフレッシュトークンが壊れている/無い場合に安全にリセットするユーティリティ。
 * 例: catch(e) { await resetIfBadSession(e); }
 */
export async function resetIfBadSession(err?: unknown) {
  const msg = (err as AuthError | Error | undefined)?.message ?? "";
  if (msg.includes("Invalid Refresh Token") || msg.includes("Refresh Token Not Found")) {
    try {
      // 古いセッションキーを削除（プロジェクトごとにキー名が違うので前方一致）
      const keys = await AsyncStorage.getAllKeys();
      const sbKey = keys.find((k) => k.includes("auth-token"));
      if (sbKey) await AsyncStorage.removeItem(sbKey);
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch {}
  }
}

/**
 * 現在のセッションを安全に取得（失敗時はリセットを試みて null）
 */
export async function getCurrentSessionSafe() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  } catch (e) {
    await resetIfBadSession(e);
    return null;
  }
}
