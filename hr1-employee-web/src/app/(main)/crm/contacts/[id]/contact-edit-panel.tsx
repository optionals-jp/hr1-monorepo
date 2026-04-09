"use client";

import { useState } from "react";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { EditPanel } from "@/components/ui/edit-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { useOrg } from "@/lib/org-context";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { getSupabase } from "@/lib/supabase/browser";
import { updateContact } from "@/lib/repositories/crm-repository";
import { useCrmCompanies } from "@/lib/hooks/use-crm";
import type { BcContact } from "@/types/database";

interface ContactEditPanelProps {
  contact: BcContact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ContactEditPanel({ contact, open, onOpenChange, onSaved }: ContactEditPanelProps) {
  const { organization } = useOrg();
  const { showToast } = useToast();
  const { data: companies } = useCrmCompanies();
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<BcContact>>({});

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditData({
        last_name: contact.last_name,
        first_name: contact.first_name,
        email: contact.email,
        phone: contact.phone,
        mobile_phone: contact.mobile_phone,
        company_id: contact.company_id,
        department: contact.department,
        position: contact.position,
      });
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!organization || saving) return;
    if (!editData.last_name?.trim()) {
      showToast("姓は必須です", "error");
      return;
    }
    setSaving(true);
    try {
      await updateContact(getSupabase(), contact.id, organization.id, {
        last_name: editData.last_name!,
        first_name: editData.first_name || null,
        email: editData.email || null,
        phone: editData.phone || null,
        mobile_phone: editData.mobile_phone || null,
        company_id: editData.company_id || null,
        department: editData.department || null,
        position: editData.position || null,
      });
      showToast("連絡先を更新しました");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error("updateContact failed:", err);
      showToast("更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditPanel
      open={open}
      onOpenChange={handleOpen}
      title="連絡先編集"
      onSave={handleSave}
      saving={saving}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>姓 *</Label>
            <Input
              value={editData.last_name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, last_name: e.target.value }))}
            />
          </div>
          <div>
            <Label>名</Label>
            <Input
              value={editData.first_name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, first_name: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>メール</Label>
          <Input
            type="email"
            value={editData.email ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>電話</Label>
            <Input
              value={editData.phone ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label>携帯</Label>
            <Input
              value={editData.mobile_phone ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, mobile_phone: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <Label>企業</Label>
          <Select
            value={editData.company_id ?? ""}
            onValueChange={(v) => setEditData((p) => ({ ...p, company_id: v || null }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="企業を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">未選択</SelectItem>
              {(companies ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>部署</Label>
            <Input
              value={editData.department ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, department: e.target.value }))}
            />
          </div>
          <div>
            <Label>役職</Label>
            <Input
              value={editData.position ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, position: e.target.value }))}
            />
          </div>
        </div>
      </div>
    </EditPanel>
  );
}
