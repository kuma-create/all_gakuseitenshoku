/* ------------------------------------------------------------------------
   app/(auth)/signup/page.tsx
   - STEP1: 基本情報入力
   - STEP2: 確認メール送信完了
------------------------------------------------------------------------- */
"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  Circle,
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

const supabase = createClientComponentClient<Database>();

export default function SignupPage() {
  const router = useRouter();

  /* ---------------- state ---------------- */
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ✅ 利用規約チェック */
  const [termsChecked, setTermsChecked] = useState(false);

  /* form */
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    referral: "",
  });

  /* -------------- handlers -------------- */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  /* パスワードルール */
  const isLengthOK = formData.password.length >= 8;
  const hasAlphaNum =
    /[A-Za-z]/.test(formData.password) && /\d/.test(formData.password);
  const allPasswordOK = isLengthOK && hasAlphaNum;

  /* -------------- signup -------------- */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      /* ❶ メール認証付きサインアップ ---------------------------- */
      const { data, error: authErr } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { referral_source: formData.referral },
          emailRedirectTo: `${location.origin}/auth/email-callback`,
        },
      });
      if (authErr) throw authErr;
      if (!data.user) throw new Error("ユーザー登録に失敗しました");

      /* ❷ 流入経路を永続テーブルに保存 ------------------------ */
      const { error: insertErr } = await supabase
        .from("user_signups")
        .insert({
          user_id: data.user.id,                // 👈 これを追加
          referral_source: formData.referral,
        });
      if (insertErr) console.error(insertErr); // 失敗しても致命的ではない

      /* ❸ 完了画面へ ------------------------------------------ */
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ?? "登録中に問題が発生しました。もう一度お試しください。",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ------- password rule icon ------- */
  const Rule = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className={`flex items-center gap-1 ${ok ? "text-emerald-600" : "text-gray-500"}`}>
      {ok ? <CheckCircle size={14} /> : <Circle size={14} />}
      {children}
    </li>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="container mx-auto max-w-screen-lg px-4 py-8">
        {/* 戻る */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-red-600"
          >
            <ArrowLeft size={16} />
            <span>トップページに戻る</span>
          </Link>
        </div>

        <div className="grid items-start gap-8 md:grid-cols-5">
          {/* ------------------ Form ------------------ */}
          <div className="md:col-span-3">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardTitle className="text-2xl">新規アカウント登録</CardTitle>
                <CardDescription className="text-red-100">
                  学生転職で理想のキャリアを見つけましょう
                </CardDescription>
              </CardHeader>

              {/* ============ STEP 1 ============ */}
              {step === 1 && (
                <CardContent className="pt-6">
                  <form onSubmit={handleSignup} className="space-y-6">
                    {/* email / password */}
                    <div className="space-y-4">
                      {/* email */}
                      <div className="grid gap-2">
                        <Label htmlFor="email">メールアドレス</Label>
                        <div className="relative">
                          <AtSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="example@university.ac.jp"
                            className="pl-10"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          ※大学メールを使用すると在学証明が不要になります
                        </p>
                      </div>

                      {/* password */}
                      <div className="grid gap-2">
                        <Label htmlFor="password">パスワード</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="8文字以上の英数字"
                            className="pl-10 pr-10"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowPassword((b) => !b)}
                          >
                            {showPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>

                        {/* Password rules */}
                        <div className="text-xs space-y-1">
                          <p className="text-gray-500">
                            パスワードは以下を満たす必要があります：
                          </p>
                          <ul className="space-y-1">
                            <Rule ok={isLengthOK}>8文字以上</Rule>
                            <Rule ok={hasAlphaNum}>英字と数字を含む</Rule>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* ▼ 流入経路 ▼ */}
                    <div className="grid gap-2">
                      <Label htmlFor="referral">どこで知りましたか？</Label>
                      <select
                        id="referral"
                        required
                        value={formData.referral}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-red-600"
                      >
                        <option value="">選択してください</option>
                        <option value="search">検索エンジン</option>
                        <option value="sns">SNS（X / Instagram 等）</option>
                        <option value="friend">友人・先輩の紹介</option>
                        <option value="ad">Web広告</option>
                        <option value="career_center">大学キャリアセンター</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                    {/* ▲ 流入経路 ▲ */}

                    {/* terms */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="terms"
                        checked={termsChecked}
                        onCheckedChange={(v) => setTermsChecked(v as boolean)}
                        required
                      />
                      <Label htmlFor="terms" className="text-sm">
                        <span className="underline">利用規約</span> と{" "}
                        <span className="underline">プライバシーポリシー</span>
                        に同意します
                      </Label>
                    </div>

                    {/* error */}
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* next btn */}
                    <Button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={
                        isLoading || !allPasswordOK || !termsChecked
                      }
                    >
                      {isLoading ? (
                        <>
                          <span className="mr-2 animate-spin">◌</span>
                          処理中...
                        </>
                      ) : (
                        "メールを送信する"
                      )}
                    </Button>
                  </form>
                </CardContent>
              )}

              {/* ============ STEP 2 ============ */}
              {step === 2 && (
                <CardContent className="flex flex-col items-center space-y-6 py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <p className="text-lg font-semibold">
                    あと少しで登録完了です！
                  </p>
                  <p className="max-w-sm text-gray-600">
                    ご入力いただいたメールアドレス宛に確認メールを送信しました。
                    <br />
                    メール内のリンクをクリックして登録を完了してください。
                  </p>
                  <Button onClick={() => router.push("/")}>トップへ戻る</Button>
                </CardContent>
              )}

              {/* footer */}
              <CardFooter className="flex flex-col items-center border-t px-6 py-4 text-center">
                <p className="text-sm text-gray-600">
                  すでにアカウントをお持ちの方は
                  <Link
                    href="/login"
                    className="ml-1 font-medium text-red-600 hover:underline"
                  >
                    ログイン
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>

          {/* ------------------ benefits ------------------ */}
          <BenefitsSidebar />
        </div>
      </div>
    </div>
  );
}

/* ───────── サブコンポーネント ───────── */
function BenefitsSidebar() {
  const benefits = [
    {
      title: "企業からのスカウト",
      desc: "あなたのプロフィールを見た企業から直接オファーが届きます",
    },
    {
      title: "職務経歴書の自動作成",
      desc: "経験やスキルを入力するだけで、魅力的な職務経歴書が完成します",
    },
    {
      title: "就活グランプリへの参加",
      desc: "ビジネススキルを可視化し、企業からの注目度をアップできます",
    },
  ];

  return (
    <div className="sticky top-4 space-y-6 md:col-span-2">
      <h3 className="mb-4 text-lg font-bold text-gray-900">登録するメリット</h3>
      <ul className="space-y-4">
        {benefits.map((b) => (
          <li key={b.title} className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <CheckCircle size={14} />
            </div>
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-sm text-gray-600">{b.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
