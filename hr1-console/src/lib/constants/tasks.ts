import { BadgeVariant } from "./types";

export const taskStatusLabels: Record<string, string> = {
  open: "未着手",
  in_progress: "進行中",
  completed: "完了",
  cancelled: "キャンセル",
};

export const taskStatusColors: Record<string, BadgeVariant> = {
  open: "outline",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export const taskPriorityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

export const taskPriorityColors: Record<string, BadgeVariant> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

export const taskScopeLabels: Record<string, string> = {
  personal: "個人",
  organization: "組織全体",
  project: "プロジェクト",
  team: "チーム",
};

export const taskAssigneeStatusLabels: Record<string, string> = {
  pending: "未着手",
  in_progress: "対応中",
  completed: "完了",
};

export const taskAssigneeStatusColors: Record<string, BadgeVariant> = {
  pending: "outline",
  in_progress: "default",
  completed: "secondary",
};

export const taskSourceLabels: Record<string, string> = {
  employee: "従業員",
  console: "管理者",
};
