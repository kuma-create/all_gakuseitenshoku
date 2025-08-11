import React from "react";
import { View, Text, FlatList, Pressable } from "react-native";

const THREADS = [
  { id: "t1", partner: "Make Culture 採用担当", last: "ご応募ありがとうございます。面談候補日は..." },
  { id: "t2", partner: "Gakuten HR", last: "プロフィールを拝見しご連絡しました..." },
];

export default function MessagesScreen() {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 12 }}>メッセージ</Text>
      <FlatList
        data={THREADS}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Pressable style={{ padding: 14, borderRadius: 10, borderWidth:1, borderColor:"#e5e7eb", backgroundColor:"#fff" }}>
            <Text style={{ fontWeight:"800" }}>{item.partner}</Text>
            <Text style={{ color:"#374151" }} numberOfLines={1}>{item.last}</Text>
          </Pressable>
        )}
      />
      <View style={{ height: 12 }} />
      <Text style={{ color:"#6b7280" }}>※ 後でリアルタイムDM/スレッド詳細を実装</Text>
    </View>
  );
}
