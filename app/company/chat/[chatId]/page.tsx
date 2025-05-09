// app/company/chat/[chatId]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { Loader2 } from "lucide-react";
import { ModernChatUI } from "@/components/chat/modern-chat-ui";
import type { Message as ChatMessage } from "@/types/message";  // ← 上で修正した型
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function ChatPage() {
  const params = useParams();
  const rawChatId = params.chatId;
  const chatId = Array.isArray(rawChatId) ? rawChatId[0] : rawChatId;

  const { toast } = useToast();

  // 認証ユーザー取得
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        toast({
          title: "認証情報の取得に失敗しました",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setUserId(user?.id ?? null);
      }
    });
  }, [toast]);

  // メッセージ一覧＆ローディング
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !userId) return;
    setLoading(true);

    // Supabase の messages テーブル Row 型
    type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

    supabase
      .from("messages")
      .select("id, sender_id, content, is_read, attachment_url, created_at")
      .eq("chat_room_id", chatId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast({
            title: "メッセージの取得に失敗しました",
            description: error.message,
            variant: "destructive",
          });
        } else if (data) {
          // Row → ChatMessage にマッピング
          const formatted: ChatMessage[] = (data as MessageRow[]).map((m) => ({
            id: m.id, // ← ここが string になるので型と一致
            sender: m.sender_id === userId ? "company" : "student",
            content: m.content,
            timestamp: m.created_at!,
            status: m.is_read ? "read" : "delivered",
            ...(m.attachment_url
              ? {
                  attachment: {
                    url: m.attachment_url,
                    name: "",
                    type: "",
                  },
                }
              : {}),
          }));
          setMessages(formatted);
        }
        setLoading(false);
      });
  }, [chatId, userId, toast]);

  // メッセージ送信
  const handleSendMessage = async (
    content: string,
    attachments?: File[]
  ): Promise<void> => {
    if (!chatId || !userId) return;
    const attachmentUrl = null;

    const { data, error } = await supabase
      .from("messages")
      .insert<Database["public"]["Tables"]["messages"]["Insert"]>({
        chat_room_id: chatId,
        sender_id: userId,
        content: content.trim(),
        is_read: false,
        attachment_url: attachmentUrl,
      })
      .select() // ここもジェネリック不要
      .single();

    if (error) {
      toast({
        title: "メッセージの送信に失敗しました",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: data.id,
        sender: "company",
        content: data.content,
        timestamp: data.created_at!,
        status: "sent",
        ...(data.attachment_url
          ? { attachment: { url: data.attachment_url, name: "", type: "" } }
          : {}),
      },
    ]);
  };

  // 面接日程設定
  const handleScheduleInterview = (details: {
    date: Date;
    time: string;
    duration: string;
    type: "オンライン" | "オフライン";
    location: string;
  }) => {
    const formattedDate = format(details.date, "yyyy年MM月dd日", { locale: ja });
    const msg = `面接日程を設定しました。\n日時: ${formattedDate} ${
      details.time
    }～\n所要時間: ${details.duration}\n${
      details.type === "オンライン"
        ? `URL: ${details.location}`
        : `場所: ${details.location}`
    }`;
    void handleSendMessage(msg);
  };

  // 認証 or 取得中はスピナー
  if (loading || !userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // チャット UI
  return (
    <div className="flex h-screen flex-col">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <ModernChatUI
        messages={messages}
        currentUser="company"
        recipient={{
          id: 0,
          name: "",
          avatar: "",
          status: "オフライン",
          university: "",
          major: "",
        }}
        onSendMessage={handleSendMessage}
        onScheduleInterview={handleScheduleInterview}
        className="h-full"
      />
    </div>
  );
}
