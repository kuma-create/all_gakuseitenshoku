import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { ROLE_DEST } from "../../src/constants/routes";
import { supabase } from "../../src/lib/supabase";

type Role = "student" | "company" | "company_admin" | "admin";

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string; redirect?: string }>();
  const nextPath = params?.next as string | undefined;
  const redirect = params?.redirect as string | undefined;

  // パスワードログインのみ
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPW, setShowPW] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DB から本物の role を取得（見つからなければ "student" 扱い）
  const fetchUserRole = async (userId: string): Promise<Role> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (error || !data) return "student";
    return data.role as Role;
  };

  const toDest = (r: Role) => {
    // next / redirect があれば最優先（既存動作維持）
    if (redirect) return String(redirect);
    if (nextPath) return String(nextPath);
    // それ以外はロール別の既定遷移先に委譲
    return ROLE_DEST[r] ?? "/";
  };

  // ---- パスワードログインのみ ----
  const handlePasswordLogin = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !password) {
      return Alert.alert("未入力", "メールとパスワードを入力してください。");
    }
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });
      if (signInError) throw signInError;

      // セッション更新
      await supabase.auth.refreshSession();

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const realRole: Role = authUser ? await fetchUserRole(authUser.id) : "student";

      // 学生以外はこの画面からのログインをブロック
      if (realRole !== "student") {
        await supabase.auth.signOut();
        setError("企業アカウントのログインはこのアプリではご利用いただけません。");
        Alert.alert("学生専用", "企業アカウントのログインはこのアプリではご利用いただけません。");
        return;
      }

      router.replace(toDest(realRole));
    } catch (e: any) {
      const msg: string = (e?.message || "ログインに失敗しました").toString();
      setError(jpError(msg));
    } finally {
      setLoading(false);
    }
  };

  const jpError = (raw: string) => {
    const s = raw.toLowerCase();
    if (s.includes("invalid login credentials")) return "メールアドレスまたはパスワードが正しくありません。";
    if (s.includes("email not confirmed")) return "メール認証が完了していません。メールをご確認ください。";
    return raw;
  };

  // ---- UI（学生・パスワード専用）----
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#fff" }}>
      {/* カード */}
      <View style={{ width: "100%", maxWidth: 420, borderRadius: 24, padding: 20, backgroundColor: "rgba(255,255,255,0.9)", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 16 }}>
        {/* 見出し */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "800" }}>ログイン</Text>
          <Text style={{ marginTop: 4, color: "#666" }}>あなたのキャリアを切り拓こう</Text>
        </View>

        {/* エラー */}
        {error && (
          <View style={{ flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", marginBottom: 8 }}>
            <Feather name="alert-circle" size={16} color="#b91c1c" />
            <Text style={{ marginLeft: 8, color: "#b91c1c" }}>{error}</Text>
          </View>
        )}

        {/* メール */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ marginBottom: 6, fontSize: 12 }}>メールアドレス</Text>
          <View style={{ position: "relative" }}>
            <Feather name="mail" size={18} color="#9ca3af" style={{ position: "absolute", left: 10, top: 14 }} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="your@mail.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingVertical: 12, paddingLeft: 36, paddingRight: 12 }}
            />
          </View>
        </View>

        {/* パスワード */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ marginBottom: 6, fontSize: 12 }}>パスワード</Text>
            <Pressable onPress={() => router.push("/auth/forgot-password" as any)}>
              <Text style={{ fontSize: 12, color: "#dc2626" }}>パスワードをお忘れ？</Text>
            </Pressable>
          </View>
          <View style={{ position: "relative" }}>
            <Feather name="lock" size={18} color="#9ca3af" style={{ position: "absolute", left: 10, top: 14 }} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPW}
              autoCapitalize="none"
              style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingVertical: 12, paddingLeft: 36, paddingRight: 36 }}
            />
            <Pressable onPress={() => setShowPW((p) => !p)} style={{ position: "absolute", right: 10, top: 10, padding: 6 }}>
              <Feather name={showPW ? "eye-off" : "eye"} size={18} color="#9ca3af" />
            </Pressable>
          </View>
        </View>

        {/* 送信 */}
        <Pressable
          onPress={handlePasswordLogin}
          disabled={loading}
          style={{ alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 10, backgroundColor: "#dc2626", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700" }}>ログイン</Text>
          )}
        </Pressable>

        {/* サインアップリンク */}
        <View style={{ marginTop: 18, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
          <Text style={{ color: "#6b7280", fontSize: 12 }}>アカウントをお持ちでない方は </Text>
          <Link
            href="/auth/signup"
            style={{ color: "#dc2626", fontWeight: "600", fontSize: 12 }}
            accessibilityRole="link"
          >
            新規登録
          </Link>
        </View>
      </View>
    </View>
  );
}