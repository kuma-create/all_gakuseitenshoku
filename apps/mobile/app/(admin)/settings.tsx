import { View, Text } from "react-native";
export default function AdminSettings() {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>設定</Text>
      <Text>※ 権限/環境設定</Text>
    </View>
  );
}
