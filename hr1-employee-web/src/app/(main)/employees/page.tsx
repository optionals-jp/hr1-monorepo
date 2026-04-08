"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Users } from "lucide-react";

export default function EmployeesPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="社員名簿" description="社員の検索・閲覧" sticky={false} border={false} />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Users className="h-10 w-10" />
          <p className="text-sm">機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
