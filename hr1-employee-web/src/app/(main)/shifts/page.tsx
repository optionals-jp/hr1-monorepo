"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { CalendarClock } from "lucide-react";

export default function ShiftsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="シフト"
        description="シフトの確認・希望提出"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <CalendarClock className="h-10 w-10" />
          <p className="text-sm">機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
