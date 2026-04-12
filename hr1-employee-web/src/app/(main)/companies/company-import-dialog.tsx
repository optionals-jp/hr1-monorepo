"use client";

import { useCallback, useRef } from "react";
import {
  CsvImportDialog,
  type CsvImportField,
} from "@hr1/shared-ui/components/ui/csv-import-dialog";
import { getSupabase } from "@/lib/supabase/browser";
import * as repository from "@/lib/repositories/crm-repository";

const COMPANY_FIELDS: CsvImportField[] = [
  { key: "name", label: "企業名", required: true },
  { key: "corporate_number", label: "法人番号" },
  { key: "industry", label: "業種" },
  { key: "phone", label: "電話番号" },
  { key: "website", label: "Webサイト", preview: false },
  { key: "address", label: "住所", preview: false },
  { key: "notes", label: "備考", preview: false },
];

const COMPANY_HEADER_PATTERNS: Record<string, RegExp[]> = {
  name: [/企業名/, /会社名/, /法人名/, /^名前$/, /^name$/i, /company.?name/i],
  corporate_number: [/法人番号/, /corporate.?number/i],
  industry: [/業種/, /業界/, /industry/i],
  phone: [/電話/, /tel/i, /phone/i],
  website: [/web/i, /url/i, /ホームページ/, /サイト/],
  address: [/住所/, /所在地/, /address/i],
  notes: [/メモ/, /備考/, /notes/i],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  /** 既存企業の名前セット（重複チェック用） */
  existingNames: Set<string>;
  /** 既存企業の法人番号セット（重複チェック用） */
  existingCorporateNumbers: Set<string>;
  onComplete: () => void;
}

export function CompanyImportDialog({
  open,
  onOpenChange,
  organizationId,
  existingNames,
  existingCorporateNumbers,
  onComplete,
}: Props) {
  // ファイル内重複を追跡するために ref を使用
  const importedNamesRef = useRef(new Set<string>());

  const validateRow = useCallback(
    (values: Record<string, string>, _rowIndex: number, allValues: Record<string, string>[]) => {
      const errors: string[] = [];

      if (!values.name?.trim()) {
        errors.push("企業名が未入力");
        return errors;
      }

      const name = values.name.trim();
      const nameLower = name.toLowerCase();

      // DB上の既存企業と重複チェック
      if (existingNames.has(nameLower)) {
        errors.push("同名の企業が既に登録済み");
      }

      // ファイル内の重複チェック
      const dupeCount = allValues.filter((v) => v.name?.trim().toLowerCase() === nameLower).length;
      if (dupeCount > 1) {
        errors.push("企業名がファイル内で重複");
      }

      // 法人番号の重複チェック
      const corpNum = values.corporate_number?.trim();
      if (corpNum) {
        if (!/^\d{13}$/.test(corpNum)) {
          errors.push("法人番号は13桁の数字");
        } else if (existingCorporateNumbers.has(corpNum)) {
          errors.push("この法人番号は既に登録済み");
        }
      }

      return errors;
    },
    [existingNames, existingCorporateNumbers]
  );

  const importRow = useCallback(
    async (values: Record<string, string>) => {
      const name = values.name.trim();

      // インポート中の重複チェック（同じバッチ内で同名企業が登録済みの場合）
      if (importedNamesRef.current.has(name.toLowerCase())) {
        throw new Error("同名の企業がバッチ内で既にインポート済み");
      }

      await repository.createCompany(getSupabase(), {
        organization_id: organizationId,
        name,
        corporate_number: values.corporate_number?.trim() || null,
        industry: values.industry?.trim() || null,
        phone: values.phone?.trim() || null,
        website: values.website?.trim() || null,
        address: values.address?.trim() || null,
        notes: values.notes?.trim() || null,
      });

      importedNamesRef.current.add(name.toLowerCase());
    },
    [organizationId]
  );

  const handleComplete = useCallback(() => {
    importedNamesRef.current.clear();
    onComplete();
  }, [onComplete]);

  return (
    <CsvImportDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) importedNamesRef.current.clear();
        onOpenChange(v);
      }}
      title="取引先企業一括インポート"
      fields={COMPANY_FIELDS}
      headerPatterns={COMPANY_HEADER_PATTERNS}
      previewColumns={["name", "corporate_number", "industry", "phone"]}
      validateRow={validateRow}
      importRow={importRow}
      onComplete={handleComplete}
    />
  );
}
