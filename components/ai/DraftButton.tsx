"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";

/** OpenAI から返ってくる JSON 型 */
export type AIDraft = {
  title: string;
  body: string;
  length: number;
};

/**
 * フォーム値 (`prompt`) と書き戻しハンドラ (`onInsert`) を
 * props でもらうボタン。react‑hook‑form に依存しない。
 */
export default function DraftButton({
  prompt,
  onInsert,
}: {
  prompt: any;
  onInsert: (draft: AIDraft) => void;
}) {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);

    const { data, error } = await supabase.functions.invoke<AIDraft>(
      "ai-pr-draft",
      { body: { prompt } },
    );

    if (error || !data) {
      toast.error("AI 下書き生成に失敗しました");
    } else {
      onInsert(data);
      toast.success("下書きを挿入しました");
    }

    setLoading(false);
  };

  return (
    <Button variant="ghost" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-2 h-4 w-4" />
      )}
      AI で下書き
    </Button>
  );
}