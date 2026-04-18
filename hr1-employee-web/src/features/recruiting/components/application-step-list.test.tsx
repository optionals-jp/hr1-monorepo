import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicationStepList, computeDeadlineState } from "./application-step-list";
import type { ApplicationStep } from "@/types/database";

function makeStep(overrides: Partial<ApplicationStep> = {}): ApplicationStep {
  return {
    id: "step-1",
    application_id: "app-1",
    step_type: "screening",
    step_order: 1,
    label: "書類選考",
    status: "pending",
    form_id: null,
    interview_id: null,
    template_id: null,
    screening_type: "resume",
    requires_review: false,
    document_url: null,
    started_at: null,
    completed_at: null,
    applicant_action_at: null,
    source: "flow",
    created_by_user_id: null,
    is_optional: false,
    description: null,
    default_duration_days: null,
    deadline_at: null,
    ...overrides,
  };
}

const noop = () => {};
const allow = () => true;

describe("ApplicationStepList", () => {
  it("空配列の場合はプレースホルダを表示する", () => {
    render(
      <ApplicationStepList
        steps={[]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
      />
    );
    expect(screen.getByText("選考ステップがありません")).toBeInTheDocument();
  });

  it("ad_hoc ステップには「追加」バッジを表示する", () => {
    render(
      <ApplicationStepList
        steps={[makeStep({ source: "ad_hoc", status: "pending" })]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
      />
    );
    expect(screen.getByText("追加")).toBeInTheDocument();
  });

  it("is_optional のステップには「任意」バッジを表示する", () => {
    render(
      <ApplicationStepList
        steps={[makeStep({ is_optional: true })]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
      />
    );
    expect(screen.getByText("任意")).toBeInTheDocument();
  });

  it("完了ステップには「完了」バッジと完了日を表示する", () => {
    render(
      <ApplicationStepList
        steps={[
          makeStep({
            status: "completed",
            completed_at: "2026-04-18T09:00:00Z",
          }),
        ]}
        canActOnStep={() => false}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
      />
    );
    // 完了バッジ（Badge variant=secondary）
    expect(screen.getByText("完了", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/完了: 2026\/04\/18/)).toBeInTheDocument();
  });

  it("進行中ステップには「進行中」バッジと開始日・アクションボタンを表示する", () => {
    render(
      <ApplicationStepList
        steps={[
          makeStep({
            status: "in_progress",
            started_at: "2026-04-18T09:00:00Z",
          }),
        ]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
      />
    );
    expect(screen.getByText("進行中")).toBeInTheDocument();
    expect(screen.getByText(/開始: 2026\/04\/18/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "完了" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "スキップ" })).toBeInTheDocument();
  });

  it("skipped ステップには「スキップ」表示と「元に戻す」ボタンを表示する", () => {
    const unskip = vi.fn();
    render(
      <ApplicationStepList
        steps={[makeStep({ status: "skipped" })]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={unskip}
      />
    );
    expect(screen.getByText("スキップ", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "元に戻す" })).toBeInTheDocument();
  });

  it("ad_hoc + pending ステップで onEditAdHoc/onDeleteAdHoc が渡されたとき編集・削除ボタンを表示する", () => {
    render(
      <ApplicationStepList
        steps={[makeStep({ source: "ad_hoc", status: "pending" })]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
        onEditAdHoc={noop}
        onDeleteAdHoc={noop}
      />
    );
    expect(screen.getByRole("button", { name: "ステップを編集" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ステップを削除" })).toBeInTheDocument();
  });

  it("Offer ステップで in_progress のときは「内定」「不合格」ボタンを表示する", () => {
    render(
      <ApplicationStepList
        steps={[
          makeStep({
            step_type: "offer",
            status: "in_progress",
            label: "内定",
          }),
        ]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
        onOffer={noop}
        onReject={noop}
      />
    );
    expect(screen.getByRole("button", { name: "内定" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "不合格" })).toBeInTheDocument();
  });
});

describe("computeDeadlineState", () => {
  const now = new Date("2026-04-18T12:00:00+09:00");

  it("deadline_at が null の場合は none を返す", () => {
    const result = computeDeadlineState(makeStep({ deadline_at: null }), now);
    expect(result.state).toBe("none");
    expect(result.deadline).toBeNull();
  });

  it("InProgress で期限が過去なら overdue を返す", () => {
    const result = computeDeadlineState(
      makeStep({ status: "in_progress", deadline_at: "2026-04-17T14:59:59Z" }),
      now
    );
    expect(result.state).toBe("overdue");
  });

  it("期限が 3 日以内なら soon を返す", () => {
    const result = computeDeadlineState(
      makeStep({ status: "in_progress", deadline_at: "2026-04-20T14:59:59Z" }),
      now
    );
    expect(result.state).toBe("soon");
  });

  it("期限が 3 日超なら normal を返す", () => {
    const result = computeDeadlineState(
      makeStep({ status: "in_progress", deadline_at: "2026-04-30T14:59:59Z" }),
      now
    );
    expect(result.state).toBe("normal");
  });

  it("Completed のときは overdue にならない (normal)", () => {
    const result = computeDeadlineState(
      makeStep({ status: "completed", deadline_at: "2026-04-17T14:59:59Z" }),
      now
    );
    expect(result.state).toBe("normal");
  });

  it("Skipped のときは normal を返す", () => {
    const result = computeDeadlineState(
      makeStep({ status: "skipped", deadline_at: "2026-04-17T14:59:59Z" }),
      now
    );
    expect(result.state).toBe("normal");
  });
});

describe("ApplicationStepList deadline rendering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00+09:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("期限超過の InProgress ステップには「期限超過」バッジを表示する", () => {
    render(
      <ApplicationStepList
        steps={[
          makeStep({
            status: "in_progress",
            started_at: "2026-04-10T00:00:00Z",
            deadline_at: "2026-04-17T14:59:59Z",
          }),
        ]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
      />
    );
    expect(screen.getByText("期限超過")).toBeInTheDocument();
  });

  it("期限間近 (3日以内) のステップには「期限間近」バッジを表示する", () => {
    render(
      <ApplicationStepList
        steps={[
          makeStep({
            status: "in_progress",
            started_at: "2026-04-18T00:00:00Z",
            deadline_at: "2026-04-20T14:59:59Z",
          }),
        ]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
      />
    );
    expect(screen.getByText("期限間近")).toBeInTheDocument();
  });

  it("deadline_at があれば「期限: YYYY/MM/DD」を表示する", () => {
    render(
      <ApplicationStepList
        steps={[
          makeStep({
            status: "in_progress",
            started_at: "2026-04-18T00:00:00Z",
            deadline_at: "2026-04-25T14:59:59Z",
          }),
        ]}
        canActOnStep={allow}
        advanceStep={noop}
        skipStep={noop}
        unskipStep={noop}
      />
    );
    expect(screen.getByText(/期限: 2026\/04\/25/)).toBeInTheDocument();
  });
});
