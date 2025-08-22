import 'dotenv/config';
import { ExpoConfig } from '@expo/config';

const config: ExpoConfig = {
  name: "Gakuten",                 // ← 必要なら 'gakuten-mobile' に変更可
  slug: "gakuten",
  scheme: "gakuten",               // Deep Link 用（必要に応じて変更）
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  icon: "./assets/images/icon.png",

  ios: {
    bundleIdentifier: "co.gakuten.app",
    supportsTablet: true,
    buildNumber: "1",
  },

  android: {
    package: "co.gakuten.app",
    edgeToEdgeEnabled: true,
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#ffffff",
    },
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],

  experiments: { typedRoutes: true },

  extra: {
    eas: {
      projectId: "213d1db4-baff-444d-a719-698ac7945c51",
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default { expo: config };