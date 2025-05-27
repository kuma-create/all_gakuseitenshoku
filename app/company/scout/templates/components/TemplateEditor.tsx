"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";
import { toast } from "sonner";

type Form = {
  title: string;
  content: string;
  is_global: boolean;
};

interface Props {
  mode: "new" | "edit";
}

export default function TemplateEditor({ mode }: Props) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [tpl, setTpl] = useState<Form>({ title: "", content: "", is_global: false });
  const isSaving = tpl.title.trim() === "" || tpl.content.trim() === "";

  const [showPreview, setShowPreview] = useState(false);
  const sampleData = { name: "山田太郎", skill: "React, TypeScript" };

  // 簡易タグ置換（プレビュー用）
  const renderPreview = useCallback(
    (txt: string) =>
      txt
        .replace(/{name}/g, sampleData.name)
        .replace(/{skill}/g, sampleData.skill),
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
            setTpl({
              title: data.title ?? "",
              content: data.content ?? "",
              is_global: data.is_global ?? false,
            });
          }
        });
    }
  }, [mode, params?.id]);

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
    const payload: Database["public"]["Tables"]["scout_templates"]["Insert"] = {
      title: tpl.title,
      content: tpl.content,
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