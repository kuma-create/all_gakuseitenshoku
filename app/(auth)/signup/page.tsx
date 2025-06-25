/* ------------------------------------------------------------------------
   app/(auth)/signup/page.tsx
   - STEP1: 基本情報入力（姓・名）
   - STEP2: 確認メール送信完了
   - 新規登録は /api/signup に POST → role は自動で student
------------------------------------------------------------------------- */
"use client";

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

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignupPage() {
  const router = useRouter();

  /* ---------------- state ---------------- */
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);

  /* form state */
  const [formData, setFormData] = useState({
    last_name : "",
    first_name: "",
    email     : "",
    password  : "",
    referral  : "",
    graduation_month: "",
  });

  const graduationMonths = Array.from({ length: 6 }, (_, i) => (new Date().getFullYear() + i).toString());

  /* handlers */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  /* password validation */
  const isLengthOK  = formData.password.length >= 8;
  const hasAlphaNum = /[A-Za-z]/.test(formData.password) && /\d/.test(formData.password);
  const allPasswordOK = isLengthOK && hasAlphaNum;

  /* ---------------- signup submit ---------------- */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/signup", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          email     : formData.email,
          password  : formData.password,
          first_name: formData.first_name,
          last_name : formData.last_name,
          referral  : formData.referral,
          graduation_month : formData.graduation_month,
        }),
      });

      const json = await res.json();

      /* ---------------- duplicate email handling ---------------- */
      if (!res.ok) {
        const msg: string = json.error ?? "";
        const isDuplicate =
          res.status === 409 || // Conflict – email already registered
          /already/i.test(msg) ||
          /exists/i.test(msg);

        if (isDuplicate) {
          // メールアドレス重複の場合はエラー文言を表示してログイン画面へ
          setError("そのメールアドレスはすでに登録されています。ログインしてください。");
          setTimeout(() => router.push("/login"), 1000);
          return;
        }

        throw new Error(msg || "登録に失敗しました");
      }

      /* 完了画面へ */
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "登録中に問題が発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  /* password rule icon */
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
                    {/* 姓名 */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="last_name">苗字</Label>
                        <Input
                          id="last_name"
                          placeholder="山田"
                          required
                          value={formData.last_name}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="first_name">名前</Label>
                        <Input
                          id="first_name"
                          placeholder="太郎"
                          required
                          value={formData.first_name}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

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
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>

                        {/* Password rules */}
                        <div className="text-xs space-y-1">
                          <p className="text-gray-500">パスワードは以下を満たす必要があります：</p>
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

                    {/* graduation month */}
                    <div className="grid gap-2">
                      <Label htmlFor="graduation_month">卒業予定月（西暦）</Label>
                      <select
                        id="graduation_month"
                        required
                        value={formData.graduation_month}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-red-600"
                      >
                        <option value="">選択してください</option>
                        {graduationMonths.map((y) => (
                          <option key={y} value={y}>
                            {y}年
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* terms */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="terms"
                        checked={termsChecked}
                        onCheckedChange={(v) => setTermsChecked(v as boolean)}
                        required
                      />
                      <Label htmlFor="terms" className="text-sm">
                        <Link
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-red-600 hover:text-red-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          利用規約
                        </Link>
                        {" "}と{" "}
                        <Link
                          href="/privacy-policy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-red-600 hover:text-red-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          プライバシーポリシー
                        </Link>
                        {" "}に同意します
                      </Label>
                    </div>

                    {/* error */}
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* submit */}
                    <Button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={isLoading || !allPasswordOK || !termsChecked || !formData.graduation_month}
                    >
                      {isLoading ? (
                        <>
                          <span className="mr-2 animate-spin">◌</span>
                          処理中...
                        </>
                      ) : (
                        "学生転職に登録する"
                      )}
                    </Button>
                  </form>
                </CardContent>
              )}

              {/* ============ STEP 2 ============ */}
              {step === 2 && (
                <CardContent className="flex flex-col items-center space-y-6 py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <p className="text-lg font-semibold">あと少しで登録完了です！</p>
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
                  <Link href="/login" className="ml-1 font-medium text-red-600 hover:underline">
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

/* ---------- メリットサイドバー ---------- */
function BenefitsSidebar() {
  const benefits = [
    { title: "企業からのスカウト", desc: "あなたのプロフィールを見た企業から直接オファーが届きます" },
    { title: "職務経歴書の自動作成", desc: "経験やスキルを入力するだけで、魅力的な職務経歴書が完成します" },
    { title: "就活グランプリへの参加", desc: "ビジネススキルを可視化し、企業からの注目度をアップできます" },
  ];

  return (
    <aside className="sticky top-4 md:col-span-2">
      <div className="rounded-xl border bg-white px-6 py-8 shadow-lg">
        <h3 className="mb-6 text-lg font-bold text-gray-900">登録するメリット</h3>
        <ul className="space-y-6">
          {benefits.map((b) => (
            <li key={b.title} className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50">
                <CheckCircle className="h-4 w-4 text-red-500" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{b.title}</p>
                <p className="text-sm text-gray-600">{b.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}