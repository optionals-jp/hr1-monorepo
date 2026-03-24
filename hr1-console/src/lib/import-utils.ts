import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedFile {
  headers: string[];
  rows: string[][];
  fileName: string;
}

export function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "tsv") {
    return parseCsv(file);
  }
  return parseSpreadsheet(file);
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length < 2) {
          reject(new Error("データが見つかりません"));
          return;
        }
        resolve({
          headers: data[0],
          rows: data.slice(1).filter((row) => row.some((cell) => cell.trim())),
          fileName: file.name,
        });
      },
      error: (err) => reject(err),
      encoding: "UTF-8",
    });
  });
}

function parseSpreadsheet(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: string[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: "",
        });
        if (data.length < 2) {
          reject(new Error("データが見つかりません"));
          return;
        }
        resolve({
          headers: data[0].map(String),
          rows: data.slice(1).filter((row) => row.some((cell) => String(cell).trim())),
          fileName: file.name,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export interface ColumnMapping {
  key: string;
  label: string;
  required?: boolean;
}

export const HR1_FIELDS: ColumnMapping[] = [
  { key: "email", label: "メールアドレス", required: true },
  { key: "last_name", label: "姓" },
  { key: "first_name", label: "名" },
  { key: "display_name", label: "氏名（フルネーム）" },
  { key: "name_kana", label: "ふりがな" },
  { key: "phone", label: "電話番号" },
  { key: "position", label: "役職" },
  { key: "department", label: "部署" },
  { key: "hire_date", label: "入社日" },
  { key: "birth_date", label: "生年月日" },
  { key: "gender", label: "性別" },
  { key: "current_address", label: "現住所" },
  { key: "registered_address", label: "本籍住所" },
  { key: "hiring_type", label: "採用区分" },
  { key: "graduation_year", label: "卒業年度" },
];

const HEADER_PATTERNS: Record<string, RegExp[]> = {
  email: [/メール/i, /email/i, /e-mail/i, /mail/i],
  last_name: [/^姓$/, /last.?name/i, /family.?name/i],
  first_name: [/^名$/, /first.?name/i, /given.?name/i],
  display_name: [/氏名/, /名前/, /フルネーム/, /full.?name/i, /display.?name/i],
  name_kana: [/ふりがな/, /フリガナ/, /カナ/, /kana/i],
  phone: [/電話/, /tel/i, /phone/i],
  position: [/役職/, /position/i, /title/i],
  department: [/部署/, /department/i, /dept/i],
  hire_date: [/入社日/, /hire.?date/i, /joining.?date/i],
  birth_date: [/生年月日/, /誕生日/, /birth.?date/i, /birthday/i],
  gender: [/性別/, /gender/i, /sex/i],
  current_address: [/現住所/, /住所/, /address/i],
  registered_address: [/本籍/, /住民票/],
  hiring_type: [/採用区分/, /採用種別/],
  graduation_year: [/卒業年/, /graduation/i],
};

export function autoDetectMapping(headers: string[]): Record<string, number | null> {
  const mapping: Record<string, number | null> = {};
  const usedIndices = new Set<number>();

  for (const field of HR1_FIELDS) {
    const patterns = HEADER_PATTERNS[field.key] ?? [];
    let found = false;
    for (const pattern of patterns) {
      const idx = headers.findIndex((h, i) => !usedIndices.has(i) && pattern.test(h.trim()));
      if (idx !== -1) {
        mapping[field.key] = idx;
        usedIndices.add(idx);
        found = true;
        break;
      }
    }
    if (!found) {
      mapping[field.key] = null;
    }
  }

  return mapping;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidatedRow {
  rowIndex: number;
  values: Record<string, string>;
  valid: boolean;
  errors: string[];
}

export function validateRows(
  rows: string[][],
  mapping: Record<string, number | null>
): ValidatedRow[] {
  const seenEmails = new Set<string>();

  return rows.map((row, rowIndex) => {
    const values: Record<string, string> = {};
    const errors: string[] = [];

    for (const field of HR1_FIELDS) {
      const colIdx = mapping[field.key];
      values[field.key] = colIdx != null ? (row[colIdx] ?? "").trim() : "";
    }

    if (values.display_name === "" && values.last_name && values.first_name) {
      values.display_name = `${values.last_name} ${values.first_name}`;
    }

    if (!values.email) {
      errors.push("メールアドレスが未入力");
    } else if (!EMAIL_REGEX.test(values.email)) {
      errors.push("メールアドレスの形式が不正");
    } else {
      const lower = values.email.toLowerCase();
      if (seenEmails.has(lower)) {
        errors.push("メールアドレスが重複");
      }
      seenEmails.add(lower);
    }

    return {
      rowIndex,
      values,
      valid: errors.length === 0,
      errors,
    };
  });
}
