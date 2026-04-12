import type { BadgeVariant } from "@hr1/shared-ui";

export const evaluationStatusLabels: Record<string, string> = {
  draft: "下書き",
  submitted: "提出済み",
};

export const evaluationStatusColors: Record<string, BadgeVariant> = {
  draft: "outline",
  submitted: "default",
};

export const raterTypeLabels: Record<string, string> = {
  supervisor: "上司",
  peer: "同僚",
  subordinate: "部下",
  self: "自己",
  external: "外部",
};

export const scoreTypeLabels: Record<string, string> = {
  five_star: "5段階評価",
  ten_point: "10点評価",
  text: "テキスト",
  select: "選択式",
};
