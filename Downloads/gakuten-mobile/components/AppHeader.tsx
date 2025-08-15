import { useRouter } from "expo-router";
import { Menu } from "lucide-react-native";
import { useEffect, useState, useRef } from "react";
import { Image, Pressable, Text, View, Animated, Easing } from "react-native";
import { supabase } from "../src/lib/supabase";

interface AppHeaderProps {
  title: string;
}

export default function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");

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
    router.replace("/auth/login");
  };

  const handleMenuPress = () => {
    console.log("Menu pressed");
    // Placeholder for menu actions, e.g., show logout option
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        height: 56,
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
      <View style={{ position: "absolute", right: 16 }}>
        <Pressable onPress={handleMenuPress} style={{ padding: 8 }}>
          <Menu size={24} color="#000" />
        </Pressable>
      </View>
    </View>
  );
}