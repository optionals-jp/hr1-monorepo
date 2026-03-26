export const stepStatusLabels: Record<string, string> = {
  pending: "未開始",
  in_progress: "進行中",
  completed: "完了",
  skipped: "スキップ",
};

export const stepTypeLabels: Record<string, string> = {
  screening: "書類選考",
  form: "アンケート/フォーム",
  interview: "面接",
  external_test: "外部テスト",
  offer: "内定",
};

/** 選考ステップ追加・編集時の選択肢（内定は自動付与のため除外） */
export const selectableStepTypes: Record<string, string> = {
  screening: "書類選考",
  form: "アンケート/フォーム",
  interview: "面接",
  external_test: "外部テスト",
};
