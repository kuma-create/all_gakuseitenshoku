import { View, Text } from "react-native";
export default function CompanyHome() {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>企業ホーム</Text>
      <Text>※ ダッシュボード的なカードやKPIなど</Text>
    </View>
  );
}
