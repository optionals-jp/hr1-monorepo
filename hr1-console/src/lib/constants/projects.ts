import { BadgeVariant } from "./types";

export const projectStatusLabels: Record<string, string> = {
  active: "進行中",
  completed: "完了",
  archived: "アーカイブ",
};

export const projectStatusColors: Record<string, BadgeVariant> = {
  active: "default",
  completed: "secondary",
  archived: "outline",
};

export const teamMemberRoleLabels: Record<string, string> = {
  leader: "リーダー",
  member: "メンバー",
};
