"use client";

import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { useDepartmentsPage, type DeptWithMembers } from "@/lib/hooks/use-departments-page";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { Trash2, Pencil, Users, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

const pageTabs = [
  { value: "list", label: "一覧" },
  { value: "orgchart", label: "組織図" },
];

export default function DepartmentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const h = useDepartmentsPage();

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
        <Button size="sm" variant="ghost" className="shrink-0" onClick={() => h.startEditing(dept)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
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
    const children = h.deptWithMembers.filter((d) => d.parent_id === dept.id);
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
      <QueryErrorBanner error={h.departmentsError} onRetry={() => h.mutate()} />
      <PageHeader
        title="部署管理"
        description="組織の部署を管理"
        sticky={false}
        border={false}
        action={<Button onClick={h.openAddDialog}>部署を追加</Button>}
      />

      <div className="sticky top-14 z-10">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8 bg-white">
          {pageTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => h.setActiveTab(tab.value)}
              className={cn(
                "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                h.activeTab === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {h.activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
        {h.activeTab === "list" && <SearchBar value={h.search} onChange={h.setSearch} />}
      </div>

      {h.activeTab === "list" && (
        <div className="bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>部署名</TableHead>
                <TableHead>親部署</TableHead>
                <TableHead>作成日</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {h.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : h.filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {h.search ? "一致する部署がありません" : "部署がありません"}
                  </TableCell>
                </TableRow>
              ) : (
                h.filtered.map((dept) => (
                  <TableRow
                    key={dept.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/departments/${dept.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium">{dept.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.getParentName(dept.parent_id) ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(dept.created_at), "yyyy/MM/dd")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            h.startEditing(dept);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const result = await h.handleDelete(dept.id);
                            if (result.success) {
                              showToast("部署を削除しました");
                            } else {
                              showToast(result.error ?? "部署の削除に失敗しました", "error");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {h.activeTab === "orgchart" && (
        <div className="relative overflow-hidden bg-gray-50 h-[calc(100dvh-7.5rem)]">
          {h.orgLoading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : h.deptWithMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">部署がありません</div>
          ) : (
            <div
              ref={h.containerRef}
              className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={h.handlePointerDown}
              onPointerMove={h.handlePointerMove}
              onPointerUp={h.handlePointerUp}
            >
              <div
                className="inline-flex items-start gap-10 p-8 origin-top-left"
                style={{
                  transform: `translate(${h.pan.x}px, ${h.pan.y}px) scale(${h.zoom})`,
                }}
              >
                {h.topLevelDepts.map((dept) => renderOrgTree(dept))}
              </div>
            </div>
          )}
          {h.deptWithMembers.length > 0 && (
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white rounded-lg shadow-md border p-1">
              <Button size="sm" variant="ghost" onClick={h.zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">
                {Math.round(h.zoom * 100)}%
              </span>
              <Button size="sm" variant="ghost" onClick={h.zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-gray-200" />
              <Button size="sm" variant="ghost" onClick={h.resetView}>
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <EditPanel
        open={h.dialogOpen}
        onOpenChange={h.setDialogOpen}
        title="部署を追加"
        onSave={async () => {
          const result = await h.handleAdd();
          if (result.success) {
            showToast("部署を追加しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.savingAdd}
        saveDisabled={!h.newDeptName.trim()}
        saveLabel="追加"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>部署名 *</Label>
            <Input
              value={h.newDeptName}
              onChange={(e) => h.setNewDeptName(e.target.value)}
              placeholder="エンジニアリング"
            />
          </div>
          <div className="space-y-2">
            <Label>親部署</Label>
            <Select value={h.newParentId} onValueChange={(v) => h.setNewParentId(v ?? "none")}>
              <SelectTrigger>
                <SelectValue placeholder="なし">
                  {(v: string) =>
                    v === "none" ? "なし" : (h.departments.find((d) => d.id === v)?.name ?? v)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし</SelectItem>
                {h.departments.map((dept) => (
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
        open={h.editDialogOpen}
        onOpenChange={h.setEditDialogOpen}
        title="部署を編集"
        onSave={async () => {
          const result = await h.saveEdit();
          if (result.success) {
            showToast("部署を更新しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.savingEdit}
        saveDisabled={!h.editName.trim()}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>部署名 *</Label>
            <Input
              value={h.editName}
              onChange={(e) => h.setEditName(e.target.value)}
              placeholder="エンジニアリング"
            />
          </div>
          <div className="space-y-2">
            <Label>親部署</Label>
            <Select value={h.editParentId} onValueChange={(v) => h.setEditParentId(v ?? "none")}>
              <SelectTrigger>
                <SelectValue placeholder="なし">
                  {(v: string) =>
                    v === "none" ? "なし" : (h.departments.find((d) => d.id === v)?.name ?? v)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし</SelectItem>
                {h.departments
                  .filter((d) => {
                    if (!h.editingId) return true;
                    if (d.id === h.editingId) return false;
                    return !h.getDescendantIds(h.editingId).has(d.id);
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
