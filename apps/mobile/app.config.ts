import 'dotenv/config';

export default {
  expo: {
    name: "Gakuten",
    slug: "gakuten",
    scheme: "gakuten",           // Deep Link 用
    ios: { bundleIdentifier: "co.gakuten.app" },
    android: { package: "co.gakuten.app" },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    plugins: ["expo-router"],
  },
};