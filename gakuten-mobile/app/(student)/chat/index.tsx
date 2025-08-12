

"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

// NOTE: Use the same supabase client used elsewhere in the app.
// If your client lives at a different path (e.g. "@/lib/supabase"),
// adjust the import below accordingly.
import { supabase } from "src/lib/supabase";

/* ----------------------- 型定義 ----------------------- */
 type ChatItem = {
  id: string;
  company: string;
  logo: string | null;
  lastMessage: string;
  time: string;
  unread: boolean;
  position: string | null;
  type: "scout" | "apply";
 };

/* ----------------------- 画面本体 ----------------------- */
export default function ChatScreen() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "scout" | "apply">("all");

  // ここでは auth.user() から取得（アプリ側の AuthContext があれば差し替えOK）
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    const u = supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    void u;
  }, []);

  const fetchChats = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase.rpc("get_my_chat_rooms", {
      p_user: userId,
    });

    if (error) {
      console.error("get_my_chat_rooms error", error);
      setLoading(false);
      return;
    }

    type RpcRow = {
      id: string;
      company_name: string | null;
      company_logo: string | null;
      last_message: string | null;
      last_created: string | null;
      is_unread: boolean;
      job_id?: string | null;
      [key: string]: any;
    };

    const items: ChatItem[] = (data as RpcRow[]).map((r) => ({
      id: r.id,
      company: r.company_name ?? "学生",
      logo: r.company_logo,
      lastMessage: r.last_message ?? "(メッセージなし)",
      time: r.last_created
        ? format(new Date(r.last_created), "yyyy/MM/dd HH:mm", { locale: ja })
        : "-",
      unread: r.is_unread,
      position: null,
      type: r.job_id ? "apply" : "scout",
    }));

    setChats(items);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void fetchChats();
  }, [fetchChats, userId]);

  // Realtime（messages の INSERT/UPDATE を監視）
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("messages-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void fetchChats()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => void fetchChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchChats, userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  }, [fetchChats]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((c) => {
      const hitTab = tab === "all" || c.type === tab;
      if (!hitTab) return false;
      if (!q) return true;
      return (
        c.company.toLowerCase().includes(q) ||
        (c.lastMessage ?? "").toLowerCase().includes(q)
      );
    });
  }, [chats, query, tab]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* ヘッダー */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
          チャット
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="会社名・求人名で検索"
            style={{
              flex: 1,
              height: 40,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              paddingHorizontal: 12,
            }}
          />
          <Pressable
            onPress={() => onRefresh()}
            style={{
              height: 40,
              paddingHorizontal: 12,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
            }}
          >
            <Text>検索</Text>
          </Pressable>
        </View>

        {/* タブ */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {(["all", "scout", "apply"] as const).map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "#111" : "#ddd",
                  backgroundColor: active ? "#111" : "#fff",
                }}
              >
                <Text style={{ color: active ? "#fff" : "#111" }}>
                  {t === "all" ? "すべて" : t === "scout" ? "スカウト" : "応募"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* リスト */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push(`/(student)/chat/${item.id}`);
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#f0f0f0",
              }}
            >
              {item.logo ? (
                <Image
                  source={{ uri: item.logo }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#eee" }}
                />
              ) : (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "#e5e5e5",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>
                    {item.company?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: item.unread ? "800" : "600" }}>
                    {item.company}
                  </Text>
                  {item.unread && (
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: "#ef4444",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12 }}>新着</Text>
                    </View>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={{ color: "#666", marginTop: 2 }}
                >
                  {item.lastMessage}
                </Text>
              </View>

              <Text style={{ color: "#888", marginLeft: 8 }}>{item.time}</Text>
            </Pressable>
          )}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Text>チャットがありません。スカウトや応募から会話を開始しましょう。</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}