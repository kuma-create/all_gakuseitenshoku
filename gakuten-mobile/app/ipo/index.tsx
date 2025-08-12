import { Link } from "expo-router";
import { View, Text, ScrollView, Pressable } from "react-native";

export default function IPOHome() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 12 }}>
        IPO大学
      </Text>
      <Text style={{ color: "#666", marginBottom: 16 }}>
        就活対策 / キャリア相談 / 診断コンテンツ をここに集約します。
      </Text>

      {/* サンプル：メニューカード */}
      <View style={{ gap: 12 }}>
        <Pressable
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 12,
          }}
        >
          <Text style={{ fontWeight: "600" }}>自己分析・診断</Text>
          <Text style={{ color: "#666", marginTop: 4 }}>
            強み・弱み、向いている職種を診断
          </Text>
        </Pressable>

        <Pressable
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 12,
          }}
        >
          <Text style={{ fontWeight: "600" }}>面接対策</Text>
          <Text style={{ color: "#666", marginTop: 4 }}>
            よくある質問と模範回答、録音練習
          </Text>
        </Pressable>

        <Link href="/(student)/(tabs)/chat" asChild>
          <Pressable
            style={{
              padding: 16,
              borderWidth: 1,
              borderColor: "#eee",
              borderRadius: 12,
            }}
          >
            <Text style={{ fontWeight: "600" }}>キャリア相談（チャット）</Text>
            <Text style={{ color: "#666", marginTop: 4 }}>
              担当者に質問・相談できます
            </Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}