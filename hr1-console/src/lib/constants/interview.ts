import { BadgeVariant } from "./types";

export const interviewStatusLabels: Record<string, string> = {
  scheduling: "日程調整中",
  confirmed: "確定済み",
  completed: "完了",
  cancelled: "キャンセル",
};

export const interviewScheduleStatusLabels: Record<string, string> = {
  scheduling: "未確定",
  confirmed: "確定済み",
  completed: "完了",
  cancelled: "キャンセル",
};

export const interviewScheduleStatusColors: Record<string, BadgeVariant> = {
  scheduling: "outline",
  confirmed: "default",
  completed: "secondary",
  cancelled: "destructive",
};
