"use client";

import { useState, useCallback } from "react";
import {
  CsvImportDialog,
  type CsvImportField,
} from "@hr1/shared-ui/components/ui/csv-import-dialog";
import { Switch } from "@hr1/shared-ui/components/ui/switch";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { invokeCreateUser } from "@/lib/hooks/use-import";
import { Mail } from "lucide-react";

const EMPLOYEE_FIELDS: CsvImportField[] = [
  { key: "email", label: "メールアドレス", required: true },
  { key: "last_name", label: "姓" },
  { key: "first_name", label: "名" },
  { key: "display_name", label: "氏名（フルネーム）" },
  { key: "name_kana", label: "ふりがな", preview: false },
  { key: "phone", label: "電話番号", preview: false },
  { key: "position", label: "役職", preview: false },
  { key: "department", label: "部署" },
  { key: "hire_date", label: "入社日", preview: false },
  { key: "birth_date", label: "生年月日", preview: false },
  { key: "gender", label: "性別", preview: false },
  { key: "current_postal_code", label: "現住所 郵便番号", preview: false },
  { key: "current_prefecture", label: "現住所 都道府県", preview: false },
  { key: "current_city", label: "現住所 市区町村", preview: false },
  { key: "current_street_address", label: "現住所 番地", preview: false },
  { key: "current_building", label: "現住所 建物名", preview: false },
  { key: "registered_postal_code", label: "住民票 郵便番号", preview: false },
  { key: "registered_prefecture", label: "住民票 都道府県", preview: false },
  { key: "registered_city", label: "住民票 市区町村", preview: false },
  { key: "registered_street_address", label: "住民票 番地", preview: false },
  { key: "registered_building", label: "住民票 建物名", preview: false },
];

const EMPLOYEE_HEADER_PATTERNS: Record<string, RegExp[]> = {
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

const GENDER_MAP: Record<string, string> = {
  男: "male",
  男性: "male",
  女: "female",
  女性: "female",
  その他: "other",
  male: "male",
  female: "female",
  other: "other",
};

const ADDRESS_FIELDS = [
  "current_postal_code",
  "current_prefecture",
  "current_city",
  "current_street_address",
  "current_building",
  "registered_postal_code",
  "registered_prefecture",
  "registered_city",
  "registered_street_address",
  "registered_building",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  departments: { id: string; name: string }[];
  onComplete: () => void;
}

export function EmployeeImportDialog({
  open,
  onOpenChange,
  organizationId,
  departments,
  onComplete,
}: Props) {
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
      const deptNameMap = new Map(departments.map((d) => [d.name, d.id]));
      const deptIds: string[] = [];
      if (values.department) {
        const names = values.department.split(/[,、]/).map((s) => s.trim());
        for (const name of names) {
          const id = deptNameMap.get(name);
          if (id) deptIds.push(id);
        }
      }

      const body: Record<string, unknown> = {
        email: values.email.trim(),
        role: "employee",
        organization_id: organizationId,
        send_invite: sendInvite,
      };
      if (values.display_name) body.display_name = values.display_name;
      if (values.name_kana) body.name_kana = values.name_kana;
      if (values.position) body.position = values.position;
      if (values.phone) body.phone = values.phone;
      if (values.hire_date) body.hire_date = values.hire_date;
      if (values.birth_date) body.birth_date = values.birth_date;
      if (values.gender && GENDER_MAP[values.gender]) body.gender = GENDER_MAP[values.gender];
      if (deptIds.length > 0) body.department_ids = deptIds;

      for (const key of ADDRESS_FIELDS) {
        if (values[key]) body[key] = values[key];
      }

      await invokeCreateUser(body);
    },
    [organizationId, departments, sendInvite]
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
      title="社員一括インポート"
      fields={EMPLOYEE_FIELDS}
      headerPatterns={EMPLOYEE_HEADER_PATTERNS}
      previewColumns={["email", "display_name", "department"]}
      validateRow={validateRow}
      importRow={importRow}
      onComplete={onComplete}
      previewFooter={
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <Label className="text-sm font-medium">招待メールを送信</Label>
            <p className="text-xs text-muted-foreground">
              ONにすると、インポートした社員に招待メールが送信されます
            </p>
          </div>
          <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
        </div>
      }
    />
  );
}
