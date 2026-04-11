"use client";

import { Dispatch, SetStateAction } from "react";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { leadSourceLabels, leadStatusLabels } from "@/lib/constants";
import type { BcLead, BcCompany } from "@/types/database";
import type { ValidationErrors } from "@/lib/validation";

interface LeadEditPanelProps {
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  editData: Partial<BcLead>;
  setEditData: Dispatch<SetStateAction<Partial<BcLead>>>;
  errors: ValidationErrors | null;
  handleSave: (showToast: (msg: string, type?: "success" | "error") => void) => void;
  handleDelete: (showToast: (msg: string, type?: "success" | "error") => void) => void;
  saving: boolean;
  deleting: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export function LeadEditPanel({
  editOpen,
  setEditOpen,
  editData,
  setEditData,
  errors,
  handleSave,
  handleDelete,
  saving,
  deleting,
  showToast,
}: LeadEditPanelProps) {
  return (
    <EditPanel
      open={editOpen}
      onOpenChange={setEditOpen}
      title={editData.id ? "リード編集" : "リード登録"}
      onSave={() => handleSave(showToast)}
      saving={saving}
      onDelete={editData.id ? () => handleDelete(showToast) : undefined}
      deleting={deleting}
      confirmDeleteMessage="このリードを削除しますか？この操作は元に戻せません。"
    >
      <div className="space-y-4">
        <div>
          <Label>企業名 *</Label>
          <Input
            value={editData.name ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
            className={errors?.name ? "border-destructive" : ""}
          />
          {errors?.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label>担当者名</Label>
          <Input
            value={editData.contact_name ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, contact_name: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>担当者メール</Label>
            <Input
              type="email"
              value={editData.contact_email ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, contact_email: e.target.value }))}
            />
          </div>
          <div>
            <Label>担当者電話</Label>
            <Input
              value={editData.contact_phone ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, contact_phone: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>ソース</Label>
            <Select
              value={editData.source ?? "other"}
              onValueChange={(v) => setEditData((p) => ({ ...p, source: v as BcLead["source"] }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(leadSourceLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ステータス</Label>
            <Select
              value={editData.status ?? "new"}
              onValueChange={(v) => setEditData((p) => ({ ...p, status: v as BcLead["status"] }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(leadStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>メモ</Label>
          <Textarea
            value={editData.notes ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
            rows={3}
          />
        </div>
      </div>
    </EditPanel>
  );
}

interface ConvertData {
  existingCompanyId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  dealTitle: string;
}

interface LeadConvertPanelProps {
  convertOpen: boolean;
  setConvertOpen: (open: boolean) => void;
  convertData: ConvertData;
  setConvertData: Dispatch<SetStateAction<ConvertData>>;
  existingCompanies: BcCompany[] | undefined;
  handleConvert: () => void;
  converting: boolean;
}

export function LeadConvertPanel({
  convertOpen,
  setConvertOpen,
  convertData,
  setConvertData,
  existingCompanies,
  handleConvert,
  converting,
}: LeadConvertPanelProps) {
  return (
    <EditPanel
      open={convertOpen}
      onOpenChange={setConvertOpen}
      title="リードをコンバート"
      onSave={handleConvert}
      saveLabel={converting ? "変換中..." : "コンバート実行"}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          このリードから企業・商談を作成します。担当者名がある場合は連絡先も作成されます。
        </p>

        <div>
          <Label>企業 *</Label>
          <Select
            value={convertData.existingCompanyId || "__new__"}
            onValueChange={(v) => {
              if (!v || v === "__new__") {
                setConvertData((p) => ({ ...p, existingCompanyId: "" }));
              } else {
                const company = (existingCompanies ?? []).find((c) => c.id === v);
                setConvertData((p) => ({
                  ...p,
                  existingCompanyId: v,
                  companyName: company?.name || p.companyName,
                }));
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__new__">＋ 新規企業を作成</SelectItem>
              {(existingCompanies ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!convertData.existingCompanyId && (
            <Input
              className="mt-2"
              placeholder="企業名を入力"
              value={convertData.companyName}
              onChange={(e) => setConvertData((p) => ({ ...p, companyName: e.target.value }))}
            />
          )}
        </div>

        <div>
          <Label>担当者名</Label>
          <Input
            value={convertData.contactName}
            onChange={(e) => setConvertData((p) => ({ ...p, contactName: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>担当者メール</Label>
            <Input
              type="email"
              value={convertData.contactEmail}
              onChange={(e) => setConvertData((p) => ({ ...p, contactEmail: e.target.value }))}
            />
          </div>
          <div>
            <Label>担当者電話</Label>
            <Input
              value={convertData.contactPhone}
              onChange={(e) => setConvertData((p) => ({ ...p, contactPhone: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label>商談名 *</Label>
          <Input
            value={convertData.dealTitle}
            onChange={(e) => setConvertData((p) => ({ ...p, dealTitle: e.target.value }))}
          />
        </div>
      </div>
    </EditPanel>
  );
}
