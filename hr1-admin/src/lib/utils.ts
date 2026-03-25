import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Date → yyyy-MM-dd（ローカルタイムゾーン） */
export function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 今日の日付を yyyy-MM-dd で返す */
export function todayString(): string {
  return formatDateLocal(new Date());
}

/** 金額を3桁カンマ区切りで表示 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("ja-JP");
}
