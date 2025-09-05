import { useRouter } from "expo-router";
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