"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";

export default function ImpersonationBanner() {
  const supabase = createClientComponentClient();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // user_metadata に impersonated_by が入っている前提
      if (user?.user_metadata?.impersonated_by) {
        setIsImpersonating(true);
        setEmail(user.email ?? null); // undefined 対策
      }
    })();
  }, [supabase]);

  if (!isImpersonating) return null;

  return (
    <div className="flex items-center justify-between bg-yellow-100 px-4 py-2 text-sm text-yellow-800">
      👀 {email ?? "ユーザー"} として閲覧中
      <form action="/api/admin/exit-impersonate" method="POST">
        <button className="underline">管理者に戻る</button>
      </form>
    </div>
  );
}