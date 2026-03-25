// ---------------------------------------------------------------------------
// HR1 Admin ステータスラベル・カラー定数
// ---------------------------------------------------------------------------

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

// --- 契約ステータス ---
export const contractStatusLabels: Record<string, string> = {
  active: "契約中",
  trial: "トライアル",
  suspended: "停止中",
  cancelled: "解約済み",
};

export const contractStatusColors: Record<string, BadgeVariant> = {
  active: "default",
  trial: "secondary",
  suspended: "outline",
  cancelled: "destructive",
};

// --- 契約変更種別 ---
export const contractChangeTypeLabels: Record<string, string> = {
  created: "契約作成",
  plan_changed: "プラン変更",
  employees_changed: "社員数変更",
  suspended: "停止",
  cancelled: "解約",
  renewed: "更新",
  updated: "情報更新",
};
