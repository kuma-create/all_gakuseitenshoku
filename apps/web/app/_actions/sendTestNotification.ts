// app/_actions/sendTestNotification.ts
"use server"

import { createClient } from "@/lib/supabase/server"

export async function sendTestNotification(userId: string) {
    const supabase = await createClient()
  
    await supabase
      .from("notifications")
      .insert([
        {
          user_id: userId,            // ← snake_case
          title: "テスト通知",
          message: "この通知はテストです", // ← body ではなく message
          notification_type: "test",   // NOT NULL の場合は適当な文字列
        },
      ])
  }
  