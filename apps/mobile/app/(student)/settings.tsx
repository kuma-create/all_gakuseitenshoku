import React from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";

export default function SettingsScreen() {
  const onLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("エラー", "ログアウトに失敗しました。");
      return;
    }
    router.replace("/auth/login");
  };

  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "800" }}>設定</Text>

      <Pressable
        onPress={() => router.push("/auth/forgot-password")}
        style={{ borderWidth:1, borderColor:"#e5e7eb", borderRadius:10, backgroundColor:"#fff", padding:14 }}
      >
        <Text style={{ fontWeight:"700" }}>パスワードをリセットする</Text>
        <Text style={{ color:"#6b7280" }}>登録メール宛にリセットリンクを送信</Text>
      </Pressable>

      <Pressable
        onPress={onLogout}
        style={{ backgroundColor:"#111827", paddingVertical:12, borderRadius:10, alignItems:"center" }}
      >
        <Text style={{ color:"#fff", fontWeight:"700" }}>ログアウト</Text>
      </Pressable>

      <Text style={{ color:"#6b7280", marginTop: 8 }}>
        ※ メール文面や /auth/reset のUX改善（トースト/期限切れ対応）はこの後着手します。
      </Text>
    </View>
  );
}
