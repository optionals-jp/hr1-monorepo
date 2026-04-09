export const CYCLE_STATUS_LABELS: Record<string, string> = {
  active: "実施中",
  closed: "終了",
  finalized: "確定",
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  pending: "未着手",
  in_progress: "進行中",
  submitted: "提出済",
  skipped: "スキップ",
};

export const RATER_TYPE_LABELS: Record<string, string> = {
  supervisor: "上司評価",
  peer: "同僚評価",
  subordinate: "部下評価",
  self: "自己評価",
  external: "外部評価",
};
