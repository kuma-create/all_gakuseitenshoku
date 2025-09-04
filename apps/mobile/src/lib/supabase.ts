import 'react-native-gesture-handler';
import { createClient, type AuthError } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// --- Storage shim that avoids importing async-storage during SSR/Web build ---
// Detect true React Native runtime (Expo Go / native) rather than Platform.OS
// because during Node/SSR builds Platform may report 'ios' and cause crashes.
const isReactNativeRuntime =
  typeof globalThis !== 'undefined' &&
  // RN sets navigator.product to 'ReactNative'
  (globalThis as any).navigator?.product === 'ReactNative' &&
  // RN has `window` but no `document`; Node(SSR) has neither
  typeof (globalThis as any).window !== 'undefined' &&
  typeof (globalThis as any).document === 'undefined';

const hasWebLocalStorage =
  typeof globalThis !== 'undefined' &&
  !!(globalThis as any).window?.localStorage;

// Methods:
//  - On RN runtime: dynamically import async-storage at call time
//  - On Web with window: use localStorage
//  - On SSR/Node: no-op (return null)
const storageShim = {
  getItem: async (k: string) => {
    if (isReactNativeRuntime) {
      return AsyncStorage.getItem(k);
    }
    if (hasWebLocalStorage) {
      return (globalThis as any).window.localStorage.getItem(k);
    }
    return null;
  },
  setItem: async (k: string, v: string) => {
    if (isReactNativeRuntime) {
      return AsyncStorage.setItem(k, v);
    }
    if (hasWebLocalStorage) {
      (globalThis as any).window.localStorage.setItem(k, v);
    }
  },
  removeItem: async (k: string) => {
    if (isReactNativeRuntime) {
      return AsyncStorage.removeItem(k);
    }
    if (hasWebLocalStorage) {
      (globalThis as any).window.localStorage.removeItem(k);
    }
  },
};

// 1) Expo extra → fallback to .env(EXPO_PUBLIC_*)
const SUPABASE_URL =
  (Constants.expoConfig?.extra as any)?.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  (Constants.expoConfig?.extra as any)?.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] Missing SUPABASE_URL/ANON_KEY. Define in apps/mobile/.env as EXPO_PUBLIC_* or in app.config.ts extra."
  );
}

export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: {
    // Web SSR 時は storage が undefined → auth-js は memory / no-op を使用
    storage: storageShim,
    persistSession: isReactNativeRuntime || hasWebLocalStorage,
    autoRefreshToken: isReactNativeRuntime || hasWebLocalStorage,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

/**
 * リフレッシュトークンが壊れている/無い場合に安全にリセットするユーティリティ。
 */
export async function resetIfBadSession(err?: unknown) {
  const msg = (err as AuthError | Error | undefined)?.message ?? "";
  if (msg.includes("Invalid Refresh Token") || msg.includes("Refresh Token Not Found")) {
    try {
      if (isReactNativeRuntime) {
        const keys = await AsyncStorage.getAllKeys();
        const sbKey = keys.find((k: string) => k.includes('auth-token'));
        if (sbKey) await AsyncStorage.removeItem(sbKey);
      } else if (hasWebLocalStorage) {
        (globalThis as any).window.localStorage.removeItem('supabase.auth.token');
      }
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch {}
  }
}

/** 現在のセッションを安全に取得 */
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
