import { BadgeVariant } from "./types";

export const applicationStatusLabels: Record<string, string> = {
  active: "選考中",
  offered: "内定",
  rejected: "不採用",
  withdrawn: "辞退",
};

export const applicationStatusColors: Record<string, BadgeVariant> = {
  active: "default",
  offered: "secondary",
  rejected: "destructive",
  withdrawn: "outline",
};
