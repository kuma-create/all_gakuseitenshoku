"use client";
import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DraftButton({ fields }: { fields: any }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  const handleClick = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-pr-draft", {
      body: { prompt: fields }
    });
    if (error) alert("生成に失敗しました");
    else {
      // ▼ フォームの state に反映（例: react-hook-form 用）
      // setValue("pr_title", data.title); setValue("pr_text", data.body);
    }
    setLoading(false);
  };

  return (
    <Button variant="ghost" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      AI で下書き
    </Button>
  );
}