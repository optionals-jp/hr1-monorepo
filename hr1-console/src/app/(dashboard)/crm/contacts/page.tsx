"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Button } from "@hr1/shared-ui/components/ui/button";
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
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { useCrmContactsPage } from "@/features/crm/hooks/use-crm-contacts-page";
import { ContactEditFields } from "@/features/crm/components/contact-edit-fields";
import { Plus } from "lucide-react";

export default function CrmContactsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useCrmContactsPage();

  const onSave = async () => {
    const r = await h.handleSave();
    if (r.success) showToast("連絡先を作成しました");
    else if (r.error) showToast(r.error, "error");
  };

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
          <Button onClick={h.openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            連絡先を追加
          </Button>
        }
      />

      <StickyFilterBar>
        <SearchBar
          value={h.search}
          onChange={h.setSearch}
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
              isLoading={h.loading}
              isEmpty={h.filteredContacts.length === 0}
              emptyMessage="連絡先がありません"
            >
              {h.filteredContacts.map((contact) => (
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
                  <TableCell className="text-muted-foreground">
                    {contact.crm_companies?.name ?? "---"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.department ?? "---"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.position ?? "---"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.email ?? "---"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.phone ?? contact.mobile_phone ?? "---"}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={h.editOpen}
        onOpenChange={h.setEditOpen}
        title="連絡先を追加"
        onSave={onSave}
        saving={h.saving}
        saveLabel="作成"
      >
        <ContactEditFields
          form={h.form}
          updateField={h.updateField}
          companies={h.companies ?? []}
          prefix="contact"
          showKana={false}
        />
      </EditPanel>
    </div>
  );
}
