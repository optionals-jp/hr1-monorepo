/** 選考ステップのステータス */
export const StepStatus = {
  Pending: "pending",
  InProgress: "in_progress",
  Completed: "completed",
  Skipped: "skipped",
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export const stepStatusLabels: Record<string, string> = {
  [StepStatus.Pending]: "未開始",
  [StepStatus.InProgress]: "進行中",
  [StepStatus.Completed]: "完了",
  [StepStatus.Skipped]: "スキップ",
};

/** 選考ステップの種別 */
export const StepType = {
  Screening: "screening",
  Form: "form",
  Interview: "interview",
  ExternalTest: "external_test",
  Offer: "offer",
} as const;
export type StepType = (typeof StepType)[keyof typeof StepType];

export const stepTypeLabels: Record<string, string> = {
  [StepType.Screening]: "書類選考",
  [StepType.Form]: "アンケート/フォーム",
  [StepType.Interview]: "面接",
  [StepType.ExternalTest]: "外部テスト",
  [StepType.Offer]: "内定",
};

/** 選考ステップ追加・編集時の選択肢（内定は自動付与のため除外） */
export const selectableStepTypes: Record<string, string> = {
  [StepType.Screening]: "書類選考",
  [StepType.Form]: "アンケート/フォーム",
  [StepType.Interview]: "面接",
  [StepType.ExternalTest]: "外部テスト",
};

/** リソース選択が必要なステップ種別 */
export const RESOURCE_STEP_TYPES = [StepType.Form, StepType.Interview] as const;

/** フォーム紐付け可能なステップ種別 */
export const FORM_STEP_TYPES: StepType[] = [StepType.Screening, StepType.Form];
