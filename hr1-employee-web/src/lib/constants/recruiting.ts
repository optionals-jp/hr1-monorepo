type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/* -------------------------------------------------------- */
/*  求人ステータス                                           */
/* -------------------------------------------------------- */

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

/* -------------------------------------------------------- */
/*  応募ステータス                                           */
/* -------------------------------------------------------- */

export const ApplicationStatus = {
  Active: "active",
  Offered: "offered",
  OfferAccepted: "offer_accepted",
  OfferDeclined: "offer_declined",
  Rejected: "rejected",
  Withdrawn: "withdrawn",
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const applicationStatusLabels: Record<string, string> = {
  [ApplicationStatus.Active]: "選考中",
  [ApplicationStatus.Offered]: "内定",
  [ApplicationStatus.OfferAccepted]: "内定承諾",
  [ApplicationStatus.OfferDeclined]: "内定辞退",
  [ApplicationStatus.Rejected]: "不採用",
  [ApplicationStatus.Withdrawn]: "辞退",
};

export const applicationStatusColors: Record<string, BadgeVariant> = {
  [ApplicationStatus.Active]: "default",
  [ApplicationStatus.Offered]: "secondary",
  [ApplicationStatus.OfferAccepted]: "default",
  [ApplicationStatus.OfferDeclined]: "destructive",
  [ApplicationStatus.Rejected]: "destructive",
  [ApplicationStatus.Withdrawn]: "outline",
};

/* -------------------------------------------------------- */
/*  選考ステップ                                             */
/* -------------------------------------------------------- */

export const StepStatus = {
  Pending: "pending",
  InProgress: "in_progress",
  Completed: "completed",
  Skipped: "skipped",
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export const stepStatusLabels: Record<string, string> = {
  [StepStatus.Pending]: "未開始",
  [StepStatus.InProgress]: "進行中",
  [StepStatus.Completed]: "完了",
  [StepStatus.Skipped]: "スキップ",
};

export const StepType = {
  Screening: "screening",
  Form: "form",
  Interview: "interview",
  ExternalTest: "external_test",
  Offer: "offer",
} as const;
export type StepType = (typeof StepType)[keyof typeof StepType];

export const stepTypeLabels: Record<string, string> = {
  [StepType.Screening]: "書類選考",
  [StepType.Form]: "アンケート/フォーム",
  [StepType.Interview]: "面接",
  [StepType.ExternalTest]: "外部テスト",
  [StepType.Offer]: "内定",
};

export const selectableStepTypes: Record<string, string> = {
  [StepType.Screening]: "書類選考",
  [StepType.Form]: "アンケート/フォーム",
  [StepType.Interview]: "面接",
  [StepType.ExternalTest]: "外部テスト",
};

export const FORM_STEP_TYPES: StepType[] = [StepType.Screening, StepType.Form];

export const RESOURCE_STEP_TYPES = [StepType.Form, StepType.Interview] as const;

/* -------------------------------------------------------- */
/*  面接                                                     */
/* -------------------------------------------------------- */

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

/* -------------------------------------------------------- */
/*  フォーム                                                 */
/* -------------------------------------------------------- */

export const formTargetLabels: Record<string, string> = {
  applicant: "候補者向け",
  employee: "社内向け",
  both: "両方",
};

export const fieldTypeLabels: Record<string, string> = {
  shortText: "短文テキスト",
  longText: "長文テキスト",
  radio: "ラジオボタン",
  checkbox: "チェックボックス",
  dropdown: "ドロップダウン",
  date: "日付",
  fileUpload: "ファイルアップロード",
};
