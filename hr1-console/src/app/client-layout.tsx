"use client";

import { ReactNode } from "react";
import { OrgProvider } from "@/lib/org-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TooltipProvider } from "@/components/ui/tooltip";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <OrgProvider>
        <div className="flex h-screen flex-col bg-white">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-slate-50">
              {children}
            </main>
          </div>
        </div>
      </OrgProvider>
    </TooltipProvider>
  );
}
