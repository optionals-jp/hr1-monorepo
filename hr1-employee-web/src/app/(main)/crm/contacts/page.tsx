"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Contact } from "lucide-react";

export default function CrmContactsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="連絡先" description="連絡先の管理" sticky={false} border={false} />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Contact className="h-10 w-10" />
          <p className="text-sm">機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
