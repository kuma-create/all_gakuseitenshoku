// app/student/[id]/page.tsx

"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ModernChatUI } from "@/components/chat/modern-chat-ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase/client";          // ← createClient ではなく supabase をインポート
import type { Database } from "@/lib/supabase/types";
import type { Message } from "@/types/message";

// ─────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────
type ChatRoomRow = Database["public"]["Tables"]["chat_rooms"]["Row"];
type CompanyRow  = Database["public"]["Tables"]["companies"]["Row"];
type MessageRow  = Database["public"]["Tables"]["messages"]["Row"];

interface ChatData {
  room:     ChatRoomRow;
  company:  CompanyRow;
  messages: Message[];
}

// ─────────────────────────────────────────
// ページコンポーネント
// ─────────────────────────────────────────
export default function StudentChatPage() {
  const params  = useParams();
  const router  = useRouter();
  const chatId  = params.id as string;

  const [chat,       setChat]       = useState<ChatData | null>(null);
  const [,          startTransition] = useTransition();

  // 1. 初期ロード
  useEffect(() => {
    const loadChat = async () => {
      // 認証ユーザー取得
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        console.error("認証ユーザーが取れません", userErr);
        router.push("/chat");
        return;
      }

      // チャットルーム＋企業情報取得
      const { data, error: roomErr } = await supabase
        .from("chat_rooms")
        .select("*, companies(*)")
        .eq("id", chatId)
        .maybeSingle();
      const room = data as (ChatRoomRow & { companies: CompanyRow }) | null;
      if (roomErr || !room) {
        console.error("chat_rooms fetch error", roomErr);
        router.push("/chat");
        return;
      }

      // メッセージ一覧取得
      const { data: msgsData, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_room_id", chatId)
        .order("created_at", { ascending: true });
      
          // あとから型アサーション
      const msgs = (msgsData as MessageRow[]) || [];
      
      if (msgErr) {
        console.error("messages fetch error", msgErr);
        return;
      }

      // MessageRow → UI 用 Message 型にマッピング
      const mapped: Message[] = (msgs ?? []).map((m) => ({
        id:         Number(m.id),
        sender:     m.sender_id === user.id ? "student" : "company",
        content:    m.content,
        timestamp:  m.created_at ?? "",
        status:     m.is_read ? "read" : "delivered",
        attachment: m.attachment_url
          ? {
              type: "file",
              url:  m.attachment_url,
              name: m.attachment_url.split("/").pop() ?? "添付",
            }
          : undefined,
      }));

      setChat({
        room,
        company: room.companies,
        messages: mapped,
      });
    };

    loadChat();
  }, [chatId, router]);

  // 2. メッセージ送信
  const handleSendMessage = useCallback(
    async (message: string, attachments?: File[]) => {
      if (!chat) return;

      // 認証ユーザー取得
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        console.error("ユーザー取得失敗", userErr);
        return;
      }

      // 添付ファイルアップロード
      let attachmentInfo: Message["attachment"] | undefined;
      if (attachments?.length) {
        const file = attachments[0];
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("attachments")
          .upload(`${chatId}/${Date.now()}-${file.name}`, file, {
            contentType: file.type,
          });
        if (uploadErr || !uploadData) {
          console.error("upload error", uploadErr);
          return;
        }
        const { data: { publicUrl } } = supabase.storage
          .from("attachments")
          .getPublicUrl(uploadData.path);
        attachmentInfo = {
          type: file.type,
          url:  publicUrl,
          name: file.name,
        };
      }

      // DB にメッセージを挿入
      const { data: inserted, error: insertErr } = await supabase
        .from("messages")
        .insert({
          chat_room_id:  chatId,
          sender_id:     user.id,
          content:       message.trim(),
          attachment_url: attachmentInfo?.url ?? null,
          is_read:        false,
        })
        .select()
        .single();
      if (insertErr || !inserted) {
        console.error("insert message error", insertErr);
        return;
      }
      const row = inserted as MessageRow;

      // 楽観的 UI 更新
      const newMsg: Message = {
        id:        Number(row.id),
        sender:     "student",
        content:   row.content,
        timestamp: row.created_at ?? "",
        status:     "sent",
        attachment: attachmentInfo,
      };
      setChat((prev) =>
        prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev
      );

      // 擬似 delivered
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
    [chat, chatId]
  );

  // ──────────────────────────────
  // UIレンダリング
  // ──────────────────────────────
  if (!chat) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <ModernChatUI
        messages={chat.messages}
        currentUser="student"
        recipient={{
          id:     parseInt(chat.company.id.replace(/\D/g, "").slice(0, 9), 10) || 0,
          name:   chat.company.name,
          avatar: chat.company.logo ?? "",
          status: "オフライン",
        }}
        onSendMessage={handleSendMessage}
        className="h-full"
      />
    </div>
  );
}
