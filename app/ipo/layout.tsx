"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout } from "@/components/Layout";

export default function IPOLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = (route: string) => router.push(route);

  // /ipo はランディング専用、レイアウトなし
  if (pathname === "/ipo") return <>{children}</>;

  // Layout が期待する currentRoute は path をそのまま渡すでOK
  const currentRoute = pathname;

  // TODO: 後で本物のユーザーを接続
  const user = null;

  return (
    <Layout currentRoute={currentRoute as any} navigate={navigate} user={user}>
      {children}
    </Layout>
  );
}