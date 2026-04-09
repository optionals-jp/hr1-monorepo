"use client";

import { useState } from "react";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { EditPanel } from "@/components/ui/edit-panel";
import { useOrg } from "@/lib/org-context";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { getSupabase } from "@/lib/supabase/browser";
import { updateCompany } from "@/lib/repositories/crm-repository";
import type { BcCompany } from "@/types/database";

interface CompanyEditPanelProps {
  company: BcCompany;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function CompanyEditPanel({ company, open, onOpenChange, onSaved }: CompanyEditPanelProps) {
  const { organization } = useOrg();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<BcCompany>>({});

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditData({
        name: company.name,
        name_kana: company.name_kana,
        corporate_number: company.corporate_number,
        phone: company.phone,
        address: company.address,
        website: company.website,
        industry: company.industry,
      });
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!organization || saving) return;
    if (!editData.name?.trim()) {
      showToast("企業名は必須です", "error");
      return;
    }
    setSaving(true);
    try {
      await updateCompany(getSupabase(), company.id, organization.id, {
        name: editData.name!,
        name_kana: editData.name_kana || null,
        corporate_number: editData.corporate_number || null,
        phone: editData.phone || null,
        address: editData.address || null,
        website: editData.website || null,
        industry: editData.industry || null,
      });
      showToast("企業情報を更新しました");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error("updateCompany failed:", err);
      showToast("更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditPanel
      open={open}
      onOpenChange={handleOpen}
      title="企業編集"
      onSave={handleSave}
      saving={saving}
    >
      <div className="space-y-4">
        <div>
          <Label>企業名 *</Label>
          <Input
            value={editData.name ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <Label>企業名（カナ）</Label>
          <Input
            value={editData.name_kana ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, name_kana: e.target.value }))}
          />
        </div>
        <div>
          <Label>法人番号</Label>
          <Input
            value={editData.corporate_number ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, corporate_number: e.target.value }))}
          />
        </div>
        <div>
          <Label>電話番号</Label>
          <Input
            value={editData.phone ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
          />
        </div>
        <div>
          <Label>住所</Label>
          <Input
            value={editData.address ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, address: e.target.value }))}
          />
        </div>
        <div>
          <Label>Webサイト</Label>
          <Input
            value={editData.website ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, website: e.target.value }))}
          />
        </div>
        <div>
          <Label>業種</Label>
          <Input
            value={editData.industry ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, industry: e.target.value }))}
          />
        </div>
      </div>
    </EditPanel>
  );
}
