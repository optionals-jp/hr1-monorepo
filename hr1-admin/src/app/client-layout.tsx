"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TooltipProvider } from "@/components/ui/tooltip";

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  // ログインページは認証不要
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // 認証状態の読み込み中、またはリダイレクト中
  if (loading || !user || !profile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-600">
            <span className="text-sm font-bold text-white">H</span>
          </div>
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 認証済み → メインレイアウト
  return (
    <>
      <Header />
      <div className="flex min-h-0">
        <Sidebar />
        <main className="flex flex-col flex-1 min-w-0 bg-slate-50">
          {children}
        </main>
      </div>
    </>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    </TooltipProvider>
  );
}
