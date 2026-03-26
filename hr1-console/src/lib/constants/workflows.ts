import { BadgeVariant } from "./types";

export const workflowRequestTypeLabels: Record<string, string> = {
  paid_leave: "有給休暇",
  overtime: "残業申請",
  business_trip: "出張申請",
  expense: "経費申請",
};

export const workflowRequestTypeColors: Record<string, BadgeVariant> = {
  paid_leave: "secondary",
  overtime: "outline",
  business_trip: "default",
  expense: "outline",
};

export const workflowStatusLabels: Record<string, string> = {
  pending: "承認待ち",
  approved: "承認済み",
  rejected: "却下",
  cancelled: "取消",
};

export const workflowStatusColors: Record<string, BadgeVariant> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};
