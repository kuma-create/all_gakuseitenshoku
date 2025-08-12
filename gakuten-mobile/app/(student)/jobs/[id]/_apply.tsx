import { Stack, useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";

export default function Apply() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ title: "応募フォーム" }} />
      <View style={{ padding: 16 }}>
        <Text>この求人に応募: {id}</Text>
        {/* TODO: 応募フォーム実装 */}
      </View>
    </>
  );
}