// app/company/onboarding/error/page.tsx
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function VerifyErrorPage() {
  const params = useSearchParams();
  const router = useRouter();
  const err = params.get("error");

  const message =
    err === "expired_token"
      ? "招待リンクの有効期限が切れました。メールを再送しますか？"
      : "リンクが無効です。再度メールを受け取ってください。";

  const resend = async () => {
    const email = params.get("email");
    if (!email) return;
    await fetch("/api/auth/resend-invite", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    router.push("/check-your-email");
  };

  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-xl font-bold mb-4">リンクが無効です</h1>
      <p className="mb-6">{message}</p>
      <Button onClick={resend}>メールを再送信</Button>
    </div>
  );
}