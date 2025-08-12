import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/lib/supabase";

/**
 * パスワード再設定メール送信（モバイル版）
 * Web版と同じく、Next.js の `/api/password-reset` を叩きます。
 * 環境変数 `EXPO_PUBLIC_WEB_BASE_URL` を設定しておく想定（例: https://culture.gakuten.co.jp）
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const target = email.trim();
    if (!target) {
      setError("メールアドレスを入力してください");
      return;
    }

    // リセット後に遷移させるURL（SupabaseのAuth設定で許可済みのドメインにすること）
    // モバイル（ネイティブ）はディープリンク、Webは現在のオリジンを既定に。
    const redirectTo =
      Platform.OS === "web"
        ? `${window.location.origin}/auth/reset`
        : process.env.EXPO_PUBLIC_PW_RESET_REDIRECT || "myapp://auth/reset"; // 必要に応じて変更

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(target, { redirectTo });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setError(String(e?.message ?? e ?? "エラーが発生しました"));
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ width: "100%", maxWidth: 420, alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 8 }}>メールを送信しました</Text>
          <Text style={{ color: "#6b7280", textAlign: "center" }}>
            受信トレイに届くリンクからパスワードを再設定してください。
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 14 }}>
            <Text style={{ color: "#dc2626", fontWeight: "600" }}>戻る</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{ width: "100%", maxWidth: 420 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 16 }}>
            パスワードをお忘れですか？
          </Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ marginBottom: 6, fontSize: 12 }}>メールアドレス</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="your@mail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 12 }}
            />
          </View>

          {error && (
            <Text style={{ color: "#b91c1c", marginBottom: 8, fontSize: 12 }}>{error}</Text>
          )}

          <Pressable
            disabled={isLoading}
            onPress={handleSubmit}
            style={{ alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 10, backgroundColor: "#dc2626", opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700" }}>送信する</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ alignItems: "center", paddingVertical: 10 }}>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>戻る</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}