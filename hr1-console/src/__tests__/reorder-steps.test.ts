import { describe, it, expect } from "vitest";
import { reorderSteps, type StepItem } from "@/lib/reorder-steps";

function makeSteps(...types: string[]): StepItem[] {
  return types.map((t, i) => ({
    id: `step-${i}`,
    step_type: t,
    step_order: i + 1,
    label: `${t}-${i}`,
  }));
}

function labels(steps: StepItem[]): string[] {
  return steps.map((s) => s.label as string);
}

describe("reorderSteps", () => {
  // 基本: [screening, form, interview1, interview2, offer]
  const base = () => makeSteps("screening", "form", "interview", "interview", "offer");

  it("隣接要素を1つ下に移動できる（3番目→4番目）", () => {
    const result = reorderSteps(base(), 2, 3);
    expect(result).not.toBeNull();
    expect(labels(result!)).toEqual([
      "screening-0",
      "form-1",
      "interview-3",
      "interview-2",
      "offer-4",
    ]);
  });

  it("隣接要素を1つ上に移動できる（4番目→3番目）", () => {
    const result = reorderSteps(base(), 3, 2);
    expect(result).not.toBeNull();
    expect(labels(result!)).toEqual([
      "screening-0",
      "form-1",
      "interview-3",
      "interview-2",
      "offer-4",
    ]);
  });

  it("先頭を末尾に移動できる", () => {
    const result = reorderSteps(base(), 0, 3);
    expect(result).not.toBeNull();
    expect(labels(result!)).toEqual([
      "form-1",
      "interview-2",
      "interview-3",
      "screening-0",
      "offer-4",
    ]);
  });

  it("末尾を先頭に移動できる", () => {
    const result = reorderSteps(base(), 3, 0);
    expect(result).not.toBeNull();
    expect(labels(result!)).toEqual([
      "interview-3",
      "screening-0",
      "form-1",
      "interview-2",
      "offer-4",
    ]);
  });

  it("末尾ドロップゾーン（toIndex > 配列長）で末尾に配置される", () => {
    const result = reorderSteps(base(), 0, 10);
    expect(result).not.toBeNull();
    expect(labels(result!)).toEqual([
      "form-1",
      "interview-2",
      "interview-3",
      "screening-0",
      "offer-4",
    ]);
  });

  it("offer ステップは常に末尾に固定される", () => {
    const result = reorderSteps(base(), 0, 3);
    expect(result).not.toBeNull();
    const last = result![result!.length - 1];
    expect(last.step_type).toBe("offer");
  });

  it("step_order が 1 から連番で再割り当てされる", () => {
    const result = reorderSteps(base(), 2, 0);
    expect(result).not.toBeNull();
    expect(result!.map((s) => s.step_order)).toEqual([1, 2, 3, 4, 5]);
  });

  it("同じ位置への移動は null を返す", () => {
    expect(reorderSteps(base(), 2, 2)).toBeNull();
  });

  it("clamp 後に同じ位置になる場合は null を返す", () => {
    // 4要素で末尾(index=3)から末尾ゾーン(index=4+)への移動
    expect(reorderSteps(base(), 3, 4)).toBeNull();
    expect(reorderSteps(base(), 3, 100)).toBeNull();
  });

  it("2要素でも正しく並び替えられる", () => {
    const steps = makeSteps("screening", "interview", "offer");
    const result = reorderSteps(steps, 0, 1);
    expect(result).not.toBeNull();
    expect(labels(result!)).toEqual(["interview-1", "screening-0", "offer-2"]);
  });

  it("元の配列を変更しない", () => {
    const original = base();
    const originalLabels = labels(original);
    reorderSteps(original, 0, 3);
    expect(labels(original)).toEqual(originalLabels);
  });
});
