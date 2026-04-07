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
