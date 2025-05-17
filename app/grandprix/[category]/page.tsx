"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function ConfirmPage() {
  const router = useRouter();
  const { category, challengeId } = useParams<{ category: string; challengeId: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  const startChallenge = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({ description: "ログインしてください" });
      setLoading(false);
      return;
    }

    const { data: session, error } = await supabase
      .from("challenge_sessions")
      .insert({
        challenge_id: challengeId,
        student_id: user.id,
      })
      .select()
      .single();

    if (error || !session) {
      toast({ description: error?.message || "セッション作成に失敗しました" });
      setLoading(false);
      return;
    }

    const sessionId = session.id;
    router.replace(`/grandprix/${category}/session/${sessionId}/test`);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-xl font-bold">挑戦確認</h1>
      <Button onClick={startChallenge} disabled={loading}>
        {loading ? "準備中..." : "挑戦開始"}
      </Button>
    </div>
  );
}