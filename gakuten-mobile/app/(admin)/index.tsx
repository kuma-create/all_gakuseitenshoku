import { Text, View } from "react-native";
import AppHeader from "../../components/AppHeader";
export default function AdminHome() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="管理者ホーム" />
      <View style={{ flex: 1, padding: 24 }}>
        <Text>※ ダッシュボード・アラートなど</Text>
      </View>
    </View>
  );
}
