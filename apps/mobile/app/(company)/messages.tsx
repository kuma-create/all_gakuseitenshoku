import { View, Text } from "react-native";
export default function CompanyMessages() {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>メッセージ</Text>
      <Text>※ 企業↔学生のやりとり</Text>
    </View>
  );
}
