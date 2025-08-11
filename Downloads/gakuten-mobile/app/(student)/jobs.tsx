import React, { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";

type Job = { id: string; title: string; company: string; location: string };

const MOCK_JOBS: Job[] = [
  { id: "1", title: "長期インターン（営業）", company: "Make Culture Inc.", location: "東京" },
  { id: "2", title: "エンジニアインターン", company: "Gakuten", location: "フルリモート" },
  { id: "3", title: "マーケティングアシスタント", company: "Pivot", location: "東京/在宅可" },
];

export default function JobsScreen() {
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>求人を探す</Text>
      <FlatList
        data={MOCK_JOBS}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const isSaved = saved[item.id];
          return (
            <View style={{ borderWidth:1, borderColor:"#e5e7eb", borderRadius:10, backgroundColor:"#fff", padding:14 }}>
              <Text style={{ fontWeight:"800" }}>{item.title}</Text>
              <Text style={{ color:"#374151" }}>{item.company}・{item.location}</Text>
              <View style={{ height: 8 }} />
              <Pressable
                onPress={() => setSaved(s => ({ ...s, [item.id]: !isSaved }))}
                style={{
                  alignSelf: "flex-start",
                  paddingVertical: 8, paddingHorizontal: 12,
                  borderRadius: 8, borderWidth: 1, borderColor: "#111827"
                }}
              >
                <Text style={{ fontWeight:"700" }}>{isSaved ? "保存済み" : "保存する"}</Text>
              </Pressable>
            </View>
          );
        }}
      />
      <View style={{ height: 12 }} />
      <Text style={{ color:"#6b7280" }}>
        ※ 後で Supabase の求人テーブルに接続します（検索/フィルタ/保存を実装）
      </Text>
    </View>
  );
}
