import { View, Text } from "react-native";
export default function AdminUsers() {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>ユーザー管理</Text>
      <Text>※ 一覧/検索/編集</Text>
    </View>
  );
}
