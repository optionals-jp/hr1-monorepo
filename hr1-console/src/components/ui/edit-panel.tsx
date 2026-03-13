"use client";

import { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
}

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
}: EditPanelProps) {
  const showSidebar = tabs && tabs.length > 1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full rounded-xl bg-background ring-1 ring-foreground/10 shadow-lg outline-none flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100",
            showSidebar ? "max-w-2xl h-126" : "max-w-md"
          )}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              {title}
            </DialogPrimitive.Title>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            {showSidebar && (
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
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t flex items-center shrink-0">
            {onDelete && (
              <Button variant="destructive" onClick={onDelete} disabled={deleting || saving}>
                {deleting ? "削除中..." : deleteLabel}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <DialogPrimitive.Close render={<Button variant="outline" />}>
                閉じる
              </DialogPrimitive.Close>
              <Button onClick={onSave} disabled={saving || saveDisabled || deleting}>
                {saving ? "保存中..." : saveLabel}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
