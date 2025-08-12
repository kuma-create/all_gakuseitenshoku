// app/(student)/_layout.tsx
import { Feather } from '@expo/vector-icons';
import { Link, Slot, usePathname, useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const HEADER_HEIGHT = 56;
const BOTTOM_BAR_HEIGHT = 58;

function BottomBar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const Item = ({ href, label, iconName }:{ href:string; label:string; iconName:FeatherIconName }) => {
    const active = isActive(href);
    const color = active ? "#2563eb" : "#94a3b8";
    return (
      <Link href={href} asChild>
        <Pressable style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
          <Feather name={iconName} size={22} color={color} />
          <Text style={{ fontSize: 11, fontWeight: active ? "700" : "500", color }}>
            {label}
          </Text>
        </Pressable>
      </Link>
    );
  };

  return (
    <SafeAreaView style={{ backgroundColor: "#fff" }} edges={["bottom"]}>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff", height: BOTTOM_BAR_HEIGHT }}>
        <Item href="/(student)" label="ホーム"   iconName="home" />
        <Item href="/(student)/jobs"   label="探す"     iconName="search" />
        <Item href="/(student)/scouts" label="スカウト" iconName="mail" />
        <Item href="/(student)/chat"   label="チャット" iconName="message-circle" />
        <Item href="/(student)/ipo"    label="IPO大学" iconName="book" />
      </View>
    </SafeAreaView>
  );
}

function getTitle(pathname: string) {
  if (pathname === "/(student)" || pathname === "/(student)/index") return "ホーム";
  if (pathname.startsWith("/(student)/jobs")) return "探す";
  if (pathname.startsWith("/(student)/scouts")) return "スカウト";
  if (pathname.startsWith("/(student)/chat")) return "チャット";
  if (pathname.startsWith("/(student)/ipo")) return "IPO大学";
  return "";
}

export default function StudentLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const hideBar = pathname.startsWith("/auth"); // 隠したいパスがあればここに追加
  const hideHeader = pathname.startsWith("/auth");
  const title = getTitle(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 上部ヘッダー（ネイティブヘッダーは_offにしてある想定） */}
      {!hideHeader && (
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "#fff" }}>
          <View
            style={{
              height: HEADER_HEIGHT,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              backgroundColor: "#fff",
              borderBottomWidth: 1,
              borderBottomColor: "#f1f5f9",
            }}
          >
            <View style={{ width: 60 }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Image
                source={require("../../assets/images/logo2.png")}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
                accessibilityLabel="Gakuten ロゴ"
              />
            </View>
            <View style={{ width: 60 }} />
          </View>
        </SafeAreaView>
      )}

      {/* コンテンツ領域：下部バーに隠れないように余白を確保 */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      {/* 下部タブバー */}
      {!hideBar && <BottomBar />}
    </View>
  );
}