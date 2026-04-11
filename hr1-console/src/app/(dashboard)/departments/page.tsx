"use client";

import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { useDepartmentsPage, type DeptWithMembers } from "@/lib/hooks/use-departments-page";
import { TabBar } from "@hr1/shared-ui/components/layout/tab-bar";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Users, ZoomIn, ZoomOut, Maximize, List, GitBranchPlus, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import type { Department } from "@/types/database";

const pageTabs = [
  { value: "list", label: "一覧", icon: List },
  { value: "orgchart", label: "組織図", icon: GitBranchPlus },
];

function DeptTreeRows({
  departments,
  allDepartments,
  search,
  onNavigate,
}: {
  departments: Department[];
  allDepartments: Department[];
  search: string;
  onNavigate: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const isSearching = search.trim().length > 0;

  const filteredIds = useMemo(() => new Set(departments.map((d) => d.id)), [departments]);

  const childrenMap = useMemo(() => {
    const map = new Map<string | null, Department[]>();
    for (const d of allDepartments) {
      const pid = d.parent_id ?? null;
      const list = map.get(pid) ?? [];
      list.push(d);
      map.set(pid, list);
    }
    return map;
  }, [allDepartments]);

  const hasVisibleDescendant = useMemo(() => {
    const cache = new Map<string, boolean>();
    const check = (id: string): boolean => {
      if (cache.has(id)) return cache.get(id)!;
      const children = childrenMap.get(id) ?? [];
      const result = children.some((c) => filteredIds.has(c.id) || check(c.id));
      cache.set(id, result);
      return result;
    };
    return check;
  }, [childrenMap, filteredIds]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows: React.ReactNode[] = [];

  const renderTree = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) ?? [];
    for (const dept of children) {
      const isVisible = filteredIds.has(dept.id) || hasVisibleDescendant(dept.id);
      if (isSearching && !isVisible) continue;

      const hasChildren = (childrenMap.get(dept.id) ?? []).length > 0;
      const isCollapsed = collapsed.has(dept.id);

      rows.push(
        <TableRow key={dept.id} className="cursor-pointer" onClick={() => onNavigate(dept.id)}>
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
              {hasChildren ? (
                <button
                  type="button"
                  className="p-0.5 mr-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(dept.id);
                  }}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      !isCollapsed && "rotate-90"
                    )}
                  />
                </button>
              ) : (
                <span className="w-5.5 shrink-0" />
              )}
              <span className="font-medium">{dept.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">
            {(childrenMap.get(dept.id) ?? []).length > 0
              ? `${(childrenMap.get(dept.id) ?? []).length}子部署`
              : "-"}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {format(new Date(dept.created_at), "yyyy/MM/dd")}
          </TableCell>
        </TableRow>
      );

      if (hasChildren && !isCollapsed) {
        renderTree(dept.id, depth + 1);
      }
    }
  };

  renderTree(null, 0);

  // orphan departments (parent_id references a non-existent dept)
  const rootIds = new Set((childrenMap.get(null) ?? []).map((d) => d.id));
  for (const dept of departments) {
    if (
      !rootIds.has(dept.id) &&
      dept.parent_id &&
      !allDepartments.some((d) => d.id === dept.parent_id)
    ) {
      if (!rows.some((r) => (r as React.ReactElement).key === dept.id)) {
        rows.push(
          <TableRow key={dept.id} className="cursor-pointer" onClick={() => onNavigate(dept.id)}>
            <TableCell>
              <div className="flex items-center">
                <span className="w-5.5 shrink-0" />
                <span className="font-medium">{dept.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">-</TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(dept.created_at), "yyyy/MM/dd")}
            </TableCell>
          </TableRow>
        );
      }
    }
  }

  return <>{rows}</>;
}

export default function DepartmentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    departments,
    isLoading,
    departmentsError,
    mutate,
    deptWithMembers,
    orgLoading,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    newDeptName,
    setNewDeptName,
    newParentId,
    setNewParentId,
    savingAdd,
    editDialogOpen,
    setEditDialogOpen,
    editingId,
    editName,
    setEditName,
    editParentId,
    setEditParentId,
    savingEdit,
    zoom,
    pan,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetView,
    zoomIn,
    zoomOut,
    openAddDialog,
    handleAdd,
    saveEdit,
    filtered,
    getDescendantIds,
    topLevelDepts,
  } = useDepartmentsPage();

  const DeptCard = ({ dept }: { dept: DeptWithMembers }) => (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow w-56 shrink-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50/50">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary cursor-pointer shrink-0"
          onClick={() => router.push(`/departments/${dept.id}`)}
        >
          <Users className="h-4 w-4" />
        </div>
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => router.push(`/departments/${dept.id}`)}
        >
          <h3 className="text-sm font-semibold truncate">{dept.name}</h3>
          <p className="text-xs text-muted-foreground">{dept.members.length}名</p>
        </div>
      </div>
      {dept.members.length > 0 && (
        <div className="px-4 py-2.5">
          <div className="space-y-1.5">
            {dept.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => router.push(`/employees/${member.id}`)}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="bg-green-100 text-green-700 text-[10px] font-medium">
                    {(member.display_name ?? member.email)[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">
                    {member.display_name ?? member.email}
                  </p>
                  {member.position && (
                    <p className="text-[10px] text-muted-foreground truncate">{member.position}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderOrgTree = (dept: DeptWithMembers) => {
    const children = deptWithMembers.filter((d) => d.parent_id === dept.id);
    return (
      <div key={dept.id} className="flex flex-col items-center">
        <DeptCard dept={dept} />
        {children.length > 0 && (
          <>
            <div className="w-0.5 h-6 bg-gray-300" />
            <div className="flex">
              {children.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === children.length - 1;
                const isOnly = children.length === 1;
                return (
                  <div key={child.id} className="flex flex-col items-center px-4">
                    {isOnly ? (
                      <div className="w-0.5 h-6 bg-gray-300" />
                    ) : (
                      <div className="self-stretch -mx-4 h-6">
                        {isFirst ? (
                          <div className="h-full ml-[50%] border-l-2 border-t-2 border-gray-300 rounded-tl-lg" />
                        ) : isLast ? (
                          <div className="h-full mr-[50%] border-r-2 border-t-2 border-gray-300 rounded-tr-lg" />
                        ) : (
                          <div className="h-full border-t-2 border-gray-300 flex justify-center">
                            <div className="w-0.5 bg-gray-300 h-full" />
                          </div>
                        )}
                      </div>
                    )}
                    {renderOrgTree(child)}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={departmentsError} onRetry={() => mutate()} />
      <PageHeader
        title="部署管理"
        description="組織の部署を管理"
        sticky={false}
        border={false}
        action={<Button onClick={openAddDialog}>部署を追加</Button>}
      />

      <StickyFilterBar>
        <TabBar
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as typeof activeTab)}
        />
        {activeTab === "list" && <SearchBar value={search} onChange={setSearch} />}
      </StickyFilterBar>

      {activeTab === "list" && (
        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>部署名</TableHead>
                <TableHead>メンバー数</TableHead>
                <TableHead>作成日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    {search ? "一致する部署がありません" : "部署がありません"}
                  </TableCell>
                </TableRow>
              ) : (
                <DeptTreeRows
                  departments={filtered}
                  allDepartments={departments}
                  search={search}
                  onNavigate={(id) => router.push(`/departments/${id}`)}
                />
              )}
            </TableBody>
          </Table>
        </TableSection>
      )}

      {activeTab === "orgchart" && (
        <div className="relative overflow-hidden bg-gray-50 h-[calc(100dvh-7.5rem)]">
          {orgLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : deptWithMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">部署がありません</div>
          ) : (
            <div
              ref={containerRef}
              className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div
                className="inline-flex items-start gap-10 p-8 origin-top-left"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                {topLevelDepts.map((dept) => renderOrgTree(dept))}
              </div>
            </div>
          )}
          {deptWithMembers.length > 0 && (
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white rounded-lg shadow-md border p-1">
              <Button size="sm" variant="ghost" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button size="sm" variant="ghost" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-gray-200" />
              <Button size="sm" variant="ghost" onClick={resetView}>
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <EditPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="部署を追加"
        onSave={async () => {
          const result = await handleAdd();
          if (result.success) {
            showToast("部署を追加しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={savingAdd}
        saveDisabled={!newDeptName.trim()}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>部署名 *</Label>
            <Input
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="エンジニアリング"
            />
          </div>
          <div className="space-y-2">
            <Label>親部署</Label>
            <Select value={newParentId} onValueChange={(v) => setNewParentId(v ?? "none")}>
              <SelectTrigger>
                <SelectValue placeholder="なし">
                  {(v: string) =>
                    v === "none" ? "なし" : (departments.find((d) => d.id === v)?.name ?? v)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditPanel>

      <EditPanel
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="部署を編集"
        onSave={async () => {
          const result = await saveEdit();
          if (result.success) {
            showToast("部署を更新しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={savingEdit}
        saveDisabled={!editName.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>部署名 *</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="エンジニアリング"
            />
          </div>
          <div className="space-y-2">
            <Label>親部署</Label>
            <Select value={editParentId} onValueChange={(v) => setEditParentId(v ?? "none")}>
              <SelectTrigger>
                <SelectValue placeholder="なし">
                  {(v: string) =>
                    v === "none" ? "なし" : (departments.find((d) => d.id === v)?.name ?? v)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし</SelectItem>
                {departments
                  .filter((d) => {
                    if (!editingId) return true;
                    if (d.id === editingId) return false;
                    return !getDescendantIds(editingId).has(d.id);
                  })
                  .map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
