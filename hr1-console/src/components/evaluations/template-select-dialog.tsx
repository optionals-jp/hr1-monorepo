"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { EvaluationTemplate } from "@/types/database";

export interface TemplateSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: EvaluationTemplate[];
  onSelect: (templateId: string) => void;
}

export function TemplateSelectDialog({
  open,
  onOpenChange,
  templates,
  onSelect,
}: TemplateSelectDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl sm:rounded-[2rem] bg-background ring-1 ring-foreground/10 shadow-lg outline-none flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 max-h-[80vh]">
          <div className="px-6 py-4 border-b shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              評価シートを選択
            </DialogPrimitive.Title>
            <p className="text-sm text-muted-foreground mt-1">使用する評価シートを選んでください</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className="w-full text-left rounded-xl border p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                >
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {t.target === "applicant"
                        ? "応募者向け"
                        : t.target === "employee"
                          ? "社員向け"
                          : "共通"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t.evaluation_type === "multi_rater" ? "多面評価" : "単独評価"}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="px-6 py-3 border-t shrink-0">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
