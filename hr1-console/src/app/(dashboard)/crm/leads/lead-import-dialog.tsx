"use client";

import { useCallback } from "react";
import { CsvImportDialog, type CsvImportField } from "@/components/ui/csv-import-dialog";
import { getSupabase } from "@/lib/supabase/browser";
import * as leadRepository from "@/lib/repositories/lead-repository";

const LEAD_FIELDS: CsvImportField[] = [
  { key: "name", label: "企業名", required: true },
  { key: "contact_name", label: "担当者名" },
  { key: "contact_email", label: "担当者メール" },
  { key: "contact_phone", label: "担当者電話" },
  { key: "source", label: "ソース" },
  { key: "notes", label: "メモ", preview: false },
];

const LEAD_HEADER_PATTERNS: Record<string, RegExp[]> = {
  name: [/企業名/, /会社名/, /リード名/, /company/i],
  contact_name: [/担当者/, /氏名/, /^名前$/, /contact.?name/i],
  contact_email: [/メール/i, /email/i, /e-mail/i],
  contact_phone: [/電話/, /tel/i, /phone/i],
  source: [/ソース/, /経路/, /source/i, /チャネル/],
  notes: [/メモ/, /備考/, /notes/i],
};

const SOURCE_MAP: Record<string, string> = {
  Web: "web",
  web: "web",
  ウェブ: "web",
  紹介: "referral",
  referral: "referral",
  イベント: "event",
  event: "event",
  コールドコール: "cold_call",
  cold_call: "cold_call",
  その他: "other",
  other: "other",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onComplete: () => void;
}

export function LeadImportDialog({ open, onOpenChange, organizationId, onComplete }: Props) {
  const validateRow = useCallback(
    (values: Record<string, string>, _rowIndex: number, allValues: Record<string, string>[]) => {
      const errors: string[] = [];
      if (!values.name?.trim()) {
        errors.push("企業名が未入力");
      }
      const name = values.name?.trim().toLowerCase();
      if (name) {
        const dupeCount = allValues.filter((v) => v.name?.trim().toLowerCase() === name).length;
        if (dupeCount > 1) {
          errors.push("企業名がファイル内で重複");
        }
      }
      return errors;
    },
    []
  );

  const importRow = useCallback(
    async (values: Record<string, string>) => {
      const source = values.source ? (SOURCE_MAP[values.source] ?? "other") : "other";
      await leadRepository.createLead(getSupabase(), {
        organization_id: organizationId,
        name: values.name.trim(),
        contact_name: values.contact_name?.trim() || null,
        contact_email: values.contact_email?.trim() || null,
        contact_phone: values.contact_phone?.trim() || null,
        source: source as "web" | "referral" | "event" | "cold_call" | "other",
        notes: values.notes?.trim() || null,
      });
    },
    [organizationId]
  );

  return (
    <CsvImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="リード一括インポート"
      fields={LEAD_FIELDS}
      headerPatterns={LEAD_HEADER_PATTERNS}
      previewColumns={["name", "contact_name", "contact_email", "source"]}
      validateRow={validateRow}
      importRow={importRow}
      onComplete={onComplete}
    />
  );
}
