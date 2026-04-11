/**
 * 評価機能の共通型定義。
 *
 * hr1-console / hr1-employee-web の両方が同じ DB スキーマを扱うため、
 * 評価ダイアログで使う型を shared-ui に集約する。各アプリの
 * `types/database.ts` の型と構造的に互換。
 */

export type EvaluationTarget = "applicant" | "employee" | "both";
export type EvaluationTypeMode = "single" | "multi_rater";
export type EvaluationScoreType = "five_star" | "ten_point" | "text" | "select";

export interface EvaluationTemplateRef {
  id: string;
  title: string;
  description: string | null;
  target: EvaluationTarget;
  evaluation_type: EvaluationTypeMode;
}

export interface EvaluationCriterionRef {
  id: string;
  label: string;
  description: string | null;
  score_type: EvaluationScoreType | string;
  options: string[] | null;
}

export interface EvaluationAnchorRef {
  criterion_id: string;
  score_value: number;
  description: string;
}

/** 評価入力フォームの 1 項目分の下書きスコア */
export interface ScoreDraft {
  criterion_id: string;
  score: number | null;
  value: string;
  comment: string;
}
