import React from "react";
import { Tabs } from "expo-router";
import { View } from "react-native";
import AppHeader from "../../components/AppHeader";

export default function AdminTabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <Tabs screenOptions={{ headerShown: false, tabBarLabelStyle: { fontSize: 12, fontWeight: "600" } }}>
        <Tabs.Screen name="index" options={{ title: "ホーム" }} />
        <Tabs.Screen name="users" options={{ title: "ユーザー" }} />
        <Tabs.Screen name="companies" options={{ title: "企業" }} />
        <Tabs.Screen name="reports" options={{ title: "レポート" }} />
        <Tabs.Screen name="settings" options={{ title: "設定" }} />
      </Tabs>
    </View>
  );
}
