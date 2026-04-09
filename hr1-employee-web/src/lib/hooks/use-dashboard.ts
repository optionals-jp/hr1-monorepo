"use client";

import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@/lib/use-query";
import { getSupabase } from "@/lib/supabase/browser";
import * as dashboardRepo from "@/lib/repositories/dashboard-repository";
import type { DashboardWidgetConfig, DashboardWidgetPreference } from "@/types/database";

export interface WidgetDefinition {
  id: string;
  label: string;
  defaultVisible: boolean;
  defaultOrder: number;
}

export const DEFAULT_WIDGETS: WidgetDefinition[] = [
  { id: "attendance", label: "勤怠サマリー", defaultVisible: true, defaultOrder: 0 },
  { id: "tasks", label: "未完了タスク", defaultVisible: true, defaultOrder: 1 },
  { id: "messages", label: "未読メッセージ", defaultVisible: true, defaultOrder: 2 },
  { id: "announcements", label: "最新お知らせ", defaultVisible: true, defaultOrder: 3 },
  { id: "calendar", label: "今日の予定", defaultVisible: true, defaultOrder: 4 },
  { id: "workflows", label: "申請状況", defaultVisible: true, defaultOrder: 5 },
];

function buildDefaultConfig(): DashboardWidgetConfig[] {
  return DEFAULT_WIDGETS.map((w) => ({
    widget_id: w.id,
    visible: w.defaultVisible,
    sort_order: w.defaultOrder,
  }));
}

export function useDashboard() {
  const { user } = useAuth();
  const { organization } = useOrg();
  const key = user && organization ? `dashboard-widgets-${organization.id}-${user.id}` : null;

  const { data: preference, mutate } = useQuery<DashboardWidgetPreference | null>(key, () =>
    dashboardRepo.fetchWidgetPreferences(getSupabase(), organization!.id, user!.id)
  );

  const widgetConfig: DashboardWidgetConfig[] = preference?.widget_config ?? buildDefaultConfig();

  const visibleWidgets = widgetConfig
    .filter((w) => w.visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  const saveWidgetConfig = async (config: DashboardWidgetConfig[]) => {
    try {
      await dashboardRepo.upsertWidgetPreferences(getSupabase(), {
        organization_id: organization!.id,
        user_id: user!.id,
        product_tab: "workspace",
        widget_config: config,
      });
      mutate();
    } catch (e) {
      console.error("ウィジェット設定保存エラー:", e);
      throw e;
    }
  };

  return {
    widgetConfig,
    visibleWidgets,
    saveWidgetConfig,
  };
}
