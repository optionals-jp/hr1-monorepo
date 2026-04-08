"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="メッセージ"
        description="チームとのコミュニケーション"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <MessageSquare className="h-10 w-10" />
          <p className="text-sm">メッセージ機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
