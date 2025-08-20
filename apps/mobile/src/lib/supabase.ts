import { createClient, type AuthError } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";

// --- SSR window/localStorage shim (prevents AsyncStorage web build from crashing on Node) ---
(() => {
  try {
    if (typeof (globalThis as any).window === 'undefined' && typeof globalThis !== 'undefined') {
      const g: any = globalThis as any;
      if (!g.window) {
        g.window = {};
      }
      if (!g.window.localStorage) {
        const noop = () => {};
        g.window.localStorage = {
          getItem: (_k: string) => null,
          setItem: (_k: string, _v: string) => noop(),
          removeItem: (_k: string) => noop(),
          clear: () => noop(),
          key: (_i: number) => null,
          length: 0,
        };
      }
    }
  } catch {}
})();

// --- Neutralize Expo Web/SSR mis-detection of React Native ---
// Some toolchains set navigator.product = 'ReactNative' during Web/SSR.
// Supabase Auth checks this flag and will try to use AsyncStorage, which crashes on SSR (no window).
// Force it to look like a browser while `window` is undefined.
(() => {
  try {
    if (typeof (globalThis as any).window === 'undefined' && typeof globalThis !== 'undefined') {
      const nav = (globalThis as any).navigator;
      if (nav && nav.product === 'ReactNative') {
        try {
          Object.defineProperty(nav, 'product', { value: 'Browser' });
        } catch {
          (globalThis as any).navigator = { ...nav, product: 'Browser' };
        }
      }
    }
  } catch {}
})();

// Load RN URL polyfill only on real React Native runtime (not SSR/Web)
// Using dynamic import to avoid touching global navigator on Node/Web.
// This ensures `navigator.product` isn't spoofed by the polyfill during SSR.
void (async () => {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      (globalThis as any).navigator?.product === 'ReactNative' &&
      typeof (globalThis as any).document === 'undefined'
    ) {
      // @ts-expect-error: react-native-url-polyfill has no type declarations for the "auto" entry
      await import('react-native-url-polyfill/auto');
    }
  } catch {}
})();

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
      const mod = await import('@react-native-async-storage/async-storage');
      return mod.default.getItem(k);
    }
    if (hasWebLocalStorage) {
      return (globalThis as any).window.localStorage.getItem(k);
    }
    return null;
  },
  setItem: async (k: string, v: string) => {
    if (isReactNativeRuntime) {
      const mod = await import('@react-native-async-storage/async-storage');
      return mod.default.setItem(k, v);
    }
    if (hasWebLocalStorage) {
      (globalThis as any).window.localStorage.setItem(k, v);
    }
  },
  removeItem: async (k: string) => {
    if (isReactNativeRuntime) {
      const mod = await import('@react-native-async-storage/async-storage');
      return mod.default.removeItem(k);
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
        const mod = await import('@react-native-async-storage/async-storage');
        const keys = await mod.default.getAllKeys();
        const sbKey = keys.find((k: string) => k.includes('auth-token'));
        if (sbKey) await mod.default.removeItem(sbKey);
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
