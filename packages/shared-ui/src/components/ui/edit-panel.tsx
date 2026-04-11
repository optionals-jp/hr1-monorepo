"use client";

import { ReactNode, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { ConfirmDialog } from "./confirm-dialog";
import { DialogPanel } from "./dialog";

export interface EditPanelTab {
  value: string;
  label: string;
}

interface EditPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tabs?: EditPanelTab[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  children: ReactNode;
  onSave: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  deleting?: boolean;
  confirmDeleteMessage?: string;
}

/**
 * 編集フォーム用のダイアログ。
 * タブサイドバー + 本文 + 保存/削除/閉じるボタンのレイアウトを提供する。
 * ダイアログのシェル（ヘッダー/ボディ/フッター）は `DialogPanel` に委譲する。
 */
export function EditPanel({
  open,
  onOpenChange,
  title,
  tabs,
  activeTab,
  onTabChange,
  children,
  onSave,
  saving = false,
  saveDisabled = false,
  saveLabel = "保存",
  onDelete,
  deleteLabel = "削除",
  deleting = false,
  confirmDeleteMessage,
}: EditPanelProps) {
  const showSidebar = tabs && tabs.length > 1;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDeleteClick = () => {
    if (confirmDeleteMessage) {
      setDeleteConfirmOpen(true);
    } else {
      onDelete?.();
    }
  };

  return (
    <>
      <DialogPanel
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        size={showSidebar ? "xl" : "md"}
        className={showSidebar ? "sm:h-126" : undefined}
        // サイドバーがある場合は本文側のパディングを無効化して、nav とコンテンツを flex で並べる。
        bodyClassName={showSidebar ? "!p-0 flex overflow-hidden" : undefined}
        footer={
          <div className="flex items-center w-full">
            {onDelete && (
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={deleting || saving}
              >
                {deleting ? "削除中..." : deleteLabel}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                閉じる
              </Button>
              <Button onClick={onSave} disabled={saving || saveDisabled || deleting}>
                {saving ? "保存中..." : saveLabel}
              </Button>
            </div>
          </div>
        }
      >
        {showSidebar ? (
          <>
            <nav className="w-44 shrink-0 border-r py-3 px-2 space-y-0.5 overflow-y-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onTabChange?.(tab.value)}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-2 text-sm transition-colors",
                    activeTab === tab.value
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </>
        ) : (
          children
        )}
      </DialogPanel>
      {confirmDeleteMessage && (
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="削除の確認"
          description={confirmDeleteMessage}
          variant="destructive"
          confirmLabel="削除"
          onConfirm={() => {
            setDeleteConfirmOpen(false);
            onDelete?.();
          }}
          loading={deleting}
        />
      )}
    </>
  );
}
