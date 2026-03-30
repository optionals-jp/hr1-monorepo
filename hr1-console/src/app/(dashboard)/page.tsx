"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { PipelineChart } from "@/components/dashboard/pipeline-chart";
import { KpiTrendChart } from "@/components/dashboard/kpi-trend-chart";
import { DepartmentChart } from "@/components/dashboard/department-chart";
import { EmployeeDepartmentChart } from "@/components/dashboard/employee-department-chart";
import { HiringTypeChart } from "@/components/dashboard/hiring-type-chart";
import { OpenJobsChart } from "@/components/dashboard/open-jobs-chart";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useDashboard } from "@/lib/hooks/use-dashboard";
import {
  Users,
  UserPlus,
  Briefcase,
  ClipboardList,
  Building2,
  UserCheck,
  ClipboardCheck,
  CalendarDays,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

const pageTabs = [
  { value: "recruiting", label: "採用" },
  { value: "employees", label: "社員" },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KpiCardDef {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
  accent: string;
  suffix?: string;
}

/* ------------------------------------------------------------------ */
/*  KpiCard                                                            */
/* ------------------------------------------------------------------ */

function KpiCard({ card }: { card: KpiCardDef }) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${card.accent}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-[13px] font-medium text-muted-foreground">
          {card.title}
        </CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
          <card.icon className={`h-4 w-4 ${card.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums tracking-tight">
          {card.value.toLocaleString()}
          {card.suffix && (
            <span className="text-sm font-medium text-muted-foreground ml-0.5">{card.suffix}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("recruiting");
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
    organization,
  } = useDashboard();

  const d = stats ?? { applicants: 0, employees: 0, openJobs: 0, activeApplications: 0 };

  const recruitingCards: KpiCardDef[] = [
    {
      title: "応募者",
      value: d.applicants,
      icon: UserPlus,
      color: "text-blue-600",
      bg: "bg-blue-50",
      accent: "bg-blue-500",
    },
    {
      title: "公開中の求人",
      value: d.openJobs,
      icon: Briefcase,
      color: "text-amber-600",
      bg: "bg-amber-50",
      accent: "bg-amber-500",
    },
    {
      title: "選考中の応募",
      value: d.activeApplications,
      icon: ClipboardList,
      color: "text-violet-600",
      bg: "bg-violet-50",
      accent: "bg-violet-500",
    },
  ];

  const hiringTotal = hiringTypeStats ? hiringTypeStats.reduce((s, i) => s + i.value, 0) : 0;
  const midCareerRatio =
    hiringTotal > 0
      ? Math.round(
          ((hiringTypeStats?.find((s) => s.name === "中途")?.value ?? 0) / hiringTotal) * 100
        )
      : 0;

  const employeeCards: KpiCardDef[] = [
    {
      title: "社員数",
      value: d.employees,
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      accent: "bg-emerald-500",
    },
    {
      title: "部署数",
      value: empDeptStats ? new Set(empDeptStats.map((s) => s.department)).size : 0,
      icon: Building2,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      accent: "bg-cyan-500",
    },
    {
      title: "中途採用比率",
      value: midCareerRatio,
      icon: UserCheck,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      accent: "bg-indigo-500",
      suffix: "%",
    },
    {
      title: "承認待ち",
      value: pendingWorkflows ?? 0,
      icon: ClipboardCheck,
      color: "text-orange-600",
      bg: "bg-orange-50",
      accent: "bg-orange-500",
    },
    {
      title: "有給取得率",
      value: leaveUsageRate ?? 0,
      icon: CalendarDays,
      color: "text-teal-600",
      bg: "bg-teal-50",
      accent: "bg-teal-500",
      suffix: "%",
    },
    {
      title: "勤怠異常",
      value: attendanceAnomalies ?? 0,
      icon: AlertTriangle,
      color: attendanceAnomalies && attendanceAnomalies > 0 ? "text-red-600" : "text-gray-400",
      bg: attendanceAnomalies && attendanceAnomalies > 0 ? "bg-red-50" : "bg-gray-50",
      accent: attendanceAnomalies && attendanceAnomalies > 0 ? "bg-red-500" : "bg-gray-300",
    },
  ];

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description={organization?.name ?? ""}
        border={false}
        sticky={false}
      />

      <div className="sticky top-14 z-10 flex items-center gap-6 border-b px-4 sm:px-6 md:px-8 bg-white">
        {pageTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
              activeTab === tab.value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <PageContent>
        <QueryErrorBanner error={statsError} onRetry={() => mutateStats()} />

        {/* ===== 採用タブ ===== */}
        {activeTab === "recruiting" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {recruitingCards.map((card) => (
                <KpiCard key={card.title} card={card} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <PipelineChart data={pipeline ?? []} />
              <KpiTrendChart data={kpiTrend ?? []} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DepartmentChart data={departmentStats ?? []} />
              <OpenJobsChart data={openJobs ?? []} />
            </div>
          </div>
        )}

        {/* ===== 社員タブ ===== */}
        {activeTab === "employees" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {employeeCards.map((card) => (
                <KpiCard key={card.title} card={card} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <EmployeeDepartmentChart data={empDeptStats ?? []} />
              <HiringTypeChart data={hiringTypeStats ?? []} />
            </div>
          </div>
        )}
      </PageContent>
    </>
  );
}
