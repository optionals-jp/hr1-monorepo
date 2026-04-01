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

// --- 見積書ステータス ---
export const quoteStatusLabels: Record<string, string> = {
  draft: "下書き",
  sent: "送付済",
  accepted: "承認済",
  rejected: "却下",
  expired: "期限切れ",
};

export const quoteStatusColors: Record<string, BadgeVariant> = {
  draft: "default",
  sent: "secondary",
  accepted: "secondary",
  rejected: "destructive",
  expired: "destructive",
};

// --- 活動種別 ---
export const activityTypeLabels: Record<string, string> = {
  appointment: "アポイント",
  memo: "メモ",
  call: "電話",
  email: "メール",
  visit: "訪問",
};

// --- 自動化トリガー ---
export const automationTriggerLabels: Record<string, string> = {
  deal_stage_changed: "商談ステージ変更時",
  deal_created: "商談作成時",
  deal_won: "商談受注時",
  deal_lost: "商談失注時",
  lead_created: "リード作成時",
  lead_status_changed: "リードステータス変更時",
  lead_converted: "リードコンバート時",
  contact_created: "連絡先作成時",
  company_created: "企業作成時",
  activity_created: "活動記録作成時",
};

export const automationActionLabels: Record<string, string> = {
  create_todo: "タスクを作成",
  create_activity: "活動を記録",
  send_notification: "通知を送信",
  update_field: "フィールドを更新",
  send_webhook: "Webhookを送信",
};

// --- メールテンプレートカテゴリ ---
export const emailTemplateCategoryLabels: Record<string, string> = {
  general: "一般",
  follow_up: "フォローアップ",
  proposal: "提案",
  thank_you: "お礼",
  introduction: "紹介",
  reminder: "リマインダー",
};

export const automationConditionOperatorLabels: Record<string, string> = {
  eq: "等しい",
  neq: "等しくない",
  gt: "より大きい",
  lt: "より小さい",
  gte: "以上",
  lte: "以下",
  contains: "を含む",
  in: "いずれかに一致",
};
