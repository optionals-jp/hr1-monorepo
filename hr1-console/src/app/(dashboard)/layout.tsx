"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OrgProvider } from "@/lib/org-context";
import { Sidebar } from "@/components/layout/sidebar";
import { SettingsSidebar } from "@/components/layout/settings-sidebar";
import { Header } from "@/components/layout/header";
import { AccessDenied } from "@/components/ui/access-denied";
import { useAuth } from "@/lib/auth-context";
import { usePermission } from "@/lib/hooks/use-permission";
import { getResourceForPath } from "@/lib/constants/permissions";

function DashboardShell({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermission();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user || !profile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="HR1" className="h-8" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  const isSettings = pathname.startsWith("/settings");
  const requiredResource = getResourceForPath(pathname);
  const hasAccess = !requiredResource || can(requiredResource, "view");

  return (
    <OrgProvider>
      <Header />
      <div className="flex min-h-0">
        {isSettings ? <SettingsSidebar /> : <Sidebar />}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {hasAccess ? children : <AccessDenied />}
        </main>
      </div>
    </OrgProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
