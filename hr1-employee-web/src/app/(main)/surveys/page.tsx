"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { HeartPulse } from "lucide-react";

export default function SurveysPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="サーベイ"
        description="アンケート・サーベイの管理"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <HeartPulse className="h-10 w-10" />
          <p className="text-sm">機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
