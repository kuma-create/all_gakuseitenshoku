// app/(student)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { View } from "react-native";
// ルートからの相対パス。components が app と同階層にある前提。
import AppHeader from "../../components/AppHeader";

export default function StudentTabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "ホーム" }} />
        <Tabs.Screen name="profile" options={{ title: "プロフィール" }} />
        <Tabs.Screen name="jobs" options={{ title: "求人" }} />
        <Tabs.Screen name="messages" options={{ title: "メッセージ" }} />
        <Tabs.Screen name="settings" options={{ title: "設定" }} />
      </Tabs>
    </View>
  );
}
