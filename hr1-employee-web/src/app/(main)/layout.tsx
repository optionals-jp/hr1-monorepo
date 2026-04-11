"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrgProvider } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";

function MainShell({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // profile取得失敗時は未認証扱いでログインへ
  useEffect(() => {
    if (!loading && user && !profile) {
      router.replace("/login?error=unauthorized");
    }
  }, [loading, user, profile, router]);

  if (loading || !user || !profile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-main-pattern">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="HR1" className="h-8" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <OrgProvider>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <AppHeader />
          <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        </div>
      </div>
    </OrgProvider>
  );
}

export default function MainLayout({ children }: { children: ReactNode }) {
  return <MainShell>{children}</MainShell>;
}
