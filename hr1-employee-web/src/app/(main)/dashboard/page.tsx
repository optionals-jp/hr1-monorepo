"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Card, CardContent } from "@hr1/shared-ui/components/ui/card";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useDashboard, DEFAULT_WIDGETS } from "@/lib/hooks/use-dashboard";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import {
  Clock,
  MessageSquare,
  CheckSquare,
  CalendarDays,
  Megaphone,
  FileInput,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { WidgetCustomizeDialog } from "./widget-customize-dialog";
import type { DashboardWidgetConfig } from "@/types/database";
import type { LucideIcon } from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "おはようございます";
  if (hour < 18) return "こんにちは";
  return "おつかれさまです";
}

interface WidgetMeta {
  icon: LucideIcon;
  href: string;
  color: string;
  description: string;
}

const widgetMeta: Record<string, WidgetMeta> = {
  attendance: {
    icon: Clock,
    href: "/my-attendance",
    color: "bg-blue-50 text-blue-600",
    description: "今日の出退勤状況",
  },
  tasks: {
    icon: CheckSquare,
    href: "/tasks",
    color: "bg-orange-50 text-orange-600",
    description: "未完了のタスク",
  },
  messages: {
    icon: MessageSquare,
    href: "/messages",
    color: "bg-green-50 text-green-600",
    description: "未読メッセージ",
  },
  announcements: {
    icon: Megaphone,
    href: "/announcements",
    color: "bg-red-50 text-red-600",
    description: "最新のお知らせ",
  },
  calendar: {
    icon: CalendarDays,
    href: "/calendar",
    color: "bg-purple-50 text-purple-600",
    description: "今日の予定",
  },
  workflows: {
    icon: FileInput,
    href: "/workflows",
    color: "bg-gray-50 text-gray-600",
    description: "申請の状況",
  },
};

const widgetLabels = Object.fromEntries(DEFAULT_WIDGETS.map((w) => [w.id, w.label]));

export default function DashboardPage() {
  const { profile } = useAuth();
  const { widgetConfig, visibleWidgets, saveWidgetConfig } = useDashboard();
  const { showToast } = useToast();
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const handleSaveConfig = async (config: DashboardWidgetConfig[]) => {
    try {
      await saveWidgetConfig(config);
      showToast("ダッシュボード設定を保存しました");
    } catch {
      showToast("設定の保存に失敗しました", "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title={`${getGreeting()}、${profile?.display_name ?? "社員"}さん`}
        description="今日も一日よろしくお願いします"
        sticky={false}
        border={false}
        action={
          <Button variant="ghost" size="sm" onClick={() => setCustomizeOpen(true)}>
            <Settings className="h-4 w-4 mr-1" />
            設定
          </Button>
        }
      />
      <PageContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
          {visibleWidgets.map((w) => {
            const meta = widgetMeta[w.widget_id];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <Link
                key={w.widget_id}
                href={meta.href}
                aria-label={(widgetLabels[w.widget_id] ?? w.widget_id) + "を開く"}
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex flex-col items-center gap-2 py-5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">
                      {widgetLabels[w.widget_id] ?? w.widget_id}
                    </span>
                    <span className="text-xs text-muted-foreground">{meta.description}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </PageContent>

      <WidgetCustomizeDialog
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        currentConfig={widgetConfig}
        onSave={handleSaveConfig}
      />
    </div>
  );
}
