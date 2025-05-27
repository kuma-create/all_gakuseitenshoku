"use client";

import { useEffect, useState } from "react";
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

    /* 2) 所属 company_id を取得 (company_members テーブル) */
    const { data: memberRow, error: memberErr } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberErr || !memberRow?.company_id) {
      toast.error("所属企業が見つかりませんでした");
      return;
    }

    /* 3) 作成 / 更新ペイロード */
    const payload: Database["public"]["Tables"]["scout_templates"]["Insert"] = {
      title: tpl.title,
      content: tpl.content,
      is_global: tpl.is_global,
      company_id: memberRow.company_id, // 外部キー制約を満たす companies.id
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
    <div className="p-6 space-y-4 max-w-xl">
      <Input
        placeholder="タイトル"
        value={tpl.title}
        onChange={(e) => setTpl({ ...tpl, title: e.target.value })}
      />

      <Textarea
        placeholder="本文 (Markdown 可)"
        className="h-64"
        value={tpl.content}
        onChange={(e) => setTpl({ ...tpl, content: e.target.value })}
      />

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={tpl.is_global}
          onChange={(e) => setTpl({ ...tpl, is_global: e.target.checked })}
        />
        全社で共有する
      </label>

      <Button disabled={isSaving} onClick={handleSave}>
        {mode === "new" ? "作成" : "更新"}する
      </Button>
    </div>
  );
}