import type { ApplicationStep, FormField } from "@/types/database";
import { StepStatus, RESOURCE_STEP_TYPES } from "@/lib/constants";
import type { FormSheetField } from "./types";

/**
 * リソース選択が必要なステップ種別かどうか
 */
export function isResourceStepType(type: string): boolean {
  return (RESOURCE_STEP_TYPES as readonly string[]).includes(type);
}

/**
 * 後続ステップが完了済みのためunskipできないかどうか
 */
export function canUnskipStep(step: ApplicationStep, allSteps: ApplicationStep[]): boolean {
  return !allSteps.some((s) => s.step_order > step.step_order && s.status === StepStatus.Completed);
}

/**
 * 現在アクション可能なステップの順序を返す
 */
export function getCurrentStepOrder(steps: ApplicationStep[]): number | null {
  const inProgress = steps.find((s) => s.status === StepStatus.InProgress);
  if (inProgress) return inProgress.step_order;
  const firstPending = steps.find((s) => s.status === StepStatus.Pending);
  return firstPending?.step_order ?? null;
}

/**
 * ステップに対してアクション可能かどうか
 */
export function canActOnStep(step: ApplicationStep, currentStepOrder: number | null): boolean {
  if (step.status === StepStatus.Completed) return false;
  if (step.status === StepStatus.Skipped) return true;
  return step.step_order === currentStepOrder;
}

/**
 * 次に自動開始すべきステップを見つける
 */
export function findNextAutoStartStep(
  steps: ApplicationStep[],
  currentStepOrder: number
): ApplicationStep | undefined {
  return steps
    .filter((s) => s.step_order > currentStepOrder && s.status === StepStatus.Pending)
    .sort((a, b) => a.step_order - b.step_order)[0];
}

/**
 * フォーム回答データを FormSheetField[] に変換する
 */
export function buildFormSheetFields(
  fields: FormField[],
  responses: { field_id: string; value: unknown }[]
): FormSheetField[] {
  const answerMap: Record<string, string> = {};
  for (const r of responses) {
    answerMap[r.field_id] = Array.isArray(r.value)
      ? (r.value as string[]).join(", ")
      : String(r.value ?? "");
  }
  return fields.map((f) => ({ field: f, value: answerMap[f.id] ?? "-" }));
}
