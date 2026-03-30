"use client";

import { useOrg } from "@/lib/org-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as dashboardRepository from "@/lib/repositories/dashboard-repository";
import { StepStatus, ApplicationStatus } from "@/lib/constants";
import { format, subMonths } from "date-fns";
import type {
  PipelineStage,
  KpiTrendPoint,
  DepartmentStat,
  EmployeeDepartmentStat,
  HiringTypeStat,
  OpenJobStat,
} from "@/types/dashboard";

export interface DashboardStats {
  applicants: number;
  employees: number;
  openJobs: number;
  activeApplications: number;
}

export function useDashboard() {
  const { organization } = useOrg();
  const orgId = organization?.id;
  const client = getSupabase();

  const {
    data: stats,
    error: statsError,
    mutate: mutateStats,
  } = useQuery<DashboardStats>(orgId ? `dashboard-stats-${orgId}` : null, () =>
    dashboardRepository.fetchDashboardStats(client, orgId!)
  );

  const { data: pipeline } = useQuery<PipelineStage[]>(
    orgId ? `dashboard-pipeline-${orgId}` : null,
    async () => {
      const applications = await dashboardRepository.fetchPipelineData(client, orgId!);
      if (!applications || applications.length === 0) return [];

      const totalApplied = applications.length;
      const stepMap = new Map<string, { order: number; label: string; count: number }>();

      for (const app of applications) {
        for (const step of app.application_steps ?? []) {
          const key = `${step.step_order}-${step.step_type}`;
          if (!stepMap.has(key)) {
            stepMap.set(key, { order: step.step_order, label: step.label, count: 0 });
          }
          if (step.status === StepStatus.Completed || step.status === StepStatus.InProgress) {
            stepMap.get(key)!.count++;
          }
        }
      }

      const stages: PipelineStage[] = [{ name: "応募", count: totalApplied }];
      const sortedSteps = Array.from(stepMap.values()).sort((a, b) => a.order - b.order);
      const offeredCount = applications.filter(
        (a) => a.status === ApplicationStatus.Offered
      ).length;

      for (const step of sortedSteps) {
        const isOfferStep = step.label === "内定" || step.label === "オファー";
        stages.push({ name: step.label, count: isOfferStep ? offeredCount : step.count });
      }

      const hasOfferStep = sortedSteps.some((s) => s.label === "内定" || s.label === "オファー");
      if (!hasOfferStep && (offeredCount > 0 || sortedSteps.length > 0)) {
        stages.push({ name: "内定", count: offeredCount });
      }

      return stages;
    }
  );

  const { data: kpiTrend } = useQuery<KpiTrendPoint[]>(
    orgId ? `dashboard-kpi-trend-${orgId}` : null,
    async () => {
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 5);
      const startDate = format(
        new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1),
        "yyyy-MM-dd"
      );

      const applications = await dashboardRepository.fetchApplicationsByDateRange(
        client,
        orgId!,
        startDate
      );
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
        if (app.status === ApplicationStatus.Offered) entry.offered++;
        if (app.status === ApplicationStatus.Withdrawn) entry.withdrawn++;
      }

      return Array.from(monthMap.entries()).map(([month, d]) => ({ month, ...d }));
    }
  );

  const { data: departmentStats } = useQuery<DepartmentStat[]>(
    orgId ? `dashboard-dept-stats-${orgId}` : null,
    async () => {
      const applications = await dashboardRepository.fetchApplicationsWithDepartment(
        client,
        orgId!
      );
      if (!applications) return [];

      const deptMap = new Map<string, { applications: number; offered: number }>();
      for (const app of applications) {
        const dept = (app.jobs as unknown as { department: string | null })?.department ?? "未設定";
        if (!deptMap.has(dept)) deptMap.set(dept, { applications: 0, offered: 0 });
        const entry = deptMap.get(dept)!;
        entry.applications++;
        if (app.status === ApplicationStatus.Offered) entry.offered++;
      }

      return Array.from(deptMap.entries())
        .map(([department, d]) => ({ department, ...d }))
        .sort((a, b) => b.applications - a.applications);
    }
  );

  const { data: openJobs } = useQuery<OpenJobStat[]>(
    orgId ? `dashboard-open-jobs-${orgId}` : null,
    async () => {
      const { jobs, apps } = await dashboardRepository.fetchOpenJobsWithApplicants(client, orgId!);
      if (jobs.length === 0) return [];

      const countMap = new Map<string, { total: number; offered: number }>();
      for (const app of apps) {
        if (!countMap.has(app.job_id)) countMap.set(app.job_id, { total: 0, offered: 0 });
        const c = countMap.get(app.job_id)!;
        c.total++;
        if (app.status === ApplicationStatus.Offered) c.offered++;
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

  const { data: empDeptStats } = useQuery<EmployeeDepartmentStat[]>(
    orgId ? `dashboard-emp-dept-${orgId}` : null,
    async () => {
      const empDepts = await dashboardRepository.fetchEmployeeDepartments(client, orgId!);
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

  const { data: pendingWorkflows } = useQuery(orgId ? `pending-workflows-${orgId}` : null, () =>
    dashboardRepository.countPendingWorkflows(client, orgId!)
  );

  const { data: leaveUsageRate } = useQuery(orgId ? `leave-usage-${orgId}` : null, async () => {
    const data = await dashboardRepository.fetchLeaveUsageRate(client, orgId!);
    if (!data || data.length === 0) return 0;
    const totalGranted = data.reduce(
      (sum, b) => sum + (b.granted_days || 0) + (b.carried_over_days || 0),
      0
    );
    const totalUsed = data.reduce((sum, b) => sum + (b.used_days || 0), 0);
    return totalGranted > 0 ? Math.round((totalUsed / totalGranted) * 100) : 0;
  });

  const { data: attendanceAnomalies } = useQuery(
    orgId ? `attendance-anomalies-${orgId}` : null,
    () => dashboardRepository.countAttendanceAnomalies(client, orgId!)
  );

  const { data: hiringTypeStats } = useQuery<HiringTypeStat[]>(
    orgId ? `dashboard-hiring-type-${orgId}` : null,
    async () => {
      const employees = await dashboardRepository.fetchHiringTypeData(client, orgId!);
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

  return {
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
  };
}
