"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { TooltipProvider } from "@hr1/shared-ui/components/ui/tooltip";
import { ToastProvider } from "@hr1/shared-ui/components/ui/toast";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <ToastProvider>
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}
