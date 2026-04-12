export interface PipelineStage {
  name: string;
  count: number;
}

export interface KpiTrendPoint {
  month: string;
  applications: number;
  offered: number;
  withdrawn: number;
}

export interface DepartmentStat {
  department: string;
  applications: number;
  offered: number;
}

export interface EmployeeDepartmentStat {
  department: string;
  count: number;
}

export interface HiringTypeStat {
  name: string;
  value: number;
}

export interface OpenJobStat {
  id: string;
  title: string;
  department: string | null;
  applicantCount: number;
  offeredCount: number;
}

export interface HiringTypeApplicationStats {
  newGrad: { applications: number; offered: number };
  midCareer: { applications: number; offered: number };
}

export interface RecruitingTarget {
  hiring_type: "new_grad" | "mid_career" | "all";
  target_type: "applications" | "offers";
  target_value: number;
}

export interface RecruitingTargets {
  newGrad: { applicationTarget: number; offerTarget: number };
  midCareer: { applicationTarget: number; offerTarget: number };
  all: { applicationTarget: number; offerTarget: number };
}

/* ------------------------------------------------------------------ */
/*  Dashboard widget config v2                                         */
/* ------------------------------------------------------------------ */

export type WidgetLayout = "full" | "left" | "right";

export type WidgetDisplayType =
  | "metric"
  | "bar_chart"
  | "area_chart"
  | "pie_chart"
  | "pipeline"
  | "progress"
  | "list";

export type DataSourceId =
  | "recruiting_summary"
  | "target_progress"
  | "pipeline"
  | "kpi_trend"
  | "department_recruiting"
  | "open_jobs"
  | "workspace_summary"
  | "pending_actions"
  | "employee_department"
  | "hiring_type"
  | "client_summary"
  | "recent_deals"
  | "crm_pipeline"
  | "crm_monthly_revenue"
  | "crm_deal_status"
  | "crm_rep_performance"
  | "application_source"
  | "time_to_hire"
  | "selection_funnel";

export interface TimeToHireStat {
  label: string;
  avgDays: number;
  medianDays: number;
  count: number;
}

export interface FunnelStage {
  name: string;
  count: number;
  conversionRate: number | null;
}

export interface DashboardWidgetConfigV1 {
  id: string;
  visible: boolean;
}

export interface DashboardWidgetConfigV2 {
  id: string;
  visible: boolean;
  layout: WidgetLayout;
  displayType: WidgetDisplayType;
  dataSource: DataSourceId;
  title?: string;
  _v: 2;
}

export type DashboardWidgetConfig = DashboardWidgetConfigV1 | DashboardWidgetConfigV2;

export function isV2Config(c: DashboardWidgetConfig): c is DashboardWidgetConfigV2 {
  return "_v" in c && c._v === 2;
}
