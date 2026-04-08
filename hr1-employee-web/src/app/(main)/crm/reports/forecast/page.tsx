"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { BarChart3 } from "lucide-react";

export default function CrmForecastPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="レポート"
        description="売上予測・分析レポート"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <BarChart3 className="h-10 w-10" />
          <p className="text-sm">機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
