import { useRouter } from "expo-router";
import { Menu } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { supabase } from "../src/lib/supabase";

interface AppHeaderProps {
  title: string;
}

export default function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");

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
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        height: 56,
        backgroundColor: "#f9fafb",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
      }}
    >
      <Pressable onPress={() => router.push("/")}>
        <Image
          source={require("../assets/images/logo2.png")}
          style={{ width: 32, height: 32, resizeMode: "contain" }}
        />
      </Pressable>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>{title}</Text>
      </View>
      <Pressable onPress={handleMenuPress} style={{ padding: 8 }}>
        <Menu size={24} color="#000" />
      </Pressable>
    </View>
  );
}