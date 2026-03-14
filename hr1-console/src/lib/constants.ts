// ---------------------------------------------------------------------------
// ステータスラベル・カラー定数
// ---------------------------------------------------------------------------

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

// --- 応募ステータス ---
export const applicationStatusLabels: Record<string, string> = {
  active: "選考中",
  offered: "内定",
  rejected: "不採用",
  withdrawn: "辞退",
};

export const applicationStatusColors: Record<string, BadgeVariant> = {
  active: "default",
  offered: "secondary",
  rejected: "destructive",
  withdrawn: "outline",
};

// --- 選考ステップステータス ---
export const stepStatusLabels: Record<string, string> = {
  pending: "未開始",
  in_progress: "進行中",
  completed: "完了",
  skipped: "スキップ",
};

// --- ステップ種別 ---
export const stepTypeLabels: Record<string, string> = {
  screening: "書類選考",
  form: "アンケート/フォーム",
  interview: "面接",
  external_test: "外部テスト",
  offer: "内定",
};

/** 選考ステップ追加・編集時の選択肢（内定は自動付与のため除外） */
export const selectableStepTypes: Record<string, string> = {
  screening: "書類選考",
  form: "アンケート/フォーム",
  interview: "面接",
  external_test: "外部テスト",
};

// --- 求人ステータス ---
export const jobStatusLabels: Record<string, string> = {
  open: "公開中",
  draft: "下書き",
  closed: "終了",
  archived: "アーカイブ",
};

export const jobStatusColors: Record<string, BadgeVariant> = {
  open: "default",
  closed: "secondary",
  draft: "outline",
  archived: "secondary",
};

// --- 面接ステータス ---
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

// --- フォームフィールド種別 ---
export const fieldTypeLabels: Record<string, string> = {
  shortText: "短文テキスト",
  longText: "長文テキスト",
  radio: "ラジオボタン",
  checkbox: "チェックボックス",
  dropdown: "ドロップダウン",
  date: "日付",
  fileUpload: "ファイルアップロード",
};

// --- 変更履歴種別 ---
export const jobChangeTypeLabels: Record<string, string> = {
  created: "作成",
  status_updated: "ステータス変更",
  title_updated: "タイトル変更",
  description_updated: "説明変更",
  info_updated: "求人情報変更",
  step_added: "ステップ追加",
  step_deleted: "ステップ削除",
};

export const formChangeTypeLabels: Record<string, string> = {
  created: "作成",
  title_updated: "タイトル変更",
  description_updated: "説明変更",
  field_added: "フィールド追加",
  field_updated: "フィールド変更",
  field_deleted: "フィールド削除",
};

export const scheduleChangeTypeLabels: Record<string, string> = {
  created: "作成",
  title_updated: "タイトル変更",
  location_updated: "場所変更",
  notes_updated: "備考変更",
  status_updated: "ステータス変更",
  slot_added: "候補日時追加",
  slot_updated: "候補日時変更",
  slot_deleted: "候補日時削除",
};
