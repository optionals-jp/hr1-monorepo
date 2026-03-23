"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { PipelineChart, PipelineStage } from "@/components/dashboard/pipeline-chart";
import { KpiTrendChart, KpiTrendPoint } from "@/components/dashboard/kpi-trend-chart";
import { DepartmentChart, DepartmentStat } from "@/components/dashboard/department-chart";
import {
  EmployeeDepartmentChart,
  EmployeeDepartmentStat,
} from "@/components/dashboard/employee-department-chart";
import { HiringTypeChart, HiringTypeStat } from "@/components/dashboard/hiring-type-chart";
import { OpenJobsChart, OpenJobStat } from "@/components/dashboard/open-jobs-chart";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
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
import { format, subMonths } from "date-fns";

const pageTabs = [
  { value: "recruiting", label: "採用" },
  { value: "employees", label: "社員" },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Stats {
  applicants: number;
  employees: number;
  openJobs: number;
  activeApplications: number;
}

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
  const { organization } = useOrg();
  const orgId = organization?.id;
  const [activeTab, setActiveTab] = useState("recruiting");

  // --- 共通 KPI ---
  const {
    data: stats,
    error: statsError,
    mutate: mutateStats,
  } = useQuery<Stats>(orgId ? `dashboard-stats-${orgId}` : null, async () => {
    const [applicantsRes, employeesRes, jobsRes, appsRes] = await Promise.all([
      getSupabase()
        .from("user_organizations")
        .select("user_id, profiles!inner(role)", { count: "exact" })
        .eq("organization_id", orgId!)
        .eq("profiles.role", "applicant"),
      getSupabase()
        .from("user_organizations")
        .select("user_id, profiles!inner(role)", { count: "exact" })
        .eq("organization_id", orgId!)
        .eq("profiles.role", "employee"),
      getSupabase()
        .from("jobs")
        .select("id", { count: "exact" })
        .eq("organization_id", orgId!)
        .eq("status", "open"),
      getSupabase()
        .from("applications")
        .select("id", { count: "exact" })
        .eq("organization_id", orgId!)
        .eq("status", "active"),
    ]);

    return {
      applicants: applicantsRes.count ?? 0,
      employees: employeesRes.count ?? 0,
      openJobs: jobsRes.count ?? 0,
      activeApplications: appsRes.count ?? 0,
    };
  });

  // --- 選考パイプライン ---
  const { data: pipeline } = useQuery<PipelineStage[]>(
    orgId ? `dashboard-pipeline-${orgId}` : null,
    async () => {
      const { data: applications } = await getSupabase()
        .from("applications")
        .select("id, status, application_steps(step_type, step_order, status, label)")
        .eq("organization_id", orgId!);

      if (!applications || applications.length === 0) return [];

      const totalApplied = applications.length;
      const stepMap = new Map<string, { order: number; label: string; count: number }>();

      for (const app of applications) {
        for (const step of app.application_steps ?? []) {
          const key = `${step.step_order}-${step.step_type}`;
          if (!stepMap.has(key)) {
            stepMap.set(key, { order: step.step_order, label: step.label, count: 0 });
          }
          if (step.status === "completed" || step.status === "in_progress") {
            stepMap.get(key)!.count++;
          }
        }
      }

      const stages: PipelineStage[] = [{ name: "応募", count: totalApplied }];
      const sortedSteps = Array.from(stepMap.values()).sort((a, b) => a.order - b.order);

      // application_stepsの最終ステップが内定相当なら、status="offered"の件数で上書き
      const offeredCount = applications.filter((a) => a.status === "offered").length;
      for (const step of sortedSteps) {
        const isOfferStep = step.label === "内定" || step.label === "オファー";
        stages.push({
          name: step.label,
          count: isOfferStep ? offeredCount : step.count,
        });
      }

      // stepsに内定ステップがなければ末尾に追加
      const hasOfferStep = sortedSteps.some((s) => s.label === "内定" || s.label === "オファー");
      if (!hasOfferStep && (offeredCount > 0 || sortedSteps.length > 0)) {
        stages.push({ name: "内定", count: offeredCount });
      }

      return stages;
    }
  );

  // --- KPIトレンド（過去6ヶ月） ---
  const { data: kpiTrend } = useQuery<KpiTrendPoint[]>(
    orgId ? `dashboard-kpi-trend-${orgId}` : null,
    async () => {
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 5);
      const startDate = format(
        new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1),
        "yyyy-MM-dd"
      );

      const { data: applications } = await getSupabase()
        .from("applications")
        .select("id, status, applied_at")
        .eq("organization_id", orgId!)
        .gte("applied_at", startDate);

      if (!applications) return [];

      const monthMap = new Map<
        string,
        { applications: number; offered: number; withdrawn: number }
      >();

      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        monthMap.set(format(d, "yyyy/MM"), { applications: 0, offered: 0, withdrawn: 0 });
      }

      for (const app of applications) {
        const key = format(new Date(app.applied_at), "yyyy/MM");
        if (!monthMap.has(key)) continue;
        const entry = monthMap.get(key)!;
        entry.applications++;
        if (app.status === "offered") entry.offered++;
        if (app.status === "withdrawn") entry.withdrawn++;
      }

      return Array.from(monthMap.entries()).map(([month, d]) => ({ month, ...d }));
    }
  );

  // --- 部署別採用状況 ---
  const { data: departmentStats } = useQuery<DepartmentStat[]>(
    orgId ? `dashboard-dept-stats-${orgId}` : null,
    async () => {
      const { data: applications } = await getSupabase()
        .from("applications")
        .select("id, status, jobs(department)")
        .eq("organization_id", orgId!);

      if (!applications) return [];

      const deptMap = new Map<string, { applications: number; offered: number }>();
      for (const app of applications) {
        const dept = (app.jobs as unknown as { department: string | null })?.department ?? "未設定";
        if (!deptMap.has(dept)) deptMap.set(dept, { applications: 0, offered: 0 });
        const entry = deptMap.get(dept)!;
        entry.applications++;
        if (app.status === "offered") entry.offered++;
      }

      return Array.from(deptMap.entries())
        .map(([department, d]) => ({ department, ...d }))
        .sort((a, b) => b.applications - a.applications);
    }
  );

  // --- 公開中の求人 ---
  const { data: openJobs } = useQuery<OpenJobStat[]>(
    orgId ? `dashboard-open-jobs-${orgId}` : null,
    async () => {
      const { data: jobs } = await getSupabase()
        .from("jobs")
        .select("id, title, department")
        .eq("organization_id", orgId!)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (!jobs || jobs.length === 0) return [];

      const { data: apps } = await getSupabase()
        .from("applications")
        .select("job_id, status")
        .eq("organization_id", orgId!)
        .in(
          "job_id",
          jobs.map((j) => j.id)
        );

      const countMap = new Map<string, { total: number; offered: number }>();
      for (const app of apps ?? []) {
        if (!countMap.has(app.job_id)) countMap.set(app.job_id, { total: 0, offered: 0 });
        const c = countMap.get(app.job_id)!;
        c.total++;
        if (app.status === "offered") c.offered++;
      }

      return jobs.map((job) => ({
        id: job.id,
        title: job.title,
        department: job.department,
        applicantCount: countMap.get(job.id)?.total ?? 0,
        offeredCount: countMap.get(job.id)?.offered ?? 0,
      }));
    }
  );

  // --- 社員: 部署別社員数 ---
  const { data: empDeptStats } = useQuery<EmployeeDepartmentStat[]>(
    orgId ? `dashboard-emp-dept-${orgId}` : null,
    async () => {
      const { data: empDepts } = await getSupabase()
        .from("employee_departments")
        .select("user_id, departments!inner(name, organization_id)")
        .eq("departments.organization_id", orgId!);

      if (!empDepts) return [];

      const deptMap = new Map<string, number>();
      for (const ed of empDepts) {
        const name = (ed.departments as unknown as { name: string }).name;
        deptMap.set(name, (deptMap.get(name) ?? 0) + 1);
      }

      return Array.from(deptMap.entries())
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);
    }
  );

  // --- 承認待ちワークフロー件数 ---
  const { data: pendingWorkflows } = useQuery(
    organization ? `pending-workflows-${organization.id}` : null,
    async () => {
      const { count } = await getSupabase()
        .from("workflow_requests")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization!.id)
        .eq("status", "pending");
      return count ?? 0;
    }
  );

  // --- 有給取得率 ---
  const { data: leaveUsageRate } = useQuery(
    organization ? `leave-usage-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("leave_balances")
        .select("granted_days, used_days, carried_over_days")
        .eq("organization_id", organization!.id)
        .eq("fiscal_year", new Date().getFullYear());
      if (!data || data.length === 0) return 0;
      const totalGranted = data.reduce(
        (sum, b) => sum + (b.granted_days || 0) + (b.carried_over_days || 0),
        0
      );
      const totalUsed = data.reduce((sum, b) => sum + (b.used_days || 0), 0);
      return totalGranted > 0 ? Math.round((totalUsed / totalGranted) * 100) : 0;
    }
  );

  // --- 勤怠異常（打刻漏れ）件数 ---
  const { data: attendanceAnomalies } = useQuery(
    organization ? `attendance-anomalies-${organization.id}` : null,
    async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count } = await getSupabase()
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization!.id)
        .is("clock_out", null)
        .lt("date", today);
      return count ?? 0;
    }
  );

  // --- 社員: 採用区分 ---
  const { data: hiringTypeStats } = useQuery<HiringTypeStat[]>(
    orgId ? `dashboard-hiring-type-${orgId}` : null,
    async () => {
      const { data: employees } = await getSupabase()
        .from("user_organizations")
        .select("user_id, profiles!inner(role, hiring_type)")
        .eq("organization_id", orgId!)
        .eq("profiles.role", "employee");

      if (!employees) return [];

      let newGrad = 0;
      let midCareer = 0;
      let unknown = 0;

      for (const emp of employees) {
        const ht = (emp.profiles as unknown as { hiring_type: string | null }).hiring_type;
        if (ht === "new_grad") newGrad++;
        else if (ht === "mid_career") midCareer++;
        else unknown++;
      }

      const result: HiringTypeStat[] = [];
      if (newGrad > 0) result.push({ name: "新卒", value: newGrad });
      if (midCareer > 0) result.push({ name: "中途", value: midCareer });
      if (unknown > 0) result.push({ name: "未設定", value: unknown });
      return result;
    }
  );

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
