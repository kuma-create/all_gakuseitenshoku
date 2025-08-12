import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
// 既存の Supabase クライアントに合わせてパスを調整してください
import { supabase } from "@/src/lib/supabase";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        Alert.alert("読み込みエラー", "ユーザー情報の取得に失敗しました。");
        setLoading(false);
        return;
      }
      setEmail(user?.email ?? "");
      // metadata.display_name を採用（無ければ空）
      setDisplayName((user?.user_metadata as any)?.display_name ?? "");
      setLoading(false);
    })();
  }, []);

  const onSave = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName }
    });
    setLoading(false);
    if (error) {
      Alert.alert("保存エラー", "プロフィールの保存に失敗しました。");
    } else {
      Alert.alert("保存しました", "表示名を更新しました。");
    }
  };

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "800" }}>プロフィール</Text>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "700" }}>メールアドレス</Text>
        <Text>{email || "-"}</Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "700" }}>表示名</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="例: 山田 太郎"
          style={{
            borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8,
            paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff"
          }}
        />
      </View>

      <Pressable
        onPress={onSave}
        style={{
          backgroundColor: "#111827", paddingVertical: 12, borderRadius: 10,
          alignItems: "center"
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>保存</Text>
      </Pressable>

      <View style={{ marginTop: 24 }}>
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>メモ</Text>
        <Text style={{ color: "#6b7280" }}>
          まずは表示名のみ更新。学生プロフィールの詳細は後でテーブル接続に拡張します。
        </Text>
      </View>
    </View>
  );
}
