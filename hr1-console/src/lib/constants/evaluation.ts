import { BadgeVariant } from "./types";

export const evaluationStatusLabels: Record<string, string> = {
  draft: "下書き",
  submitted: "提出済み",
};

export const evaluationStatusColors: Record<string, BadgeVariant> = {
  draft: "outline",
  submitted: "default",
};

export const evaluationTypeLabels: Record<string, string> = {
  single: "単独評価",
  multi_rater: "多面評価 (360度)",
};

export const anonymityModeLabels: Record<string, string> = {
  none: "なし（全員実名）",
  peer_only: "同僚・部下のみ匿名",
  full: "完全匿名",
};

export const raterTypeLabels: Record<string, string> = {
  supervisor: "上司",
  peer: "同僚",
  subordinate: "部下",
  self: "自己",
  external: "外部",
};

export const cycleStatusLabels: Record<string, string> = {
  draft: "準備中",
  active: "実施中",
  closed: "締切済み",
  calibrating: "調整中",
  finalized: "確定",
};

export const cycleStatusColors: Record<string, BadgeVariant> = {
  draft: "outline",
  active: "default",
  closed: "secondary",
  calibrating: "outline",
  finalized: "secondary",
};

export const assignmentStatusLabels: Record<string, string> = {
  pending: "未着手",
  in_progress: "進行中",
  submitted: "提出済み",
  skipped: "スキップ",
};

export const scoreTypeLabels: Record<string, string> = {
  five_star: "5段階評価",
  ten_point: "10点評価",
  text: "テキスト",
  select: "選択式",
};
