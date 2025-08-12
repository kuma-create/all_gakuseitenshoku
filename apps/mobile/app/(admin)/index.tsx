import { View, Text } from "react-native";
export default function AdminHome() {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>管理者ホーム</Text>
      <Text>※ ダッシュボード・アラートなど</Text>
    </View>
  );
}
