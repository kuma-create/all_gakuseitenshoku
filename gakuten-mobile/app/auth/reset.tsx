import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasRecovery, setHasRecovery] = useState<boolean | null>(null);

  // リカバリーセッションがあるかを確認（メールのリンクから来ているか）
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      // recovery セッションでなくても updateUser は可能だが、ガイドとして状態を示す
      const ok = !!data.session; // ここでは存在可否のみチェック
      if (active) setHasRecovery(ok);
    })();
    return () => { active = false; };
  }, []);

  const validate = (): string | null => {
    if (!pw || pw.length < 8) return "8文字以上で入力してください";
    if (pw !== pw2) return "パスワードが一致しません";
    return null;
  };

  const update = async () => {
    const v = validate();
    if (v) { setErr(v); return; }
    setErr(null);
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setDone(true);
      // 1.5秒後にログイン画面へ
      setTimeout(() => {
        router.replace("/auth/login");
      }, 1500);
    } catch (e:any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:24 }}>
        <Text style={{ fontWeight:"800", fontSize:18, marginBottom:8 }}>パスワードを更新しました</Text>
        <Text>自動でログイン画面に戻ります…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:24 }}>
      <Text style={{ fontWeight:"800", fontSize:18, marginBottom:16 }}>新しいパスワード</Text>

      {hasRecovery === false && (
        <Text style={{ color:"#b91c1c", marginBottom:8, textAlign:"center", maxWidth:420 }}>
          メールのリセットリンクからこの画面を開いてください。
        </Text>
      )}

      {/* 新しいパスワード */}
      <TextInput
        value={pw}
        onChangeText={setPw}
        placeholder="新しいパスワード（8文字以上）"
        secureTextEntry={!show}
        autoCapitalize="none"
        style={{ width:"90%", maxWidth:420, borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, paddingVertical:12, paddingHorizontal:12, marginBottom:8 }}
      />

      {/* 確認用パスワード */}
      <TextInput
        value={pw2}
        onChangeText={setPw2}
        placeholder="もう一度入力"
        secureTextEntry={!show}
        autoCapitalize="none"
        style={{ width:"90%", maxWidth:420, borderWidth:1, borderColor:"#e5e7eb", borderRadius:8, paddingVertical:12, paddingHorizontal:12, marginBottom:8 }}
      />

      {/* 表示/非表示 切り替え */}
      <Pressable onPress={() => setShow((s) => !s)} style={{ marginBottom: 8 }}>
        <Text style={{ color:"#6b7280", fontSize:12 }}>{show ? "非表示にする" : "表示する"}</Text>
      </Pressable>

      {err ? <Text style={{ color:"#b91c1c", marginBottom:8 }}>{err}</Text> : null}

      <Pressable
        onPress={update}
        disabled={loading}
        style={{ alignItems:"center", justifyContent:"center", paddingVertical:14, paddingHorizontal:24, borderRadius:10, backgroundColor:"#dc2626", opacity: loading ? .7 : 1 }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color:"#fff", fontWeight:"700" }}>更新する</Text>}
      </Pressable>

      {Platform.OS === "web" ? (
        <Text style={{ marginTop:10, color:"#6b7280", fontSize:12 }}>※ Webの開発環境では同一タブで開くことがあります。</Text>
      ) : null}
    </View>
  );
}
