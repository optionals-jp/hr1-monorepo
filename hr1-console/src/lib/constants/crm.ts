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

// --- ステージ別デフォルト確度 ---
export const dealStageProbability: Record<string, number> = {
  initial: 10,
  proposal: 30,
  negotiation: 60,
  closing: 90,
};

// --- カスタムフィールド型 ---
export const crmFieldTypeLabels: Record<string, string> = {
  text: "テキスト",
  number: "数値",
  currency: "金額",
  date: "日付",
  dropdown: "ドロップダウン",
  multi_select: "複数選択",
  checkbox: "チェックボックス",
  url: "URL",
  email: "メール",
  phone: "電話番号",
};

export const crmEntityTypeLabels: Record<string, string> = {
  company: "企業",
  contact: "連絡先",
  deal: "商談",
};

// フィールド型が選択肢を必要とするかどうか
export const fieldTypeNeedsOptions = new Set(["dropdown", "multi_select"]);

// --- 活動種別 ---
export const activityTypeLabels: Record<string, string> = {
  appointment: "アポイント",
  memo: "メモ",
  call: "電話",
  email: "メール",
  visit: "訪問",
};
