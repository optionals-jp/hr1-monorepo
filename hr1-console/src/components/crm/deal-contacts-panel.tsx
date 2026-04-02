"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useCrmDealContacts, useCrmContacts, useDealContactMutations } from "@/lib/hooks/use-crm";
import { dealContactRoleLabels } from "@/lib/constants";
import type { BcDealContact, DealContactRole } from "@/types/database";
import { Plus, Star, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface DealContactsPanelProps {
  dealId: string;
}

export function DealContactsPanel({ dealId }: DealContactsPanelProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const { data: dealContacts, mutate } = useCrmDealContacts(dealId);
  const { data: allContacts } = useCrmContacts();
  const mutations = useDealContactMutations();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedRole, setSelectedRole] = useState<DealContactRole>("stakeholder");
  const [addNotes, setAddNotes] = useState("");

  const linkedContactIds = new Set((dealContacts ?? []).map((dc) => dc.contact_id));
  const availableContacts = (allContacts ?? []).filter((c) => !linkedContactIds.has(c.id));

  const handleAdd = useCallback(async () => {
    if (!selectedContactId) return;
    const result = await mutations.add({
      deal_id: dealId,
      contact_id: selectedContactId,
      role: selectedRole,
      is_primary: (dealContacts ?? []).length === 0,
      notes: addNotes || null,
    });
    if (result.success) {
      showToast("連絡先を追加しました");
      setAddOpen(false);
      setSelectedContactId("");
      setSelectedRole("stakeholder");
      setAddNotes("");
      mutate();
    } else {
      showToast("連絡先の追加に失敗しました", "error");
    }
  }, [
    dealId,
    selectedContactId,
    selectedRole,
    addNotes,
    dealContacts,
    mutations,
    showToast,
    mutate,
  ]);

  const handleRemove = useCallback(
    async (dc: BcDealContact) => {
      const result = await mutations.remove(dc.id);
      if (result.success) {
        showToast("連絡先を解除しました");
        mutate();
      } else {
        showToast("連絡先の解除に失敗しました", "error");
      }
    },
    [mutations, showToast, mutate]
  );

  const handleSetPrimary = useCallback(
    async (dc: BcDealContact) => {
      if (dc.is_primary) return;
      const result = await mutations.setPrimary(dealId, dc.id);
      if (result.success) {
        showToast("主担当連絡先を変更しました");
        mutate();
      } else {
        showToast("主担当の変更に失敗しました", "error");
      }
    },
    [dealId, mutations, showToast, mutate]
  );

  const handleRoleChange = useCallback(
    async (dc: BcDealContact, role: DealContactRole) => {
      const result = await mutations.updateRole(dc.id, role);
      if (!result.success) {
        showToast("ロールの変更に失敗しました", "error");
      }
      mutate();
    },
    [mutations, showToast, mutate]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users className="size-4" />
          関連連絡先（{dealContacts?.length ?? 0}件）
        </h2>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-1" />
          追加
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>氏名</TableHead>
            <TableHead>部署・役職</TableHead>
            <TableHead>メール</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(dealContacts ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                関連連絡先がありません
              </TableCell>
            </TableRow>
          ) : (
            (dealContacts ?? []).map((dc) => {
              const contact = dc.bc_contacts;
              if (!contact) return null;
              return (
                <TableRow
                  key={dc.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/crm/contacts/${dc.contact_id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {contact.last_name} {contact.first_name ?? ""}
                      </span>
                      {dc.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="size-3 mr-0.5" />
                          主担当
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[contact.department, contact.position].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.email ?? "—"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={dc.role}
                      onValueChange={(v) => handleRoleChange(dc, v as DealContactRole)}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
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
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {!dc.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(dc)}
                          className="text-muted-foreground hover:text-foreground p-1"
                          title="主担当に設定"
                        >
                          <Star className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(dc)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        title="解除"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <EditPanel open={addOpen} onOpenChange={setAddOpen} title="連絡先を追加" onSave={handleAdd}>
        <div className="space-y-4">
          <div>
            <Label>連絡先 *</Label>
            <Select value={selectedContactId} onValueChange={(v) => setSelectedContactId(v ?? "")}>
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
