"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { FileInput } from "lucide-react";

export default function WorkflowsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="各種申請"
        description="ワークフロー申請の確認・提出"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <FileInput className="h-10 w-10" />
          <p className="text-sm">機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
