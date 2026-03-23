import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 開始日時から30分後の終了日時文字列を生成する */
export function autoFillEndAt(startValue: string): string {
  const start = new Date(startValue);
  start.setMinutes(start.getMinutes() + 30);
  const y = start.getFullYear();
  const mo = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  const h = String(start.getHours()).padStart(2, "0");
  const mi = String(start.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

// ---------------------------------------------------------------------------
// 日付・時刻フォーマットユーティリティ
// ---------------------------------------------------------------------------

/** Date → yyyy-MM-dd（ローカルタイムゾーン） */
export function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO 文字列 → HH:mm */
export function formatTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 分数 → H:mm 表示（0以下は "-"） */
export function formatMinutesHM(m: number): string {
  if (m <= 0) return "-";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, "0")}`;
}

/** 年月 → yyyy-MM */
export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 曜日ラベル（日〜土） */
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;
export function weekdayLabel(d: Date): string {
  return WEEKDAY_LABELS[d.getDay()];
}

/** 今日の日付を yyyy-MM-dd で返す */
export function todayString(): string {
  return formatDateLocal(new Date());
}

/** CSV エクスポート用ファイル名タイムスタンプ */
export function fileTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}
