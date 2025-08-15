

"use client";

import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

export default function IPOTabRedirect() {
  const router = useRouter();

  useEffect(() => {
    // タブ選択時に専用スタック `/ipo` へ遷移
    router.replace("/ipo");
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}