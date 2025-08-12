// app/(student)/chat/[id].tsx
// 学生向けチャット詳細（Expo Router / React Native）
// ✅ UI/UX 改善版: 自動スクロール・日付セパレータ・送信ボタンの無効化・入力欄のオートリサイズ・
//   キーボード閉じる・スクロール最下部へジャンプ・求人詳細CTA など

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// 依存は既存のまま
import type { Database } from "@/lib/supabase/types";
import { supabase } from "src/lib/supabase";

// ────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────
type ChatRoomRow = Database["public"]["Tables"]["chat_rooms"]["Row"];
type CompanyRow  = Database["public"]["Tables"]["companies"]["Row"];
type MessageRow  = Database["public"]["Tables"]["messages"]["Row"];
type JobRow      = Database["public"]["Tables"]["jobs"]["Row"];

type MessageBubble = {
  id: string;
  sender: "student" | "company";
  content: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  attachment?: {
    type: string;
    url: string;
    name?: string;
  };
};

interface ChatData {
  room: ChatRoomRow;
  company: CompanyRow;
  job?: JobRow;
  messages: MessageBubble[];
}

// タブバー高さ（被り回避用）
const TAB_BAR_HEIGHT = 88;

// 日付セパレータ用の小ユーティリティ
function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
function formatYMD(ts: string) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}
function formatHM(ts: string) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function ChatDetailScreen() {
  const { id: chatIdParam } = useLocalSearchParams<{ id: string }>();
  const chatId = useMemo(() => String(chatIdParam ?? ""), [chatIdParam]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [chat, setChat] = useState<ChatData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(44);
  const [isSending, startTransition] = useTransition();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const studentUserIdRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<MessageBubble | { __type: "separator"; id: string; label: string }>>(null);

  // ───────────────── 初期ロード & 購読 ─────────────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: roomData, error: roomErr } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", chatId)
        .single();
      if (roomErr || !roomData) {
        console.warn("chat_rooms error", roomErr);
        router.replace("/chat");
        return;
      }

      // 学生 user_id 解決
      let studentUserId: string | null = null;
      if (roomData.student_id) {
        const { data: stuRow, error: stuErr } = await supabase
          .from("student_profiles")
          .select("user_id")
          .eq("id", roomData.student_id as string)
          .maybeSingle();
        if (stuErr) {
          console.warn("student_profiles error", stuErr);
        } else if (stuRow?.user_id) {
          studentUserId = stuRow.user_id;
        }
      }
      studentUserIdRef.current = studentUserId;

      // アクセス権確認
      const isStudent = user.id === studentUserId;
      let isCompanyMember = false;
      if (!isStudent && roomData.company_id) {
        const { data: memberRow } = await supabase
          .from("company_members")
          .select("user_id")
          .eq("company_id", roomData.company_id as string)
          .eq("user_id", user.id)
          .maybeSingle();
        isCompanyMember = !!memberRow;
      }
      if (!isStudent && !isCompanyMember) {
        router.replace("/chat");
        return;
      }

      // 会社
      if (!roomData.company_id) {
        router.replace("/chat");
        return;
      }
      const { data: companyData, error: compErr } = await supabase
        .from("companies")
        .select("*")
        .eq("id", roomData.company_id as string)
        .maybeSingle();
      if (compErr || !companyData) {
        console.warn("companies error", compErr);
        router.replace("/chat");
        return;
      }

      // 求人 (任意)
      let jobData: JobRow | undefined;
      if ((roomData as any).job_id) {
        const { data: jobRow, error: jobErr } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", (roomData as any).job_id as string)
          .maybeSingle();
        if (jobErr) {
          console.warn("jobs error", jobErr);
        } else if (jobRow) {
          jobData = jobRow;
        }
      }

      // メッセージ
      const { data: msgsData, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_room_id", chatId)
        .order("created_at", { ascending: true });
      if (msgErr) console.warn("messages error", msgErr);
      const msgs = (msgsData as MessageRow[]) ?? [];

      // map
      const mapped: MessageBubble[] = msgs.map((m) => ({
        id: m.id,
        sender: m.sender_id === studentUserId ? "student" : "company",
        content: m.content ?? "",
        timestamp: m.created_at ?? "",
        status: m.is_read ? "read" : "delivered",
        attachment: m.attachment_url
          ? { type: "file", url: m.attachment_url, name: m.attachment_url.split("/").pop() || "添付" }
          : undefined,
      }));

      // 日付セパレータを挿入
      const withSeparators: (MessageBubble | { __type: "separator"; id: string; label: string })[] = [];
      mapped.forEach((m, idx) => {
        const prev = mapped[idx - 1];
        if (!prev || !isSameDay(prev.timestamp, m.timestamp)) {
          withSeparators.push({ __type: "separator", id: `sep-${m.id}`, label: formatYMD(m.timestamp) });
        }
        withSeparators.push(m);
      });

      setChat({ room: roomData, company: companyData, job: jobData, messages: mapped });

      // 購読（新規メッセージ）
      channel = supabase
        .channel(`room-${chatId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `chat_room_id=eq.${chatId}` },
          (payload) => {
            const m = payload.new as MessageRow;
            const newMsg: MessageBubble = {
              id: m.id,
              sender: m.sender_id === studentUserIdRef.current ? "student" : "company",
              content: m.content ?? "",
              timestamp: m.created_at ?? "",
              status: "delivered",
              attachment: m.attachment_url
                ? { type: "file", url: m.attachment_url, name: m.attachment_url.split("/").pop() || "添付" }
                : undefined,
            };
            setChat((prev) => (prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev));
            scrollToEnd();
          }
        )
        .subscribe();
    };

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [chatId, router]);

  // 送信
  const handleSend = useCallback(async () => {
    if (!chat || !input.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const text = input.trim();
    setInput("");

    const { data: inserted, error: insErr } = await supabase
      .from("messages")
      .insert({
        chat_room_id: chatId,
        sender_id: user.id,
        content: text,
        attachment_url: null,
        is_read: false,
      })
      .select()
      .single();

    if (insErr || !inserted) {
      // 失敗時: 入力を戻す
      setInput((prev) => (prev ? prev : text));
      console.warn("insert message error", insErr);
      return;
    }

    const isStudent = currentUserId === studentUserIdRef.current;
    const optimistic: MessageBubble = {
      id: inserted.id,
      sender: isStudent ? "student" : "company",
      content: inserted.content ?? text,
      timestamp: inserted.created_at ?? new Date().toISOString(),
      status: "sent",
    };
    setChat((prev) => (prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev));
    scrollToEnd();

    startTransition(() => {
      setTimeout(() => {
        setChat((prev) =>
          prev
            ? { ...prev, messages: prev.messages.map((m) => (m.id === optimistic.id ? { ...m, status: "delivered" } : m)) }
            : prev
        );
      }, 600);
    });
  }, [chat, chatId, input, currentUserId, startTransition]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
      setShowScrollToBottom(false);
    });
  };

  const onListScroll = useCallback((e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
    setShowScrollToBottom(!isAtBottom);
  }, []);

  // ローディング
  if (!chat) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const isStudent = currentUserId === studentUserIdRef.current;
  const title = chat.company?.name || "チャット";

  // セパレータを含む配列を都度作る（新規メッセージでも崩れないように）
  const dataWithSeparators: (MessageBubble | { __type: "separator"; id: string; label: string })[] = [];
  chat.messages.forEach((m, idx) => {
    const prev = chat.messages[idx - 1];
    if (!prev || !isSameDay(prev.timestamp, m.timestamp)) {
      dataWithSeparators.push({ __type: "separator", id: `sep-${m.id}`, label: formatYMD(m.timestamp) });
    }
    dataWithSeparators.push(m);
  });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title,
          headerBackTitle: "戻る",
          headerRight: () =>
            chat.job ? (
              <TouchableOpacity onPress={() => router.push(`/(student)/jobs/${chat.job!.id}`)} style={styles.headerCta}>
                <Text style={styles.headerCtaText}>求人を見る</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: "padding", android: undefined })}
        keyboardVerticalOffset={(Platform.OS === "ios" ? 76 : 0) + TAB_BAR_HEIGHT + (insets.bottom || 0)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.chatArea}>
            <FlatList
              ref={listRef}
              data={dataWithSeparators}
              keyExtractor={(item) => ("__type" in item ? item.id : item.id)}
              renderItem={({ item }) =>
                ("__type" in item ? (
                  <View style={styles.separatorWrap}>
                    <Text style={styles.separatorText}>{item.label}</Text>
                  </View>
                ) : (
                  <Bubble message={item} isMine={item.sender === (isStudent ? "student" : "company")} />
                ))
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.listContent,
                {
                  // タブバー + セーフエリア + 入力欄高さぶん余白を確保
                  paddingBottom: (insets.bottom || 0) + TAB_BAR_HEIGHT + 120,
                },
              ]}
              onContentSizeChange={scrollToEnd}
              onScroll={onListScroll}
              scrollEventThrottle={16}
            />

            {showScrollToBottom && (
              <TouchableOpacity style={styles.scrollToBottom} onPress={scrollToEnd}>
                <Text style={styles.scrollToBottomText}>↓ 最新へ</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.inputBar,
            {
              // セーフエリア分の内側余白
              paddingBottom: (insets.bottom || 0) + 8,
              paddingTop: 10,
              // 下のタブバーに被らないように外側マージン
              marginBottom: TAB_BAR_HEIGHT,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { height: Math.min(120, Math.max(44, inputHeight)), fontSize: 16, lineHeight: 22 }
            ]}
            placeholder="メッセージを入力"
            value={input}
            onChangeText={setInput}
            onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
            multiline
            autoCorrect
            autoCapitalize="none"
            returnKeyType="send"
            onFocus={scrollToEnd}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>送信</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────
// UI: メッセージ気泡
// ────────────────────────────────────────────────
function Bubble({ message, isMine }: { message: MessageBubble; isMine: boolean }) {
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.text, isMine ? styles.textMine : styles.textOther]}>{message.content}</Text>
        <Text style={styles.meta}>{formatHM(message.timestamp)}</Text>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  chatArea: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 16 },

  headerCta: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#111827" },
  headerCtaText: { color: "#fff", fontWeight: "600" },

  inputBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    zIndex: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    lineHeight: 22,
  },
  sendBtn: {
    marginLeft: 8,
    minHeight: 46,
    minWidth: 68,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  sendBtnDisabled: { backgroundColor: "#9CA3AF" },
  sendText: { color: "#fff", fontWeight: "600" },

  row: { flexDirection: "row", marginBottom: 8 },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },

  bubble: { maxWidth: "94%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMine: { backgroundColor: "#111827", borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: "#F3F4F6", borderTopLeftRadius: 4 },

  text: { fontSize: 17, lineHeight: 24 },
  textMine: { color: "#fff" },
  textOther: { color: "#111827" },

  meta: { marginTop: 4, fontSize: 12, color: "#4B5563", textAlign: "right" },

  separatorWrap: { alignItems: "center", marginVertical: 10 },
  separatorText: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },

  scrollToBottom: {
    position: "absolute",
    right: 12,
    bottom: 80,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#111827",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  scrollToBottomText: { color: "#fff", fontWeight: "600" },
});