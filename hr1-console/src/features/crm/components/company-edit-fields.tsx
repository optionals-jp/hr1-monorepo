import { Input } from "@hr1/shared-ui/components/ui/input";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Field } from "@/features/crm/components/detail-helpers";
import type { CompanyFormData } from "@/features/crm/hooks/use-crm-company-detail-page";

interface Props {
  form: CompanyFormData;
  updateField: <K extends keyof CompanyFormData>(field: K, value: CompanyFormData[K]) => void;
  prefix?: string;
}

export function CompanyEditFields({ form, updateField, prefix = "edit-company" }: Props) {
  return (
    <div className="space-y-4">
      <Field id={`${prefix}-name`} label="企業名" required>
        <Input
          id={`${prefix}-name`}
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="例: 株式会社サンプル"
        />
      </Field>
      <Field id={`${prefix}-name-kana`} label="フリガナ">
        <Input
          id={`${prefix}-name-kana`}
          value={form.name_kana}
          onChange={(e) => updateField("name_kana", e.target.value)}
          placeholder="例: カブシキガイシャサンプル"
        />
      </Field>
      <Field id={`${prefix}-industry`} label="業種">
        <Input
          id={`${prefix}-industry`}
          value={form.industry}
          onChange={(e) => updateField("industry", e.target.value)}
          placeholder="例: IT・通信"
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
      <Field id={`${prefix}-postal-code`} label="郵便番号">
        <Input
          id={`${prefix}-postal-code`}
          value={form.postal_code}
          onChange={(e) => updateField("postal_code", e.target.value)}
          placeholder="例: 100-0001"
        />
      </Field>
      <Field id={`${prefix}-address`} label="住所">
        <Input
          id={`${prefix}-address`}
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="例: 東京都千代田区丸の内1-1-1"
        />
      </Field>
      <Field id={`${prefix}-website`} label="Webサイト">
        <Input
          id={`${prefix}-website`}
          value={form.website}
          onChange={(e) => updateField("website", e.target.value)}
          placeholder="例: https://example.com"
        />
      </Field>
      <Field id={`${prefix}-corporate-number`} label="法人番号">
        <Input
          id={`${prefix}-corporate-number`}
          value={form.corporate_number}
          onChange={(e) => updateField("corporate_number", e.target.value)}
          placeholder="例: 1234567890123"
        />
      </Field>
      <Field id={`${prefix}-notes`} label="備考">
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
