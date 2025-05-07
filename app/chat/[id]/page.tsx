// app/student/[id]/page.tsx
"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useRef,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ModernChatUI } from "@/components/chat/modern-chat-ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { Message } from "@/types/message";

type ChatRoomRow = Database["public"]["Tables"]["chat_rooms"]["Row"];
type CompanyRow  = Database["public"]["Tables"]["companies"]["Row"];
type MessageRow  = Database["public"]["Tables"]["messages"]["Row"];

interface ChatData {
  room:     ChatRoomRow;
  company:  CompanyRow;
  messages: Message[];
}

export default function StudentChatPage() {
  const { id: chatId } = useParams() as { id: string };
  const router = useRouter();
  const [chat, setChat] = useState<ChatData | null>(null);
  const [, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // ─── 初期ロード & リアルタイム購読 ─────────────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadChat = async () => {
      // 1) 認証チェック
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        router.push("/chat");
        return;
      }

      // 2) chat_rooms を取得
      const { data: roomData, error: roomErr } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", chatId)
        .maybeSingle();
      if (roomErr || !roomData) {
        router.push("/chat");
        return;
      }

      // ★ ここで companyId を抜き出す ★
      const companyId = roomData.company_id;
      if (!companyId) {
        console.error("company_id が設定されていません");
        return;
      }

      // 3) companies を取得
      const { data: companyData, error: compErr } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      if (compErr || !companyData) {
        console.error("company fetch error", compErr);
        return;
      }

      // 4) messages を取得
      const { data: msgsData, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_room_id", chatId)
        .order("created_at", { ascending: true });
      if (msgErr) console.error("messages fetch error", msgErr);
      const msgs = (msgsData as MessageRow[]) || [];

      // 5) MessageRow → UI用 Message にマッピング
      const mapped: Message[] = msgs.map((m) => ({
        id:        Number(m.id),
        sender:    m.sender_id === user.id ? "student" : "company",
        content:   m.content,
        timestamp: m.created_at ?? "",
        status:    m.is_read ? "read" : "delivered",
        attachment: m.attachment_url
          ? {
              type: "file",
              url:  m.attachment_url,
              name: m.attachment_url.split("/").pop() || "添付",
            }
          : undefined,
      }));

      // 6) state 更新 + スクロール
      setChat({ room: roomData, company: companyData, messages: mapped });
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });

      // 7) リアルタイム購読 (INSERT)
      channel = supabase
        .channel(`room-${chatId}`)
        .on(
          "postgres_changes",
          {
            event:  "INSERT",
            schema: "public",
            table:  "messages",
            filter: `chat_room_id=eq.${chatId}`,
          },
          (payload) => {
            const m = payload.new as MessageRow;
            const newMsg: Message = {
              id:        Number(m.id),
              sender:    m.sender_id === user.id ? "student" : "company",
              content:   m.content,
              timestamp: m.created_at ?? "",
              status:    "delivered",
              attachment: m.attachment_url
                ? {
                    type: "file",
                    url:  m.attachment_url,
                    name: m.attachment_url.split("/").pop() || "添付",
                  }
                : undefined,
            };
            setChat((prev) =>
              prev
                ? { ...prev, messages: [...prev.messages, newMsg] }
                : prev
            );
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        )
        .subscribe();
    };

    loadChat();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [chatId, router]);

// ─── メッセージ送信 ────────────────────────────
interface NewMessage {
  chat_room_id:   string;
  sender_id:      string;
  content:        string;
  attachment_url: string | null;
  is_read:        boolean;
}

const handleSendMessage = useCallback(
  async (text: string, attachments?: File[]) => {
    if (!chat) return;

    // 1) 認証ユーザー取得
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return;

    // 2) 添付ファイルアップロード（あれば）
    let attachmentInfo;
    if (attachments?.length) {
      const file = attachments[0];
      const path = `${chatId}/${Date.now()}-${file.name}`;

      const { data: uploadData, error: upErr } = await supabase
        .storage
        .from("attachments")
        .upload(path, file, { contentType: file.type });
      if (upErr || !uploadData) {
        console.error("upload error", upErr);
        return;
      }

      const { data: urlData } = supabase
        .storage
        .from("attachments")
        .getPublicUrl(uploadData.path);
      attachmentInfo = {
        type: file.type,
        url:  urlData.publicUrl,
        name: file.name,
      };
    }

    // 3) DBにメッセージ挿入
    const { data: inserted, error: insErr } = await supabase
      .from("messages")
      .insert({
        chat_room_id:   chatId,
        sender_id:      user.id,
        content:        text.trim(),
        attachment_url: attachmentInfo?.url ?? null,
        is_read:        false,
      })
      .select()
      .single();

    if (insErr || !inserted) {
      console.error("insert message error", insErr);
      return;
    }

    // 4) 楽観的UI更新
    const newMsg: Message = {
      id:        Number(inserted.id),
      sender:    "student",
      content:   inserted.content,
      timestamp: inserted.created_at ?? "",
      status:    "sent",
      attachment: attachmentInfo,
    };
    setChat((prev) =>
      prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev
    );
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    // 5) 擬似 delivered 状態に切り替え
    startTransition(() => {
      setTimeout(() => {
        setChat((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === newMsg.id ? { ...m, status: "delivered" } : m
                ),
              }
            : prev
        );
      }, 1000);
    });
  },
  [chat, chatId])}
