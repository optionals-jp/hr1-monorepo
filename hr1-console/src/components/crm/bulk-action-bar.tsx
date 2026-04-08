"use client";

import { useState } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { ConfirmDialog } from "@hr1/shared-ui/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline";
  /** trueの場合、確認ダイアログを表示 */
  confirm?: boolean;
  confirmMessage?: string;
  onClick: (selectedIds: string[]) => Promise<void>;
}

interface BulkActionBarProps {
  selectedIds: string[];
  totalCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionBar({
  selectedIds,
  totalCount,
  onClearSelection,
  actions,
  className,
}: BulkActionBarProps) {
  const [processing, setProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  if (selectedIds.length === 0) return null;

  const executeAction = async (action: BulkAction) => {
    setProcessing(true);
    try {
      await action.onClick(selectedIds);
    } finally {
      setProcessing(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg",
          className
        )}
      >
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedIds.length}/{totalCount}件 選択中
        </span>

        <div className="h-5 w-px bg-border" />

        {actions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant ?? "outline"}
            size="sm"
            disabled={processing}
            onClick={() => {
              if (action.confirm) {
                setConfirmAction(action);
              } else {
                executeAction(action);
              }
            }}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}

        <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={processing}>
          <X className="size-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title="操作の確認"
        description={
          confirmAction?.confirmMessage ??
          `選択した${selectedIds.length}件に対して「${confirmAction?.label}」を実行しますか？`
        }
        confirmLabel={confirmAction?.label ?? "実行"}
        variant={confirmAction?.variant === "destructive" ? "destructive" : "default"}
        onConfirm={() => confirmAction && executeAction(confirmAction)}
        loading={processing}
      />
    </>
  );
}

// Re-export hook from lib/hooks for backwards compatibility
export { useBulkSelection } from "@/lib/hooks/use-bulk-selection";
