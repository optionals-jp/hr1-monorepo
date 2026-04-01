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

// --- リード ---
export const leadSourceLabels: Record<string, string> = {
  web: "Web",
  referral: "紹介",
  event: "イベント",
  cold_call: "コールドコール",
  other: "その他",
};

export const leadStatusLabels: Record<string, string> = {
  new: "新規",
  contacted: "連絡済",
  qualified: "有望",
  unqualified: "見込み薄",
  converted: "コンバート済",
};

export const leadStatusColors: Record<string, BadgeVariant> = {
  new: "default",
  contacted: "secondary",
  qualified: "secondary",
  unqualified: "destructive",
  converted: "secondary",
};

// --- 商談連絡先ロール ---
export const dealContactRoleLabels: Record<string, string> = {
  decision_maker: "意思決定者",
  influencer: "影響者",
  champion: "推進者",
  end_user: "エンドユーザー",
  evaluator: "評価者",
  stakeholder: "関係者",
};

// --- 活動種別 ---
export const activityTypeLabels: Record<string, string> = {
  appointment: "アポイント",
  memo: "メモ",
  call: "電話",
  email: "メール",
  visit: "訪問",
};
