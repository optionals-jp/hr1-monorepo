import { Input } from "@hr1/shared-ui/components/ui/input";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { Field } from "@/features/crm/components/detail-helpers";
import type { BcCompany } from "@/types/database";

/** 連絡先と連絡先詳細の両方のフォーム型を受け入れる共通型 */
export interface ContactEditForm {
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  company_id: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  mobile_phone: string;
  notes: string;
}

interface Props {
  form: ContactEditForm;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateField: (field: string, value: any) => void;
  companies: BcCompany[];
  prefix?: string;
  /** リスト画面ではカナフィールドを非表示にする */
  showKana?: boolean;
}

export function ContactEditFields({
  form,
  updateField,
  companies,
  prefix = "edit-contact",
  showKana = true,
}: Props) {
  return (
    <div className="space-y-4">
      <Field id={`${prefix}-last-name`} label="姓" required>
        <Input
          id={`${prefix}-last-name`}
          value={form.last_name}
          onChange={(e) => updateField("last_name", e.target.value)}
          placeholder="例: 田中"
        />
      </Field>
      <Field id={`${prefix}-first-name`} label="名">
        <Input
          id={`${prefix}-first-name`}
          value={form.first_name}
          onChange={(e) => updateField("first_name", e.target.value)}
          placeholder="例: 太郎"
        />
      </Field>
      {showKana && (
        <>
          <Field id={`${prefix}-last-name-kana`} label="姓カナ">
            <Input
              id={`${prefix}-last-name-kana`}
              value={form.last_name_kana}
              onChange={(e) => updateField("last_name_kana", e.target.value)}
              placeholder="例: タナカ"
            />
          </Field>
          <Field id={`${prefix}-first-name-kana`} label="名カナ">
            <Input
              id={`${prefix}-first-name-kana`}
              value={form.first_name_kana}
              onChange={(e) => updateField("first_name_kana", e.target.value)}
              placeholder="例: タロウ"
            />
          </Field>
        </>
      )}
      <Field id={`${prefix}-company`} label="企業">
        <Select value={form.company_id} onValueChange={(v) => updateField("company_id", v ?? "")}>
          <SelectTrigger id={`${prefix}-company`}>
            <SelectValue placeholder="企業を選択" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id={`${prefix}-department`} label="部署">
        <Input
          id={`${prefix}-department`}
          value={form.department}
          onChange={(e) => updateField("department", e.target.value)}
          placeholder="例: 営業部"
        />
      </Field>
      <Field id={`${prefix}-position`} label="役職">
        <Input
          id={`${prefix}-position`}
          value={form.position}
          onChange={(e) => updateField("position", e.target.value)}
          placeholder="例: 部長"
        />
      </Field>
      <Field id={`${prefix}-email`} label="メール">
        <Input
          id={`${prefix}-email`}
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="例: tanaka@example.com"
        />
      </Field>
      <Field id={`${prefix}-phone`} label="電話番号">
        <Input
          id={`${prefix}-phone`}
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="例: 03-1234-5678"
        />
      </Field>
      <Field id={`${prefix}-mobile-phone`} label="携帯">
        <Input
          id={`${prefix}-mobile-phone`}
          value={form.mobile_phone}
          onChange={(e) => updateField("mobile_phone", e.target.value)}
          placeholder="例: 090-1234-5678"
        />
      </Field>
      <Field id={`${prefix}-notes`} label="メモ">
        <Textarea
          id={`${prefix}-notes`}
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="メモや備考を入力"
          rows={3}
        />
      </Field>
    </div>
  );
}
