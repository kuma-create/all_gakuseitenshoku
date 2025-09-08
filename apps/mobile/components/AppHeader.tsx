import { useRouter, usePathname } from "expo-router";
import { Menu } from "lucide-react-native";
import { useEffect, useState, useRef } from "react";
import { Image, Pressable, Text, View, Animated, Easing, Modal, TouchableOpacity, ScrollView } from "react-native";
import { supabase } from "../src/lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationBell } from "./notifications/NotificationBell";

interface AppHeaderProps {
  title: string;
}

export default function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>("");

  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top, 12);
  const baseBarHeight = 56;
  const headerHeight = baseBarHeight + headerPaddingTop;
  const menuTop = headerHeight + 8;

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const navigateAndClose = (path: string) => {
    closeMenu();
    router.push(path as any);
  };

  // --- Logo spin animations ---
  const homeSpin = useRef(new Animated.Value(0)).current;
  const ipoSpin = useRef(new Animated.Value(0)).current;

  const spinOnce = (val: Animated.Value, onComplete?: () => void) => {
    val.setValue(0);
    Animated.timing(val, {
      toValue: 1,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (onComplete) onComplete();
    });
  };

  const homeRotate = homeSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const ipoRotate = ipoSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleHomeLogoPress = () => {
    spinOnce(homeSpin, () => router.push("/"));
  };

  const handleIpoLogoPress = () => {
    spinOnce(ipoSpin, () => router.push("/ipo/dashboard"));
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email || "");
      }
    })();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const logoutAndClose = async () => {
    await supabase.auth.signOut();
    closeMenu();
    router.replace("/");
  };

  const handleMenuPress = () => {
    openMenu();
  };

  const menuItems: { label: React.ReactNode; onPress: () => void }[] = [
    {
      label: (
        <Image
          source={require("../assets/images/logo5.png")}
          style={{ width: 160, height: 80, resizeMode: "contain" }}
        />
      ),
      onPress: () => navigateAndClose("/"),
    },
    {
      label: (
        <Image
          source={require("../assets/images/IPO_logo2.png")}
          style={{ width: 160, height: 80, resizeMode: "contain" }}
        />
      ),
      onPress: () => navigateAndClose("/ipo/dashboard"),
    },
  ];

  // --- Secondary nav (AppHeader2) setup ---
  const header2NavItems: Array<{ label: string; path: string }> = [
    { label: "ホーム", path: "/ipo/dashboard" },
    { label: "学生転職", path: "/(student)" },
    { label: "求人検索", path: "/(student)/jobs" },
    { label: "スカウト", path: "/(student)/scouts" },
    { label: "チャット", path: "/(student)/chat" },
    { label: "友達紹介", path: "/referral" },
  ];

  // Normalize paths by removing Expo Router group segments like /(student)
  const normalizePath = (p: string) => p.replace(/\([^/]+\)/g, "").replace(/\/+/g, "/");

  const deriveActiveLabel = (p: string) => {
    const np = normalizePath(p || "/");
    let matched: { label: string; path: string } | undefined;
    for (const it of header2NavItems) {
      const itNorm = normalizePath(it.path);
      if (np.startsWith(itNorm)) {
        if (!matched || itNorm.length > normalizePath(matched.path).length) {
          matched = it;
        }
      }
    }
    return matched ? matched.label : "ホーム";
  };

  const activeHeader2Label = deriveActiveLabel(pathname || "/");

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingTop: headerPaddingTop,
          height: headerHeight,
          backgroundColor: "#f9fafb",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
          position: "relative",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          <Pressable onPress={handleHomeLogoPress}>
            <Animated.Image
              source={require("../assets/images/logo2.png")}
              style={{
                width: 32,
                height: 32,
                resizeMode: "contain",
                marginRight: 16,
                transform: [{ rotateY: homeRotate as unknown as string }],
              }}
            />
          </Pressable>
          <Pressable onPress={handleIpoLogoPress}>
            <Animated.Image
              source={require("../assets/images/IPO_logo.png")}
              style={{
                width: 32,
                height: 32,
                resizeMode: "contain",
                marginLeft: 16,
                transform: [{ rotateY: ipoRotate as unknown as string }],
              }}
            />
          </Pressable>
        </View>
        <View style={{ position: "absolute", right: 16, top: headerPaddingTop, height: baseBarHeight, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ marginRight: 8 }}>
              <NotificationBell />
            </View>
            <Pressable onPress={handleMenuPress} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="メニューを開く">
              <Menu size={24} color="#000" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Secondary navigation bar */}
      <AppHeader2
        onNavigate={(p) => router.push(p as any)}
        items={header2NavItems}
        activeLabel={activeHeader2Label}
        onPressItem={() => {}}
        currentPath={pathname || "/"}
      />

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
        {/* Backdrop */}
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.2)" }} onPress={closeMenu} />
        {/* Menu Box */}
        <View
          style={{
            position: "absolute",
            top: menuTop,
            right: 12,
            width: 240,
            backgroundColor: "#fff",
            borderRadius: 12,
            paddingVertical: 8,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          {/* Header (user) */}
          <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
            <Text style={{ fontSize: 14, color: "#6b7280" }}>サインイン中</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }} numberOfLines={1}>
              {userName || "ゲスト"}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 300 }}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={item.onPress}
                style={{ paddingVertical: 12, paddingHorizontal: 14 }}
                accessibilityRole="button"
              >
                {typeof item.label === "string" ? (
                  <Text style={{ fontSize: 16, color: "#111827" }}>{item.label}</Text>
                ) : (
                  item.label
                )}
              </TouchableOpacity>
            ))}
            <View style={{ height: 8 }} />
            <TouchableOpacity onPress={logoutAndClose} style={{ paddingVertical: 12, paddingHorizontal: 14 }} accessibilityRole="button">
              <Text style={{ fontSize: 16, color: "#ef4444", fontWeight: "600" }}>ログアウト</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/* === AppHeader2 (unified here) === */

export type AppHeader2Props = {
  onNavigate: (path: string) => void;
  items?: Array<{ label: string; path: string }>;
  /** 現在のアクティブタブ名（未指定なら「ホーム」） */
  activeLabel?: string;
  /** タブ押下時に親へ通知（任意） */
  onPressItem?: (label: string, path: string) => void;
  /** 現在のパス（色テーマ判定用） */
  currentPath?: string;
};

export function AppHeader2({ onNavigate, items, activeLabel, onPressItem, currentPath }: AppHeader2Props) {
  const navItems: Array<{ label: string; path: string }> =
    items && items.length
      ? items
      : [
          { label: "ホーム", path: "/ipo/dashboard" },
          { label: "学生転職", path: "/ipo" },
          { label: "求人検索", path: "/jobs" },
          { label: "スカウト", path: "/scouts" },
          { label: "チャット", path: "/chat"},
          { label: "友達紹介", path: "/referral" },
        ];

  const current = activeLabel ?? "ホーム";
  const isIpoPage = (currentPath ?? "/").startsWith("/ipo");
  const BRAND_COLOR = isIpoPage ? "#2563EB" : "#DC2626"; // blue for /ipo, red otherwise

  return (
    <View
      style={{
        backgroundColor: BRAND_COLOR,
        paddingVertical: 10,
        borderRadius: 0,
        marginBottom: 12,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 24 }}
      >
        {navItems.map((it) => (
          <TouchableOpacity
            key={it.label}
            onPress={() => {
              if (typeof onPressItem === "function") onPressItem(it.label, it.path);
              onNavigate(it.path);
            }}
            activeOpacity={0.8}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              backgroundColor: it.label === current ? "#FFFFFF" : "transparent",
              borderRadius: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: it.label === current ? BRAND_COLOR : "#FFFFFF",
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                {it.label}
              </Text>
              {it.label === "おすすめ" ? (
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "#FACC15",
                    marginLeft: 8,
                  }}
                />
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}