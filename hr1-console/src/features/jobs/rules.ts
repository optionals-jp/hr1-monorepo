import type { Application, ApplicationStep } from "@/types/database";
import {
  applicationStatusLabels as appStatusLabels,
  stepStatusLabels,
  StepStatus,
} from "@/lib/constants";
import type { HistoryEvent } from "./types";

/**
 * アプリケーション一覧からタイムラインイベントを構築する
 */
export function buildHistoryEvents(applications: Application[]): HistoryEvent[] {
  const events: HistoryEvent[] = [];

  for (const app of applications ?? []) {
    const profile = app.profiles as unknown as {
      display_name: string | null;
      email: string;
    } | null;
    const name = profile?.display_name ?? "-";
    const email = profile?.email ?? "-";

    events.push({
      id: `app-${app.id}`,
      applicantName: name,
      applicantEmail: email,
      eventType: "応募",
      label: appStatusLabels[app.status] ?? app.status,
      status: app.status,
      date: app.applied_at,
    });

    for (const step of (app.application_steps ?? []) as ApplicationStep[]) {
      if (step.status !== StepStatus.Pending) {
        events.push({
          id: `step-${step.id}`,
          applicantName: name,
          applicantEmail: email,
          eventType: step.label,
          label: stepStatusLabels[step.status] ?? step.status,
          status: step.status,
          date: step.completed_at ?? app.applied_at,
        });
      }
    }
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
}

/**
 * ステップ追加時の related_id を決定する
 */
export function resolveRelatedId(
  stepType: string,
  formStepTypes: readonly string[],
  formId: string,
  interviewStepType: string,
  interviewId: string
): string | null {
  if (formStepTypes.includes(stepType) && formId) return formId;
  if (stepType === interviewStepType && interviewId) return interviewId;
  return null;
}
