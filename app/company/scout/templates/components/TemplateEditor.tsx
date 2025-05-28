"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Form = {
  title: string;
  position: string;
  offer_range: string;
  content: string;
  job_id?: string | null;
  is_global: boolean;
};

interface Props {
  mode: "new" | "edit";
}

export default function TemplateEditor({ mode }: Props) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [tpl, setTpl] = useState<Form>({
    title: "",
    position: "",
    offer_range: "",
    content: "",
    job_id: null,
    is_global: false,
  });
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const isSaving =
    tpl.title.trim() === "" ||
    tpl.position.trim() === "" ||
    tpl.offer_range.trim() === "" ||
    tpl.content.trim() === "";

  const [showPreview, setShowPreview] = useState(false);
  const sampleData = {
    name: "山田太郎",
    skill: "React, TypeScript",
    position: "フロントエンドエンジニア",
    offer_range: "400-600",
  };

  // 簡易タグ置換（プレビュー用）
  const renderPreview = useCallback(
    (txt: string) =>
      txt
        .replace(/{name}/g, sampleData.name)
        .replace(/{skill}/g, sampleData.skill)
        .replace(/{position}/g, sampleData.position)
        .replace(/{offer_range}/g, sampleData.offer_range),
    [sampleData]
  );

  /* --- 編集モード：既存データ取得 ----------------------------- */
  useEffect(() => {
    if (mode === "edit" && params?.id) {
      supabase
        .from("scout_templates")
        .select("*")
        .eq("id", params.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const row = data as unknown as { job_id?: string | null } & typeof data;
            setTpl({
              title: row.title ?? "",
              position: row.position ?? "",
              offer_range: row.offer_range ?? "",
              content: row.content ?? "",
              job_id: row.job_id ?? null,
              is_global: row.is_global ?? false,
            });
          }
        });
    }
  }, [mode, params?.id]);

  // 企業の求人一覧を取得（セレクト用）
  useEffect(() => {
    (async () => {
      if (!tpl.is_global && mode === "edit") {
        // 編集用テンプレでも求人セレクトを出したいので company を取得
      }
      // companyRowId は後述で保存処理にも使うが、ここでは取得手段がまだ無いので user→company を再度呼ぶ
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cmp } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cmp?.id) return;

      const { data } = await supabase
        .from("jobs")
        .select("id, title")
        .eq("company_id", cmp.id)
        .order("created_at", { ascending: false });

      if (data) setJobs(data as { id: string; title: string }[]);
    })();
  }, []);

  /* --- 保存処理 ------------------------------------------------ */
  const handleSave = async () => {
    /* 1) 認証ユーザー取得 */
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      toast.error("ログイン情報を取得できませんでした");
      return;
    }

    /* 2) 所属 company_id を取得 (companies.user_id を参照) */
    const { data: companyRow, error: cmpErr } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (cmpErr || !companyRow?.id) {
      toast.error("所属企業が見つかりませんでした");
      return;
    }

    /* 3) 作成 / 更新ペイロード */
    const payload: Database["public"]["Tables"]["scout_templates"]["Insert"] & { job_id?: string | null } = {
      title: tpl.title,
      position: tpl.position,
      offer_range: tpl.offer_range,
      content: tpl.content,
      job_id: tpl.job_id,
      is_global: tpl.is_global,
      company_id: companyRow.id, // 外部キー制約を満たす companies.id
    };

    /* 4) INSERT or UPDATE */
    let result;
    if (mode === "new") {
      result = await supabase.from("scout_templates").insert(payload).select().single();
    } else if (params?.id) {
      result = await supabase
        .from("scout_templates")
        .update(payload)
        .eq("id", params.id)
        .select()
        .single();
    }

    /* 5) エラー処理 */
    if (result?.error) {
      console.error(result.error);
      toast.error(`保存に失敗しました: ${result.error.message}`);
      return;
    }

    toast.success(mode === "new" ? "テンプレートを作成しました" : "テンプレートを更新しました");
    router.push("/company/scout/templates");
  };

  /* --- JSX ----------------------------------------------------- */
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">
        {mode === "new" ? "スカウトテンプレート作成" : "スカウトテンプレート編集"}
      </h2>

      {/* タイトル入力 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">タイトル</label>
        <Input
          placeholder="例）エンジニア向け一次面談案内"
          value={tpl.title}
          onChange={(e) => setTpl({ ...tpl, title: e.target.value })}
        />
      </div>

      {/* 紐づけ求人（任意） */}
      <div className="space-y-2">
        <label className="text-sm font-medium">紐づけ求人 (任意)</label>
        <Select
          value={tpl.job_id ?? ""}
          onValueChange={(v) => setTpl({ ...tpl, job_id: v || null })}
        >
          <SelectTrigger>
            <SelectValue placeholder="未選択 (汎用テンプレ)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem key="" value="">
              未選択
            </SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ポジション & レンジ入力 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">提示ポジション *</label>
          <Input
            placeholder="例）フロントエンドエンジニア"
            value={tpl.position}
            onChange={(e) => setTpl({ ...tpl, position: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">オファー額レンジ（万円） *</label>
          <Input
            placeholder="例）400-600"
            value={tpl.offer_range}
            onChange={(e) => setTpl({ ...tpl, offer_range: e.target.value })}
          />
        </div>
      </div>

      {/* 本文入力 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">本文 (Markdown 可)</label>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "入力に戻る" : "プレビュー"}
          </button>
        </div>

        {showPreview ? (
          <div className="border rounded-md p-4 bg-muted/40 whitespace-pre-wrap text-sm">
            {renderPreview(tpl.content || "")}
          </div>
        ) : (
          <>
            <Textarea
              placeholder="テンプレート本文を入力..."
              className="h-64"
              value={tpl.content}
              onChange={(e) => setTpl({ ...tpl, content: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              {tpl.content.length} 文字
            </p>
          </>
        )}
      </div>

      {/* 置換タグヘルプ */}
      <div className="text-xs text-gray-600 space-y-1">
        <p className="font-medium">利用可能なプレースホルダー:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><code>{`{name}`}</code> : 学生の氏名</li>
          <li><code>{`{skill}`}</code> : 学生のスキル一覧</li>
          <li><code>{`{position}`}</code> : 提示ポジション</li>
          <li><code>{`{offer_range}`}</code> : オファー額レンジ（万円）</li>
        </ul>
      </div>

      {/* 全社チェック & アクション */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={tpl.is_global}
            onChange={(e) => setTpl({ ...tpl, is_global: e.target.checked })}
          />
          全社で共有する
        </label>

        <Button
          disabled={isSaving}
          onClick={handleSave}
          className="ml-auto"
        >
          {mode === "new" ? "作成" : "更新"}する
        </Button>
      </div>
    </div>
  );
}