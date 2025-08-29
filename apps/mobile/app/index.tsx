import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Dimensions, Easing, SafeAreaView } from "react-native";
import Svg, { Defs, RadialGradient as SvgRadialGradient, Stop, Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../src/lib/supabase";

const { width, height } = Dimensions.get("window");
const SPLASH_DURATION = 1200; // was 1500
const SPLASH_LOGO_SIZE = Math.min(260, Math.floor(width * 0.6));
const HERO_LOGO_SIZE = Math.min(140, Math.floor(width * 0.38));

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

  const goStudent = () => {
    const target = "/(student)";
    if (isLoggedIn) router.push(target);
    else router.push(`/auth/login?next=${encodeURIComponent(target)}`);
  };

  const goIPO = () => {
    const target = "/(student)/ipo/dashboard";
    if (isLoggedIn) router.push(target);
    else router.push(`/auth/login?next=${encodeURIComponent(target)}`);
  };

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
                style={[styles.logo, { width: HERO_LOGO_SIZE, height: HERO_LOGO_SIZE }]}
              />
              <Image
                source={require("../assets/images/IPO_logo2.png")}
                style={[styles.logo, { marginTop: 4, marginLeft: 0, width: HERO_LOGO_SIZE, height: HERO_LOGO_SIZE }]}
              />
            </View>
            <Text style={styles.titleHero}>
              キャリア解像度を高め、未来を切り拓こう
            </Text>
            <Text style={styles.subtitleHero}>
              学生転職 × IPO大学 が、あなたの可能性を広げる
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.red, styles.buttonShadow]}
              onPress={goStudent}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>学生転職</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.blue, styles.buttonShadow]}
              onPress={goIPO}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>IPO大学</Text>
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
    justifyContent: "center",
    alignItems: "center",
  },
  logos: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    resizeMode: "contain",
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
});
