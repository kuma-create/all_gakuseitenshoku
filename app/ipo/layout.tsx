"use client";
import React, { useEffect, useCallback, startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout } from "@/components/Layout";

export default function IPOLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useCallback((route: string) => {
    startTransition(() => {
      router.push(route);
    });
  }, [router]);

  // Run a callback when the main thread is idle (fallback to setTimeout)
  const runIdle = (cb: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // @ts-ignore
      (window as any).requestIdleCallback(cb);
    } else {
      setTimeout(cb, 0);
    }
  };

  // Prefetch common IPO routes to make client navigation snappier
  useEffect(() => {
    runIdle(() => {
      router.prefetch('/ipo/dashboard');
      router.prefetch('/ipo/analysis');
      router.prefetch('/ipo/case');
      router.prefetch('/ipo/diagnosis');
      router.prefetch('/ipo/selection');
      router.prefetch('/ipo/calendar');
      router.prefetch('/ipo/library');
    });
  }, [router]);

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