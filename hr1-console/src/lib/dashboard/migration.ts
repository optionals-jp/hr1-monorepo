import type { DashboardWidgetConfig, DashboardWidgetConfigV2 } from "@/types/dashboard";

const V1_TO_V2: Record<string, Omit<DashboardWidgetConfigV2, "id" | "visible">> = {
  summary: { layout: "full", displayType: "metric", dataSource: "recruiting_summary", _v: 2 },
  target_progress: {
    layout: "full",
    displayType: "progress",
    dataSource: "target_progress",
    _v: 2,
  },
  pipeline: { layout: "left", displayType: "pipeline", dataSource: "pipeline", _v: 2 },
  kpi_trend: { layout: "right", displayType: "area_chart", dataSource: "kpi_trend", _v: 2 },
  department: {
    layout: "left",
    displayType: "bar_chart",
    dataSource: "department_recruiting",
    _v: 2,
  },
  open_jobs: { layout: "right", displayType: "list", dataSource: "open_jobs", _v: 2 },
  ws_summary: { layout: "full", displayType: "metric", dataSource: "workspace_summary", _v: 2 },
  ws_emp_dept: {
    layout: "left",
    displayType: "bar_chart",
    dataSource: "employee_department",
    _v: 2,
  },
  ws_actions: { layout: "right", displayType: "list", dataSource: "pending_actions", _v: 2 },
  ws_hiring_type: { layout: "full", displayType: "pie_chart", dataSource: "hiring_type", _v: 2 },
};

export function migrateWidgetConfig(raw: DashboardWidgetConfig[]): DashboardWidgetConfigV2[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  // Already v2
  if ("_v" in raw[0] && (raw[0] as DashboardWidgetConfigV2)._v === 2) {
    return raw as DashboardWidgetConfigV2[];
  }
  // Migrate v1 -> v2
  return raw.map((item) => {
    const mapping = V1_TO_V2[item.id];
    if (mapping) {
      return { id: item.id, visible: item.visible, ...mapping };
    }
    // Unknown v1 id - create a fallback metric widget
    return {
      id: item.id,
      visible: item.visible,
      layout: "full" as const,
      displayType: "metric" as const,
      dataSource: "recruiting_summary" as const,
      _v: 2 as const,
    };
  });
}
