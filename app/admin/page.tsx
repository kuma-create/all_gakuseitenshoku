/* ------------------------------------------------------------------
   app/admin/page.tsx  –  /admin をダッシュボードへ転送
------------------------------------------------------------------ */
import { redirect } from "next/navigation";

export default function AdminIndex() {
  // 実際のトップにしたい場所へ
  redirect("/admin/(protected)/page");
}