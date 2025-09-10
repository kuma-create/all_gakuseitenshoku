"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Search } from "lucide-react-native";
import { supabase } from "src/lib/supabase";

type ESItem = {
  id: string;
  title: string;
  body: string;
  memo: string; // どの会社で使うか / 活用方針
  updatedAt: number;
  expanded?: boolean;
};

function uid() {
  try {
    // @ts-ignore
    return global?.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  } catch {
    return Math.random().toString(36).slice(2);
  }
}


export default function ESManagerScreen() {
  const [items, setItems] = useState<ESItem[]>([]);
  const [query, setQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setItems([]);
        return;
      }
      const { data, error } = await supabase
        .from("es_entries")
        .select("*")
        .order("updated_at", { ascending: false });
      if (!error && data) {
        setItems(
          data.map((d: any) => ({
            id: d.id,
            title: d.title,
            body: d.body ?? "",
            memo: d.memo ?? "",
            updatedAt: d.updated_at ? new Date(d.updated_at).getTime() : Date.now(),
            expanded: false,
          }))
        );
      }
    };
    bootstrap();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.title, i.body, i.memo].some((t) => (t || "").toLowerCase().includes(q))
    );
  }, [items, query]);

  const addFromTitle = useCallback(async (title: string) => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("es_entries")
      .insert({ user_id: userId, title, body: "", memo: "" })
      .select()
      .single();
    setLoading(false);
    if (!error && data) {
      const newItem: ESItem = {
        id: data.id,
        title: data.title,
        body: data.body ?? "",
        memo: data.memo ?? "",
        updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now(),
        expanded: true,
      };
      setItems((prev) => [newItem, ...prev]);
    } else if (error) {
      Alert.alert("追加に失敗しました", error.message);
    }
  }, [userId]);

  const addCustom = useCallback(() => {
    const t = newTitle.trim() || "新しいお題";
    addFromTitle(t);
    setNewTitle("");
  }, [newTitle, addFromTitle]);

  const updateItem = useCallback((id: string, patch: Partial<ESItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i))
    );
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id));
    const { error } = await supabase.from("es_entries").delete().eq("id", id);
    if (error) {
      setItems(prev);
      Alert.alert("削除に失敗しました", error.message);
    }
  }, [items]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS === "android") {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: ToastAndroid } = require("react-native");
        ToastAndroid.show("本文をコピーしました", ToastAndroid.SHORT);
      } else {
        Alert.alert("コピー完了", "本文をコピーしました");
      }
    } catch {
      Alert.alert("コピー失敗", "コピーに失敗しました");
    }
  }, []);

  const saveOne = useCallback(async (id: string) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const { data, error } = await supabase
      .from("es_entries")
      .update({ title: current.title, body: current.body, memo: current.memo })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      Alert.alert("保存に失敗しました", error.message);
      return;
    }
    if (data) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                id: data.id,
                title: data.title,
                body: data.body ?? "",
                memo: data.memo ?? "",
                updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now(),
                expanded: i.expanded,
              }
            : i
        )
      );
      if (Platform.OS === "android") {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: ToastAndroid } = require("react-native");
        ToastAndroid.show("保存しました", ToastAndroid.SHORT);
      } else {
        Alert.alert("保存", "保存しました");
      }
    }
  }, [items]);

  const renderItem = ({ item }: { item: ESItem }) => {
    return (
      <View style={styles.card}>
        <Pressable
          onPress={() => updateItem(item.id, { expanded: !item.expanded })}
          style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.8 }]}
        >
          <Text numberOfLines={1} style={styles.title}>
            {item.expanded ? "▾ " : "▸ "}
            {item.title}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.body.length} 文字</Text>
          </View>
        </Pressable>

        {item.expanded && (
          <View style={styles.content}>
            {/* 本文 */}
            <Text style={styles.label}>本文</Text>
            <TextInput
              value={item.body}
              onChangeText={(t) => updateItem(item.id, { body: t })}
              placeholder="ここにES本文を書く"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              style={styles.textarea}
            />
            <View style={styles.row}>
              <Pressable
                onPress={() => copyToClipboard(item.body)}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              >
                <Text style={styles.buttonText}>コピー</Text>
              </Pressable>
              <Pressable
                onPress={() => saveOne(item.id)}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              >
                <Text style={styles.buttonText}>保存</Text>
              </Pressable>
              <Pressable
                onPress={() => removeItem(item.id)}
                style={({ pressed }) => [styles.buttonGhost, pressed && styles.pressed]}
              >
                <Text style={styles.buttonGhostText}>削除</Text>
              </Pressable>
            </View>

            {/* メモ */}
            <Text style={styles.label}>メモ</Text>
            <TextInput
              value={item.memo}
              onChangeText={(t) => updateItem(item.id, { memo: t })}
              placeholder="どの会社で使うか、どう活用するかをメモ"
              placeholderTextColor="#9ca3af"
              style={styles.input}
            />

            <Text style={styles.meta}>最終更新: {new Date(item.updatedAt).toLocaleString()}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* ヘッダー */}
          <Text style={styles.header}>ES管理</Text>
          {!userId && (
            <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}>
              ログインするとESをクラウドに保存できます。
            </Text>
          )}

          {/* 検索 */}
          <View style={styles.search}>
            <Search size={20} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="タイトル・本文・メモを検索"
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
            />
          </View>

          {/* 追加パネル */}
          <View style={styles.addPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {PRESET_QUESTIONS.map((q) => (
                <Pressable
                  key={q.title}
                  onPress={() => addFromTitle(q.title)}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                >
                  <Text style={styles.chipText}>{q.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.addRow}>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="自由入力：お題"
                placeholderTextColor="#9ca3af"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable
                onPress={addCustom}
                disabled={!userId || loading}
                style={({ pressed }) => [
                  styles.buttonPrimary,
                  (!userId || loading) && { opacity: 0.5 },
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.buttonPrimaryText}>追加</Text>
              </Pressable>
            </View>
          </View>

          {/* リスト */}
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  まだESがありません。上のプリセットや自由入力から追加してください。
                </Text>
              </View>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    marginBottom: 10,
    backgroundColor: "#f9fafb",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  addPanel: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  chip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipText: {
    fontSize: 12,
    color: "#111827",
  },
  addRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    backgroundColor: "#ffffff",
  },
  buttonPrimary: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  buttonPrimaryText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  badgeText: {
    fontSize: 12,
    color: "#111827",
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  buttonText: {
    color: "#111827",
    fontWeight: "600",
  },
  buttonGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  buttonGhostText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  meta: {
    marginTop: 2,
    fontSize: 11,
    color: "#6b7280",
    textAlign: "right",
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.7,
  },
});

const PRESET_QUESTIONS = [
  { title: "自己紹介" },
  { title: "学生時代に力を入れたこと" },
  { title: "志望動機" },
  { title: "長所と短所" },
  { title: "将来のキャリアプラン" },
];