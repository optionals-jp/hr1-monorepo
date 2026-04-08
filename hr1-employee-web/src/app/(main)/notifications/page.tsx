"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="通知" description="あなたへの通知" sticky={false} border={false} />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Bell className="h-10 w-10" />
          <p className="text-sm">通知はありません</p>
        </div>
      </PageContent>
    </div>
  );
}
