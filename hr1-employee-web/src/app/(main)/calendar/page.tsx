"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="カレンダー"
        description="スケジュールの確認"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <CalendarDays className="h-10 w-10" />
          <p className="text-sm">カレンダー機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
