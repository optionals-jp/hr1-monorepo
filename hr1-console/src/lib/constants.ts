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

// --- 評価スコアタイプ ---
export const scoreTypeLabels: Record<string, string> = {
  five_star: "5段階評価",
  ten_point: "10点評価",
  text: "テキスト",
  select: "選択式",
};

// --- 評価ステータス ---
export const evaluationStatusLabels: Record<string, string> = {
  draft: "下書き",
  submitted: "提出済み",
};

export const evaluationStatusColors: Record<string, BadgeVariant> = {
  draft: "outline",
  submitted: "default",
};

// --- 評価タイプ ---
export const evaluationTypeLabels: Record<string, string> = {
  single: "単独評価",
  multi_rater: "多面評価 (360度)",
};

// --- 匿名設定 ---
export const anonymityModeLabels: Record<string, string> = {
  none: "なし（全員実名）",
  peer_only: "同僚・部下のみ匿名",
  full: "完全匿名",
};

// --- 評価者タイプ ---
export const raterTypeLabels: Record<string, string> = {
  supervisor: "上司",
  peer: "同僚",
  subordinate: "部下",
  self: "自己",
  external: "外部",
};

// --- 評価サイクルステータス ---
export const cycleStatusLabels: Record<string, string> = {
  draft: "準備中",
  active: "実施中",
  closed: "締切済み",
  calibrating: "調整中",
  finalized: "確定",
};

export const cycleStatusColors: Record<string, BadgeVariant> = {
  draft: "outline",
  active: "default",
  closed: "secondary",
  calibrating: "outline",
  finalized: "secondary",
};

// --- アサインメントステータス ---
export const assignmentStatusLabels: Record<string, string> = {
  pending: "未着手",
  in_progress: "進行中",
  submitted: "提出済み",
  skipped: "スキップ",
};

// --- 性別 ---
export const genderLabels: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
};

// --- フォーム対象 ---
export const formTargetLabels: Record<string, string> = {
  applicant: "応募者向け",
  employee: "社内向け",
  both: "両方",
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
  target_updated: "対象変更",
  description_updated: "説明変更",
  field_added: "フィールド追加",
  field_updated: "フィールド変更",
  field_deleted: "フィールド削除",
};

// --- プロジェクトステータス ---
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

// --- チームメンバー役割 ---
export const teamMemberRoleLabels: Record<string, string> = {
  leader: "リーダー",
  member: "メンバー",
};

// --- 勤怠ステータス ---
export const attendanceStatusLabels: Record<string, string> = {
  present: "出勤",
  absent: "欠勤",
  late: "遅刻",
  early_leave: "早退",
  paid_leave: "有休",
  half_day_am: "午前半休",
  half_day_pm: "午後半休",
  holiday: "休日",
  sick_leave: "病欠",
  special_leave: "特別休暇",
};

export const attendanceStatusColors: Record<string, BadgeVariant> = {
  present: "default",
  absent: "destructive",
  late: "outline",
  early_leave: "outline",
  paid_leave: "secondary",
  half_day_am: "secondary",
  half_day_pm: "secondary",
  holiday: "secondary",
  sick_leave: "destructive",
  special_leave: "secondary",
};

// --- 打刻種別 ---
export const punchTypeLabels: Record<string, string> = {
  clock_in: "出勤",
  clock_out: "退勤",
  break_start: "休憩開始",
  break_end: "休憩終了",
};

// --- 修正依頼ステータス ---
export const correctionStatusLabels: Record<string, string> = {
  pending: "承認待ち",
  approved: "承認済み",
  rejected: "却下",
};

export const correctionStatusColors: Record<string, BadgeVariant> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
};

// --- タスクステータス ---
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

// --- タスク優先度 ---
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

// --- タスクスコープ ---
export const taskScopeLabels: Record<string, string> = {
  personal: "個人",
  organization: "組織全体",
  project: "プロジェクト",
  team: "チーム",
};

// --- タスク担当者ステータス ---
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

// --- タスクソース ---
export const taskSourceLabels: Record<string, string> = {
  employee: "従業員",
  console: "管理者",
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

// --- パルスサーベイステータス ---
export const surveyStatusLabels: Record<string, string> = {
  draft: "下書き",
  active: "実施中",
  closed: "終了",
};

export const surveyStatusColors: Record<string, BadgeVariant> = {
  draft: "outline",
  active: "default",
  closed: "secondary",
};

// --- パルスサーベイ対象 ---
export const surveyTargetLabels: Record<string, string> = {
  applicant: "応募者向け",
  employee: "社員向け",
  both: "両方",
};

// --- パルスサーベイ質問タイプ ---
export const surveyQuestionTypeLabels: Record<string, string> = {
  rating: "5段階評価",
  text: "自由記述",
  single_choice: "単一選択",
  multiple_choice: "複数選択",
};

// --- シフトスケジュールステータス ---
export const shiftScheduleStatusLabels: Record<string, string> = {
  draft: "下書き",
  published: "公開済み",
};

export const shiftScheduleStatusColors: Record<string, BadgeVariant> = {
  draft: "outline",
  published: "default",
};

// --- FAQ カテゴリ ---
export const faqCategoryLabels: Record<string, string> = {
  general: "一般",
  recruitment: "採用",
  benefits: "福利厚生",
  work_style: "働き方",
  culture: "社風・文化",
  other: "その他",
};

// --- FAQ 対象 ---
export const faqTargetLabels: Record<string, string> = {
  applicant: "応募者向け",
  employee: "社内向け",
  both: "両方",
};
