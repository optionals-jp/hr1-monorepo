/**
 * 日付範囲フィルタを扱う共通ユーティリティ。
 *
 * `<input type="date">` が返す `YYYY-MM-DD` のような **日付のみ文字列** は
 * ES 仕様で UTC 0時として解釈される一方、`T` が付いた文字列 (例: `T23:59:59`)
 * はタイムゾーン指定がない限りローカル時刻として解釈される。両者を混在させると
 * JST 環境で最大9時間の範囲ズレ (レコード漏れ) が発生する。
 *
 * HR1 は日本国内向けサービスのため、日付範囲は常に **JST (+09:00)** の
 * 日境界で解釈する。クライアント側フィルタ・Supabase クエリの両方でこの
 * モジュールのヘルパーを使用することで、ズレを一元的に防ぐ。
 */

const JST_OFFSET = "+09:00";

/**
 * `YYYY-MM-DD` を JST 当日開始時刻 (00:00:00.000) のエポックミリ秒に変換する。
 * 空文字列・undefined・null の場合は null を返す。
 */
export function startOfDayJstMs(dateOnly: string | null | undefined): number | null {
  if (!dateOnly) return null;
  return new Date(`${dateOnly}T00:00:00.000${JST_OFFSET}`).getTime();
}

/**
 * `YYYY-MM-DD` を JST 当日終了時刻 (23:59:59.999) のエポックミリ秒に変換する。
 * 空文字列・undefined・null の場合は null を返す。
 */
export function endOfDayJstMs(dateOnly: string | null | undefined): number | null {
  if (!dateOnly) return null;
  return new Date(`${dateOnly}T23:59:59.999${JST_OFFSET}`).getTime();
}

/**
 * `YYYY-MM-DD` を JST 当日開始時刻の ISO8601 文字列 (UTC) に変換する。
 * Supabase の `timestamptz` カラムとの `.gte()` 比較に使用する。
 */
export function startOfDayJstIso(dateOnly: string | null | undefined): string | null {
  const ms = startOfDayJstMs(dateOnly);
  return ms === null ? null : new Date(ms).toISOString();
}

/**
 * `YYYY-MM-DD` を JST 当日終了時刻の ISO8601 文字列 (UTC) に変換する。
 * Supabase の `timestamptz` カラムとの `.lte()` 比較に使用する。
 */
export function endOfDayJstIso(dateOnly: string | null | undefined): string | null {
  const ms = endOfDayJstMs(dateOnly);
  return ms === null ? null : new Date(ms).toISOString();
}

/**
 * `YYYY-MM-DD` 形式の開始・終了日から、JST 日境界で切り出した
 * エポックミリ秒の範囲を返す。値が空なら各側 null。
 */
export function jstDateRangeMs(
  from: string | null | undefined,
  to: string | null | undefined
): { fromMs: number | null; toMs: number | null } {
  return { fromMs: startOfDayJstMs(from), toMs: endOfDayJstMs(to) };
}

/**
 * `YYYY-MM-DD` 形式の開始・終了日から、JST 日境界で切り出した
 * ISO8601 文字列の範囲を返す。Supabase timestamptz との比較用。
 */
export function jstDateRangeIso(
  from: string | null | undefined,
  to: string | null | undefined
): { startIso: string | null; endIso: string | null } {
  return { startIso: startOfDayJstIso(from), endIso: endOfDayJstIso(to) };
}

/**
 * タイムスタンプ (`timestamptz` カラムから取得した文字列や Date) が、
 * JST 日境界で切り出した `[from, to]` の範囲内にあるか判定する。
 * from / to が空なら片側の判定はスキップされる。
 */
export function isWithinJstDateRange(
  value: string | Date | null | undefined,
  from: string | null | undefined,
  to: string | null | undefined
): boolean {
  if (value === null || value === undefined) return false;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(ms)) return false;
  const fromMs = startOfDayJstMs(from);
  const toMs = endOfDayJstMs(to);
  if (fromMs !== null && ms < fromMs) return false;
  if (toMs !== null && ms > toMs) return false;
  return true;
}
