import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicationStepList } from "./application-step-list";
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
