"use client";

import { useState, useCallback } from "react";
import { CsvImportDialog, type CsvImportField } from "@/components/ui/csv-import-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { invokeCreateUser } from "@/lib/hooks/use-import";
import { Mail } from "lucide-react";

const APPLICANT_FIELDS: CsvImportField[] = [
  { key: "email", label: "メールアドレス", required: true },
  { key: "last_name", label: "姓" },
  { key: "first_name", label: "名" },
  { key: "display_name", label: "氏名（フルネーム）" },
  { key: "name_kana", label: "ふりがな", preview: false },
  { key: "hiring_type", label: "採用区分" },
  { key: "graduation_year", label: "卒業年", preview: false },
];

const APPLICANT_HEADER_PATTERNS: Record<string, RegExp[]> = {
  email: [/メール/i, /email/i, /e-mail/i, /mail/i],
  last_name: [/^姓$/, /last.?name/i, /family.?name/i],
  first_name: [/^名$/, /first.?name/i, /given.?name/i],
  display_name: [/氏名/, /名前/, /フルネーム/, /full.?name/i, /display.?name/i],
  name_kana: [/ふりがな/, /フリガナ/, /カナ/, /kana/i],
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
      const body: Record<string, unknown> = {
        email: values.email.trim(),
        role: "applicant",
        organization_id: organizationId,
        send_invite: sendInvite,
      };
      if (values.display_name) body.display_name = values.display_name;
      if (values.name_kana) body.name_kana = values.name_kana;

      const hiringType = values.hiring_type ? HIRING_TYPE_MAP[values.hiring_type] : null;
      if (hiringType) body.hiring_type = hiringType;

      if (values.graduation_year) {
        const year = Number(values.graduation_year);
        if (!isNaN(year)) body.graduation_year = year;
      }

      await invokeCreateUser(body);
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
