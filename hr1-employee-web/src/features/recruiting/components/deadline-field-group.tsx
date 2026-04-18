"use client";

import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { cn } from "@hr1/shared-ui/lib/utils";
import { DeadlineMode, deadlineModeLabels, DEADLINE_OFFSET_DAYS_MAX } from "@/lib/constants";
import type { DeadlineSettings } from "@/types/database";

export interface DeadlineFieldGroupProps {
  mode: DeadlineMode;
  /** 数値文字列、空 = 未設定 */
  offsetDays: string;
  /** YYYY-MM-DD、空 = 未設定 */
  fixedDate: string;
  onChange: (patch: Partial<{ mode: DeadlineMode; offsetDays: string; fixedDate: string }>) => void;
  /**
   * fixed_date 選択肢を表示するか。
   * - テンプレート編集: false (テンプレは再利用されるため絶対日付は避ける)
   * - 求人 / 個別応募: true
   */
  allowFixed?: boolean;
  /** ラジオの name / aria 用 */
  idPrefix?: string;
  className?: string;
  disabled?: boolean;
}

const OFFSET_MODES: DeadlineMode[] = [
  DeadlineMode.DaysFromApplication,
  DeadlineMode.DaysFromStepStart,
  DeadlineMode.DaysFromPreviousCompletion,
];

export function DeadlineFieldGroup({
  mode,
  offsetDays,
  fixedDate,
  onChange,
  allowFixed = false,
  idPrefix = "deadline",
  className,
  disabled = false,
}: DeadlineFieldGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">期限設定</Label>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name={`${idPrefix}-mode`}
            checked={mode === DeadlineMode.None}
            disabled={disabled}
            onChange={() => onChange({ mode: DeadlineMode.None })}
            className="h-4 w-4"
          />
          <span>{deadlineModeLabels[DeadlineMode.None]}</span>
        </label>

        {OFFSET_MODES.map((m) => (
          <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-mode`}
              checked={mode === m}
              disabled={disabled}
              onChange={() => onChange({ mode: m })}
              className="h-4 w-4"
            />
            <span className="w-40 shrink-0">{deadlineModeLabels[m]}</span>
            <Input
              type="number"
              min={1}
              max={DEADLINE_OFFSET_DAYS_MAX}
              step={1}
              value={mode === m ? offsetDays : ""}
              disabled={disabled || mode !== m}
              onChange={(e) => onChange({ offsetDays: e.target.value })}
              placeholder="日数"
              className="w-20 h-8"
              aria-label={`${deadlineModeLabels[m]}の日数`}
            />
            <span className="text-muted-foreground">日後</span>
          </label>
        ))}

        {allowFixed && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={`${idPrefix}-mode`}
              checked={mode === DeadlineMode.FixedDate}
              disabled={disabled}
              onChange={() => onChange({ mode: DeadlineMode.FixedDate })}
              className="h-4 w-4"
            />
            <span className="w-40 shrink-0">{deadlineModeLabels[DeadlineMode.FixedDate]}</span>
            <Input
              type="date"
              value={mode === DeadlineMode.FixedDate ? fixedDate : ""}
              disabled={disabled || mode !== DeadlineMode.FixedDate}
              onChange={(e) => onChange({ fixedDate: e.target.value })}
              className="w-40 h-8"
              aria-label="固定期限日"
            />
          </label>
        )}
      </div>
    </div>
  );
}

/**
 * UI state (mode / offsetDays / fixedDate) → DB 送信形 (DeadlineSettings) への変換。
 * バリデーション失敗時は `{ ok: false, error }` を返す。
 */
export function toDeadlineSettings(
  mode: DeadlineMode,
  offsetDays: string,
  fixedDate: string
): { ok: true; value: DeadlineSettings } | { ok: false; error: string } {
  if (mode === DeadlineMode.None) {
    return {
      ok: true,
      value: {
        deadline_mode: "none",
        deadline_offset_days: null,
        fixed_deadline_date: null,
      },
    };
  }
  if (mode === DeadlineMode.FixedDate) {
    const trimmed = fixedDate.trim();
    if (!trimmed || !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return { ok: false, error: "固定日付を YYYY-MM-DD 形式で入力してください" };
    }
    return {
      ok: true,
      value: {
        deadline_mode: "fixed_date",
        deadline_offset_days: null,
        fixed_deadline_date: trimmed,
      },
    };
  }
  // offset 系 3 モード
  const raw = offsetDays.trim();
  if (raw === "") {
    return { ok: false, error: "日数を入力してください" };
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > DEADLINE_OFFSET_DAYS_MAX) {
    return {
      ok: false,
      error: `日数は 1 〜 ${DEADLINE_OFFSET_DAYS_MAX} の整数で入力してください`,
    };
  }
  return {
    ok: true,
    value: {
      deadline_mode: mode,
      deadline_offset_days: n,
      fixed_deadline_date: null,
    },
  };
}

/** DB 値 (DeadlineSettings) → UI state の初期値を組み立てる */
export function fromDeadlineSettings(settings: Partial<DeadlineSettings>): {
  mode: DeadlineMode;
  offsetDays: string;
  fixedDate: string;
} {
  const mode = (settings.deadline_mode ?? DeadlineMode.None) as DeadlineMode;
  return {
    mode,
    offsetDays: settings.deadline_offset_days != null ? String(settings.deadline_offset_days) : "",
    fixedDate: settings.fixed_deadline_date ?? "",
  };
}
