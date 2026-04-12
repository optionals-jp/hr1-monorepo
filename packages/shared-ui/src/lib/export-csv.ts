/**
 * CSV エクスポートユーティリティ
 * BOM付きUTF-8で日本語Excelに対応
 */

interface CsvColumn<T> {
  key: keyof T | ((row: T) => string | number | null | undefined);
  label: string;
}

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return `${value.getFullYear()}/${String(value.getMonth() + 1).padStart(2, "0")}/${String(value.getDate()).padStart(2, "0")}`;
  }
  const str = String(value);
  // ISO 8601 date string detection (e.g., "2026-03-22T15:30:00.000Z")
  if (/^\d{4}-\d{2}-\d{2}(T|\s)/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    }
  }
  return str;
}

export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  const header = columns.map((col) => escapeCsvValue(col.label)).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = typeof col.key === "function" ? col.key(row) : row[col.key];
        return escapeCsvValue(formatValue(value));
      })
      .join(",")
  );
  const csv = "\uFEFF" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string): string {
  // Sanitize formula injection: prefix dangerous leading characters with a single quote
  let sanitized = value;
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }
  if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function csvFilenameWithDate(prefix: string): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `${prefix}_${date}`;
}
