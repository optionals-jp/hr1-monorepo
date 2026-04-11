"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { cn } from "@hr1/shared-ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import type { JobStep, Interview } from "@/types/database";
import { StepType, FORM_STEP_TYPES, stepTypeLabels, selectableStepTypes } from "@/lib/constants";
import { GripVertical, Trash2, Plus } from "lucide-react";

interface StepManageDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  steps: JobStep[];
  forms: { id: string; title: string }[];
  interviews: Interview[];
  onSave: (
    updatedSteps: JobStep[],
    newSteps: {
      step_type: string;
      label: string;
      related_id: string | null;
    }[],
    deletedIds: string[]
  ) => Promise<void>;
  saving: boolean;
}

interface EditableStep {
  id: string;
  step_type: string;
  label: string;
  related_id: string | null;
  step_order: number;
  isNew?: boolean;
}

export function StepManageDialog({
  open,
  onOpenChange,
  steps: initialSteps,
  forms,
  interviews,
  onSave,
  saving,
}: StepManageDialogProps) {
  const [editSteps, setEditSteps] = useState<EditableStep[]>(() =>
    initialSteps
      .filter((s) => s.step_type !== StepType.Offer)
      .map((s) => ({
        id: s.id,
        step_type: s.step_type,
        label: s.label,
        related_id: s.related_id,
        step_order: s.step_order,
      }))
  );
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addStep = () => {
    setEditSteps((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        step_type: StepType.Interview,
        label: "",
        related_id: null,
        step_order: prev.length + 1,
        isNew: true,
      },
    ]);
  };

  const removeStep = (index: number) => {
    const step = editSteps[index];
    if (!step.isNew) {
      setDeletedIds((prev) => [...prev, step.id]);
    }
    setEditSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof EditableStep, value: string | null) => {
    setEditSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "step_type") {
        next[index].related_id = null;
      }
      return next;
    });
  };

  const handleDrop = () => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setEditSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dragOverIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    let order = 0;
    const existing: typeof initialSteps = [];
    const newSteps: { step_type: string; label: string; related_id: string | null }[] = [];

    for (const s of editSteps) {
      order++;
      if (s.isNew) {
        if (s.label.trim()) {
          newSteps.push({
            step_type: s.step_type,
            label: s.label.trim(),
            related_id: s.related_id,
          });
        }
      } else {
        const original = initialSteps.find((is_) => is_.id === s.id);
        if (original) {
          existing.push({
            ...original,
            step_order: order,
            label: s.label,
            step_type: s.step_type,
            related_id: s.related_id,
          });
        }
      }
    }

    await onSave(existing, newSteps, deletedIds);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-2xl sm:rounded-[2rem] bg-background ring-1 ring-foreground/10 shadow-lg outline-none flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 max-h-[85vh]">
          <div className="px-6 py-4 border-b shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              選考ステップを編集
            </DialogPrimitive.Title>
            <p className="text-sm text-muted-foreground mt-1">
              ドラッグで並び替え、ステップの追加・削除ができます
            </p>
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 space-y-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {editSteps.map((step, index) => (
              <div
                key={step.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (index !== dragIndex) setDragOverIndex(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={cn(
                  "flex items-start gap-3 rounded-xl bg-white border p-3 cursor-grab",
                  dragOverIndex === index && dragIndex !== index && "ring-2 ring-primary/20"
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5" />
                <span className="text-sm font-bold text-muted-foreground w-6 text-center shrink-0 mt-2">
                  {index + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={step.step_type}
                      onValueChange={(v) => v && updateStep(index, "step_type", v)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue>{(v: string) => stepTypeLabels[v] ?? v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(selectableStepTypes).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={step.label}
                      onChange={(e) => updateStep(index, "label", e.target.value)}
                      placeholder="ステップ名"
                      className="flex-1"
                    />
                    {step.isNew && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        新規
                      </Badge>
                    )}
                  </div>
                  {FORM_STEP_TYPES.includes(step.step_type as StepType) && (
                    <Select
                      value={step.related_id ?? ""}
                      onValueChange={(v) => updateStep(index, "related_id", v || null)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="フォームを選択（任意）">
                          {(v: string) =>
                            forms.find((f) => f.id === v)?.title ?? "フォームを選択（任意）"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {forms.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {step.step_type === StepType.Interview && (
                    <Select
                      value={step.related_id ?? ""}
                      onValueChange={(v) => updateStep(index, "related_id", v || null)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="日程調整を選択（任意）">
                          {(v: string) =>
                            interviews.find((iv) => iv.id === v)?.title ?? "日程調整を選択（任意）"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {interviews.map((iv) => (
                          <SelectItem key={iv.id} value={iv.id}>
                            {iv.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeStep(index)}
                  className="text-muted-foreground hover:text-destructive shrink-0 mt-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" className="w-full" onClick={addStep}>
              <Plus className="size-4 mr-1.5" />
              ステップを追加
            </Button>
          </div>

          <div className="px-6 py-3 border-t flex items-center justify-between shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
