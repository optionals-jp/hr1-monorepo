import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  DeadlineFieldGroup,
  toDeadlineSettings,
  fromDeadlineSettings,
} from "./deadline-field-group";
import { DeadlineMode } from "@/lib/constants";

describe("DeadlineFieldGroup (UI)", () => {
  it("allowFixed=false のとき固定日付ラジオは表示されない", () => {
    render(
      <DeadlineFieldGroup
        mode={DeadlineMode.None}
        offsetDays=""
        fixedDate=""
        onChange={() => {}}
        allowFixed={false}
      />
    );
    expect(screen.queryByLabelText("固定期限日")).toBeNull();
  });

  it("allowFixed=true のとき固定日付入力が表示される", () => {
    render(
      <DeadlineFieldGroup
        mode={DeadlineMode.None}
        offsetDays=""
        fixedDate=""
        onChange={() => {}}
        allowFixed
      />
    );
    expect(screen.getByLabelText("固定期限日")).toBeInTheDocument();
  });

  it("モード以外の日数入力は disabled になる", () => {
    render(
      <DeadlineFieldGroup
        mode={DeadlineMode.DaysFromApplication}
        offsetDays="7"
        fixedDate=""
        onChange={() => {}}
      />
    );
    const activeInput = screen.getByLabelText("応募日からの日数") as HTMLInputElement;
    const otherInput = screen.getByLabelText("ステップ開始からの日数") as HTMLInputElement;
    expect(activeInput.disabled).toBe(false);
    expect(activeInput.value).toBe("7");
    expect(otherInput.disabled).toBe(true);
  });

  it("ラジオ選択で onChange({ mode }) が呼ばれる", () => {
    const patches: unknown[] = [];
    render(
      <DeadlineFieldGroup
        mode={DeadlineMode.None}
        offsetDays=""
        fixedDate=""
        onChange={(p) => patches.push(p)}
      />
    );
    const radio = screen
      .getAllByRole("radio")
      .find((r) => (r as HTMLInputElement).checked === false) as HTMLInputElement;
    fireEvent.click(radio);
    expect(patches.length).toBeGreaterThan(0);
    expect((patches[0] as { mode?: string }).mode).toBeDefined();
  });
});

describe("toDeadlineSettings", () => {
  it("none モードは全フィールドを null にする", () => {
    const r = toDeadlineSettings(DeadlineMode.None, "7", "2026-04-10");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        deadline_mode: "none",
        deadline_offset_days: null,
        fixed_deadline_date: null,
      });
    }
  });

  it("days_from_application で正の整数ならOK", () => {
    const r = toDeadlineSettings(DeadlineMode.DaysFromApplication, "14", "");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.deadline_mode).toBe("days_from_application");
      expect(r.value.deadline_offset_days).toBe(14);
      expect(r.value.fixed_deadline_date).toBeNull();
    }
  });

  it("offset モードで空文字はエラー", () => {
    const r = toDeadlineSettings(DeadlineMode.DaysFromStepStart, "", "");
    expect(r.ok).toBe(false);
  });

  it("offset モードで 0 はエラー", () => {
    const r = toDeadlineSettings(DeadlineMode.DaysFromStepStart, "0", "");
    expect(r.ok).toBe(false);
  });

  it("offset モードで 366 はエラー (上限超過)", () => {
    const r = toDeadlineSettings(DeadlineMode.DaysFromStepStart, "366", "");
    expect(r.ok).toBe(false);
  });

  it("offset モードで 365 は OK (上限)", () => {
    const r = toDeadlineSettings(DeadlineMode.DaysFromStepStart, "365", "");
    expect(r.ok).toBe(true);
  });

  it("offset モードで小数はエラー", () => {
    const r = toDeadlineSettings(DeadlineMode.DaysFromStepStart, "3.5", "");
    expect(r.ok).toBe(false);
  });

  it("fixed_date で YYYY-MM-DD ならOK", () => {
    const r = toDeadlineSettings(DeadlineMode.FixedDate, "", "2026-04-10");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        deadline_mode: "fixed_date",
        deadline_offset_days: null,
        fixed_deadline_date: "2026-04-10",
      });
    }
  });

  it("fixed_date で空文字はエラー", () => {
    const r = toDeadlineSettings(DeadlineMode.FixedDate, "", "");
    expect(r.ok).toBe(false);
  });

  it("fixed_date で不正な形式はエラー", () => {
    const r = toDeadlineSettings(DeadlineMode.FixedDate, "", "2026/04/10");
    expect(r.ok).toBe(false);
  });
});

describe("fromDeadlineSettings", () => {
  it("none のケース", () => {
    expect(
      fromDeadlineSettings({
        deadline_mode: "none",
        deadline_offset_days: null,
        fixed_deadline_date: null,
      })
    ).toEqual({ mode: "none", offsetDays: "", fixedDate: "" });
  });

  it("days_from_step_start のケース", () => {
    expect(
      fromDeadlineSettings({
        deadline_mode: "days_from_step_start",
        deadline_offset_days: 5,
        fixed_deadline_date: null,
      })
    ).toEqual({ mode: "days_from_step_start", offsetDays: "5", fixedDate: "" });
  });

  it("fixed_date のケース", () => {
    expect(
      fromDeadlineSettings({
        deadline_mode: "fixed_date",
        deadline_offset_days: null,
        fixed_deadline_date: "2026-04-10",
      })
    ).toEqual({ mode: "fixed_date", offsetDays: "", fixedDate: "2026-04-10" });
  });

  it("未定義は none にフォールバック", () => {
    expect(fromDeadlineSettings({})).toEqual({
      mode: "none",
      offsetDays: "",
      fixedDate: "",
    });
  });
});
