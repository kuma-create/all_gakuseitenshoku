"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Database } from "@/lib/supabase/types";

// ⚙️ UI Components (ShadCN)
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

/* ------------------------------------------------------------------
   Zod schema & types
------------------------------------------------------------------ */
const schema = z.object({
  subject: z.string().min(1, "件名を入力してください"),
  category: z.enum(["general", "bug", "feature", "billing"], {
    required_error: "カテゴリーを選択してください",
  }),
  message: z.string().min(1, "お問い合わせ内容を入力してください"),
});

type FormValues = z.infer<typeof schema>;

/* ------------------------------------------------------------------
   Page Component
------------------------------------------------------------------ */
export default function SupportPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    const { error } = await createInquiry(values);

    if (error) {
      toast.error("送信に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    toast.success("お問い合わせを送信しました。サポートチームからの連絡をお待ちください。");
    reset();
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">サポートセンターお問い合わせ</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 件名 */}
        <div>
          <Input placeholder="件名" {...register("subject")} />
          {errors.subject && (
            <p className="text-destructive text-sm mt-1">{errors.subject.message}</p>
          )}
        </div>

        {/* カテゴリー */}
        <div>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリーを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">一般</SelectItem>
                  <SelectItem value="bug">不具合</SelectItem>
                  <SelectItem value="feature">その他</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && (
            <p className="text-destructive text-sm mt-1">{errors.category.message}</p>
          )}
        </div>

        {/* お問い合わせ内容 */}
        <div>
          <Textarea rows={6} placeholder="お問い合わせ内容" {...register("message")} />
          {errors.message && (
            <p className="text-destructive text-sm mt-1">{errors.message.message}</p>
          )}
        </div>

        {/* 送信ボタン */}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "送信中..." : "送信する"}
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------
   ⛳ Server Action: createInquiry
   - Inserts inquiry into `support_inquiries` table
   - Associates with currently signed‑in user
------------------------------------------------------------------ */
async function createInquiry(values: FormValues) {
  // ✅ クライアント側 Supabase で問い合わせを登録
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return { error: authError } as const;
  }

  // 組み立てるデータオブジェクト（型を明示）
  const data: Database["public"]["Tables"]["support_inquiries"]["Insert"] = {
    subject: values.subject,
    category: values.category,
    message: values.message,
    status: "open",
    user_id: user ? user.id : null, // nullable 列なので null 可
  };

  const { error } = await supabase.from("support_inquiries").insert(data);

  if (error) {
    return { error } as const;
  }

  return { error: null } as const;
}
