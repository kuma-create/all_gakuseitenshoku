import React from "react";
import { Tabs } from "expo-router";
import { View } from "react-native";
import AppHeader from "../../components/AppHeader";

export default function CompanyTabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <Tabs screenOptions={{ headerShown: false, tabBarLabelStyle: { fontSize: 12, fontWeight: "600" } }}>
        <Tabs.Screen name="index" options={{ title: "ホーム" }} />
        <Tabs.Screen name="jobs-new" options={{ title: "求人作成" }} />
        <Tabs.Screen name="candidates" options={{ title: "候補者" }} />
        <Tabs.Screen name="messages" options={{ title: "メッセージ" }} />
        <Tabs.Screen name="settings" options={{ title: "設定" }} />
      </Tabs>
    </View>
  );
}
