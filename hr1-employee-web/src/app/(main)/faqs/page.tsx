"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { HelpCircle } from "lucide-react";

export default function FaqsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="よくある質問" description="社内FAQ" sticky={false} border={false} />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <HelpCircle className="h-10 w-10" />
          <p className="text-sm">FAQ機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
