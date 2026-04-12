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
import { useCrmCompaniesPage } from "@/features/crm/hooks/use-crm-companies-page";
import { CompanyEditFields } from "@/features/crm/components/company-edit-fields";
import { Plus } from "lucide-react";

export default function CrmCompaniesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useCrmCompaniesPage();

  const onSave = async () => {
    const r = await h.handleSave();
    if (r.success) showToast("企業を作成しました");
    else if (r.error) showToast(r.error, "error");
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="取引先企業"
        sticky={false}
        border={false}
        breadcrumb={[
          { label: "CRM", href: "/crm/dashboard" },
          { label: "取引先企業", href: "/crm/companies" },
        ]}
        action={
          <Button onClick={h.openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />
            企業を追加
          </Button>
        }
      />

      <StickyFilterBar>
        <SearchBar
          value={h.search}
          onChange={h.setSearch}
          placeholder="企業名・フリガナ・業種・住所で検索"
        />
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>企業名</TableHead>
              <TableHead>業種</TableHead>
              <TableHead>電話番号</TableHead>
              <TableHead>住所</TableHead>
              <TableHead>Webサイト</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={h.loading}
              isEmpty={h.filteredCompanies.length === 0}
              emptyMessage="企業がありません"
            >
              {h.filteredCompanies.map((company) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/crm/companies/${company.id}`)}
                >
                  <TableCell>
                    <div>
                      <span className="font-medium">{company.name}</span>
                      {company.name_kana && (
                        <span className="block text-xs text-muted-foreground">
                          {company.name_kana}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{company.industry ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{company.phone ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{company.address ?? "---"}</span>
                  </TableCell>
                  <TableCell>
                    {company.website ? (
                      <span
                        className="text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(company.website!, "_blank", "noopener,noreferrer");
                        }}
                      >
                        {company.website}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">---</span>
                    )}
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
        title="企業を追加"
        onSave={onSave}
        saving={h.saving}
        saveLabel="作成"
      >
        <CompanyEditFields form={h.form} updateField={h.updateField} prefix="company" />
      </EditPanel>
    </div>
  );
}
