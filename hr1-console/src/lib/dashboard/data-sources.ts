import type { WidgetDisplayType, DataSourceId } from "@/types/dashboard";
import type { ProductTab } from "@/components/layout/sidebar";

export interface DataSourceDefinition {
  id: DataSourceId;
  label: string;
  description: string;
  compatibleDisplayTypes: WidgetDisplayType[];
  defaultDisplayType: WidgetDisplayType;
  defaultLayout: "full" | "left" | "right";
  availableTabs: ProductTab[];
}

export const DATA_SOURCE_REGISTRY: Record<DataSourceId, DataSourceDefinition> = {
  recruiting_summary: {
    id: "recruiting_summary",
    label: "採用サマリー",
    description: "応募者数・選考中・公開求人・内定率",
    compatibleDisplayTypes: ["metric"],
    defaultDisplayType: "metric",
    defaultLayout: "full",
    availableTabs: ["recruiting"],
  },
  target_progress: {
    id: "target_progress",
    label: "採用目標進捗",
    description: "新卒・中途の目標に対する進捗",
    compatibleDisplayTypes: ["progress"],
    defaultDisplayType: "progress",
    defaultLayout: "full",
    availableTabs: ["recruiting"],
  },
  pipeline: {
    id: "pipeline",
    label: "選考パイプライン",
    description: "選考ステージ別の候補者数",
    compatibleDisplayTypes: ["pipeline", "bar_chart"],
    defaultDisplayType: "pipeline",
    defaultLayout: "left",
    availableTabs: ["recruiting"],
  },
  kpi_trend: {
    id: "kpi_trend",
    label: "応募トレンド",
    description: "過去6ヶ月の応募・内定・辞退の推移",
    compatibleDisplayTypes: ["area_chart", "bar_chart"],
    defaultDisplayType: "area_chart",
    defaultLayout: "right",
    availableTabs: ["recruiting"],
  },
  department_recruiting: {
    id: "department_recruiting",
    label: "部署別採用状況",
    description: "部署ごとの応募数・内定数",
    compatibleDisplayTypes: ["bar_chart", "pie_chart"],
    defaultDisplayType: "bar_chart",
    defaultLayout: "left",
    availableTabs: ["recruiting"],
  },
  open_jobs: {
    id: "open_jobs",
    label: "公開中の求人",
    description: "求人別の応募・内定状況",
    compatibleDisplayTypes: ["list"],
    defaultDisplayType: "list",
    defaultLayout: "right",
    availableTabs: ["recruiting"],
  },
  workspace_summary: {
    id: "workspace_summary",
    label: "組織サマリー",
    description: "社員数・部署数・有給取得率",
    compatibleDisplayTypes: ["metric"],
    defaultDisplayType: "metric",
    defaultLayout: "full",
    availableTabs: ["workspace"],
  },
  pending_actions: {
    id: "pending_actions",
    label: "要対応",
    description: "承認待ち・勤怠異常・有給取得率",
    compatibleDisplayTypes: ["list"],
    defaultDisplayType: "list",
    defaultLayout: "right",
    availableTabs: ["workspace"],
  },
  employee_department: {
    id: "employee_department",
    label: "部署別社員数",
    description: "部署ごとの社員の分布",
    compatibleDisplayTypes: ["bar_chart", "pie_chart"],
    defaultDisplayType: "bar_chart",
    defaultLayout: "left",
    availableTabs: ["workspace"],
  },
  hiring_type: {
    id: "hiring_type",
    label: "採用区分",
    description: "新卒・中途の内訳",
    compatibleDisplayTypes: ["pie_chart", "bar_chart"],
    defaultDisplayType: "pie_chart",
    defaultLayout: "right",
    availableTabs: ["workspace"],
  },
  client_summary: {
    id: "client_summary",
    label: "CRMサマリー",
    description: "取引先・連絡先・商談の概要",
    compatibleDisplayTypes: ["metric"],
    defaultDisplayType: "metric",
    defaultLayout: "full",
    availableTabs: ["client"],
  },
  recent_deals: {
    id: "recent_deals",
    label: "最近の商談",
    description: "直近の商談リスト",
    compatibleDisplayTypes: ["list"],
    defaultDisplayType: "list",
    defaultLayout: "full",
    availableTabs: ["client"],
  },
  crm_pipeline: {
    id: "crm_pipeline",
    label: "商談パイプライン",
    description: "ステージ別の商談件数・金額",
    compatibleDisplayTypes: ["pipeline", "bar_chart"],
    defaultDisplayType: "pipeline",
    defaultLayout: "full",
    availableTabs: ["client"],
  },
  crm_monthly_revenue: {
    id: "crm_monthly_revenue",
    label: "月別受注金額",
    description: "過去6ヶ月の受注金額推移",
    compatibleDisplayTypes: ["area_chart", "bar_chart"],
    defaultDisplayType: "area_chart",
    defaultLayout: "left",
    availableTabs: ["client"],
  },
  crm_deal_status: {
    id: "crm_deal_status",
    label: "商談ステータス",
    description: "商談中・受注・失注の内訳",
    compatibleDisplayTypes: ["pie_chart", "bar_chart"],
    defaultDisplayType: "pie_chart",
    defaultLayout: "right",
    availableTabs: ["client"],
  },
  crm_rep_performance: {
    id: "crm_rep_performance",
    label: "担当者別実績",
    description: "担当者ごとの商談数・受注金額",
    compatibleDisplayTypes: ["bar_chart"],
    defaultDisplayType: "bar_chart",
    defaultLayout: "full",
    availableTabs: ["client"],
  },
};

export function getSourcesForTab(tab: ProductTab): DataSourceDefinition[] {
  return Object.values(DATA_SOURCE_REGISTRY).filter((s) => s.availableTabs.includes(tab));
}
