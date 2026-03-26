import { BadgeVariant } from "./types";

export const jobStatusLabels: Record<string, string> = {
  open: "公開中",
  draft: "下書き",
  closed: "終了",
  archived: "アーカイブ",
};

export const jobStatusColors: Record<string, BadgeVariant> = {
  open: "default",
  closed: "secondary",
  draft: "outline",
  archived: "secondary",
};
