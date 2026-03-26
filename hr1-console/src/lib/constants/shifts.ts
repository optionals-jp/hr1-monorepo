import { BadgeVariant } from "./types";

export const shiftScheduleStatusLabels: Record<string, string> = {
  draft: "下書き",
  published: "公開済み",
};

export const shiftScheduleStatusColors: Record<string, BadgeVariant> = {
  draft: "outline",
  published: "default",
};
