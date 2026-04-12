"use client";

import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import type { DealFormData } from "@/features/crm/hooks/use-crm-deals-page";

interface DealFormPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  saveLabel: string;
  onSave: () => void;
  saving?: boolean;
  form: DealFormData;
  updateField: <K extends keyof DealFormData>(field: K, value: DealFormData[K]) => void;
  companies: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  employees: { id: string; email: string; display_name: string | null }[];
}

export function DealFormPanel({
  open,
  onOpenChange,
  title,
  saveLabel,
  onSave,
  saving,
  form,
  updateField,
  companies,
  stages,
  employees,
}: DealFormPanelProps) {
  return (
    <EditPanel
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      onSave={onSave}
      saving={saving}
      saveLabel={saveLabel}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="deal-title">
            商談名 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="deal-title"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="例: システム導入案件"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deal-company">企業</Label>
          <Select value={form.company_id} onValueChange={(v) => updateField("company_id", v ?? "")}>
            <SelectTrigger id="deal-company">
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
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deal-amount">金額</Label>
          <Input
            id="deal-amount"
            type="number"
            value={form.amount}
            onChange={(e) => updateField("amount", e.target.value)}
            placeholder="例: 1500000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deal-stage">ステージ</Label>
          <Select value={form.stage_id} onValueChange={(v) => updateField("stage_id", v ?? "")}>
            <SelectTrigger id="deal-stage">
              <SelectValue placeholder="ステージを選択" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deal-probability">確度 (%)</Label>
          <Input
            id="deal-probability"
            type="number"
            min={0}
            max={100}
            value={form.probability}
            onChange={(e) => updateField("probability", e.target.value)}
            placeholder="例: 50"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deal-close-date">受注予定日</Label>
          <Input
            id="deal-close-date"
            type="date"
            value={form.expected_close_date}
            onChange={(e) => updateField("expected_close_date", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deal-assigned">担当者</Label>
          <Select
            value={form.assigned_to}
            onValueChange={(v) => updateField("assigned_to", v ?? "")}
          >
            <SelectTrigger id="deal-assigned">
              <SelectValue placeholder="担当者を選択" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.display_name ?? e.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deal-description">説明</Label>
          <Textarea
            id="deal-description"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="商談の詳細や備考を入力"
            rows={3}
          />
        </div>
      </div>
    </EditPanel>
  );
}
