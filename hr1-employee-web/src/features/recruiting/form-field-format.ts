import { format } from "date-fns";

/**
 * form_responses.value (jsonb) を form_fields.type に応じて表示用文字列に整形する。
 *
 * - date       : ISO 文字列 → `yyyy/MM/dd`
 * - checkbox   : 配列 → カンマ区切り
 * - その他     : 文字列化
 */
export function formatFormFieldValue(value: unknown, type: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";

  if (type === "date" && typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return format(d, "yyyy/MM/dd");
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
