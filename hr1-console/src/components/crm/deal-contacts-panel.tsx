"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditPanel } from "@/components/ui/edit-panel";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useOrg } from "@/lib/org-context";
import { useCrmDealContacts, useCrmContacts } from "@/lib/hooks/use-crm";
import { getSupabase } from "@/lib/supabase/browser";
import * as repo from "@/lib/repositories/deal-contact-repository";
import { dealContactRoleLabels } from "@/lib/constants/crm";
import type { BcDealContact, DealContactRole } from "@/types/database";
import { Plus, Star, Trash2, Users } from "lucide-react";
import Link from "next/link";

interface DealContactsPanelProps {
  dealId: string;
}

export function DealContactsPanel({ dealId }: DealContactsPanelProps) {
  const { organization } = useOrg();
  const { showToast } = useToast();
  const { data: dealContacts, mutate } = useCrmDealContacts(dealId);
  const { data: allContacts } = useCrmContacts();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedRole, setSelectedRole] = useState<DealContactRole>("stakeholder");
  const [addNotes, setAddNotes] = useState("");

  // 既に紐付いている連絡先IDのセット
  const linkedContactIds = new Set((dealContacts ?? []).map((dc) => dc.contact_id));
  const availableContacts = (allContacts ?? []).filter((c) => !linkedContactIds.has(c.id));

  const handleAdd = useCallback(async () => {
    if (!organization || !selectedContactId) return;
    try {
      await repo.addDealContact(getSupabase(), {
        organization_id: organization.id,
        deal_id: dealId,
        contact_id: selectedContactId,
        role: selectedRole,
        is_primary: (dealContacts ?? []).length === 0,
        notes: addNotes || null,
      });
      showToast("連絡先を追加しました");
      setAddOpen(false);
      setSelectedContactId("");
      setSelectedRole("stakeholder");
      setAddNotes("");
      mutate();
    } catch {
      showToast("連絡先の追加に失敗しました", "error");
    }
  }, [
    organization,
    dealId,
    selectedContactId,
    selectedRole,
    addNotes,
    dealContacts,
    showToast,
    mutate,
  ]);

  const handleRemove = useCallback(
    async (dc: BcDealContact) => {
      if (!organization) return;
      try {
        await repo.removeDealContact(getSupabase(), dc.id, organization.id);
        showToast("連絡先を解除しました");
        mutate();
      } catch {
        showToast("連絡先の解除に失敗しました", "error");
      }
    },
    [organization, showToast, mutate]
  );

  const handleSetPrimary = useCallback(
    async (dc: BcDealContact) => {
      if (!organization || dc.is_primary) return;
      try {
        await repo.setPrimaryContact(getSupabase(), dealId, dc.id, organization.id);
        showToast("主担当連絡先を変更しました");
        mutate();
      } catch {
        showToast("主担当の変更に失敗しました", "error");
      }
    },
    [organization, dealId, showToast, mutate]
  );

  const handleRoleChange = useCallback(
    async (dc: BcDealContact, role: DealContactRole) => {
      if (!organization) return;
      try {
        await repo.updateDealContact(getSupabase(), dc.id, organization.id, { role });
        mutate();
      } catch {
        showToast("ロールの変更に失敗しました", "error");
      }
    },
    [organization, showToast, mutate]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="size-5" />
          関連連絡先（{dealContacts?.length ?? 0}件）
        </h2>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-1" />
          追加
        </Button>
      </div>

      <div className="space-y-2">
        {(dealContacts ?? []).map((dc) => {
          const contact = dc.bc_contacts;
          if (!contact) return null;
          return (
            <div
              key={dc.id}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/crm/contacts/${dc.contact_id}`}
                    className="font-medium text-sm text-primary hover:underline"
                  >
                    {contact.last_name} {contact.first_name ?? ""}
                  </Link>
                  {dc.is_primary && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="size-3 mr-0.5" />
                      主担当
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {contact.position && (
                    <span className="text-xs text-muted-foreground">{contact.position}</span>
                  )}
                  {contact.department && (
                    <span className="text-xs text-muted-foreground">{contact.department}</span>
                  )}
                  {contact.email && (
                    <span className="text-xs text-muted-foreground">{contact.email}</span>
                  )}
                </div>
                {dc.notes && <p className="text-xs text-muted-foreground mt-1">{dc.notes}</p>}
              </div>
              <Select
                value={dc.role}
                onValueChange={(v) => handleRoleChange(dc, v as DealContactRole)}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dealContactRoleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!dc.is_primary && (
                <button
                  onClick={() => handleSetPrimary(dc)}
                  className="text-muted-foreground hover:text-foreground"
                  title="主担当に設定"
                >
                  <Star className="size-4" />
                </button>
              )}
              <button
                onClick={() => handleRemove(dc)}
                className="text-muted-foreground hover:text-destructive"
                title="解除"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
        {(dealContacts ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">関連連絡先がありません</p>
        )}
      </div>

      {/* 連絡先追加パネル */}
      <EditPanel open={addOpen} onOpenChange={setAddOpen} title="連絡先を追加" onSave={handleAdd}>
        <div className="space-y-4">
          <div>
            <Label>連絡先 *</Label>
            <Select value={selectedContactId} onValueChange={setSelectedContactId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="連絡先を選択" />
              </SelectTrigger>
              <SelectContent>
                {availableContacts.length === 0 ? (
                  <SelectItem value="" disabled>
                    追加可能な連絡先がありません
                  </SelectItem>
                ) : (
                  availableContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.last_name} {c.first_name ?? ""}
                      {c.bc_companies?.name ? ` (${c.bc_companies.name})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>ロール</Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as DealContactRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dealContactRoleLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>メモ</Label>
            <Textarea
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
              placeholder="この連絡先に関するメモ"
              rows={2}
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
