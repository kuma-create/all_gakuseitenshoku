"use client"

import React, { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2, FileText, PencilLine, Save, Search, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * ES 管理ページ（Web/モバイル両対応のレスポンシブ）
 * - タイトルのアコーディオンで開閉
 * - 本文入力 + 文字数カウンター
 * - コピー・削除
 * - メモ欄（薄字の説明）
 * - お題からテンプレ作成（想定質問プリセット）
 * - ローカルストレージに保存（必要に応じて Supabase に差し替え可）
 */

// 想定質問プリセット
const PRESET_QUESTIONS = [
  { title: "なぜコンサル業界を志望しているのか" },
  { title: "学生時代に力を入れたこと（ガクチカ）" },
  { title: "これまでの困難とその乗り越え方" },
  { title: "あなたの強みと弱み" },
  { title: "当社を志望する理由" },
];

export type ESItem = {
  id: string;
  title: string;
  body: string;
  memo: string; // どの会社で使うか / 活用方針
  updatedAt: number;
};

function uid() {
  return crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

const supabase = createClient();

export default function ESManagerPage() {
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
          }))
        );
      }
    };
    bootstrap();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    return items.filter((i) =>
      [i.title, i.body, i.memo].some((t) => t.toLowerCase().includes(q.toLowerCase()))
    );
  }, [items, query]);

  const addFromTitle = async (title: string) => {
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
      };
      setItems((prev) => [newItem, ...prev]);
    }
  };

  const addCustom = () => {
    const t = newTitle.trim() || "新しいお題";
    addFromTitle(t);
    setNewTitle("");
  };

  const removeItem = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id)); // optimistic
    const { error } = await supabase.from("es_entries").delete().eq("id", id);
    if (error) {
      // rollback on error
      setItems(prev);
      alert("削除に失敗しました");
    }
  };

  const updateItem = (id: string, patch: Partial<ESItem>) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: Date.now() } : i))
    );

  const saveItem = async (id: string) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    const { data, error } = await supabase
      .from("es_entries")
      .update({ title: current.title, body: current.body, memo: current.memo })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      alert("保存に失敗しました");
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
              }
            : i
        )
      );
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("本文をコピーしました");
    } catch (e) {
      console.error(e);
      alert("コピーに失敗しました");
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-4 sm:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" /> ES管理
        </h1>
      </div>

      {!userId && (
        <p className="mb-2 text-sm text-muted-foreground">
          ログインするとESを保存できます。
        </p>
      )}

      {/* 検索 */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・本文・メモを検索"
            className="pl-9"
          />
        </div>
      </div>

      {/* 追加パネル */}
      <Card className="mb-4">
        <CardHeader className="py-3">
          <CardTitle className="text-base">ESをお題から作成</CardTitle>
          <CardDescription>想定質問のプリセットまたは自由入力から追加できます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESET_QUESTIONS.map((q) => (
              <Button key={q.title} variant="secondary" size="sm" onClick={() => addFromTitle(q.title)}>
                <Sparkles className="mr-1 h-4 w-4" /> {q.title}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="自由入力：お題（例）リーダーシップを発揮した経験"
            />
            <Button onClick={addCustom} disabled={loading || !userId}>
              <Plus className="mr-1 h-4 w-4" /> 追加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* リスト */}
      <Accordion type="multiple" className="space-y-2">
        {filtered.map((item) => (
          <AccordionItem key={item.id} value={item.id} className="rounded-lg border px-3">
            <AccordionTrigger className="py-3 text-left">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.memo || "どの会社で使うか、活用方針のメモ"}</p>
                </div>
                <Badge variant="outline" className="whitespace-nowrap">{item.body.length} 文字</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-3">
                {/* 本文 */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">本文</Label>
                  <Textarea
                    value={item.body}
                    onChange={(e) => updateItem(item.id, { body: e.target.value })}
                    placeholder="ここにES本文を書く（Ctrl/Cmd + Enter で保存）"
                    className="min-h-[140px]"
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveItem(item.id);
                    }}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>文字数: {item.body.length}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => copyToClipboard(item.body)}>
                        <Copy className="mr-1 h-4 w-4" /> コピー
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => saveItem(item.id)}>
                        <Save className="mr-1 h-4 w-4" /> 保存
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                        <Trash2 className="mr-1 h-4 w-4" /> 削除
                      </Button>
                    </div>
                  </div>
                </div>

                {/* メモ */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">メモ</Label>
                  <Input
                    value={item.memo}
                    onChange={(e) => updateItem(item.id, { memo: e.target.value })}
                    placeholder="どの会社で使うか、どう活用するかをメモ"
                  />
                </div>

                {/* メタ情報 */}
                <div className="flex items-center justify-end">
                  <p className="text-[11px] text-muted-foreground">最終更新: {new Date(item.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* 空のとき */}
      {filtered.length === 0 && (
        <Card className="mt-4">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            まだESがありません。上のプリセットや自由入力から追加してください。
          </CardContent>
        </Card>
      )}
    </main>
  );
}
