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
  { key: "current_postal_code", label: "現住所 郵便番号" },
  { key: "current_prefecture", label: "現住所 都道府県" },
  { key: "current_city", label: "現住所 市区町村" },
  { key: "current_street_address", label: "現住所 番地" },
  { key: "current_building", label: "現住所 建物名" },
  { key: "registered_postal_code", label: "住民票 郵便番号" },
  { key: "registered_prefecture", label: "住民票 都道府県" },
  { key: "registered_city", label: "住民票 市区町村" },
  { key: "registered_street_address", label: "住民票 番地" },
  { key: "registered_building", label: "住民票 建物名" },
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
  current_postal_code: [/現住所.*郵便/, /郵便番号/],
  current_prefecture: [/現住所.*都道府県/, /都道府県/],
  current_city: [/現住所.*市区町村/, /市区町村/],
  current_street_address: [/現住所.*番地/, /^番地$/],
  current_building: [/現住所.*建物/, /建物名/],
  registered_postal_code: [/住民票.*郵便/, /本籍.*郵便/],
  registered_prefecture: [/住民票.*都道府県/, /本籍.*都道府県/],
  registered_city: [/住民票.*市区町村/, /本籍.*市区町村/],
  registered_street_address: [/住民票.*番地/, /本籍.*番地/],
  registered_building: [/住民票.*建物/, /本籍.*建物/],
};

export function autoDetectMapping(
  headers: string[],
  fields: ColumnMapping[] = HR1_FIELDS,
  patterns: Record<string, RegExp[]> = HEADER_PATTERNS
): Record<string, number | null> {
  const mapping: Record<string, number | null> = {};
  const usedIndices = new Set<number>();

  for (const field of fields) {
    const fieldPatterns = patterns[field.key] ?? [];
    let found = false;
    for (const pattern of fieldPatterns) {
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
  mapping: Record<string, number | null>,
  fields: ColumnMapping[] = HR1_FIELDS
): ValidatedRow[] {
  const seenEmails = new Set<string>();

  return rows.map((row, rowIndex) => {
    const values: Record<string, string> = {};
    const errors: string[] = [];

    for (const field of fields) {
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
