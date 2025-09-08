"use client";
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";

export type AppHeader2Props = {
  onNavigate: (path: string) => void;
  items?: Array<{ label: string; path: string }>;
  /** 現在のアクティブタブ名（未指定なら「ホーム」） */
  activeLabel?: string;
};

/**
 * Reusable header with pill buttons (moved from IPOMobileDashboard)
 */
export function AppHeader2({ onNavigate, items, activeLabel }: AppHeader2Props) {
  const navItems: Array<{ label: string; path: string }> =
    items && items.length
      ? items
      : [
          { label: "ホーム", path: "/ipo/demo" },
          { label: "学生転職", path: "/" },
          { label: "求人検索", path: "/jobs" },
          { label: "スカウト", path: "/scouts" },
          { label: "チャット", path: "/chat"},
          { label: "友達紹介", path: "/"},
        ];

  const current = activeLabel ?? "ホーム";
  const BRAND_BLUE = "#2563EB";

  return (
    <View
      style={{
        backgroundColor: BRAND_BLUE,
        paddingVertical: 10,
        borderRadius: 12,
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
            onPress={() => onNavigate(it.path)}
            activeOpacity={0.8}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              backgroundColor: it.label === current ? "#FFFFFF" : "transparent",
              borderRadius: 999,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: it.label === current ? BRAND_BLUE : "#FFFFFF",
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
export default AppHeader2;