/* ------------------------------------------------------------------
   app/admin/(protected)/page.tsx
   - /admin/(protected) へ直接アクセスしたとき用のダミー
   - 好きな管理トップに転送するだけ
------------------------------------------------------------------ */
import { redirect } from "next/navigation";

export default function AdminProtectedIndex() {
  redirect("/admin/(protected)/page"); // ← 好きなパスに変更可
}