import { StepType } from "@/lib/constants";

export interface StepItem {
  id: string;
  step_type: string;
  step_order: number;
}

/**
 * 選考ステップを並び替える（offer ステップは常に末尾に固定）
 *
 * @param steps 現在のステップ配列（offer 含む）
 * @param fromIndex 移動元インデックス（offer 除外後の配列内）
 * @param toIndex 移動先インデックス（offer 除外後の配列内、末尾超過は末尾に丸める）
 * @returns 並び替え後のステップ配列（step_order 再割り当て済み）。変更なしの場合は null
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
