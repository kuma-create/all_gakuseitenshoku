import { Link } from "expo-router";
import { View, Text, Pressable } from "react-native";
import AppHeader from "@/components/AppHeader";

const items = [
  { label: "求人作成", href: "/company/jobs/new" },
  { label: "応募者一覧", href: "/company/candidates" },
  { label: "メッセージ", href: "/company/messages" },
  { label: "設定", href: "/company/settings" },
];

export default function CompanyHome() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <View style={{ flex: 1, padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>企業ダッシュボード</Text>
        <View style={{ gap: 10 }}>
          {items.map((it) => (
            <Link key={it.href} href={it.href} asChild>
              <Pressable
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  backgroundColor: "#fff",
                }}
              >
                <Text style={{ fontWeight: "600" }}>{it.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
    </View>
  );
}
