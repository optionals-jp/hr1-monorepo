"use client";

import type { DashboardWidgetConfigV2, DataSourceId } from "@/types/dashboard";
import type {
  PipelineStage,
  KpiTrendPoint,
  DepartmentStat,
  EmployeeDepartmentStat,
  HiringTypeStat,
  OpenJobStat,
  HiringTypeApplicationStats,
  RecruitingTargets,
} from "@/types/dashboard";
import { DATA_SOURCE_REGISTRY } from "@/lib/dashboard/data-sources";
import { dealStatusLabels, applicationSourceLabels } from "@/lib/constants";
import type { CrmPipelineStage } from "@/types/database";
import { Panel, PanelHeader, PanelBody } from "./panel";
import { GenericBarChart } from "./charts/generic-bar-chart";
import type { ChartProps } from "./charts/generic-bar-chart";
import { GenericAreaChart } from "./charts/generic-area-chart";
import { GenericPieChart } from "./charts/generic-pie-chart";
import type { PieChartProps } from "./charts/generic-pie-chart";
import { MetricDisplay } from "./charts/metric-display";
import type { MetricDisplayProps } from "./charts/metric-display";
import { ListDisplay } from "./charts/list-display";
import type { ListItem } from "./charts/list-display";
import { PipelineChart } from "./pipeline-chart";
import { TargetProgressPanel } from "./target-progress-panel";

/* ------------------------------------------------------------------ */
/*  DashboardData                                                      */
/* ------------------------------------------------------------------ */

export interface DashboardData {
  stats:
    | {
        applicants: number;
        employees: number;
        openJobs: number;
        activeApplications: number;
      }
    | undefined;
  pipeline: PipelineStage[] | undefined;
  kpiTrend: KpiTrendPoint[] | undefined;
  departmentStats: DepartmentStat[] | undefined;
  sourceStats: { source: string; count: number; offered: number }[] | undefined;
  openJobs: OpenJobStat[] | undefined;
  empDeptStats: EmployeeDepartmentStat[] | undefined;
  pendingWorkflows: number | undefined;
  leaveUsageRate: number | undefined;
  attendanceAnomalies: number | undefined;
  hiringTypeStats: HiringTypeStat[] | undefined;
  hiringTypeAppStats: HiringTypeApplicationStats | undefined;
  targets: RecruitingTargets | undefined;
  pipelineRate: number;
  crmCompanyCount?: number;
  crmContactCount?: number;
  crmOpenDeals?: number;
  crmWonDeals?: number;
  crmTotalAmount?: number;
  crmWonAmount?: number;
  crmDeals?: {
    id: string;
    title: string;
    companyName: string;
    stageId: string | null;
    stageName: string | null;
    amount: number | null;
    status: string;
    probability: number | null;
    assignedToName: string | null;
    expectedCloseDate: string | null;
  }[];
  crmPipelineStages?: CrmPipelineStage[];
}

/* ------------------------------------------------------------------ */
/*  Resolved display data                                              */
/* ------------------------------------------------------------------ */

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#14b8a6"];

type ResolvedData =
  | { type: "metric"; props: MetricDisplayProps }
  | { type: "bar_chart"; props: ChartProps }
  | { type: "area_chart"; props: ChartProps }
  | { type: "pie_chart"; props: PieChartProps }
  | { type: "pipeline"; data: PipelineStage[] }
  | {
      type: "progress";
      stats: HiringTypeApplicationStats | undefined;
      targets: RecruitingTargets | undefined;
    }
  | { type: "list"; items: ListItem[]; maxItems?: number; viewAllHref?: string }
  | null;

function resolveDataSource(
  dataSource: DataSourceId,
  displayType: DashboardWidgetConfigV2["displayType"],
  data: DashboardData
): ResolvedData {
  switch (dataSource) {
    /* ---- recruiting_summary ---- */
    case "recruiting_summary": {
      const s = data.stats;
      return {
        type: "metric",
        props: {
          metrics: [
            { value: s?.applicants ?? 0, label: "応募者" },
            { value: s?.activeApplications ?? 0, label: "選考中" },
            { value: s?.openJobs ?? 0, label: "公開求人" },
            { value: Math.round(data.pipelineRate), label: "内定率", suffix: "%" },
          ],
        },
      };
    }

    /* ---- pipeline ---- */
    case "pipeline": {
      const stages = data.pipeline ?? [];
      if (displayType === "pipeline") {
        return { type: "pipeline", data: stages };
      }
      // bar_chart
      return {
        type: "bar_chart",
        props: {
          data: stages as unknown as Record<string, unknown>[],
          categoryKey: "name",
          series: [{ key: "count", label: "候補者", color: "#3b82f6" }],
        },
      };
    }

    /* ---- kpi_trend ---- */
    case "kpi_trend": {
      const trend = (data.kpiTrend ?? []) as unknown as Record<string, unknown>[];
      const series = [
        { key: "applications", label: "応募数", color: "#3b82f6" },
        { key: "offered", label: "内定数", color: "#22c55e" },
        { key: "withdrawn", label: "辞退数", color: "#f97316" },
      ];
      if (displayType === "area_chart") {
        return { type: "area_chart", props: { data: trend, categoryKey: "month", series } };
      }
      // bar_chart
      return { type: "bar_chart", props: { data: trend, categoryKey: "month", series } };
    }

    /* ---- department_recruiting ---- */
    case "department_recruiting": {
      const dept = data.departmentStats ?? [];
      if (displayType === "pie_chart") {
        return {
          type: "pie_chart",
          props: {
            data: dept.map((d) => ({ name: d.department, value: d.applications })),
            colors: PIE_COLORS,
          },
        };
      }
      // bar_chart
      return {
        type: "bar_chart",
        props: {
          data: dept as unknown as Record<string, unknown>[],
          categoryKey: "department",
          series: [
            { key: "applications", label: "応募数", color: "#3b82f6" },
            { key: "offered", label: "内定数", color: "#22c55e" },
          ],
        },
      };
    }

    /* ---- open_jobs ---- */
    case "open_jobs": {
      const jobs = data.openJobs ?? [];
      const items: ListItem[] = jobs.map((j) => ({
        id: j.id,
        title: j.title,
        subtitle: j.department ?? undefined,
        values: [
          { label: "応募", value: j.applicantCount },
          { label: "内定", value: j.offeredCount, color: "#16a34a" },
        ],
      }));
      return { type: "list", items, maxItems: 8 };
    }

    /* ---- workspace_summary ---- */
    case "workspace_summary": {
      const s = data.stats;
      const deptCount = data.empDeptStats?.length ?? 0;
      return {
        type: "metric",
        props: {
          metrics: [
            { value: s?.employees ?? 0, label: "社員数" },
            { value: deptCount, label: "部署数" },
            { value: data.leaveUsageRate ?? 0, label: "有給取得率", suffix: "%" },
          ],
        },
      };
    }

    /* ---- pending_actions ---- */
    case "pending_actions": {
      const items: ListItem[] = [
        {
          id: "pending-workflows",
          href: "/workflows",
          title: "承認待ちのワークフロー",
          values: [{ label: "件数", value: data.pendingWorkflows ?? 0 }],
        },
        {
          id: "attendance-anomalies",
          href: "/attendance",
          title: "勤怠異常",
          values: [{ label: "件数", value: data.attendanceAnomalies ?? 0 }],
        },
        {
          id: "leave-usage",
          href: "/leaves",
          title: "有給取得率",
          values: [{ label: "", value: `${data.leaveUsageRate ?? 0}%` }],
        },
      ];
      return { type: "list", items };
    }

    /* ---- employee_department ---- */
    case "employee_department": {
      const empDept = data.empDeptStats ?? [];
      if (displayType === "pie_chart") {
        return {
          type: "pie_chart",
          props: {
            data: empDept.map((d) => ({ name: d.department, value: d.count })),
            colors: PIE_COLORS,
          },
        };
      }
      // bar_chart
      return {
        type: "bar_chart",
        props: {
          data: empDept as unknown as Record<string, unknown>[],
          categoryKey: "department",
          series: [{ key: "count", label: "社員数", color: "#10b981" }],
        },
      };
    }

    /* ---- hiring_type ---- */
    case "hiring_type": {
      const ht = data.hiringTypeStats ?? [];
      if (displayType === "pie_chart") {
        return {
          type: "pie_chart",
          props: {
            data: ht.map((d) => ({ name: d.name, value: d.value })),
            colors: PIE_COLORS,
          },
        };
      }
      // bar_chart
      return {
        type: "bar_chart",
        props: {
          data: ht as unknown as Record<string, unknown>[],
          categoryKey: "name",
          series: [{ key: "value", label: "人数", color: "#6366f1" }],
        },
      };
    }

    /* ---- target_progress ---- */
    case "target_progress": {
      return {
        type: "progress",
        stats: data.hiringTypeAppStats,
        targets: data.targets,
      };
    }

    /* ---- client_summary ---- */
    case "client_summary": {
      return {
        type: "metric",
        props: {
          metrics: [
            { value: data.crmCompanyCount ?? 0, label: "取引先" },
            { value: data.crmContactCount ?? 0, label: "連絡先" },
            { value: data.crmOpenDeals ?? 0, label: "商談中" },
            { value: data.crmWonDeals ?? 0, label: "受注" },
          ],
        },
      };
    }

    /* ---- recent_deals ---- */
    case "recent_deals": {
      const deals = data.crmDeals ?? [];
      const items: ListItem[] = deals.map((d) => ({
        id: d.id,
        href: undefined,
        title: d.title,
        subtitle: `${d.companyName} / ${d.stageName ?? "—"}`,
        values: [
          {
            label: dealStatusLabels[d.status] ?? d.status,
            value: d.amount != null ? `${(d.amount / 10000).toLocaleString()}万円` : "-",
          },
        ],
      }));
      return { type: "list", items, maxItems: 10 };
    }

    /* ---- crm_pipeline ---- */
    case "crm_pipeline": {
      const deals = data.crmDeals ?? [];
      const openDeals = deals.filter((d) => d.status === "open");
      const pipelineStages = data.crmPipelineStages ?? [];

      const stages = pipelineStages.map((s) => ({
        name: s.name,
        count: openDeals.filter((d) => d.stageId === s.id).length,
      }));

      if (displayType === "pipeline") {
        return { type: "pipeline", data: stages };
      }
      return {
        type: "bar_chart",
        props: {
          data: stages as unknown as Record<string, unknown>[],
          categoryKey: "name",
          series: [{ key: "count", label: "商談数", color: "#3b82f6" }],
        },
      };
    }

    /* ---- crm_monthly_revenue ---- */
    case "crm_monthly_revenue": {
      const deals = data.crmDeals ?? [];
      const wonDeals = deals.filter((d) => d.status === "won" && d.expectedCloseDate);
      const monthMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap[key] = 0;
      }
      for (const d of wonDeals) {
        if (!d.expectedCloseDate) continue;
        const date = new Date(d.expectedCloseDate);
        const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (key in monthMap) {
          monthMap[key] += d.amount ?? 0;
        }
      }
      const trend = Object.entries(monthMap).map(([month, amount]) => ({
        month,
        amount: Math.round(amount / 10000),
      }));
      const series = [{ key: "amount", label: "受注金額（万円）", color: "#22c55e" }];
      if (displayType === "area_chart") {
        return {
          type: "area_chart",
          props: {
            data: trend as unknown as Record<string, unknown>[],
            categoryKey: "month",
            series,
          },
        };
      }
      return {
        type: "bar_chart",
        props: {
          data: trend as unknown as Record<string, unknown>[],
          categoryKey: "month",
          series,
        },
      };
    }

    /* ---- crm_deal_status ---- */
    case "crm_deal_status": {
      const deals = data.crmDeals ?? [];
      const statusData = [
        { name: "商談中", value: deals.filter((d) => d.status === "open").length },
        { name: "受注", value: deals.filter((d) => d.status === "won").length },
        { name: "失注", value: deals.filter((d) => d.status === "lost").length },
      ];
      if (displayType === "pie_chart") {
        return {
          type: "pie_chart",
          props: { data: statusData, colors: ["#3b82f6", "#22c55e", "#ef4444"] },
        };
      }
      return {
        type: "bar_chart",
        props: {
          data: statusData as unknown as Record<string, unknown>[],
          categoryKey: "name",
          series: [{ key: "value", label: "件数", color: "#3b82f6" }],
        },
      };
    }

    /* ---- crm_rep_performance ---- */
    case "crm_rep_performance": {
      const deals = data.crmDeals ?? [];
      const repMap: Record<string, { deals: number; wonAmount: number }> = {};
      for (const d of deals) {
        const name = d.assignedToName ?? "未割当";
        if (!repMap[name]) repMap[name] = { deals: 0, wonAmount: 0 };
        repMap[name].deals++;
        if (d.status === "won") repMap[name].wonAmount += d.amount ?? 0;
      }
      const repData = Object.entries(repMap)
        .map(([name, v]) => ({
          name,
          deals: v.deals,
          wonAmount: Math.round(v.wonAmount / 10000),
        }))
        .sort((a, b) => b.wonAmount - a.wonAmount)
        .slice(0, 10);
      return {
        type: "bar_chart",
        props: {
          data: repData as unknown as Record<string, unknown>[],
          categoryKey: "name",
          series: [
            { key: "deals", label: "商談数", color: "#3b82f6" },
            { key: "wonAmount", label: "受注（万円）", color: "#22c55e" },
          ],
        },
      };
    }

    /* ---- application_source ---- */
    case "application_source": {
      const src = data.sourceStats ?? [];
      if (displayType === "pie_chart") {
        return {
          type: "pie_chart",
          props: {
            data: src.map((s: { source: string; count: number }) => ({
              name:
                s.source === "未設定" ? "未設定" : (applicationSourceLabels[s.source] ?? s.source),
              value: s.count,
            })),
            colors: PIE_COLORS,
          },
        };
      }
      return {
        type: "bar_chart",
        props: {
          data: src.map((s: { source: string; count: number; offered: number }) => ({
            source:
              s.source === "未設定" ? "未設定" : (applicationSourceLabels[s.source] ?? s.source),
            applications: s.count,
            offered: s.offered,
          })) as unknown as Record<string, unknown>[],
          categoryKey: "source",
          series: [
            { key: "applications", label: "応募数", color: "#3b82f6" },
            { key: "offered", label: "内定数", color: "#22c55e" },
          ],
        },
      };
    }

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  WidgetRenderer                                                     */
/* ------------------------------------------------------------------ */

interface WidgetRendererProps {
  config: DashboardWidgetConfigV2;
  data: DashboardData;
}

export function WidgetRenderer({ config, data }: WidgetRendererProps) {
  const def = DATA_SOURCE_REGISTRY[config.dataSource];
  const title = config.title ?? def?.label ?? "";
  const resolved = resolveDataSource(config.dataSource, config.displayType, data);

  if (!resolved) {
    return (
      <Panel>
        <PanelHeader title={title} />
        <PanelBody>
          <p className="text-sm text-muted-foreground py-8 text-center">未対応のデータソースです</p>
        </PanelBody>
      </Panel>
    );
  }

  switch (resolved.type) {
    case "pipeline":
      return <PipelineChart data={resolved.data} />;

    case "progress":
      return <TargetProgressPanel stats={resolved.stats} targets={resolved.targets} />;

    case "metric":
      return (
        <Panel>
          <PanelHeader title={title} />
          <PanelBody>
            <MetricDisplay metrics={resolved.props.metrics} />
          </PanelBody>
        </Panel>
      );

    case "bar_chart":
      return (
        <Panel>
          <PanelHeader title={title} />
          <PanelBody>
            <GenericBarChart
              data={resolved.props.data}
              series={resolved.props.series}
              categoryKey={resolved.props.categoryKey}
            />
          </PanelBody>
        </Panel>
      );

    case "area_chart":
      return (
        <Panel>
          <PanelHeader title={title} />
          <PanelBody>
            <GenericAreaChart
              data={resolved.props.data}
              series={resolved.props.series}
              categoryKey={resolved.props.categoryKey}
            />
          </PanelBody>
        </Panel>
      );

    case "pie_chart":
      return (
        <Panel>
          <PanelHeader title={title} />
          <PanelBody>
            <GenericPieChart data={resolved.props.data} colors={resolved.props.colors} />
          </PanelBody>
        </Panel>
      );

    case "list":
      return (
        <Panel>
          <PanelHeader title={title} />
          <PanelBody>
            <ListDisplay
              items={resolved.items}
              maxItems={resolved.maxItems}
              viewAllHref={resolved.viewAllHref}
            />
          </PanelBody>
        </Panel>
      );
  }
}
