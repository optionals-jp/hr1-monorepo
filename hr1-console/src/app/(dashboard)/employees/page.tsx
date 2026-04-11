"use client";

import * as XLSX from "xlsx";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { Checkbox } from "@hr1/shared-ui/components/ui/checkbox";
import { EditPanel, type EditPanelTab } from "@hr1/shared-ui/components/ui/edit-panel";
import { useEmployeesPage, type EmployeeWithDepts } from "@/lib/hooks/use-employees-page";

import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
import { StickyFilterBar } from "@hr1/shared-ui/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { SlidersHorizontal, X, Download, Upload, ChevronDown } from "lucide-react";
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
  const h = useEmployeesPage();

  return (
    <div className="flex flex-col">
      <QueryErrorBanner error={h.employeesError} onRetry={() => h.mutate()} />
      <PageHeader
        title="社員一覧"
        description="社員の管理・招待"
        sticky={false}
        border={false}
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" disabled={h.employees.length === 0} />}
              >
                <Download className="mr-1.5 h-4 w-4" />
                エクスポート
                <ChevronDown className="ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportAsCsv(h.employees)}>
                  CSV出力
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAsXlsx(h.employees)}>
                  スプレッドシート出力 (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => h.setImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              インポート
            </Button>
            <Button onClick={h.openAddDialog}>社員を追加</Button>
          </div>
        }
      />

      <StickyFilterBar>
        <SearchBar value={h.search} onChange={h.setSearch} />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {h.filterDeptId !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  部署：
                  {h.filterDeptId === "none"
                    ? "未所属"
                    : h.departments.find((d) => d.id === h.filterDeptId)?.name}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      h.setFilterDeptId("all");
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
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterDeptId("all")}>
              <span className={cn(h.filterDeptId === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {h.departments.map((dept) => (
              <DropdownMenuItem
                key={dept.id}
                className="py-2"
                onClick={() => h.setFilterDeptId(dept.id)}
              >
                <span className={cn(h.filterDeptId === dept.id && "font-medium")}>{dept.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterDeptId("none")}>
              <span className={cn(h.filterDeptId === "none" && "font-medium")}>未所属</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
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
            <TableEmptyState
              colSpan={5}
              isLoading={h.isLoading}
              isEmpty={h.filtered.length === 0}
              emptyMessage="社員がいません"
            >
              {h.filtered.map((emp) => (
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
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={h.dialogOpen}
        onOpenChange={h.setDialogOpen}
        title="社員を追加"
        tabs={addTabs}
        activeTab={h.addTab}
        onTabChange={h.setAddTab}
        onSave={async () => {
          const result = await h.handleAdd();
          if (result.success) {
            showToast("社員を追加しました");
          } else if (result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.saving}
        saveDisabled={!h.newEmail}
        saveLabel="追加"
      >
        {h.addTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>メールアドレス *</Label>
              <Input
                type="email"
                value={h.newEmail}
                onChange={(e) => h.updateNewEmail(e.target.value)}
                placeholder="example@company.com"
                className={h.formErrors.email ? "border-red-500" : ""}
              />
              {h.formErrors.email && <p className="text-sm text-red-500">{h.formErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                value={h.newName}
                onChange={(e) => h.updateNewName(e.target.value)}
                placeholder="田中 太郎"
                className={h.formErrors.name ? "border-red-500" : ""}
              />
              {h.formErrors.name && <p className="text-sm text-red-500">{h.formErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>役職</Label>
              <Input
                value={h.newPosition}
                onChange={(e) => h.updateNewPosition(e.target.value)}
                placeholder="マネージャー"
                className={h.formErrors.position ? "border-red-500" : ""}
              />
              {h.formErrors.position && (
                <p className="text-sm text-red-500">{h.formErrors.position}</p>
              )}
            </div>
          </div>
        )}
        {h.addTab === "departments" && (
          <div className="space-y-3">
            {h.departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">部署管理から部署を追加してください</p>
            ) : (
              h.departments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={h.selectedDeptIds.includes(dept.id)}
                    onCheckedChange={() => h.toggleDept(dept.id)}
                  />
                  <span className="text-sm">{dept.name}</span>
                </label>
              ))
            )}
          </div>
        )}
      </EditPanel>

      {h.organization && (
        <EmployeeImportDialog
          open={h.importOpen}
          onOpenChange={h.setImportOpen}
          organizationId={h.organization.id}
          departments={h.departments}
          onComplete={() => h.mutate()}
        />
      )}
    </div>
  );
}
