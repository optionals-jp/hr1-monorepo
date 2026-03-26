import type { BadgeVariant } from "./types";

// --- 商談ステータス ---
export const dealStatusLabels: Record<string, string> = {
  open: "商談中",
  won: "受注",
  lost: "失注",
};

export const dealStatusColors: Record<string, BadgeVariant> = {
  open: "default",
  won: "secondary",
  lost: "destructive",
};

// --- 商談ステージ ---
export const dealStageLabels: Record<string, string> = {
  initial: "初回接触",
  proposal: "提案",
  negotiation: "交渉",
  closing: "クロージング",
};

// --- 活動種別 ---
export const activityTypeLabels: Record<string, string> = {
  appointment: "アポイント",
  memo: "メモ",
  call: "電話",
  email: "メール",
  visit: "訪問",
};
