"use client";

import { useState, useCallback } from "react";
import {
  CsvImportDialog,
  type CsvImportField,
} from "@hr1/shared-ui/components/ui/csv-import-dialog";
import { Switch } from "@hr1/shared-ui/components/ui/switch";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Mail } from "lucide-react";
import { getSupabase } from "@/lib/supabase/browser";
import * as applicantRepo from "@/lib/repositories/applicant-repository";

const APPLICANT_FIELDS: CsvImportField[] = [
  { key: "email", label: "メールアドレス", required: true },
  { key: "display_name", label: "氏名（フルネーム）" },
  { key: "hiring_type", label: "採用区分" },
  { key: "graduation_year", label: "卒業年", preview: false },
];

const APPLICANT_HEADER_PATTERNS: Record<string, RegExp[]> = {
  email: [/メール/i, /email/i, /e-mail/i, /mail/i],
  display_name: [/氏名/, /名前/, /フルネーム/, /full.?name/i, /display.?name/i],
  hiring_type: [/採用区分/, /採用種別/, /hiring.?type/i],
  graduation_year: [/卒業年/, /卒年/, /graduation/i],
};

const HIRING_TYPE_MAP: Record<string, string> = {
  新卒: "new_grad",
  新卒採用: "new_grad",
  中途: "mid_career",
  中途採用: "mid_career",
  new_grad: "new_grad",
  mid_career: "mid_career",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onComplete: () => void;
}

export function ApplicantImportDialog({ open, onOpenChange, organizationId, onComplete }: Props) {
  const [sendInvite, setSendInvite] = useState(false);

  const validateRow = useCallback(
    (values: Record<string, string>, _rowIndex: number, allValues: Record<string, string>[]) => {
      const errors: string[] = [];
      if (!values.email?.trim()) {
        errors.push("メールアドレスが未入力");
        return errors;
      }
      const email = values.email.trim().toLowerCase();
      const dupeCount = allValues.filter((v) => v.email?.trim().toLowerCase() === email).length;
      if (dupeCount > 1) {
        errors.push("メールアドレスがファイル内で重複");
      }
      return errors;
    },
    []
  );

  const importRow = useCallback(
    async (values: Record<string, string>) => {
      const hiringType = values.hiring_type ? (HIRING_TYPE_MAP[values.hiring_type] ?? null) : null;
      const gradYearRaw = values.graduation_year?.trim();
      const gradYear =
        gradYearRaw && !Number.isNaN(Number(gradYearRaw)) ? Number(gradYearRaw) : undefined;

      await applicantRepo.createApplicant(getSupabase(), {
        email: values.email.trim(),
        display_name: values.display_name?.trim() || null,
        organization_id: organizationId,
        hiring_type: hiringType,
        graduation_year: gradYear,
        send_invite: sendInvite,
      });
    },
    [organizationId, sendInvite]
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) setSendInvite(false);
      onOpenChange(v);
    },
    [onOpenChange]
  );

  return (
    <CsvImportDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="応募者一括インポート"
      fields={APPLICANT_FIELDS}
      headerPatterns={APPLICANT_HEADER_PATTERNS}
      previewColumns={["email", "display_name", "hiring_type"]}
      validateRow={validateRow}
      importRow={importRow}
      onComplete={onComplete}
      previewFooter={
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <Label className="text-sm font-medium">招待メールを送信</Label>
            <p className="text-xs text-muted-foreground">
              ONにすると、インポートした応募者に招待メールが送信されます
            </p>
          </div>
          <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
        </div>
      }
    />
  );
}
