"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import { fetchContacts, fetchCompanies } from "@/lib/repositories/crm-repository";
import { Plus } from "lucide-react";

interface ContactFormData {
  last_name: string;
  first_name: string;
  company_id: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  mobile_phone: string;
  notes: string;
}

const emptyForm: ContactFormData = {
  last_name: "",
  first_name: "",
  company_id: "",
  department: "",
  position: "",
  email: "",
  phone: "",
  mobile_phone: "",
  notes: "",
};

export default function CrmContactsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();

  const { data: contacts, mutate: mutateContacts } = useOrgQuery("crm-contacts-list", (orgId) =>
    fetchContacts(getSupabase(), orgId)
  );

  const { data: companies } = useOrgQuery("crm-contacts-companies", (orgId) =>
    fetchCompanies(getSupabase(), orgId)
  );

  // UI state
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.last_name.toLowerCase().includes(q) ||
        (c.first_name ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.crm_companies?.name ?? "").toLowerCase().includes(q) ||
        (c.department ?? "").toLowerCase().includes(q)
    );
  }, [contacts, search]);

  // Open add panel
  const openAdd = useCallback(() => {
    setForm(emptyForm);
    setEditOpen(true);
  }, []);

  // Handle form field change
  const updateField = useCallback(
    <K extends keyof ContactFormData>(field: K, value: ContactFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Save contact
  const handleSave = useCallback(async () => {
    if (!organization || saving) return;
    if (!form.last_name.trim()) {
      showToast("姓は必須です", "error");
      return;
    }

    setSaving(true);
    try {
      const { error } = await getSupabase()
        .from("crm_contacts")
        .insert({
          organization_id: organization.id,
          last_name: form.last_name.trim(),
          first_name: form.first_name.trim() || null,
          company_id: form.company_id || null,
          department: form.department.trim() || null,
          position: form.position.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          mobile_phone: form.mobile_phone.trim() || null,
          notes: form.notes.trim() || null,
          created_by: user?.id ?? null,
        });
      if (error) throw error;
      showToast("連絡先を作成しました");
      setEditOpen(false);
      mutateContacts();
    } catch {
      showToast("連絡先の作成に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, saving, form, user, showToast, mutateContacts]);

  const loading = !contacts;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="連絡先"
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "連絡先", href: "/crm/contacts" },
        ]}
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            連絡先を追加
          </Button>
        }
      />

      <StickyFilterBar>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="氏名・メール・企業名・部署で検索"
        />
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>氏名</TableHead>
              <TableHead>企業名</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>役職</TableHead>
              <TableHead>メール</TableHead>
              <TableHead>電話番号</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={6}
              isLoading={loading}
              isEmpty={filteredContacts.length === 0}
              emptyMessage="連絡先がありません"
            >
              {filteredContacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/crm/contacts/${contact.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                          {contact.last_name[0]}
                          {contact.first_name?.[0] ?? ""}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {contact.last_name} {contact.first_name ?? ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {contact.crm_companies?.name ?? "---"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{contact.department ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{contact.position ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{contact.email ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {contact.phone ?? contact.mobile_phone ?? "---"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      {/* Add Contact Panel */}
      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title="連絡先を追加"
        onSave={handleSave}
        saving={saving}
        saveLabel="作成"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-last-name">
              姓 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-last-name"
              value={form.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              placeholder="例: 田中"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-first-name">名</Label>
            <Input
              id="contact-first-name"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              placeholder="例: 太郎"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-company">企業</Label>
            <Select
              value={form.company_id}
              onValueChange={(v) => updateField("company_id", v ?? "")}
            >
              <SelectTrigger id="contact-company">
                <SelectValue placeholder="企業を選択" />
              </SelectTrigger>
              <SelectContent>
                {(companies ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-department">部署</Label>
            <Input
              id="contact-department"
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
              placeholder="例: 営業部"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-position">役職</Label>
            <Input
              id="contact-position"
              value={form.position}
              onChange={(e) => updateField("position", e.target.value)}
              placeholder="例: 部長"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email">メール</Label>
            <Input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="例: tanaka@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">電話番号</Label>
            <Input
              id="contact-phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="例: 03-1234-5678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-mobile-phone">携帯</Label>
            <Input
              id="contact-mobile-phone"
              value={form.mobile_phone}
              onChange={(e) => updateField("mobile_phone", e.target.value)}
              placeholder="例: 090-1234-5678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-notes">メモ</Label>
            <Textarea
              id="contact-notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="メモや備考を入力"
              rows={3}
            />
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
