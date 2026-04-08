"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Headset } from "lucide-react";

export default function ServiceRequestsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="サービスリクエスト"
        description="人事部門へのリクエスト"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Headset className="h-10 w-10" />
          <p className="text-sm">機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
