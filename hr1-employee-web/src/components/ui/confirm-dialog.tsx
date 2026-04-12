"use client";

import { Button } from "@hr1/shared-ui/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

/**
 * 共通確認ダイアログ。
 * キャンセル/削除などの破壊的操作の前に使用する。
 * Base UIのDialogを使わずシンプルなオーバーレイで実装（軽量）。
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "確認",
  cancelText = "キャンセル",
  onConfirm,
  variant = "default",
  disabled = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="bg-background rounded-lg p-6 max-w-sm mx-4 shadow-lg">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mb-4">{description}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            size="sm"
            disabled={disabled}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
