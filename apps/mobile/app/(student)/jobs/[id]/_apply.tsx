
import type { PostgrestError } from "@supabase/supabase-js";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "src/lib/supabase";

export default function Apply() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selfPR, setSelfPR] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const session = sessionRes.session;
      if (!session) {
        router.push("/auth/login");
        return;
      }
      const { data: prof } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!prof?.id) {
        router.push("/auth/signup");
        return;
      }

      const { error } = await supabase.from("applications").insert({
        job_id: id,
        student_id: prof.id,
        self_pr: selfPR || null,
        resume_url: resumeUrl || null,
      });

      if (error) {
        const code = (error as any)?.code || (error as any)?.details;
        if (code && String(code).includes("23505")) {
          Alert.alert("注意", "既に応募済みです");
        } else {
          throw error;
        }
      } else {
        Alert.alert("応募が完了しました");
        router.back();
      }
    } catch (e) {
      Alert.alert("エラー", (e as PostgrestError)?.message ?? "応募に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "応募フォーム" }} />
      <View style={styles.container}>
        <Text style={styles.label}>自己PR</Text>
        <TextInput
          multiline
          value={selfPR}
          onChangeText={setSelfPR}
          style={[styles.input, styles.textarea]}
          placeholder="意気込みなどを入力"
        />
        <Text style={[styles.label, { marginTop: 16 }]}>履歴書URL</Text>
        <TextInput
          value={resumeUrl}
          onChangeText={setResumeUrl}
          style={styles.input}
          placeholder="https://example.com/resume.pdf"
          autoCapitalize="none"
        />
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.button, loading && { opacity: 0.7 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>送信</Text>
          )}
        </Pressable>
      </View>
    </>
  );
}


const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  textarea: { height: 120, textAlignVertical: "top" },
  button: {
    backgroundColor: "#dc2626",
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
