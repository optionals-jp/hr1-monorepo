import type { PermissionAction } from "@/types/database";

/**
 * URL パス → リソースキーのマッピング。
 * パスのプレフィックスで照合される（長い順に評価）。
 * ここに含まれないパスは常にアクセス可能（ダッシュボード、プロフィール等）。
 */
export const ROUTE_RESOURCE_MAP: { prefix: string; resource: string }[] = [
  // 労務
  { prefix: "/employees", resource: "employees" },
  { prefix: "/departments", resource: "departments" },
  { prefix: "/attendance", resource: "attendance" },
  { prefix: "/shifts", resource: "shifts" },
  { prefix: "/workflows", resource: "workflows" },
  { prefix: "/leave", resource: "leave" },
  { prefix: "/payslips", resource: "payslips" },
  // 共通
  { prefix: "/evaluations", resource: "evaluations" },
  { prefix: "/messages", resource: "messages" },
  { prefix: "/calendar", resource: "calendar" },
  { prefix: "/tasks", resource: "tasks" },
  { prefix: "/announcements", resource: "announcements" },
  { prefix: "/faqs", resource: "faqs" },
  { prefix: "/projects", resource: "projects" },
  { prefix: "/surveys", resource: "surveys" },
  { prefix: "/wiki", resource: "wiki" },
  // CRM（長いプレフィックスを先に）
  { prefix: "/crm/settings", resource: "crm.settings" },
  { prefix: "/crm/reports", resource: "crm.reports" },
  { prefix: "/crm/leads", resource: "crm.leads" },
  { prefix: "/crm/companies", resource: "crm.companies" },
  { prefix: "/crm/contacts", resource: "crm.contacts" },
  { prefix: "/crm/deals", resource: "crm.deals" },
  { prefix: "/crm/quotes", resource: "crm.quotes" },
  { prefix: "/crm", resource: "crm.leads" },
  // 設定（個人設定は除外 — 常にアクセス可能）
  { prefix: "/settings/organization", resource: "settings.organization" },
  { prefix: "/settings/members", resource: "settings.members" },
  { prefix: "/settings/permission-groups", resource: "settings.members" },
  { prefix: "/settings/skills", resource: "settings.skills" },
  { prefix: "/settings/certifications", resource: "settings.certifications" },
  { prefix: "/settings/recruiting-targets", resource: "settings.recruiting-targets" },
  // その他
  { prefix: "/compliance", resource: "compliance" },
  { prefix: "/audit-logs", resource: "audit-logs" },
];

/** パスに対応するリソースキーを返す。マッピングがなければ null（常にアクセス可能） */
export function getResourceForPath(pathname: string): string | null {
  for (const { prefix, resource } of ROUTE_RESOURCE_MAP) {
    if (
      pathname === prefix ||
      pathname.startsWith(prefix + "/") ||
      pathname.startsWith(prefix + "?")
    ) {
      return resource;
    }
  }
  return null;
}

export const PERMISSION_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"];

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: "閲覧",
  create: "作成",
  edit: "編集",
  delete: "削除",
};

export interface PermissionResourceDef {
  key: string;
  label: string;
  category: string;
}

export const PERMISSION_RESOURCE_CATEGORIES = ["労務", "共通", "CRM", "設定", "その他"] as const;

export const PERMISSION_RESOURCES: PermissionResourceDef[] = [
  // 労務
  { key: "employees", label: "社員", category: "労務" },
  { key: "departments", label: "部署", category: "労務" },
  { key: "attendance", label: "勤怠", category: "労務" },
  { key: "shifts", label: "シフト", category: "労務" },
  { key: "workflows", label: "ワークフロー", category: "労務" },
  { key: "leave", label: "休暇", category: "労務" },
  { key: "payslips", label: "給与明細", category: "労務" },

  // 共通
  { key: "evaluations", label: "評価", category: "共通" },
  { key: "messages", label: "メッセージ", category: "共通" },
  { key: "calendar", label: "カレンダー", category: "共通" },
  { key: "tasks", label: "タスク", category: "共通" },
  { key: "announcements", label: "お知らせ", category: "共通" },
  { key: "faqs", label: "FAQ", category: "共通" },
  { key: "projects", label: "プロジェクト", category: "共通" },
  { key: "surveys", label: "アンケート", category: "共通" },
  { key: "wiki", label: "Wiki", category: "共通" },

  // CRM
  { key: "crm.leads", label: "リード", category: "CRM" },
  { key: "crm.companies", label: "企業", category: "CRM" },
  { key: "crm.contacts", label: "連絡先", category: "CRM" },
  { key: "crm.deals", label: "案件", category: "CRM" },
  { key: "crm.quotes", label: "見積", category: "CRM" },
  { key: "crm.reports", label: "レポート", category: "CRM" },
  { key: "crm.settings", label: "CRM設定", category: "CRM" },

  // 設定
  { key: "settings.organization", label: "組織情報", category: "設定" },
  { key: "settings.members", label: "メンバー管理", category: "設定" },
  { key: "settings.dashboard", label: "ダッシュボード設定", category: "設定" },
  { key: "settings.recruiting-targets", label: "採用目標", category: "設定" },
  { key: "settings.certifications", label: "資格マスタ", category: "設定" },
  { key: "settings.skills", label: "スキルマスタ", category: "設定" },

  // その他
  { key: "compliance", label: "コンプライアンス", category: "その他" },
  { key: "audit-logs", label: "監査ログ", category: "その他" },
];
