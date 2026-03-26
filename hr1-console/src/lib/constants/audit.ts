export const auditActionLabels: Record<string, string> = {
  create: "作成",
  update: "変更",
  delete: "削除",
};

export const detailActionLabels: Record<string, string> = {
  created: "作成",
  status_updated: "ステータス変更",
  title_updated: "タイトル変更",
  description_updated: "説明変更",
  info_updated: "求人情報変更",
  step_added: "ステップ追加",
  step_deleted: "ステップ削除",
  target_updated: "対象変更",
  field_added: "フィールド追加",
  field_updated: "フィールド変更",
  field_deleted: "フィールド削除",
  slot_added: "候補日時追加",
  slot_updated: "候補日時変更",
  slot_deleted: "候補日時削除",
  location_updated: "場所変更",
  notes_updated: "備考変更",
};

export function getAuditActionLabel(log: {
  action: string;
  metadata?: Record<string, unknown> | null;
}): string {
  const detailAction = (log.metadata as Record<string, string> | null)?.detail_action;
  if (detailAction && detailActionLabels[detailAction]) {
    return detailActionLabels[detailAction];
  }
  return auditActionLabels[log.action] ?? log.action;
}

export const jobChangeTypeLabels: Record<string, string> = {
  create: "作成",
  update: "変更",
  delete: "削除",
  created: "作成",
  status_updated: "ステータス変更",
  title_updated: "タイトル変更",
  description_updated: "説明変更",
  info_updated: "求人情報変更",
  step_added: "ステップ追加",
  step_deleted: "ステップ削除",
};

export const formChangeTypeLabels: Record<string, string> = {
  create: "作成",
  update: "変更",
  delete: "削除",
  created: "作成",
  title_updated: "タイトル変更",
  target_updated: "対象変更",
  description_updated: "説明変更",
  field_added: "フィールド追加",
  field_updated: "フィールド変更",
  field_deleted: "フィールド削除",
};

export const scheduleChangeTypeLabels: Record<string, string> = {
  create: "作成",
  update: "変更",
  delete: "削除",
  created: "作成",
  title_updated: "タイトル変更",
  location_updated: "場所変更",
  notes_updated: "備考変更",
  status_updated: "ステータス変更",
  slot_added: "候補日時追加",
  slot_updated: "候補日時変更",
  slot_deleted: "候補日時削除",
};
