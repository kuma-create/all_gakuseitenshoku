import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useTask } from "@/features/guide/useTask";

export default function TaskScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const { task, content, setContent, save, markDone } = useTask(taskId);

  if (!task) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Stack.Screen options={{ title: task.title }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {task.kind === "text" && (
          <View>
            {task.helper ? <Text style={S.helper}>{task.helper}</Text> : null}
            <TextInput
              style={S.input}
              multiline
              value={content?.text ?? ""}
              onChangeText={(t) => setContent({ ...content, text: t })}
              placeholder="ここに下書き。保存するとプロフィールに自動反映（後で編集可）"
            />
          </View>
        )}
        {/* 他kindは後述 */}
        <TouchableOpacity style={S.primary} onPress={async () => { await save(); }}>
          <Text style={S.primaryText}>保存</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.secondary} onPress={async () => { await markDone(); router.back(); }}>
          <Text style={S.secondaryText}>完了にする</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
const S = StyleSheet.create({
  helper: { fontSize: 12, color: "#64748B", marginBottom: 8, lineHeight: 18 },
  input: { minHeight: 160, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12, fontSize: 14 },
  primary: { marginTop: 16, backgroundColor: "#2563EB", padding: 14, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "600" },
  secondary: { marginTop: 8, backgroundColor: "#EFF6FF", padding: 12, borderRadius: 12, alignItems: "center" },
  secondaryText: { color: "#1D4ED8", fontWeight: "600" },
});