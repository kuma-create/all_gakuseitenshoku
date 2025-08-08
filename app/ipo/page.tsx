"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { LandingPage } from "@/components/LandingPage";

export default function Page() {
  const router = useRouter();
  const navigate = (route: string) => router.push(route);
  // TODO: 接続後に実ユーザーを入れる
  const user = null;
  
  // ルート /ipo はレイアウトを被せず、ランディング単体を描画
  return <LandingPage navigate={navigate} user={user} />;
}