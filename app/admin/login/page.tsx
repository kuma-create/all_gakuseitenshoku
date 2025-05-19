/* ------------------------------------------------------------------
   app/admin/login/page.tsx  –  管理者専用ログイン
------------------------------------------------------------------ */
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
} from "@/components/ui/card";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle } from "@/components/ui/alert";

export default function AdminLogin() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const nextPath     = searchParams.get("next") || "/admin";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]           = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr(null);

    /* Supabase Auth -------------- */
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password,
    });
    if (error || !data.session) {
      setErr("ログインに失敗しました");
      setLoading(false);
      return;
    }

    /* ロール確認 – JWT / app_metadata から取得（DB アクセス不要） */
    const role =
      data.user.user_metadata?.role ??
      (data.user.app_metadata as any)?.role ??
      (data.user as any).role;

    if (role !== "admin") {
      setErr("管理者権限がありません");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.replace(nextPath);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>管理者ログイン</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {err && (
              <Alert variant="destructive">
                <AlertTitle>{err}</AlertTitle>
              </Alert>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}