"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Megaphone } from "lucide-react";

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="お知らせ" description="社内のお知らせ" sticky={false} border={false} />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Megaphone className="h-10 w-10" />
          <p className="text-sm">お知らせ機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
