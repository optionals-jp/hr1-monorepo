"use client";

import { useState } from "react";
import { DialogPanel } from "@hr1/shared-ui/components/ui/dialog";
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
import type { DeadlineSettings, JobStep, Interview } from "@/types/database";
import {
  DeadlineMode,
  StepType,
  FORM_STEP_TYPES,
  stepTypeLabels,
  selectableStepTypes,
  screeningTypeLabels,
} from "@/lib/constants";
import { ResourceSelectField } from "@/features/recruiting/components/resource-select-field";
import {
  DeadlineFieldGroup,
  fromDeadlineSettings,
  toDeadlineSettings,
} from "@/features/recruiting/components/deadline-field-group";
import { GripVertical, Trash2, Plus } from "lucide-react";

interface StepManageDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  steps: JobStep[];
  forms: { id: string; title: string }[];
  interviews: Interview[];
  onSave: (
    updatedSteps: JobStep[],
    newSteps: ({
      step_type: string;
      label: string;
      form_id: string | null;
      interview_id: string | null;
      screening_type: string | null;
      requires_review: boolean;
    } & DeadlineSettings)[],
    deletedIds: string[]
  ) => Promise<void>;
  saving: boolean;
}

interface EditableStep {
  id: string;
  step_type: string;
  label: string;
  form_id: string | null;
  interview_id: string | null;
  screening_type: string | null;
  requires_review: boolean;
  step_order: number;
  /** 期限モード */
  deadline_mode: DeadlineMode;
  /** 数値文字列、空 = 未設定 */
  deadline_offset_days: string;
  /** YYYY-MM-DD、空 = 未設定 */
  fixed_deadline_date: string;
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
      .map((s) => {
        const d = fromDeadlineSettings(s);
        return {
          id: s.id,
          step_type: s.step_type,
          label: s.label,
          form_id: s.form_id,
          interview_id: s.interview_id,
          screening_type: s.screening_type,
          requires_review: s.requires_review,
          step_order: s.step_order,
          deadline_mode: d.mode,
          deadline_offset_days: d.offsetDays,
          fixed_deadline_date: d.fixedDate,
        };
      })
  );
  const [saveError, setSaveError] = useState<string | null>(null);
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
        form_id: null,
        interview_id: null,
        screening_type: null,
        requires_review: false,
        step_order: prev.length + 1,
        deadline_mode: DeadlineMode.None,
        deadline_offset_days: "",
        fixed_deadline_date: "",
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
        next[index].form_id = null;
        next[index].interview_id = null;
        next[index].screening_type = null;
      }
      return next;
    });
  };

  const updateDeadline = (
    index: number,
    patch: Partial<{ mode: DeadlineMode; offsetDays: string; fixedDate: string }>
  ) => {
    setEditSteps((prev) => {
      const next = [...prev];
      const cur = next[index];
      next[index] = {
        ...cur,
        deadline_mode: patch.mode ?? cur.deadline_mode,
        deadline_offset_days: patch.offsetDays ?? cur.deadline_offset_days,
        fixed_deadline_date: patch.fixedDate ?? cur.fixed_deadline_date,
      };
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
    const newSteps: ({
      step_type: string;
      label: string;
      form_id: string | null;
      interview_id: string | null;
      screening_type: string | null;
      requires_review: boolean;
    } & DeadlineSettings)[] = [];

    for (let i = 0; i < editSteps.length; i++) {
      const s = editSteps[i];
      order++;
      const deadlineResult = toDeadlineSettings(
        s.deadline_mode,
        s.deadline_offset_days,
        s.fixed_deadline_date
      );
      if (!deadlineResult.ok) {
        setSaveError(`${i + 1} 番目のステップ: ${deadlineResult.error}`);
        return;
      }
      if (s.isNew) {
        if (s.label.trim()) {
          newSteps.push({
            step_type: s.step_type,
            label: s.label.trim(),
            form_id: s.form_id,
            interview_id: s.interview_id,
            screening_type: s.screening_type,
            requires_review: s.requires_review,
            ...deadlineResult.value,
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
            form_id: s.form_id,
            interview_id: s.interview_id,
            screening_type: s.screening_type,
            requires_review: s.requires_review,
            ...deadlineResult.value,
          });
        }
      }
    }

    setSaveError(null);
    await onSave(existing, newSteps, deletedIds);
  };

  return (
    <DialogPanel
      open={open}
      onOpenChange={onOpenChange}
      title="選考ステップを編集"
      description="ドラッグで並び替え、ステップの追加・削除ができます"
      size="xl"
      bodyClassName="p-4 space-y-2"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              editSteps.some((s) => s.step_type === StepType.Screening && !s.screening_type)
            }
          >
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      }
    >
      <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="space-y-2">
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
              {step.step_type === StepType.Screening && (
                <Select
                  value={step.screening_type ?? ""}
                  onValueChange={(v) => updateStep(index, "screening_type", v || null)}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full",
                      !step.screening_type && "text-destructive border-destructive"
                    )}
                  >
                    <SelectValue placeholder="書類の種類を選択（必須）">
                      {(v: string) => screeningTypeLabels[v] ?? "書類の種類を選択（必須）"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(screeningTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {FORM_STEP_TYPES.includes(step.step_type as StepType) && (
                <ResourceSelectField
                  value={step.form_id}
                  onChange={(v) => updateStep(index, "form_id", v)}
                  items={forms}
                  placeholder="フォームを選択（任意）"
                />
              )}
              {step.step_type === StepType.Interview && (
                <ResourceSelectField
                  value={step.interview_id}
                  onChange={(v) => updateStep(index, "interview_id", v)}
                  items={interviews}
                  placeholder="日程調整を選択（任意）"
                />
              )}
              <DeadlineFieldGroup
                mode={step.deadline_mode}
                offsetDays={step.deadline_offset_days}
                fixedDate={step.fixed_deadline_date}
                onChange={(patch) => updateDeadline(index, patch)}
                allowFixed
                idPrefix={`step-deadline-${step.id}`}
              />
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
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </div>
    </DialogPanel>
  );
}
