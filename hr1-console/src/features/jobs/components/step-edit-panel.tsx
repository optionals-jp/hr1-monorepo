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
import { Checkbox } from "@/components/ui/checkbox";
import type { Interview } from "@/types/database";
import { stepTypeLabels, selectableStepTypes } from "@/lib/constants";

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
  stepScheduleIds: string[];
  setStepScheduleIds: (v: string[] | ((prev: string[]) => string[])) => void;
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
  stepScheduleIds,
  setStepScheduleIds,
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
              setStepScheduleIds([]);
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
        {["screening", "form"].includes(stepType) && (
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
        {stepType === "interview" && (
          <div className="space-y-2">
            <Label>日程調整</Label>
            {interviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">日程調整がありません</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3">
                {interviews.map((iv) => (
                  <label key={iv.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={stepScheduleIds.includes(iv.id)}
                      onCheckedChange={(checked) => {
                        setStepScheduleIds((prev: string[]) =>
                          checked ? [...prev, iv.id] : prev.filter((sid) => sid !== iv.id)
                        );
                      }}
                    />
                    <span className="text-sm">{iv.title}</span>
                  </label>
                ))}
              </div>
            )}
            {mode === "edit" && stepScheduleIds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {stepScheduleIds.map((sid) => {
                  const iv = interviews.find((i) => i.id === sid);
                  return iv ? (
                    <Link
                      key={sid}
                      href={`/scheduling/${sid}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {iv.title}
                    </Link>
                  ) : null;
                })}
              </div>
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
