import { BadgeVariant } from "./types";

/** 応募ステータス */
export const ApplicationStatus = {
  Active: "active",
  Offered: "offered",
  Rejected: "rejected",
  Withdrawn: "withdrawn",
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const applicationStatusLabels: Record<string, string> = {
  [ApplicationStatus.Active]: "選考中",
  [ApplicationStatus.Offered]: "内定",
  [ApplicationStatus.Rejected]: "不採用",
  [ApplicationStatus.Withdrawn]: "辞退",
};

export const applicationStatusColors: Record<string, BadgeVariant> = {
  [ApplicationStatus.Active]: "default",
  [ApplicationStatus.Offered]: "secondary",
  [ApplicationStatus.Rejected]: "destructive",
  [ApplicationStatus.Withdrawn]: "outline",
};
