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
 * ステップ追加時の form_id / interview_id を決定する
 * step_type に応じて適切な FK 列のみセットされる
 */
export function resolveStepRefs(
  stepType: string,
  formStepTypes: readonly string[],
  formId: string,
  interviewStepType: string,
  interviewId: string
): { form_id: string | null; interview_id: string | null } {
  if (formStepTypes.includes(stepType) && formId) {
    return { form_id: formId, interview_id: null };
  }
  if (stepType === interviewStepType && interviewId) {
    return { form_id: null, interview_id: interviewId };
  }
  return { form_id: null, interview_id: null };
}
