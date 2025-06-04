/* ───────────────────────────────────────────────
   app/student/[id]/page.tsx
   - 学生側チャット画面（Supabase 実データ版）
────────────────────────────────────────────── */
"use client";

import clsx from "clsx";

import React, {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useRef,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, MapPin, Users, Calendar, ExternalLink } from "lucide-react";
import { MessageSquare, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
/* ---- StudentChatPage の冒頭付近 ---- */
import { ModernChatUI } from "@/components/chat/modern-chat-ui";  // ← {} を付ける
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { Message } from "@/types/message";

/* ---------- 共通アイコン行コンポーネント ---------- */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string | number | null
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="font-medium text-foreground">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

/* ───────────── Supabase 型エイリアス ───────────── */
type ChatRoomRow = Database["public"]["Tables"]["chat_rooms"]["Row"];
type CompanyRow  = Database["public"]["Tables"]["companies"]["Row"];
type MessageRow  = Database["public"]["Tables"]["messages"]["Row"];

/* 画面状態 */
interface ChatData {
  room:     ChatRoomRow;
  company:  CompanyRow;
  messages: Message[];
}

export default function StudentChatPage() {
  /* ------- ルーティング / 状態 ------- */
  const { id: chatId } = useParams() as { id: string };
  const router = useRouter();
  const [chat, setChat] = useState<ChatData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const studentUserIdRef = useRef<string | null>(null);

  /* ───────────── 初期ロード & 購読 ───────────── */
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const loadChat = async () => {
      /* 1) 認証チェック */
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      if (!user) {
        console.warn("no auth user – redirecting to /login");
        router.push("/login");
        return;
      }

      /* 2) chat_rooms を取得し、本人がアクセス権を持つか判定
         ───────────────────────────── */
      const { data: roomData, error: roomErr } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", chatId)
        .maybeSingle();

      if (roomErr || !roomData) {
        console.error("chat_rooms fetch error", roomErr);
        router.push("/chat");
        return;
      }

      /* 2-a) 学生側 user_id を取得 */
      let studentUserId: string | null = null;
      if (roomData.student_id) {
        const { data: stuRow, error: stuErr } = await supabase
          .from("student_profiles")
          .select("user_id")
          .eq("id", roomData.student_id as string)
          .maybeSingle();
        if (stuErr) {
          console.error("student_profiles fetch error", stuErr);
        } else if (stuRow) {
          studentUserId = stuRow.user_id;
        }
      }
      studentUserIdRef.current = studentUserId;

      const isStudent = user.id === studentUserId;

      /* 会社メンバー or 学生本人でなければアクセス不可 */
      let isCompanyMember = false;
      if (!isStudent && roomData.company_id) {
        const { data: memberRow, error: memErr } = await supabase
          .from("company_members")
          .select("user_id")
          .eq("company_id", roomData.company_id as string)
          .eq("user_id", user.id)
          .maybeSingle();

        if (memErr) {
          console.error("company_members fetch error", memErr);
        }
        isCompanyMember = !!memberRow;
      }

      if (!isStudent && !isCompanyMember) {
        console.warn("no permission to view this chat");
        router.push("/chat");
        return;
      }

      /* 3) companies 取得 */
      if (!roomData.company_id) {
        console.error("roomData.company_id is null");
        router.push("/chat");
        return;
      }
      const { data: companyData, error: compErr } = await supabase
        .from("companies")
        .select("*")
        .eq("id", roomData.company_id as string)
        .maybeSingle();
      if (compErr || !companyData) {
        console.error("company fetch error", compErr);
        return;
      }

      /* 4) messages 取得 */
      const { data: msgsData, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_room_id", chatId)
        .order("created_at", { ascending: true });
      if (msgErr) console.error("messages fetch error", msgErr);
      const msgs = (msgsData as MessageRow[]) ?? [];

      /* 5) MessageRow → Message へマッピング */
      const mapped: Message[] = msgs.map((m) => ({
        id:        m.id,                                   // string
        sender:    m.sender_id === studentUserId ? "student" : "company",
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

      /* 6) 画面状態を更新 */
      setChat({ room: roomData, company: companyData, messages: mapped });
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });

      /* 7) リアルタイム購読 */
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
              id:        m.id,
              sender:    m.sender_id === studentUserId ? "student" : "company",
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
              prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev
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

  /* ───────────── メッセージ送信 ───────────── */
  const handleSendMessage = useCallback(
    async (text: string, attachments?: File[]) => {
      if (!chat) return;

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) return;

      /* 添付ファイルアップロード (任意) */
      let attachmentInfo: Message["attachment"];
      if (attachments?.length) {
        const file = attachments[0];
        const path = `${chatId}/${Date.now()}-${file.name}`;

        const { data: uploadData, error: upErr } = await supabase
          .storage.from("attachments")
          .upload(path, file, { contentType: file.type });
        if (upErr || !uploadData) {
          console.error("upload error", upErr);
          return;
        }

        const { data: urlData } = supabase
          .storage.from("attachments")
          .getPublicUrl(uploadData.path);
        attachmentInfo = {
          type: file.type,
          url:  urlData.publicUrl,
          name: file.name,
        };
      }

      /* DB に挿入 */
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

      const isStudent = currentUserId === studentUserIdRef.current;

      /* 楽観的 UI 反映 */
      const newMsg: Message = {
        id:        inserted.id,
        sender:    isStudent ? "student" : "company",
        content:   inserted.content,
        timestamp: inserted.created_at ?? "",
        status:    "sent",
        attachment: attachmentInfo,
      };
      setChat((prev) =>
        prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev
      );
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });

      /* 疑似 delivered へ変更 */
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
    [chat, chatId, currentUserId, startTransition]
  );

  /* ───────────── ローディング表示 ───────────── */
  if (!chat) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  /* ---------- Layout ---------- */
  const isStudent = currentUserId === studentUserIdRef.current;

  // タブ状態: "chat" or "job"
  const [tab, setTab] = useState<"chat" | "job">("chat");

  return (
    /* 2行×2列グリッド: [header] / [chat | sidebar] */
    <div className="grid h-screen grid-rows-[1fr] md:grid-cols-[minmax(0,1fr)_360px]">
      {/* ── Header (row 0, col-span 2) ── */}
      <header className="flex items-center justify-between gap-2 border-b bg-background px-4 py-2 md:col-span-2">
        {/* 左側：スレッドタイトルなど。必要なら変更 */}
        <h1 className="text-sm font-medium truncate">{chat.company.name}</h1>

        {/* 右側：モバイル限定タブ */}
        <div className="flex gap-1 md:hidden">
          <Button
            variant={tab === "chat" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("chat")}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant={tab === "job" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("job")}
          >
            <Briefcase className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Chat column (row 1, col 0) ── */}
      <div className={clsx(
        "flex flex-col h-full min-h-0 min-w-0 border-r overflow-y-auto",
        "md:flex",
        tab !== "chat" && "hidden md:flex"
      )}>
        <ModernChatUI
          messages={chat.messages}
          onSendMessage={handleSendMessage}
          currentUser={isStudent ? "student" : "company"}
          recipient={{ id: chat.company.id, name: chat.company.name }}
          className="flex flex-col flex-1 min-h-0"
        />
        <div ref={bottomRef} className="h-0" />
      </div>

      {/* ── Sidebar (row 1, col 1) ── */}
      <aside className={clsx(
        "h-full overflow-y-auto bg-background",
        "hidden md:block",
        tab === "job" && "block"
      )}>
        <div className="space-y-6 p-4">
          {isStudent ? (
            /* ---- Company Info ---- */
            <>
              <h2 className="text-base font-semibold">会社情報</h2>
              <div className="flex items-center gap-3">
                <img
                  src={chat.company.logo ?? "/placeholder.svg"}
                  alt={chat.company.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div>
                  <p className="font-medium">{chat.company.name}</p>
                  {chat.company.industry && (
                    <p className="text-xs text-muted-foreground">
                      {chat.company.industry}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <InfoRow icon={MapPin}   label="所在地"   value={chat.company.location} />
                <InfoRow icon={Users}    label="社員数"   value={chat.company.employee_count?.toString()} />
                <InfoRow icon={Calendar} label="設立"     value={chat.company.founded_year?.toString()} />
                {chat.company.website && (
                  <a
                    href={chat.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    公式サイト
                  </a>
                )}
              </div>
              {chat.company.description && (
                <p className="rounded-lg bg-gray-50 p-3 text-sm">
                  {chat.company.description.split("\n")[0]}...
                </p>
              )}
            </>
          ) : (
            /* ---- Placeholder for company view (show student profile) ---- */
            <p className="text-sm text-muted-foreground">
              学生プロフィールをここに表示
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
