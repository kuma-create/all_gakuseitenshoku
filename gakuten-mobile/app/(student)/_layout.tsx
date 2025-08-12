// app/(student)/_layout.tsx
import { Link, Slot, usePathname } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function BottomBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const Item = ({ href, label, emoji }:{ href:string; label:string; emoji:string }) => (
    <Link href={href} asChild>
      <Pressable style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
        <Text style={{ fontSize: 18, marginBottom: 2 }}>{emoji}</Text>
        <Text style={{ fontSize: 11, fontWeight: isActive(href) ? "700" : "500", color: isActive(href) ? "#ef4444" : "#334155" }}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );

  return (
    <SafeAreaView style={{ backgroundColor: "#fff" }} edges={["bottom"]}>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff", height: 58 }}>
        <Item href="/(student)" label="ホーム"   emoji="🏠" />
        <Item href="/(student)/jobs"   label="探す"     emoji="🔎" />
        <Item href="/(student)/scouts" label="スカウト" emoji="📩" />
        <Item href="/(student)/chat"   label="チャット" emoji="💬" />
        <Item href="/(student)/ipo"    label="IPO大学" emoji="🎓" />
      </View>
    </SafeAreaView>
  );
}

export default function StudentLayout() {
  const pathname = usePathname();
  const hideBar = pathname.startsWith("/auth"); // 隠したいパスがあればここに追加

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {!hideBar && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff" }}>
          <BottomBar />
        </View>
      )}
    </View>
  );
}