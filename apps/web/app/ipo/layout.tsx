"use client";
import React, { useEffect, useCallback, startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout } from "@/components/Layout";
import { SidebarProvider } from "@/components/ui/sidebar";

// Metadata is defined in app/ipo/metadata.ts (server file).

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

  const isLanding = pathname === "/ipo";

  // Layout が期待する currentRoute は path をそのまま渡すでOK
  const currentRoute = pathname;

  // TODO: 後で本物のユーザーを接続
  const user = null;

  // Force-initialize sidebar collapsed at first load by clearing any legacy state key
  useEffect(() => {
    try {
      // shadcn/ui sidebar default key used previously
      localStorage.removeItem('sidebar:state');
    } catch {}
  }, []);

  if (isLanding) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false} storageKey="ipo:sidebar:state">
      <Layout currentRoute={currentRoute as any} navigate={navigate} user={user}>
        <div className="w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </Layout>
    </SidebarProvider>
  );
}