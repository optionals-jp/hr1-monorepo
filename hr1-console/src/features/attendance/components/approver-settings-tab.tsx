"use client";

import { useState } from "react";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Label } from "@hr1/shared-ui/components/ui/label";
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
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@hr1/shared-ui/components/ui/select";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import {
  useApprovers,
  addApprover as addApproverAction,
  deleteApprover as deleteApproverAction,
} from "@/features/attendance/hooks/use-attendance-queries";
import { Plus, Trash2, Building2, User, FolderKanban } from "lucide-react";
import type { Department, Project } from "@/types/database";
import type { Employee } from "@/features/attendance/types";

interface ApproverSettingsTabProps {
  employees: Employee[];
  departments: Department[];
  projects: Project[];
}

export function ApproverSettingsTab({
  employees,
  departments,
  projects,
}: ApproverSettingsTabProps) {
  const { organization } = useOrg();
  const { showToast } = useToast();
  const [approverDialogOpen, setApproverDialogOpen] = useState(false);
  const [approverMode, setApproverMode] = useState<"individual" | "department" | "project">(
    "individual"
  );
  const [approverTargetUserId, setApproverTargetUserId] = useState("");
  const [approverTargetDeptId, setApproverTargetDeptId] = useState("");
  const [approverTargetProjectId, setApproverTargetProjectId] = useState("");
  const [approverApproverId, setApproverApproverId] = useState("");
  const [savingApprover, setSavingApprover] = useState(false);

  const {
    data: approvers = [],
    isLoading: approversLoading,
    mutate: mutateApprovers,
  } = useApprovers();

  const handleAddApprover = async () => {
    if (!organization) return;
    if (!approverApproverId) {
      showToast("承認者を選択してください", "error");
      return;
    }
    if (approverMode === "individual" && !approverTargetUserId) {
      showToast("対象社員を選択してください", "error");
      return;
    }
    if (approverMode === "department" && !approverTargetDeptId) {
      showToast("対象部署を選択してください", "error");
      return;
    }
    if (approverMode === "project" && !approverTargetProjectId) {
      showToast("対象プロジェクトを選択してください", "error");
      return;
    }
    setSavingApprover(true);
    try {
      const { error } = await addApproverAction({
        organization_id: organization.id,
        user_id: approverMode === "individual" ? approverTargetUserId : null,
        department_id: approverMode === "department" ? approverTargetDeptId : null,
        project_id: approverMode === "project" ? approverTargetProjectId : null,
        approver_id: approverApproverId,
      });
      if (error) throw error;
      await mutateApprovers();
      showToast("承認者を追加しました", "success");
      setApproverDialogOpen(false);
      setApproverTargetUserId("");
      setApproverTargetDeptId("");
      setApproverTargetProjectId("");
      setApproverApproverId("");
    } catch {
      showToast("承認者の追加に失敗しました（重複の可能性があります）", "error");
    } finally {
      setSavingApprover(false);
    }
  };

  const handleDeleteApprover = async (id: string) => {
    if (!window.confirm("削除してもよろしいですか？")) return;
    try {
      if (!organization) return;
      await deleteApproverAction(id, organization.id);
      await mutateApprovers();
      showToast("承認者を削除しました", "success");
    } catch {
      showToast("削除に失敗しました", "error");
    }
  };

  return (
    <>
      <div className="px-4 py-3 sm:px-6 md:px-8">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            社員ごと、または部署単位で勤怠の承認者を設定できます。部署単位で設定すると、その部署に所属する全社員に適用されます。
          </p>
          <Button
            className="shrink-0 ml-4"
            onClick={() => {
              setApproverMode("individual");
              setApproverTargetUserId("");
              setApproverTargetDeptId("");
              setApproverApproverId("");
              setApproverDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            承認者を追加
          </Button>
        </div>
      </div>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>種別</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>承認者</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={approversLoading}
              isEmpty={approvers.length === 0}
              emptyMessage="承認者が設定されていません"
            >
              {approvers.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    {a.department_id ? (
                      <Badge variant="secondary" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        部署
                      </Badge>
                    ) : a.project_id ? (
                      <Badge variant="secondary" className="gap-1 bg-violet-100 text-violet-700">
                        <FolderKanban className="h-3 w-3" />
                        プロジェクト
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <User className="h-3 w-3" />
                        個別
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.department_id ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {a.departments?.name ?? "不明な部署"}
                        </span>
                      </div>
                    ) : a.project_id ? (
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {a.projects?.name ?? "不明なプロジェクト"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {(a.target_profile?.display_name ?? a.target_profile?.email ?? "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {a.target_profile?.display_name ?? a.target_profile?.email}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {
                            (a.approver_profile?.display_name ??
                              a.approver_profile?.email ??
                              "?")[0]
                          }
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {a.approver_profile?.display_name ?? a.approver_profile?.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteApprover(a.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={approverDialogOpen}
        onOpenChange={setApproverDialogOpen}
        title="承認者を追加"
        saving={savingApprover}
        onSave={handleAddApprover}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div>
            <Label>設定方法</Label>
            <div className="flex gap-1.5 mt-1.5">
              {(
                [
                  { mode: "individual", label: "個別設定", icon: User },
                  { mode: "department", label: "部署一括", icon: Building2 },
                  { mode: "project", label: "プロジェクト一括", icon: FolderKanban },
                ] as const
              ).map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setApproverMode(mode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    approverMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {approverMode === "individual" && (
            <div>
              <Label>対象社員</Label>
              <Select
                value={approverTargetUserId}
                onValueChange={(v) => v && setApproverTargetUserId(v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="社員を選択">
                    {(v: string) =>
                      employees.find((e) => e.id === v)?.display_name ??
                      employees.find((e) => e.id === v)?.email ??
                      v
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.display_name ?? e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {approverMode === "department" && (
            <div>
              <Label>対象部署</Label>
              <Select
                value={approverTargetDeptId}
                onValueChange={(v) => v && setApproverTargetDeptId(v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="部署を選択">
                    {(v: string) => departments.find((d) => d.id === v)?.name ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                この部署に所属する全社員に承認者が適用されます
              </p>
            </div>
          )}

          {approverMode === "project" && (
            <div>
              <Label>対象プロジェクト</Label>
              <Select
                value={approverTargetProjectId}
                onValueChange={(v) => v && setApproverTargetProjectId(v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="プロジェクトを選択">
                    {(v: string) => projects.find((p) => p.id === v)?.name ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      有効なプロジェクトがありません
                    </div>
                  ) : (
                    projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                このプロジェクトのメンバー全員に承認者が適用されます
              </p>
            </div>
          )}

          <div>
            <Label>承認者</Label>
            <Select value={approverApproverId} onValueChange={(v) => v && setApproverApproverId(v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="承認者を選択">
                  {(v: string) =>
                    employees.find((e) => e.id === v)?.display_name ??
                    employees.find((e) => e.id === v)?.email ??
                    v
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.display_name ?? e.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditPanel>
    </>
  );
}
