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
