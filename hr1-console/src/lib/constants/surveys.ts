import { BadgeVariant } from "./types";

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

export const surveyTargetLabels: Record<string, string> = {
  applicant: "応募者向け",
  employee: "社員向け",
  both: "両方",
};

export const surveyQuestionTypeLabels: Record<string, string> = {
  rating: "5段階評価",
  text: "自由記述",
  single_choice: "単一選択",
  multiple_choice: "複数選択",
};
