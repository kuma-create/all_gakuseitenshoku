// app/company/chat/[chatId]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { ModernChatUI } from "@/components/chat/modern-chat-ui";
import type { Message as ChatMessage } from "@/types/message";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/ui/use-toast";

/* ------------------------------------------------------------------ */
/*                               型定義                                */
/* ------------------------------------------------------------------ */
type MessageRow   = Database["public"]["Tables"]["messages"]["Row"];
type ChatRoomRow  = Database["public"]["Tables"]["chat_rooms"]["Row"];
type StudentRow   = Database["public"]["Tables"]["student_profiles"]["Row"];
type ChatUser = {
  id: string;
  name: string;
  avatar: string;
  status: "オンライン" | "オフライン";
  university: string;
  faculty: string;
  department: string;
};
type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

/* ------------------------------------------------------------------ */
/*                             コンポーネント                          */
/* ------------------------------------------------------------------ */
export default function ChatPage() {
  /* ------------------ URL パラメータ（chatId） ------------------ */
  const { chatId: raw } = useParams<{ chatId: string | string[] }>();
  const chatId = Array.isArray(raw) ? raw[0] : raw;

  const { toast } = useToast();

  /* ------------------ 認証ユーザー ------------------ */
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

  /* ------------------ チャット相手（学生） ------------------ */
  const [recipient, setRecipient] = useState<ChatUser>({
    id: "",
    name: "",
    avatar: "",
    status: "オフライン",
    university: "",
    faculty: "",
    department: "",
  });

  /* ------------------ 会社情報 ------------------ */
  type CompanyMemberRow = Database["public"]["Tables"]["company_members"]["Row"];
  const [company, setCompany] = useState<Pick<CompanyRow, "id" | "name"> | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;

    // company_members.user_id → companies.id (FK) で取得
    supabase
      .from("company_members")
      .select("company_id, companies!inner(id, name)")
      .eq("user_id", userId)
      .maybeSingle<CompanyMemberRow & { companies: CompanyRow }>()
      .then(({ data, error }) => {
        if (error) {
          toast({
            title: "会社情報の取得に失敗しました",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        if (data?.companies) {
          setCompany({ id: data.companies.id, name: data.companies.name ?? "" });
        }
      });
  }, [userId, toast]);

  useEffect(() => {
    if (!chatId) return;

    supabase
      .from("chat_rooms")
      .select(
        `
          id,
          student_profiles:student_id (
            id,
            full_name,
            avatar_url,
            university,
            faculty,
            department
          )
        `
      )
      .eq("id", chatId)
      .maybeSingle<ChatRoomRow & { student_profiles: StudentRow | null }>()
      .then(({ data, error }) => {
        if (error) {
          toast({
            title: "相手ユーザー取得に失敗しました",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        if (data?.student_profiles) {
          const s = data.student_profiles;
          setRecipient({
            id: s.id,
            name: s.full_name ?? "",
            avatar: s.avatar_url ?? "",
            status: "オンライン",
            university: s.university ?? "",
            faculty: s.faculty ?? "",
            department: s.department ?? "",
          });
        }
      });
  }, [chatId, toast]);

  /* ------------------ メッセージ ------------------ */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(true);

  // --- 既読フラグを更新 ---
  const markMessagesAsRead = useCallback(
    async (roomId: string) => {
      if (!userId) return;
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("chat_room_id", roomId)
        .neq("sender_id", userId)
        .eq("is_read", false);
    },
    [userId]
  );

  /* 既存メッセージ取得 */
  useEffect(() => {
    if (!chatId || !userId) return;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, sender_id, content, is_read, attachment_url, created_at"
        )
        .eq("chat_room_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        toast({
          title: "メッセージの取得に失敗しました",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // --- 既読処理 ---
      await markMessagesAsRead(chatId);

      const formatted: ChatMessage[] = (data as MessageRow[]).map((m) => ({
        id: m.id,
        sender: m.sender_id === userId ? "company" : "student",
        content: m.content,
        timestamp: m.created_at!,
        status: "read", // 取得直後に既読化したので全て read 扱い
        ...(m.attachment_url && {
          attachment: {
            url: m.attachment_url,
            name: "",
            type: "",
          },
        }),
      }));

      setMessages(formatted);
      setLoading(false);
    })();
  }, [chatId, userId, toast, markMessagesAsRead]);

  /* メッセージ送信 */
  const handleSendMessage = useCallback(
    async (content: string, attachments?: File[]) => {
      if (!chatId || !userId) return;
      const attachmentUrl = null; // 先にアップロード処理を入れる場合はここで URL を生成

      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_room_id   : chatId,
          sender_id      : userId,
          content        : content.trim(),
          is_read        : false,
          attachment_url : attachmentUrl,
        } satisfies Database["public"]["Tables"]["messages"]["Insert"])
        .select("id, sender_id, content, attachment_url, created_at")
        .single();

      // --- 通知メールを Edge Function 経由で送信 ---
      await supabase.functions.invoke("send-email", {
        body: {
          user_id: recipient.id,      // 受信者の Auth UID
          from_role: "company",       // 件名テンプレ切替
          company_name: company?.name ?? "", // 件名に差し込む会社名
          notification_type: "chat",  // 通常チャット
          message: content.trim(),
        },
      });

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
          id       : data.id,
          sender   : "company",
          content  : data.content,
          timestamp: data.created_at!,
          status   : "sent",
          ...(data.attachment_url && {
            attachment: {
              url : data.attachment_url,
              name: "",
              type: "",
            },
          }),
        },
      ]);
    },
    [chatId, userId, recipient, company, toast]
  );

  /* 面接日程設定 */
  const handleScheduleInterview = (details: {
    date     : Date;
    time     : string;
    duration : string;
    type     : "オンライン" | "オフライン";
    location : string;
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

  /* ---------- ローディング ---------- */
  if (loading || !userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  /* ------------------ 画面描画 ------------------ */
  return (
    <div className="flex h-screen flex-col">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <ModernChatUI
        messages={messages}
        currentUser="company"
        recipient={recipient}
        onSendMessage={handleSendMessage}
        onScheduleInterview={handleScheduleInterview}
        className="h-full"
      />
    </div>
  );
}
