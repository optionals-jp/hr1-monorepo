"use client";

import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { ListTodo } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="タスク"
        description="あなたに割り当てられたタスク"
        sticky={false}
        border={false}
      />
      <PageContent>
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <ListTodo className="h-10 w-10" />
          <p className="text-sm">タスク機能は準備中です</p>
        </div>
      </PageContent>
    </div>
  );
}
