import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Dimensions, Easing, TextInput, Pressable, ActivityIndicator, Linking, Platform } from "react-native";
import * as LinkingExpo from "expo-linking";
import Svg, { Defs, RadialGradient as SvgRadialGradient, Stop, Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../src/lib/supabase";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "https://gakuten.co.jp";

const { width, height } = Dimensions.get("window");
const SPLASH_DURATION = 1200; // was 1500
const SPLASH_LOGO_SIZE = Math.min(260, Math.floor(width * 0.6));
const HERO_LOGO_SIZE = Math.min(140, Math.floor(width * 0.38));

const TERMS_URL = "https://culture.gakuten.co.jp/terms"; // 利用規約
const PRIVACY_URL = "https://culture.gakuten.co.jp/privacy"; // 個人情報取扱い

const HeroBlobBg = () => {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox="0 0 375 812"
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        <SvgRadialGradient id="grad1" cx="30%" cy="30%" r="50%">
          <Stop offset="0%" stopColor="#A0F0FF" stopOpacity="0.6" />
          <Stop offset="100%" stopColor="#A0F0FF" stopOpacity="0" />
        </SvgRadialGradient>
        <SvgRadialGradient id="grad2" cx="70%" cy="40%" r="40%">
          <Stop offset="0%" stopColor="#5ED0FF" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#5ED0FF" stopOpacity="0" />
        </SvgRadialGradient>
        <SvgRadialGradient id="grad3" cx="50%" cy="70%" r="60%">
          <Stop offset="0%" stopColor="#00BFFF" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#00BFFF" stopOpacity="0" />
        </SvgRadialGradient>
      </Defs>
      <Circle cx="110" cy="150" r="150" fill="url(#grad1)" />
      <Circle cx="280" cy="180" r="120" fill="url(#grad2)" />
      <Circle cx="180" cy="600" r="180" fill="url(#grad3)" />
    </Svg>
  );
};

export default function RootIndex() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  // Inline auth state
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPW, setShowPW] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  type Role = "student" | "company" | "company_admin" | "admin";
  const fetchUserRole = async (userId: string): Promise<Role> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (error || !data) return "student";
    return data.role as Role;
  };

  const jpError = (raw: string) => {
    const s = (raw || "").toLowerCase();
    if (s.includes("invalid login credentials")) return "メールアドレスまたはパスワードが正しくありません。";
    if (s.includes("email not confirmed")) return "メール認証が完了していません。メールをご確認ください。";
    return raw;
  };

  const handleLogin = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !password) {
      setError("メールとパスワードを入力してください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });
      if (signInError) throw signInError;
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      const role: Role = user ? await fetchUserRole(user.id) : "student";
      if (role !== "student") {
        await supabase.auth.signOut();
        setError("企業アカウントのログインはこのアプリではご利用いただけません。");
        return;
      }
      router.replace("/(student)");
    } catch (e: any) {
      setError(jpError(e?.message || "ログインに失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setError(null);
    setSuccess(null);
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail || !password) {
      setError("メールとパスワードを入力してください。");
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    setLoading(true);
    try {
      // WEB版と同等: Next.js の /api/signup にPOSTし、メール送信とredirectはサーバー側で統一制御
      const gradYear = new Date().getFullYear();
      const defaultGraduationMonth = `${gradYear}-03-31`;

      const payload = {
        email: targetEmail,
        password,
        first_name: "",
        last_name: "",
        referral_source: "mobile",
        referral_code: "",
        graduation_month: defaultGraduationMonth,
      };

      const res = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let json: any = {};
      try { json = await res.json(); } catch {}

      if (!res.ok) {
        const msg: string = json?.error || "登録に失敗しました。もう一度お試しください。";
        if (/already|exists|duplicate/i.test(msg)) {
          setError("既に登録済みのメールアドレスです。ログインしてください。");
        } else {
          setError(msg);
        }
      } else {
        setSuccess("確認メールを送信しました。メール記載の手順で認証を完了してください。");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (e: any) {
      setError(jpError(e?.message || "登録に失敗しました"));
    } finally {
      setLoading(false);
    }
  };
  // Handle deep links for Supabase email confirmations (native)
  useEffect(() => {
    const handleUrl = async (url?: string | null) => {
      if (!url) return;
      try {
        const parsed = LinkingExpo.parse(url);
        const qp = parsed.queryParams || {} as any;
        const token_hash = qp.token_hash as string | undefined;
        const type = (qp.type as string | undefined) || "signup";
        if (token_hash) {
          // Verify the email confirmation or other OTP-based links
          const { error } = await supabase.auth.verifyOtp({
            type: type as any, // 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change'
            token_hash,
          });
          if (error) {
            setError(jpError(error.message));
          } else {
            setSuccess("メール認証が完了しました。ログインできます。");
            // 取得したセッションで学生ダッシュボードへ
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const role: Role = await fetchUserRole(user.id);
              if (role === "student") router.replace("/(student)");
            }
          }
        }
      } catch (e: any) {
        // 解析や検証に失敗しても致命的ではない
        console.warn("Deep link handling error", e?.message || e);
      }
    };

    // Initial URL (app cold start)
    Linking.getInitialURL().then(handleUrl);
    // Runtime URL events
    const sub = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

  // Animated values for splash and hero opacity
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const [showHero, setShowHero] = useState(false);

  const logo1Opacity = useRef(new Animated.Value(0)).current;
  const logo1Scale = useRef(new Animated.Value(0.9)).current;
  const logo2Opacity = useRef(new Animated.Value(0)).current;
  const logo2Scale = useRef(new Animated.Value(0.9)).current;
  const heroTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });
    return () => listener.subscription?.unsubscribe?.();
  }, []);

  // Splash → Hero cross-fade animation
  useEffect(() => {
    // Start with splash visible, hero hidden
    Animated.timing(splashOpacity, {
      toValue: 1,
      duration: 0,
      useNativeDriver: true,
    }).start();
    Animated.timing(heroOpacity, {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logo1Opacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(logo1Scale, { toValue: 1, speed: 12, bounciness: 6, useNativeDriver: true }),
      ]),
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(logo2Opacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(logo2Scale, { toValue: 1, speed: 12, bounciness: 6, useNativeDriver: true }),
      ]),
    ]).start();

    const timeout = setTimeout(() => {
      // Cross-fade: splash fades out, hero fades in
      setShowHero(true);
      Animated.parallel([
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(heroTranslateY, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, SPLASH_DURATION);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoggedIn = !!session;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Splash Screen */}
      <Animated.View
        pointerEvents={showHero ? "none" : "auto"}
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
            opacity: splashOpacity,
            zIndex: 2,
          },
        ]}
      >
        <View style={{ flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Animated.Image
            source={require("../assets/images/logo6.png")}
            style={{ width: SPLASH_LOGO_SIZE, height: SPLASH_LOGO_SIZE, resizeMode: "contain", opacity: logo1Opacity, transform: [{ scale: logo1Scale }] }}
          />
          <Animated.Image
            source={require("../assets/images/IPO_logo2.png")}
            style={{ width: SPLASH_LOGO_SIZE, height: SPLASH_LOGO_SIZE, resizeMode: "contain", marginTop: 4, opacity: logo2Opacity, transform: [{ scale: logo2Scale }] }}
          />
        </View>
      </Animated.View>

      {/* Hero Screen */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: heroOpacity,
            zIndex: 1,
          },
        ]}
        pointerEvents={showHero ? "auto" : "none"}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F7FBFF" }]}>
          <HeroBlobBg />
          <Animated.View style={[styles.containerHero, { transform: [{ translateY: heroTranslateY }] }]}>
            <View style={styles.logos}>
              <Image
                source={require("../assets/images/logo6.png")}
                style={styles.logoLarge}
              />
              <Image
                source={require("../assets/images/IPO_logo2.png")}
                style={styles.logoLarge}
              />
            </View>

            {/* Segmented tabs */}
            <View style={styles.segmentWrap}>
              <Pressable
                onPress={() => { setMode("signup"); setError(null); setSuccess(null); }}
                style={[styles.segmentTab, mode === "signup" ? styles.segmentActive : styles.segmentInactive]}
              >
                <Text numberOfLines={1} ellipsizeMode="clip" style={[styles.segmentText, mode === "signup" ? styles.segmentTextActive : styles.segmentTextInactive]}>新規登録</Text>
              </Pressable>
              <Pressable
                onPress={() => { setMode("login"); setError(null); setSuccess(null); }}
                style={[styles.segmentTab, mode === "login" ? styles.segmentActive : styles.segmentInactive]}
              >
                <Text numberOfLines={1} ellipsizeMode="clip" style={[styles.segmentText, mode === "login" ? styles.segmentTextActive : styles.segmentTextInactive]}>ログイン</Text>
              </Pressable>
            </View>

            {/* Error / Success messages */}
            {error ? (
              <View style={styles.alertError}><Text style={styles.alertErrorText}>{error}</Text></View>
            ) : null}
            {success ? (
              <View style={styles.alertSuccess}><Text style={styles.alertSuccessText}>{success}</Text></View>
            ) : null}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>メールアドレス</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.inputLabel}>パスワード</Text>
                {mode === "login" && (
                  <Pressable onPress={() => router.push("/auth/forgot-password" as any)}>
                    <Text style={styles.linkText}>パスワードをお忘れ？</Text>
                  </Pressable>
                )}
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPW}
                autoCapitalize="none"
                style={styles.input}
              />
              <Pressable onPress={() => setShowPW((v) => !v)}>
                <Text style={styles.togglePW}>{showPW ? "非表示" : "表示"}</Text>
              </Pressable>
            </View>

            {/* Confirm Password for signup */}
            {mode === "signup" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>パスワード（確認）</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPW}
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            )}

            {mode === "signup" && (
              <View style={styles.termsWrap}>
                <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
                  <Text style={styles.termsLink}>利用規約</Text>
                </Pressable>
                <Text>および</Text>
                <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
                  <Text style={styles.termsLink}>個人情報取扱い</Text>
                </Pressable>
                <Text>をご確認のうえご登録ください。</Text>
              </View>
            )}

            {/* Primary action */}
            <TouchableOpacity
              style={[styles.button, styles.red, styles.buttonShadow, { marginTop: 6, opacity: loading ? 0.7 : 1 }]}
              onPress={mode === "signup" ? handleSignup : handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>{mode === "signup" ? "新規登録して始める" : "ログイン"}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerHero: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 200,
  },
  logos: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    resizeMode: "contain",
  },
  logoLarge: {
    width: 160,
    height: 56,
    resizeMode: "contain",
    alignSelf: "center",
    marginHorizontal: 8,
    marginVertical: 8,
  },
  titleHero: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
    color: "#0A0A0A",
    textShadowColor: "rgba(0,0,0,0.04)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    lineHeight: 30,
  },
  subtitleHero: {
    fontSize: 16,
    color: "#333333",
    textAlign: "center",
    marginBottom: 24,
    textShadowColor: "rgba(0,0,0,0.05)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  button: {
    minWidth: 260,
    paddingVertical: 15,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: "center",
    opacity: 0.95,
  },
  red: {
    backgroundColor: "#D33F49",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#D33F49",
  },
  blue: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  segmentWrap: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#E9EEF5",
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    width: "100%",
    maxWidth: 360,
  },
  segmentTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    paddingHorizontal: 12,
    minWidth: 140,
  },
  segmentActive: {
    backgroundColor: "#fff",
  },
  segmentInactive: {
    backgroundColor: "transparent",
  },
  segmentText: { fontWeight: "700" },
  segmentTextActive: { color: "#0A0A0A" },
  segmentTextInactive: { color: "#5B6B7C" },

  inputGroup: { width: "100%", maxWidth: 360, marginBottom: 10 },
  inputLabel: { fontSize: 12, color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  linkText: { fontSize: 12, color: "#dc2626" },
  togglePW: { alignSelf: "flex-end", fontSize: 12, color: "#6b7280", marginTop: 6 },

  alertError: { borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", padding: 10, borderRadius: 8, marginBottom: 8, maxWidth: 360 },
  alertErrorText: { color: "#b91c1c" },
  alertSuccess: { borderWidth: 1, borderColor: "#BBF7D0", backgroundColor: "#F0FDF4", padding: 10, borderRadius: 8, marginBottom: 8, maxWidth: 360 },
  alertSuccessText: { color: "#16a34a" },

  // Terms notice styles
  termsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
    marginBottom: 6,
    maxWidth: 360,
  },
  termsText: { color: "#374151" },
  termsLink: { color: "#2563eb", textDecorationLine: "underline" },
});