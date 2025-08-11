import AppHeader from "@/components/AppHeader";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

const items = [
  { label: "ユーザー管理", href: "/admin/users" },
  { label: "企業管理", href: "/admin/companies" },
  { label: "レポート", href: "/admin/reports" },
  { label: "設定", href: "/admin/settings" },
];

export default function AdminHome() {
  return (
    <View style={{ flex: 1 }}>
      <AppHeader />
      <View style={{ flex: 1, padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>管理者ダッシュボード</Text>
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
