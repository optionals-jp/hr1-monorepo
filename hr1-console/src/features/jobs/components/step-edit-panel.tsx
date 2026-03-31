"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditPanel } from "@/components/ui/edit-panel";
import type { Interview } from "@/types/database";
import { StepType, FORM_STEP_TYPES, stepTypeLabels, selectableStepTypes } from "@/lib/constants";

interface StepEditPanelProps {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stepType: string;
  setStepType: (v: string) => void;
  stepLabel: string;
  setStepLabel: (v: string) => void;
  stepFormId: string;
  setStepFormId: (v: string) => void;
  stepInterviewId: string;
  setStepInterviewId: (v: string) => void;
  forms: { id: string; title: string }[];
  interviews: Interview[];
  saving: boolean;
  onSave: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

export function StepEditPanel({
  mode,
  open,
  onOpenChange,
  stepType,
  setStepType,
  stepLabel,
  setStepLabel,
  stepFormId,
  setStepFormId,
  stepInterviewId,
  setStepInterviewId,
  forms,
  interviews,
  saving,
  onSave,
  onDelete,
  deleting,
}: StepEditPanelProps) {
  return (
    <EditPanel
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "add" ? "選考ステップを追加" : "ステップを編集"}
      onSave={onSave}
      saving={saving}
      saveDisabled={!stepLabel}
      saveLabel={mode === "add" ? "追加" : undefined}
      onDelete={mode === "edit" ? onDelete : undefined}
      deleting={mode === "edit" ? deleting : undefined}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>種類</Label>
          <Select
            value={stepType}
            onValueChange={(v) => {
              if (!v) return;
              setStepType(v);
              setStepFormId("");
              setStepInterviewId("");
            }}
          >
            <SelectTrigger>
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
        </div>
        {FORM_STEP_TYPES.includes(stepType as StepType) && (
          <div className="space-y-2">
            <Label>フォーム</Label>
            <Select value={stepFormId} onValueChange={(v) => v && setStepFormId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="フォームを選択（任意）">
                  {(v: string) => forms.find((f) => f.id === v)?.title ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {forms.length === 0 ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    フォームがありません
                  </div>
                ) : (
                  forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {mode === "edit" && stepFormId && (
              <Link href={`/forms/${stepFormId}`} className="text-sm text-primary hover:underline">
                フォームの詳細を表示 →
              </Link>
            )}
          </div>
        )}
        {stepType === StepType.Interview && (
          <div className="space-y-2">
            <Label>日程調整</Label>
            <Select value={stepInterviewId} onValueChange={(v) => v && setStepInterviewId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="日程調整を選択（任意）">
                  {(v: string) => interviews.find((iv) => iv.id === v)?.title ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {interviews.length === 0 ? (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    日程調整がありません
                  </div>
                ) : (
                  interviews.map((iv) => (
                    <SelectItem key={iv.id} value={iv.id}>
                      {iv.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {mode === "edit" && stepInterviewId && (
              <Link
                href={`/scheduling/${stepInterviewId}`}
                className="text-sm text-primary hover:underline"
              >
                日程調整の詳細を表示 →
              </Link>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label>ラベル *</Label>
          <Input
            value={stepLabel}
            onChange={(e) => setStepLabel(e.target.value)}
            placeholder="一次面接"
          />
        </div>
      </div>
    </EditPanel>
  );
}
