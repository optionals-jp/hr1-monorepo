"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabBar } from "@/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { useDepartmentDetail } from "@/lib/hooks/use-department-detail";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { FormInput } from "@/components/ui/form-field";
import { DepartmentOverviewTab } from "@/features/departments/components/department-overview-tab";

const tabs = [
  { value: "overview", label: "概要" },
  { value: "members", label: "社員" },
  { value: "audit", label: "変更ログ" },
];

const editTabs: EditPanelTab[] = [{ value: "basic", label: "基本情報" }];

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {
    organization,
    department,
    members,
    loading,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    editName,
    setEditName,
    saving,
    startEditing,
    saveEdit,
  } = useDepartmentDetail(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!department) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        部署が見つかりません
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={department.name}
        description="部署詳細"
        sticky={false}
        breadcrumb={[{ label: "部署管理", href: "/departments" }]}
      />

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </StickyFilterBar>

      {activeTab === "overview" && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <DepartmentOverviewTab department={department} members={members} onEdit={startEditing} />
        </div>
      )}

      {activeTab === "members" && (
        <div className="flex-1 overflow-y-auto bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>役職</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    この部署に所属する社員はいません
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "audit" && organization && (
        <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
          <AuditLogPanel organizationId={organization.id} tableName="departments" recordId={id} />
        </div>
      )}

      <EditPanel
        open={editing}
        onOpenChange={setEditing}
        title="部署情報を編集"
        tabs={editTabs}
        activeTab="basic"
        onTabChange={() => {}}
        onSave={saveEdit}
        saving={saving}
        saveDisabled={!editName.trim()}
      >
        <FormInput
          label="部署名"
          required
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
        />
      </EditPanel>
    </div>
  );
}
