import { Stack } from "expo-router";

export default function IPOLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, title: "IPO大学" }}>
      <Stack.Screen name="index" options={{ title: "IPO大学" }} />
      {/* 以後、詳細画面が増えたら <Stack.Screen name="detail" ... /> のように追加 */}
    </Stack>
  );
}