"use client";

import { useParams, useRouter } from "next/navigation";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { useDepartmentDetail } from "@/lib/hooks/use-department-detail";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { EditPanel, type EditPanelTab } from "@hr1/shared-ui/components/ui/edit-panel";
import { FormInput } from "@hr1/shared-ui/components/ui/form-field";
import { DepartmentOverviewTab } from "@/features/departments/components/department-overview-tab";
import { Info, Users, History } from "lucide-react";

const tabs = [
  { value: "overview", label: "概要", icon: Info },
  { value: "members", label: "社員", icon: Users },
  { value: "audit", label: "変更ログ", icon: History },
];

const editTabs: EditPanelTab[] = [{ value: "basic", label: "基本情報" }];

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const h = useDepartmentDetail(id);

  if (h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!h.department) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        部署が見つかりません
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={h.department.name}
        description="部署詳細"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "部署管理", href: "/departments" }]}
      />

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={h.activeTab} onTabChange={h.setActiveTab} />
        {h.activeTab === "members" && (
          <SearchBar
            value={h.memberSearch}
            onChange={h.setMemberSearch}
            placeholder="名前・メール・役職で検索"
          />
        )}
      </StickyFilterBar>

      {h.activeTab === "overview" && (
        <PageContent>
          <DepartmentOverviewTab
            department={h.department}
            members={h.members}
            onEdit={h.startEditing}
          />
        </PageContent>
      )}

      {h.activeTab === "members" && (
        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>役職</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={3}
                isLoading={false}
                isEmpty={h.filteredMembers.length === 0}
                emptyMessage="この部署に所属する社員はいません"
              >
                {h.filteredMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/employees/${member.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                            {(member.display_name ?? member.email)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.display_name ?? "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.position ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      )}

      {h.activeTab === "audit" && h.organization && (
        <PageContent>
          <AuditLogPanel organizationId={h.organization.id} tableName="departments" recordId={id} />
        </PageContent>
      )}

      <EditPanel
        open={h.editing}
        onOpenChange={h.setEditing}
        title="部署情報を編集"
        tabs={editTabs}
        activeTab="basic"
        onTabChange={() => {}}
        onSave={h.saveEdit}
        saving={h.saving}
        saveDisabled={!h.editName.trim()}
        onDelete={async () => {
          const result = await h.handleDelete();
          if (result.success) {
            showToast("部署を削除しました");
            router.push("/departments");
          } else {
            showToast(result.error ?? "削除に失敗しました", "error");
          }
        }}
        deleteLabel="部署を削除"
        deleting={h.deleting}
      >
        <FormInput
          label="部署名"
          required
          value={h.editName}
          onChange={(e) => h.setEditName(e.target.value)}
        />
      </EditPanel>
    </div>
  );
}
