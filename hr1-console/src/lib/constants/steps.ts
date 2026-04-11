/**
 * 選考ステップのステータス
 *
 * 採用機能本体は hr1-employee-web に移管されたが、
 * hr1-console のダッシュボードではパイプライン集計のために
 * `application_steps.status` を参照する必要があるため、
 * ステータス値の定義をここに残している。
 */
export const StepStatus = {
  Pending: "pending",
  InProgress: "in_progress",
  Completed: "completed",
  Skipped: "skipped",
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];
