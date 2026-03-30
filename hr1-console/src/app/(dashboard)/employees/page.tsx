"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/toast";
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
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { useOrg } from "@/lib/org-context";
import { useEmployeesPage, type EmployeeWithDepts } from "@/lib/hooks/use-employees-page";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { validators, validateForm, type ValidationErrors } from "@/lib/validation";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { SearchBar } from "@/components/ui/search-bar";
import { SlidersHorizontal, X, Download, Upload, ChevronDown, Trash2 } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";
import { genderLabels } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { EmployeeImportDialog } from "./employee-import-dialog";

const addTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "departments", label: "部署" },
];

type ExportColumn = {
  key: string;
  label: string;
  getValue: (e: EmployeeWithDepts) => string;
};

const exportColumns: ExportColumn[] = [
  { key: "display_name", label: "氏名", getValue: (e) => e.display_name ?? "" },
  { key: "name_kana", label: "ふりがな", getValue: (e) => e.name_kana ?? "" },
  { key: "email", label: "メール", getValue: (e) => e.email },
  { key: "phone", label: "電話番号", getValue: (e) => e.phone ?? "" },
  { key: "position", label: "役職", getValue: (e) => e.position ?? "" },
  {
    key: "departments",
    label: "部署",
    getValue: (e) => e.departments.map((d) => d.name).join(", "),
  },
  { key: "hire_date", label: "入社日", getValue: (e) => e.hire_date ?? "" },
  { key: "birth_date", label: "生年月日", getValue: (e) => e.birth_date ?? "" },
  {
    key: "gender",
    label: "性別",
    getValue: (e) => (e.gender ? (genderLabels[e.gender] ?? e.gender) : ""),
  },
  {
    key: "current_postal_code",
    label: "現住所 郵便番号",
    getValue: (e) => e.current_postal_code ?? "",
  },
  {
    key: "current_prefecture",
    label: "現住所 都道府県",
    getValue: (e) => e.current_prefecture ?? "",
  },
  { key: "current_city", label: "現住所 市区町村", getValue: (e) => e.current_city ?? "" },
  {
    key: "current_street_address",
    label: "現住所 番地",
    getValue: (e) => e.current_street_address ?? "",
  },
  { key: "current_building", label: "現住所 建物名", getValue: (e) => e.current_building ?? "" },
  {
    key: "registered_postal_code",
    label: "住民票 郵便番号",
    getValue: (e) => e.registered_postal_code ?? "",
  },
  {
    key: "registered_prefecture",
    label: "住民票 都道府県",
    getValue: (e) => e.registered_prefecture ?? "",
  },
  { key: "registered_city", label: "住民票 市区町村", getValue: (e) => e.registered_city ?? "" },
  {
    key: "registered_street_address",
    label: "住民票 番地",
    getValue: (e) => e.registered_street_address ?? "",
  },
  {
    key: "registered_building",
    label: "住民票 建物名",
    getValue: (e) => e.registered_building ?? "",
  },
];

function exportFilename() {
  const now = new Date();
  return `社員名簿_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

function exportAsXlsx(employees: EmployeeWithDepts[]) {
  const rows = employees.map((e) => {
    const obj: Record<string, string> = {};
    exportColumns.forEach((col) => {
      obj[col.label] = col.getValue(e);
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "社員名簿");
  XLSX.writeFile(wb, `${exportFilename()}.xlsx`);
}

function exportAsCsv(employees: EmployeeWithDepts[]) {
  exportToCSV(
    employees.map((e) => {
      const obj: Record<string, string> = {};
      exportColumns.forEach((col) => {
        obj[col.key] = col.getValue(e);
      });
      return obj;
    }),
    exportColumns.map((col) => ({ key: col.key, label: col.label })),
    exportFilename()
  );
}

export default function EmployeesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { departments, employees, isLoading, employeesError, mutate, addEmployee, deleteEmployee } =
    useEmployeesPage();
  const [search, setSearch] = useState("");
  const [filterDeptId, setFilterDeptId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addTab, setAddTab] = useState("basic");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAddDialog = () => {
    setNewEmail("");
    setNewName("");
    setNewPosition("");
    setSelectedDeptIds([]);
    setFormErrors({});
    setAddTab("basic");
    setDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!organization) return;

    const errors = validateForm(
      {
        email: [validators.required("メールアドレス"), validators.email()],
        name: [validators.maxLength(100, "名前")],
        position: [validators.maxLength(100, "役職")],
      },
      { email: newEmail, name: newName, position: newPosition }
    );
    if (errors) {
      setFormErrors(errors);
      if (errors.email || errors.name || errors.position) setAddTab("basic");
      return;
    }
    setFormErrors({});
    setSaving(true);

    const result = await addEmployee(organization.id, {
      email: newEmail,
      display_name: newName || null,
      position: newPosition || null,
      department_ids: selectedDeptIds,
    });

    if (result.success) {
      setDialogOpen(false);
      showToast("社員を追加しました");
    } else {
      showToast(result.error ?? "社員の追加に失敗しました", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (emp: EmployeeWithDepts) => {
    if (!organization) return;
    if (!window.confirm(`${emp.display_name ?? emp.email} を組織から削除しますか？`)) return;
    setDeletingId(emp.id);
    const result = await deleteEmployee(organization.id, emp);
    if (result.success) {
      showToast("社員を削除しました");
    } else {
      showToast(result.error ?? "削除に失敗しました", "error");
    }
    setDeletingId(null);
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
    <div className="flex flex-col">
      <QueryErrorBanner error={employeesError} onRetry={() => mutate()} />
      <PageHeader
        title="社員一覧"
        description="社員の管理・招待"
        sticky={false}
        border={false}
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" disabled={employees.length === 0} />}
              >
                <Download className="mr-1.5 h-4 w-4" />
                エクスポート
                <ChevronDown className="ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportAsCsv(employees)}>CSV出力</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAsXlsx(employees)}>
                  スプレッドシート出力 (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              インポート
            </Button>
            <Button onClick={openAddDialog}>社員を追加</Button>
          </div>
        }
      />

      <div className="sticky top-14 z-10">
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
      </div>

      <div className="bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>役職</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={isLoading}
              isEmpty={filtered.length === 0}
              emptyMessage="社員がいません"
            >
              {filtered.map((emp) => (
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
                  <TableCell>
                    <button
                      type="button"
                      disabled={deletingId === emp.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(emp);
                      }}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
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
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setFormErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="example@company.com"
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="田中 太郎"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>役職</Label>
              <Input
                value={newPosition}
                onChange={(e) => {
                  setNewPosition(e.target.value);
                  setFormErrors((prev) => ({ ...prev, position: "" }));
                }}
                placeholder="マネージャー"
                className={formErrors.position ? "border-red-500" : ""}
              />
              {formErrors.position && <p className="text-sm text-red-500">{formErrors.position}</p>}
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

      {organization && (
        <EmployeeImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          organizationId={organization.id}
          departments={departments}
          onComplete={() => mutate()}
        />
      )}
    </div>
  );
}
