import type { DashboardWidgetConfigV2 } from "@/types/dashboard";

export const DEFAULT_RECRUITING_WIDGETS: DashboardWidgetConfigV2[] = [
  {
    id: "summary",
    visible: true,
    layout: "full",
    displayType: "metric",
    dataSource: "recruiting_summary",
    _v: 2,
  },
  {
    id: "target_progress",
    visible: true,
    layout: "full",
    displayType: "progress",
    dataSource: "target_progress",
    _v: 2,
  },
  {
    id: "pipeline",
    visible: true,
    layout: "left",
    displayType: "pipeline",
    dataSource: "pipeline",
    _v: 2,
  },
  {
    id: "kpi_trend",
    visible: true,
    layout: "right",
    displayType: "area_chart",
    dataSource: "kpi_trend",
    _v: 2,
  },
  {
    id: "department",
    visible: true,
    layout: "left",
    displayType: "bar_chart",
    dataSource: "department_recruiting",
    _v: 2,
  },
  {
    id: "open_jobs",
    visible: true,
    layout: "right",
    displayType: "list",
    dataSource: "open_jobs",
    _v: 2,
  },
];

export const DEFAULT_WORKSPACE_WIDGETS: DashboardWidgetConfigV2[] = [
  {
    id: "ws_summary",
    visible: true,
    layout: "full",
    displayType: "metric",
    dataSource: "workspace_summary",
    _v: 2,
  },
  {
    id: "ws_emp_dept",
    visible: true,
    layout: "left",
    displayType: "bar_chart",
    dataSource: "employee_department",
    _v: 2,
  },
  {
    id: "ws_actions",
    visible: true,
    layout: "right",
    displayType: "list",
    dataSource: "pending_actions",
    _v: 2,
  },
  {
    id: "ws_hiring_type",
    visible: true,
    layout: "full",
    displayType: "pie_chart",
    dataSource: "hiring_type",
    _v: 2,
  },
];

export const DEFAULT_CLIENT_WIDGETS: DashboardWidgetConfigV2[] = [
  {
    id: "client_summary",
    visible: true,
    layout: "full",
    displayType: "metric",
    dataSource: "client_summary",
    _v: 2,
  },
  {
    id: "recent_deals",
    visible: true,
    layout: "full",
    displayType: "list",
    dataSource: "recent_deals",
    _v: 2,
  },
];
