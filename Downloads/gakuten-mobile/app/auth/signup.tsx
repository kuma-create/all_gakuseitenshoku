// app/auth/signup.tsx
import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, Link } from "expo-router";
import { supabase } from "../../src/lib/supabase";

type UserType = "student" | "company";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<UserType>("student");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => !!email && !!password && !!confirmPassword && password === confirmPassword,
    [email, password, confirmPassword]
  );

  const handleSignUp = async () => {
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    if (!email || !password) {
      setError("メールとパスワードを入力してください");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { user_type: userType }, // プロフィール用メタデータに種類を保存
          emailRedirectTo: undefined,
        },
      });
      if (error) throw error;

      setSuccess("確認メールを送信しました。メール記載の手順で認証を完了してください。");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setError(e?.message ?? "登録に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
          paddingHorizontal: 16,
          backgroundColor: "#fff",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 440,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "#ffffff",
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {/* Header */}
          <View style={{ padding: 20, borderBottomWidth: 1, borderColor: "#f3f4f6" }}>
            <Text style={{ fontSize: 22, fontWeight: "800" }}>アカウント登録</Text>
            <Text style={{ marginTop: 6, color: "#6b7280" }}>
              必要情報を入力して、アカウントを作成しましょう
            </Text>
          </View>

          {/* Content */}
          <View style={{ padding: 20 }}>
            {/* Tabs */}
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                {(["student", "company"] as UserType[]).map((t) => {
                  const active = userType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setUserType(t)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        alignItems: "center",
                        backgroundColor: active ? "#ef4444" : "#ffffff",
                      }}
                    >
                      <Text style={{ color: active ? "#fff" : "#111827", fontWeight: "600" }}>
                        {t === "student" ? "学生" : "企業"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                {userType === "student"
                  ? "学生アカウントでは、求人検索、応募、企業とのメッセージングなどが可能です。"
                  : "企業アカウントでは、求人掲載、応募者管理、学生とのメッセージングなどが可能です。"}
              </Text>
            </View>

            {/* Alerts */}
            {error ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#ef4444",
                  backgroundColor: "#fef2f2",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: "#b91c1c" }}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#22c55e",
                  backgroundColor: "#f0fdf4",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: "#16a34a" }}>{success}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={{ gap: 12 }}>
              {/* Email */}
              <View>
                <Text style={{ marginBottom: 6, fontSize: 12 }}>メールアドレス</Text>
                <View style={{ position: "relative" }}>
                  <Feather
                    name="mail"
                    size={18}
                    color="#9ca3af"
                    style={{ position: "absolute", left: 10, top: 14 }}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="#9ca3af"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingLeft: 36,
                      paddingRight: 12,
                    }}
                  />
                </View>
              </View>

              {/* Password */}
              <View>
                <Text style={{ marginBottom: 6, fontSize: 12 }}>パスワード</Text>
                <View style={{ position: "relative" }}>
                  <Feather
                    name="lock"
                    size={18}
                    color="#9ca3af"
                    style={{ position: "absolute", left: 10, top: 14 }}
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingLeft: 36,
                      paddingRight: 44,
                    }}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    style={{ position: "absolute", right: 8, top: 8, padding: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="パスワードの表示切替"
                  >
                    <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#6b7280" />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View>
                <Text style={{ marginBottom: 6, fontSize: 12 }}>パスワード（確認）</Text>
                <View style={{ position: "relative" }}>
                  <Feather
                    name="lock"
                    size={18}
                    color="#9ca3af"
                    style={{ position: "absolute", left: 10, top: 14 }}
                  />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingLeft: 36,
                      paddingRight: 44,
                    }}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    style={{ position: "absolute", right: 8, top: 8, padding: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel="パスワードの表示切替"
                  >
                    <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#6b7280" />
                  </Pressable>
                </View>
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSignUp}
                disabled={loading || !canSubmit || !!success}
                style={{
                  marginTop: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: "#dc2626",
                  opacity: loading || !canSubmit || !!success ? 0.6 : 1,
                }}
              >
                {loading ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "700" }}>登録中...</Text>
                  </View>
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>アカウント作成</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Footer */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: "#6b7280" }}>
                すでにアカウントをお持ちの方は{" "}
              </Text>
              <Link
                href="/auth/login"
                style={{ color: "#dc2626", fontWeight: "600", fontSize: 12 }}
                accessibilityRole="link"
              >
                ログイン
              </Link>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}