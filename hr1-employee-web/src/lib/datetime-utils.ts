/**
 * 開始日時を基に 30 分後のdatetime-local文字列を返す
 */
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

/**
 * ISO8601 文字列を datetime-local 用の yyyy-MM-ddTHH:mm に変換する
 */
export function toLocalDatetime(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
