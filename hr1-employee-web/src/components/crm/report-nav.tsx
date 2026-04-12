"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@hr1/shared-ui/lib/utils";
import { TrendingUp, Workflow, Trophy, Activity } from "lucide-react";

const REPORT_TABS = [
  { href: "/reports/forecast", label: "売上予測", icon: TrendingUp },
  { href: "/reports/pipeline", label: "パイプライン分析", icon: Workflow },
  { href: "/reports/win-loss", label: "勝敗分析", icon: Trophy },
  { href: "/reports/performance", label: "担当者パフォーマンス", icon: Activity },
] as const;

export function ReportNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 px-4 sm:px-6 md:px-8 border-b bg-white overflow-x-auto">
      {REPORT_TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors",
              isActive
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
