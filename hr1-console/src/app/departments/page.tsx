"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Department } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { Trash2, Pencil, Users, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface DeptMember {
  id: string;
  email: string;
  display_name: string | null;
  position: string | null;
}

interface DeptWithMembers extends Department {
  members: DeptMember[];
}

const pageTabs = [
  { value: "list", label: "一覧" },
  { value: "orgchart", label: "組織図" },
];

export default function DepartmentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useState("list");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newParentId, setNewParentId] = useState<string>("none");
  const [savingAdd, setSavingAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState<string>("none");
  const [savingEdit, setSavingEdit] = useState(false);

  // 組織図パン＆ズーム
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // wheelイベントはpassive: falseでネイティブ登録（ReactのonWheelはpassiveのためpreventDefaultが効かない）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((z) => Math.min(2, Math.max(0.3, z + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, []);

  const handlePointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const {
    data: departments = [],
    isLoading,
    error: departmentsError,
    mutate,
  } = useQuery<Department[]>(organization ? `departments-${organization.id}` : null, async () => {
    const { data } = await getSupabase()
      .from("departments")
      .select("*")
      .eq("organization_id", organization!.id)
      .order("name");
    return data ?? [];
  });

  const {
    data: deptWithMembers = [],
    isLoading: orgLoading,
    mutate: mutateOrg,
  } = useQuery<DeptWithMembers[]>(
    organization && activeTab === "orgchart" ? `dept-members-${organization.id}` : null,
    async () => {
      const [{ data: deptData }, { data: edData }] = await Promise.all([
        getSupabase()
          .from("departments")
          .select("*")
          .eq("organization_id", organization!.id)
          .order("name"),
        getSupabase()
          .from("employee_departments")
          .select("department_id, profiles:user_id(id, email, display_name, position)")
          .in(
            "department_id",
            (
              await getSupabase()
                .from("departments")
                .select("id")
                .eq("organization_id", organization!.id)
            ).data?.map((d) => d.id) ?? []
          ),
      ]);

      const memberMap = new Map<string, DeptMember[]>();
      for (const row of edData ?? []) {
        const ed = row as unknown as { department_id: string; profiles: DeptMember };
        if (!ed.profiles) continue;
        const list = memberMap.get(ed.department_id) ?? [];
        list.push(ed.profiles);
        memberMap.set(ed.department_id, list);
      }

      return (deptData ?? []).map((dept) => ({
        ...dept,
        members: memberMap.get(dept.id) ?? [],
      }));
    }
  );

  const openAddDialog = () => {
    setNewDeptName("");
    setNewParentId("none");
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!organization || !newDeptName.trim()) return;
    setSavingAdd(true);

    try {
      const { error } = await getSupabase()
        .from("departments")
        .insert({
          id: crypto.randomUUID(),
          organization_id: organization.id,
          name: newDeptName.trim(),
          parent_id: newParentId === "none" ? null : newParentId,
        });
      if (error) throw error;

      setDialogOpen(false);
      mutate();
      mutateOrg();
      showToast("部署を追加しました");
    } catch {
      showToast("部署の追加に失敗しました", "error");
    } finally {
      setSavingAdd(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await getSupabase().from("departments").delete().eq("id", id);
      if (error) throw error;

      mutate();
      mutateOrg();
      showToast("部署を削除しました");
    } catch {
      showToast("部署の削除に失敗しました", "error");
    }
  };

  const startEditing = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditParentId(dept.parent_id ?? "none");
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);

    try {
      const { error } = await getSupabase()
        .from("departments")
        .update({
          name: editName.trim(),
          parent_id: editParentId === "none" ? null : editParentId,
        })
        .eq("id", editingId);
      if (error) throw error;

      setEditingId(null);
      setEditDialogOpen(false);
      mutate();
      mutateOrg();
      showToast("部署を更新しました");
    } catch {
      showToast("部署の更新に失敗しました", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = departments.filter(
    (d) => !search || d.name.toLowerCase().includes(search.toLowerCase())
  );

  // 指定部署の子孫IDを全て取得（循環参照防止用）
  const getDescendantIds = (deptId: string): Set<string> => {
    const ids = new Set<string>();
    const collect = (id: string) => {
      for (const d of departments) {
        if (d.parent_id === id && !ids.has(d.id)) {
          ids.add(d.id);
          collect(d.id);
        }
      }
    };
    collect(deptId);
    return ids;
  };

  // 親部署名を取得
  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    return departments.find((d) => d.id === parentId)?.name ?? null;
  };

  // 部署カードコンポーネント
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
        <Button size="sm" variant="ghost" className="shrink-0" onClick={() => startEditing(dept)}>
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

  // 組織図: 上から下へのツリーレイアウト
  const renderOrgTree = (dept: DeptWithMembers) => {
    const children = deptWithMembers.filter((d) => d.parent_id === dept.id);
    return (
      <div key={dept.id} className="flex flex-col items-center">
        <DeptCard dept={dept} />
        {children.length > 0 && (
          <>
            {/* 親から下への縦線 */}
            <div className="w-0.5 h-6 bg-gray-300" />
            {/* 子ノードを横に並べる */}
            <div className="flex">
              {children.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === children.length - 1;
                const isOnly = children.length === 1;
                return (
                  <div key={child.id} className="flex flex-col items-center px-4">
                    {/* 接続線（-mx-4でパディング領域まで拡張） */}
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

  const rootDepts = deptWithMembers.filter((d) => !d.parent_id);
  const orphanDepts = deptWithMembers.filter(
    (d) => d.parent_id && !deptWithMembers.some((p) => p.id === d.parent_id)
  );
  const topLevelDepts = [...rootDepts, ...orphanDepts];

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

      <div className="sticky top-14 z-10">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8 bg-white">
          {pageTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                activeTab === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
        {activeTab === "list" && <SearchBar value={search} onChange={setSearch} />}
      </div>

      {activeTab === "list" && (
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {search ? "一致する部署がありません" : "部署がありません"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((dept) => (
                  <TableRow
                    key={dept.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/departments/${dept.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium">{dept.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getParentName(dept.parent_id) ?? "-"}
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
                            startEditing(dept);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(dept.id);
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
          {/* ズームコントロール */}
          {deptWithMembers.length > 0 && (
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white rounded-lg shadow-md border p-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
              >
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
        onSave={handleAdd}
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
        onSave={saveEdit}
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
