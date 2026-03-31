"use client";

import type { DashboardWidgetConfigV2 } from "@/types/dashboard";
import type { DashboardData } from "./widget-renderer";
import { WidgetRenderer } from "./widget-renderer";
import { cn } from "@/lib/utils";

interface DashboardGridProps {
  widgets: DashboardWidgetConfigV2[];
  data: DashboardData;
}

export function DashboardGrid({ widgets, data }: DashboardGridProps) {
  const visibleWidgets = widgets.filter((w) => w.visible);

  if (visibleWidgets.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">表示するウィジェットがありません</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {visibleWidgets.map((w) => (
        <div
          key={w.id}
          className={cn(
            w.layout === "full" && "md:col-span-2",
            w.layout === "left" && "md:col-span-1",
            w.layout === "right" && "md:col-span-1"
          )}
        >
          <WidgetRenderer config={w} data={data} />
        </div>
      ))}
    </div>
  );
}
