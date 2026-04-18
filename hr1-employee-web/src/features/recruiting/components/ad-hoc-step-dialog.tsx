"use client";

import { useEffect, useState } from "react";
import type { JSX } from "react";
import { DialogPanel } from "@hr1/shared-ui/components/ui/dialog";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  StepType,
  FORM_STEP_TYPES,
  selectableStepTypes,
  screeningTypeLabels,
  stepTypeLabels,
} from "@/lib/constants";
import type { ApplicationStep, CustomForm, Interview } from "@/types/database";
import { ResourceSelectField } from "@/features/recruiting/components/resource-select-field";

interface AdHocStepDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingStep: ApplicationStep | null;
  /** 指定された場合、このステップの「前」に挿入する。位置選択 UI は非表示。 */
  insertBeforeStepId?: string | null;
  existingSteps: ApplicationStep[];
  forms: CustomForm[];
  interviews: Interview[];
  onLoadResources: () => Promise<void> | void;
  onSubmit: (input: {
    step_type: string;
    label: string;
    form_id?: string | null;
    interview_id?: string | null;
    screening_type?: string | null;
    requires_review?: boolean;
    is_optional?: boolean;
    description?: string | null;
    insert_after_step_id?: string | null;
    insert_before_step_id?: string | null;
    default_duration_days?: number | null;
    deadline_at?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
}

interface FormState {
  step_type: string;
  label: string;
  form_id: string | null;
  interview_id: string | null;
  screening_type: string | null;
  requires_review: boolean;
  is_optional: boolean;
  description: string;
  insert_after_step_id: string | null; // null => 末尾
  /** 空文字 = 未設定。数値文字列で保持し、保存時に数値化する */
  default_duration_days: string;
  /** YYYY-MM-DD 形式。空文字 = 未設定。保存時に JST 23:59:59 の timestamptz に変換 */
  deadline_date: string;
}

/** timestamptz (ISO) から YYYY-MM-DD (JST) の文字列へ変換する。null 安全。 */
function isoToJstDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  // JST (UTC+9) オフセットを加算して日付部分だけ取り出す
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function buildInitialForm(editingStep: ApplicationStep | null): FormState {
  if (!editingStep) {
    return {
      step_type: StepType.Screening,
      label: "",
      form_id: null,
      interview_id: null,
      screening_type: "resume",
      requires_review: false,
      is_optional: false,
      description: "",
      insert_after_step_id: null,
      default_duration_days: "",
      deadline_date: "",
    };
  }
  return {
    step_type: editingStep.step_type,
    label: editingStep.label,
    form_id: editingStep.form_id,
    interview_id: editingStep.interview_id,
    screening_type: editingStep.screening_type,
    requires_review: editingStep.requires_review,
    is_optional: editingStep.is_optional,
    description: editingStep.description ?? "",
    insert_after_step_id: null, // 編集時は位置変更 UI を出さない（step_order は別途管理）
    default_duration_days:
      editingStep.default_duration_days != null ? String(editingStep.default_duration_days) : "",
    deadline_date: isoToJstDate(editingStep.deadline_at),
  };
}

/**
 * Dialog 本体は `open === true` のときだけマウントする（key で remount）。
 * これにより state 初期化を useEffect に押し込まずに済み、
 * 不要な setState in effect を避ける。
 */
export function AdHocStepDialog(props: AdHocStepDialogProps): JSX.Element | null {
  if (!props.open) {
    return null;
  }
  return (
    <AdHocStepDialogBody
      key={props.editingStep?.id ?? props.insertBeforeStepId ?? "new"}
      {...props}
    />
  );
}

function AdHocStepDialogBody({
  open,
  onOpenChange,
  editingStep,
  insertBeforeStepId,
  existingSteps,
  forms,
  interviews,
  onLoadResources,
  onSubmit,
}: AdHocStepDialogProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(editingStep));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onLoadResources();
    // onLoadResources は parent 側で安定化させる前提（依存に入れない）。
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "step_type") {
        next.form_id = null;
        next.interview_id = null;
        next.screening_type = value === StepType.Screening ? "resume" : null;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      setError("ステップ名を入力してください");
      return;
    }
    if (form.step_type === StepType.Screening && !form.screening_type) {
      setError("書類の種類を選択してください");
      return;
    }

    // 既定所要日数のバリデーション (空なら null)
    let durationDays: number | null = null;
    if (form.default_duration_days.trim() !== "") {
      const n = Number(form.default_duration_days);
      if (!Number.isInteger(n) || n <= 0) {
        setError("既定所要日数は正の整数で入力してください");
        return;
      }
      durationDays = n;
    }

    // 期限日 (YYYY-MM-DD) を JST 23:59:59 の timestamptz に変換
    let deadlineIso: string | null = null;
    if (form.deadline_date.trim() !== "") {
      // JST の 23:59:59 を UTC の ISO 文字列にする: JST = UTC+9 なので UTC は 14:59:59Z
      deadlineIso = `${form.deadline_date}T14:59:59.000Z`;
    }

    setSaving(true);
    setError(null);
    const result = await onSubmit({
      step_type: form.step_type,
      label: form.label.trim(),
      form_id: form.form_id,
      interview_id: form.interview_id,
      screening_type: form.step_type === StepType.Screening ? form.screening_type : null,
      requires_review: form.requires_review,
      is_optional: form.is_optional,
      description: form.description.trim() ? form.description.trim() : null,
      insert_after_step_id: editingStep || insertBeforeStepId ? null : form.insert_after_step_id,
      insert_before_step_id: editingStep ? null : (insertBeforeStepId ?? null),
      default_duration_days: durationDays,
      deadline_at: deadlineIso,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "保存に失敗しました");
    }
  };

  // 挿入位置の候補: 既存ステップを順序で並べたリスト + 末尾。
  // オファー（最終確定）ステップの後ろには挿入不可にするのが安全なので、
  // 完了済み/スキップ済みだけでなく step_type=offer も候補から除外する。
  const positionOptions = existingSteps
    .slice()
    .sort((a, b) => a.step_order - b.step_order)
    .filter((s) => s.step_type !== StepType.Offer);

  return (
    <DialogPanel
      open={open}
      onOpenChange={onOpenChange}
      title={editingStep ? "ステップを編集" : "ステップを追加"}
      description="この応募者にだけ追加されるステップです。フローのテンプレートには影響しません。"
      size="md"
      bodyClassName="p-4 space-y-4"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Label htmlFor="ad-hoc-step-type">種別</Label>
        <Select value={form.step_type} onValueChange={(v) => v && update("step_type", v)}>
          <SelectTrigger id="ad-hoc-step-type" className="w-full">
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

      <div className="space-y-2">
        <Label htmlFor="ad-hoc-step-label">ステップ名</Label>
        <Input
          id="ad-hoc-step-label"
          value={form.label}
          onChange={(e) => update("label", e.target.value)}
          placeholder="例: 追加の課題提出"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ad-hoc-step-description">候補者への依頼内容（任意）</Label>
        <Textarea
          id="ad-hoc-step-description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="例: 下記の課題について、1週間以内にご提出をお願いします。"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          応募者のアプリ上でこのステップの説明として表示されます。
        </p>
      </div>

      {form.step_type === StepType.Screening && (
        <div className="space-y-2">
          <Label htmlFor="ad-hoc-step-screening">書類の種類</Label>
          <Select
            value={form.screening_type ?? ""}
            onValueChange={(v) => update("screening_type", v || null)}
          >
            <SelectTrigger id="ad-hoc-step-screening" className="w-full">
              <SelectValue placeholder="書類の種類を選択">
                {(v: string) => screeningTypeLabels[v] ?? "書類の種類を選択"}
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
        </div>
      )}

      {FORM_STEP_TYPES.includes(form.step_type as StepType) && (
        <div className="space-y-2">
          <Label htmlFor="ad-hoc-step-form">フォーム（任意）</Label>
          <ResourceSelectField
            id="ad-hoc-step-form"
            value={form.form_id}
            onChange={(v) => update("form_id", v)}
            items={forms}
            placeholder="フォームを選択"
          />
        </div>
      )}

      {form.step_type === StepType.Interview && (
        <div className="space-y-2">
          <Label htmlFor="ad-hoc-step-interview">日程調整（任意）</Label>
          <ResourceSelectField
            id="ad-hoc-step-interview"
            value={form.interview_id}
            onChange={(v) => update("interview_id", v)}
            items={interviews}
            placeholder="日程調整を選択"
          />
        </div>
      )}

      {!editingStep && insertBeforeStepId && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          挿入位置:{" "}
          <span className="font-medium">
            「{existingSteps.find((s) => s.id === insertBeforeStepId)?.label ?? ""}」の前
          </span>
        </div>
      )}

      {!editingStep && !insertBeforeStepId && positionOptions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="ad-hoc-step-position">挿入位置</Label>
          <Select
            value={form.insert_after_step_id ?? "__append__"}
            onValueChange={(v) =>
              update("insert_after_step_id", v === "__append__" ? null : v || null)
            }
          >
            <SelectTrigger id="ad-hoc-step-position" className="w-full">
              <SelectValue>
                {(v: string) =>
                  v === "__append__"
                    ? "末尾に追加"
                    : `「${positionOptions.find((s) => s.id === v)?.label ?? ""}」の後に追加`
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {positionOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  「{s.label}」の後に追加
                </SelectItem>
              ))}
              <SelectItem value="__append__">末尾に追加</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ad-hoc-step-duration">既定所要日数（任意）</Label>
          <Input
            id="ad-hoc-step-duration"
            type="number"
            min={1}
            step={1}
            value={form.default_duration_days}
            onChange={(e) => update("default_duration_days", e.target.value)}
            placeholder="例: 7"
          />
          <p className="text-xs text-muted-foreground">
            ステップ開始時にこの日数後 (JST 23:59) を期限として自動設定します。
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ad-hoc-step-deadline">期限日（任意）</Label>
          <Input
            id="ad-hoc-step-deadline"
            type="date"
            value={form.deadline_date}
            onChange={(e) => update("deadline_date", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            手動で期限日を設定できます（所要日数より優先）。
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 pt-1">
        <Checkbox
          id="ad-hoc-step-optional"
          checked={form.is_optional}
          onCheckedChange={(c) => update("is_optional", !!c)}
          className="mt-0.5"
        />
        <div className="space-y-0.5">
          <Label htmlFor="ad-hoc-step-optional" className="cursor-pointer">
            任意ステップにする
          </Label>
          <p className="text-xs text-muted-foreground">
            候補者がスキップ可能なステップとして扱います。
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </DialogPanel>
  );
}
