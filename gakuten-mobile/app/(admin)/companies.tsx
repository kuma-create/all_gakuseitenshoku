import { View, Text } from "react-native";
export default function AdminCompanies() {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>企業管理</Text>
      <Text>※ 一覧/審査/編集</Text>
    </View>
  );
}
