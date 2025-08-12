import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
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

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#f9fafb",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
      }}
    >
      <View>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>{title}</Text>
        <Text style={{ fontWeight: "600" }}>{userName}</Text>
      </View>
      <Pressable onPress={handleLogout}>
        <Text style={{ color: "#dc2626", fontWeight: "600" }}>ログアウト</Text>
      </Pressable>
    </View>
  );
}