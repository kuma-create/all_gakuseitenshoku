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
type JobRow      = Database["public"]["Tables"]["jobs"]["Row"];   // ← 募集要項テーブル

/* 画面状態 */
interface ChatData {
  room:     ChatRoomRow;
  company:  CompanyRow;
  job?:     JobRow;
  messages: Message[];
}

export default function StudentChatPage() {
  /* ------- ルーティング / 状態 ------- */
  const { id: chatId } = useParams() as { id: string };
  const router = useRouter();
  const [chat, setChat] = useState<ChatData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // タブ状態: "chat" or "job"
  const [tab, setTab] = useState<"chat" | "job">("chat");
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
        .single();

      if (roomErr) {
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

      /* 3-b) jobs 取得 (roomData.job_id がある場合) */
      let jobData: JobRow | undefined;
      if ((roomData as any).job_id) {
        const { data: jobRow, error: jobErr } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", (roomData as any).job_id as string)
          .maybeSingle();
        if (jobErr) {
          console.error("jobs fetch error", jobErr);
        } else {
          jobData = jobRow ?? undefined;
        }
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
      setChat({ room: roomData, company: companyData, job: jobData, messages: mapped });
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
      // 送信内容が空なら何もしない
      if (!chat || (!text.trim() && !attachments?.length)) return;

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) return;

      /* 添付ファイルアップロード (任意) */
      let attachmentInfo: Message["attachment"];
      if (attachments?.length) {
        const file = attachments[0];
        /* Supabase Storage ではスペースや一部の記号が使えないためファイル名をサニタイズ */
        const sanitizedName = file.name
          .replace(/\s+/g, "_")             // 空白 → アンダースコア
          .replace(/[^\w.\-（）()]/g, "_");  // 日本語など非英数は一律 _
        const path = `${chatId}/${Date.now()}-${sanitizedName}`;

        const { data: uploadData, error: upErr } = await supabase
          .storage.from("attachments")
          .upload(
            path,
            file,
            {
              contentType: file.type,
              cacheControl: "3600",
              upsert:       true            // 同名ファイルが既にあっても上書き
            }
          );
        if (upErr || !uploadData) {
          if (upErr) {
            console.error("upload error detail:", upErr?.message ?? upErr);
          }
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

      if (isStudent && chat.company.user_id) {
        await supabase.functions.invoke("send-email", {
          body: {
            user_id:            chat.company.user_id,        // 会社側 Auth UID
            from_role:          "student",                   // 送信者ロール
            notification_type:  "chat",
            title:              "学生から新しいチャットが届きました",
            message:            text.trim(),
          },
        });
      }

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

  // 一時的にグローバルヘッダーを隠す
  useEffect(() => {
    const siteHeader = document.getElementById("siteHeader"); // サイト共通ヘッダーの id を想定
    if (siteHeader) siteHeader.style.display = "none";
    return () => {
      if (siteHeader) siteHeader.style.display = "";
    };
  }, []);

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


  return (
    /* 2行×2列グリッド: [header] / [chat | sidebar] */
    <div className="grid h-[calc(100vh-4rem)] grid-rows-[1fr] md:grid-cols-[minmax(0,1fr)_360px]">

      {/* ── Chat column (row 1, col 0) ── */}
      <div className="flex flex-col h-full min-h-0 min-w-0 border-r overflow-hidden md:flex">
        {/* --- 内部スクロール領域 --- */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <ModernChatUI
            messages={chat.messages}
            onSendMessage={handleSendMessage}
            currentUser={isStudent ? "student" : "company"}
            recipient={{ id: chat.company.id, name: chat.company.name }}
            className="flex flex-col flex-1 min-h-0 h-full overflow-y-auto"
          />
          <div ref={bottomRef} className="h-0" />
        </div> {/* end scroll container */}
      </div>

      {/* ── Sidebar (row 1, col 1) ── */}
      <aside className={clsx(
        "h-full overflow-y-auto bg-background",
        "hidden md:block",
        tab === "job" && "block"
      )}>
        <div className="space-y-6 p-4">
          {tab === "chat" && (
            <>
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
            </>
          )}

          {tab === "job" && chat.job && (
            <>
              <h2 className="text-base font-semibold">募集要項</h2>
              <p className="text-lg font-medium">{chat.job.title}</p>

              <div className="space-y-2 text-sm mt-4">
                <InfoRow icon={Briefcase} label="雇用形態" value={chat.job.work_type} />
                <InfoRow icon={MapPin}    label="勤務地"   value={chat.job.location} />
                <InfoRow icon={Users}     label="給与"     value={chat.job.salary_range} />
                {/* 必須スキル（requirements をカンマ区切りで表示） */}
                {chat.job.requirements && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {chat.job.requirements.split(",").map((s) => (
                      <Badge key={s.trim()} variant="secondary">{s.trim()}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {chat.job.description && (
                <p className="mt-4 whitespace-pre-wrap text-sm">
                  {chat.job.description}
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
