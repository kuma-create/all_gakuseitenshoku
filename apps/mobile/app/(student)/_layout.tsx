import { Feather } from '@expo/vector-icons';
import { Link, Slot, usePathname } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const BOTTOM_BAR_HEIGHT = 58;

function BottomBar() {
  const pathname = usePathname();

  // Normalize both the current pathname and hrefs by removing any /(group) parts.
  const normalize = (p: string) => {
    // remove route group segments: "/(xxx)"
    let s = p.replace(/\/\([^/]+\)/g, "");
    // collapse multiple slashes
    s = s.replace(/\/+/g, "/");
    // remove trailing slash except root
    if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
    // ensure leading slash and avoid empty string (treat as root "/")
    if (!s.startsWith("/")) s = "/" + s;
    if (s === "" || s === "//") s = "/";
    return s;
  };

  const normPath = normalize(pathname);

  const isActive = (href: string) => {
    const target = normalize(href);
    return normPath === target || (target !== "/" && normPath.startsWith(target + "/"));
  };

  const Item = ({
    href,
    label,
    iconName,
    active,
  }: {
    href: string;
    label: string;
    iconName: FeatherIconName;
    active: boolean;
  }) => {
    const color = active ? "#2563eb" : "#94a3b8";
    const fontWeight = active ? "700" : "500";
    const fontSize = active ? 12 : 11;
    const iconSize = active ? 24 : 22;
    return (
      <Link href={href} asChild>
        <Pressable style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
          <Feather name={iconName} size={iconSize} color={color} />
          <Text style={{ fontSize, fontWeight, color }}>{label}</Text>
        </Pressable>
      </Link>
    );
  };

  return (
    <SafeAreaView style={{ backgroundColor: "#fff" }} edges={["bottom"]}>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e5e7eb", backgroundColor: "#fff", height: BOTTOM_BAR_HEIGHT }}>
        <Item href="/ipo/dashboard" label="ホーム" iconName="home" active={isActive("/ipo/dashboard")} />
        <Item href="/ipo/analysis" label="自己分析" iconName="activity" active={isActive("/ipo/analysis")} />
        <Item href="/(student)/profile" label="プロフィール" iconName="user" active={isActive("/(student)/profile")} />
        <Item href="/ipo/ES" label="ES管理" iconName="edit-3" active={isActive("/ipo/ES")} />
        <Item href="/ipo/selection" label="選考管理" iconName="clipboard" active={isActive("/ipo/selection")} />
      </View>
    </SafeAreaView>
  );
}

function getTitle(pathname: string) {
  if (pathname === "/(student)" || pathname === "/(student)/index") return "ホーム";
  if (pathname.startsWith("/(student)/jobs")) return "探す";
  if (pathname.startsWith("/(student)/scouts")) return "スカウト";
  if (pathname.startsWith("/(student)/chat")) return "チャット";
  if (pathname.startsWith("/(student)/ipo/dashboard")) return "IPO大学";
  return "";
}

export default function StudentLayout() {
  const pathname = usePathname();

  // Normalize pathname to ignore route groups like /(student)
  const normalize = (p: string) => {
    let s = p.replace(/\/\([^/]+\)/g, ""); // remove /(group)
    s = s.replace(/\/+/g, "/");
    if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
    if (!s.startsWith("/")) s = "/" + s;
    if (s === "" || s === "//") s = "/";
    return s;
  };
  const normPath = normalize(pathname);

  // Hide bar/header on auth and on any /ipo path
  const hideBar = normPath.startsWith("/auth");
  const hideHeader = normPath.startsWith("/auth");
  const title = getTitle(pathname);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {!hideHeader && <AppHeader title={title} />}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {!hideBar && <BottomBar />}
    </View>
  );
}