"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApplicationStep } from "@/types/database";
import type { FormSheetField } from "@/features/applications/types";

interface FormResponseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: ApplicationStep | null;
  fields: FormSheetField[];
  loading: boolean;
}

export function FormResponseSheet({
  open,
  onOpenChange,
  step,
  fields,
  loading,
}: FormResponseSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step?.label ?? "フォーム回答"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">読み込み中...</p>
          ) : fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">回答がありません</p>
          ) : (
            fields.map(({ field, value }) => (
              <div key={field.id} className="rounded-lg border p-4 space-y-1">
                <p className="text-sm font-medium">{field.label}</p>
                {field.description && (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                )}
                <p className="text-sm pt-1 whitespace-pre-wrap">{value}</p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
