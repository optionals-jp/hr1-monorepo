"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Department } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/ui/search-bar";
import { SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface EmployeeWithDepts {
  id: string;
  email: string;
  display_name: string | null;
  position: string | null;
  departments: { id: string; name: string }[];
}

const addTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "departments", label: "部署" },
];

export default function EmployeesPage() {
  const router = useRouter();
  const { organization } = useOrg();
  const [search, setSearch] = useState("");
  const [filterDeptId, setFilterDeptId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addTab, setAddTab] = useState("basic");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: departments = [] } = useQuery<Department[]>(
    organization ? `departments-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("departments")
        .select("*")
        .eq("organization_id", organization!.id)
        .order("name");
      return data ?? [];
    }
  );

  const {
    data: employees = [],
    isLoading,
    mutate,
  } = useQuery<EmployeeWithDepts[]>(
    organization ? `employees-${organization.id}` : null,
    async () => {
      const { data } = await getSupabase()
        .from("user_organizations")
        .select("profiles(id, email, display_name, position)")
        .eq("organization_id", organization!.id)
        .eq("profiles.role", "employee");

      const profiles = (data ?? [])
        .map(
          (row) =>
            (
              row as unknown as {
                profiles: {
                  id: string;
                  email: string;
                  display_name: string | null;
                  position: string | null;
                };
              }
            ).profiles
        )
        .filter(Boolean);

      if (profiles.length === 0) return [];

      const { data: edData } = await getSupabase()
        .from("employee_departments")
        .select("user_id, departments(id, name)")
        .in(
          "user_id",
          profiles.map((p) => p.id)
        );

      const deptMap = new Map<string, { id: string; name: string }[]>();
      for (const ed of edData ?? []) {
        const dept = ed as unknown as {
          user_id: string;
          departments: { id: string; name: string };
        };
        if (!dept.departments) continue;
        const list = deptMap.get(dept.user_id) ?? [];
        list.push(dept.departments);
        deptMap.set(dept.user_id, list);
      }

      return profiles.map((p) => ({
        ...p,
        departments: deptMap.get(p.id) ?? [],
      }));
    }
  );

  const openAddDialog = () => {
    setNewEmail("");
    setNewName("");
    setNewPosition("");
    setSelectedDeptIds([]);
    setAddTab("basic");
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!organization || !newEmail) return;
    setSaving(true);

    const id = crypto.randomUUID();
    await getSupabase()
      .from("profiles")
      .insert({
        id,
        email: newEmail,
        display_name: newName || null,
        role: "employee",
        position: newPosition || null,
      });

    await getSupabase().from("user_organizations").insert({
      user_id: id,
      organization_id: organization.id,
    });

    if (selectedDeptIds.length > 0) {
      await getSupabase()
        .from("employee_departments")
        .insert(selectedDeptIds.map((deptId) => ({ user_id: id, department_id: deptId })));
    }

    setSaving(false);
    setDialogOpen(false);
    mutate();
  };

  const toggleDept = (deptId: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const filtered = employees.filter((e) => {
    const matchesSearch =
      !search ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.departments.some((d) => d.name.toLowerCase().includes(search.toLowerCase()));
    const matchesDept =
      filterDeptId === "all" ||
      (filterDeptId === "none"
        ? e.departments.length === 0
        : e.departments.some((d) => d.id === filterDeptId));
    return matchesSearch && matchesDept;
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="社員一覧"
        description="社員の管理・招待"
        action={<Button onClick={openAddDialog}>社員を追加</Button>}
        border={false}
      />

      <SearchBar value={search} onChange={setSearch} />
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white border-b px-4 sm:px-6 md:px-8 cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
          {filterDeptId !== "all" && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                部署：
                {filterDeptId === "none"
                  ? "未所属"
                  : departments.find((d) => d.id === filterDeptId)?.name}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterDeptId("all");
                  }}
                  className="ml-0.5 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-auto py-2">
          <DropdownMenuItem className="py-2" onClick={() => setFilterDeptId("all")}>
            <span className={cn(filterDeptId === "all" && "font-medium")}>すべて</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {departments.map((dept) => (
            <DropdownMenuItem
              key={dept.id}
              className="py-2"
              onClick={() => setFilterDeptId(dept.id)}
            >
              <span className={cn(filterDeptId === dept.id && "font-medium")}>{dept.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="py-2" onClick={() => setFilterDeptId("none")}>
            <span className={cn(filterDeptId === "none" && "font-medium")}>未所属</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 overflow-y-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>役職</TableHead>
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
                  社員がいません
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/employees/${emp.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                          {(emp.display_name ?? emp.email)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{emp.display_name ?? "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{emp.email}</TableCell>
                  <TableCell>
                    {emp.departments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {emp.departments.map((d) => (
                          <Badge key={d.id} variant="secondary">
                            {d.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{emp.position ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="社員を追加"
        tabs={addTabs}
        activeTab={addTab}
        onTabChange={setAddTab}
        onSave={handleAdd}
        saving={saving}
        saveDisabled={!newEmail}
        saveLabel="追加"
      >
        {addTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>メールアドレス *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="example@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="田中 太郎"
              />
            </div>
            <div className="space-y-2">
              <Label>役職</Label>
              <Input
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="マネージャー"
              />
            </div>
          </div>
        )}
        {addTab === "departments" && (
          <div className="space-y-3">
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">部署管理から部署を追加してください</p>
            ) : (
              departments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedDeptIds.includes(dept.id)}
                    onCheckedChange={() => toggleDept(dept.id)}
                  />
                  <span className="text-sm">{dept.name}</span>
                </label>
              ))
            )}
          </div>
        )}
      </EditPanel>
    </div>
  );
}
