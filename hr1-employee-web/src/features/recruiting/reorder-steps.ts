import { StepType } from "@/lib/constants";

export interface StepItem {
  id: string;
  step_type: string;
  step_order: number;
}

/**
 * 選考ステップを並び替える（offer ステップは常に末尾に固定）
 */
export function reorderSteps<T extends StepItem>(
  steps: T[],
  fromIndex: number,
  toIndex: number
): T[] | null {
  if (fromIndex === toIndex) return null;

  const nonOffer = steps.filter((s) => s.step_type !== StepType.Offer).map((s) => ({ ...s }));
  const offerSteps = steps.filter((s) => s.step_type === StepType.Offer);

  const clampedTo = Math.min(toIndex, nonOffer.length - 1);
  if (fromIndex === clampedTo) return null;

  const [moved] = nonOffer.splice(fromIndex, 1);
  nonOffer.splice(clampedTo, 0, moved);

  const merged = [...nonOffer, ...offerSteps];
  return merged.map((s, i) => ({ ...s, step_order: i + 1 }));
}

/**
 * ステップ追加時の related_id を決定する
 */
export function resolveRelatedId(
  stepType: string,
  formStepTypes: readonly string[],
  formId: string,
  interviewStepType: string,
  interviewId: string
): string | null {
  if (formStepTypes.includes(stepType) && formId) return formId;
  if (stepType === interviewStepType && interviewId) return interviewId;
  return null;
}
