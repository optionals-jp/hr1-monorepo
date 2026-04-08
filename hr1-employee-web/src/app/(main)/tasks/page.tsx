"use client";

import { CheckSquare } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-foreground">タスク</h1>
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckSquare className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          タスク機能は準備中です
        </p>
      </div>
    </div>
  );
}
