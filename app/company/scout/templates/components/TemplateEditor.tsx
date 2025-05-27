"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

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
    // TODO: company_id をセッションや context から取得して差し込む
    const payload: Database["public"]["Tables"]["scout_templates"]["Insert"] = {
      ...tpl,
      company_id: "", // 仮
    };

    if (mode === "new") {
      await supabase.from("scout_templates").insert(payload);
    } else if (params?.id) {
      await supabase.from("scout_templates").update(payload).eq("id", params.id);
    }
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