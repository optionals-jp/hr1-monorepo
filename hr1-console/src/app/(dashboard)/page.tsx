"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import { useProductTab } from "@/components/layout/sidebar";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import type { DashboardData } from "@/components/dashboard/widget-renderer";
import type { DashboardWidgetConfigV2 } from "@/types/dashboard";
import {
  DEFAULT_RECRUITING_WIDGETS,
  DEFAULT_WORKSPACE_WIDGETS,
  DEFAULT_CLIENT_WIDGETS,
} from "@/lib/dashboard/defaults";
import { Settings2 } from "lucide-react";

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
      <div className="md:col-span-2 h-24 rounded-xl bg-muted/40" />
      <div className="h-72 rounded-xl bg-muted/40" />
      <div className="h-72 rounded-xl bg-muted/40" />
    </div>
  );
}

export default function DashboardPage() {
  const activeTab = useProductTab();
  const {
    stats,
    statsError,
    mutateStats,
    pipeline,
    kpiTrend,
    departmentStats,
    openJobs,
    empDeptStats,
    pendingWorkflows,
    leaveUsageRate,
    attendanceAnomalies,
    hiringTypeStats,
    hiringTypeAppStats,
    targets,
    recruitingWidgetConfig,
    workspaceWidgetConfig,
    clientWidgetConfig,
    recruitingConfigLoading,
    workspaceConfigLoading,
    clientConfigLoading,
    crmCompanyCount,
    crmContactCount,
    crmOpenDeals,
    crmWonDeals,
    crmTotalAmount,
    crmWonAmount,
    crmDeals,
  } = useDashboard(activeTab);

  const pipelineRate =
    pipeline && pipeline.length >= 2 && pipeline[0].count > 0
      ? Math.round((pipeline[pipeline.length - 1].count / pipeline[0].count) * 100)
      : 0;

  const dashboardData: DashboardData = {
    stats,
    pipeline,
    kpiTrend,
    departmentStats,
    openJobs,
    empDeptStats,
    pendingWorkflows,
    leaveUsageRate,
    attendanceAnomalies,
    hiringTypeStats,
    hiringTypeAppStats,
    targets,
    pipelineRate,
    crmCompanyCount,
    crmContactCount,
    crmOpenDeals,
    crmWonDeals,
    crmTotalAmount,
    crmWonAmount,
    crmDeals,
  };

  const configMap: Record<string, DashboardWidgetConfigV2[] | undefined> = {
    recruiting: recruitingWidgetConfig,
    workspace: workspaceWidgetConfig,
    client: clientWidgetConfig,
  };

  const defaultMap: Record<string, DashboardWidgetConfigV2[]> = {
    recruiting: DEFAULT_RECRUITING_WIDGETS,
    workspace: DEFAULT_WORKSPACE_WIDGETS,
    client: DEFAULT_CLIENT_WIDGETS,
  };

  const loadingMap: Record<string, boolean> = {
    recruiting: recruitingConfigLoading,
    workspace: workspaceConfigLoading,
    client: clientConfigLoading,
  };

  const savedConfig = configMap[activeTab];
  const isLoading = loadingMap[activeTab] ?? false;
  const currentConfig = savedConfig ?? defaultMap[activeTab] ?? DEFAULT_RECRUITING_WIDGETS;

  return (
    <div className="px-4 py-5 sm:px-6 md:px-8 md:py-6">
      <QueryErrorBanner error={statsError} onRetry={() => mutateStats()} />

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[17px] font-semibold tracking-tight">ダッシュボード</h1>
          <Link
            href={`/settings/dashboard?tab=${activeTab}`}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Settings2 className="h-4 w-4" />
            カスタマイズ
          </Link>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <DashboardGrid widgets={currentConfig} data={dashboardData} />
        )}
      </div>
    </div>
  );
}
