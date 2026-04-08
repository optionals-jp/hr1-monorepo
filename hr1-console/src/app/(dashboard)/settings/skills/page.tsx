"use client";

import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { SearchBar } from "@hr1/shared-ui/components/ui/search-bar";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@hr1/shared-ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@hr1/shared-ui/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSkillMastersPage } from "@/lib/hooks/use-settings";
import { Plus, X, SlidersHorizontal, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SkillsSettingsPage() {
  const router = useRouter();
  const h = useSkillMastersPage();
  const [dialogOpen, setDialogOpen] = useState(false);

  const existingCategories = [
    ...new Set(h.masters.map((m) => m.category).filter(Boolean)),
  ] as string[];

  const openAddDialog = () => {
    h.setNewName("");
    h.setNewCategory("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    await h.handleAdd();
    setDialogOpen(false);
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="スキルマスタ"
        description="社員が選択できるスキルの一覧を管理します"
        sticky={false}
        border={false}
        action={
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-1.5" />
            スキルを追加
          </Button>
        }
      />

      <StickyFilterBar>
        <SearchBar value={h.search} onChange={h.setSearch} placeholder="スキル名・カテゴリで検索" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">カテゴリ</span>
            {h.filterCategory !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  {h.filterCategory}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      h.setFilterCategory("all");
                    }}
                    className="ml-0.5 hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto py-2 max-h-80 overflow-y-auto">
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterCategory("all")}>
              <span className={cn(h.filterCategory === "all" && "font-medium")}>すべて</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {h.categories.map((cat) => (
              <DropdownMenuItem key={cat} className="py-2" onClick={() => h.setFilterCategory(cat)}>
                <span className={cn(h.filterCategory === cat && "font-medium")}>{cat}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </StickyFilterBar>

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>スキル名</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>種別</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={h.loading}
              isEmpty={h.filtered.length === 0}
              emptyMessage="スキルが見つかりません"
            >
              {h.filtered.map((master) => {
                const isSystem = master.organization_id === null;
                return (
                  <TableRow
                    key={master.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/settings/skills/${master.id}`)}
                  >
                    <TableCell className="font-medium">{master.name}</TableCell>
                    <TableCell>{master.category ?? "未分類"}</TableCell>
                    <TableCell>
                      {isSystem ? (
                        <Badge variant="outline">共通</Badge>
                      ) : (
                        <Badge variant="secondary">自社</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isSystem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            h.handleDelete(master);
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      {/* 追加ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>スキルを追加</DialogTitle>
            <DialogDescription>
              自社専用のスキルを追加します。共通スキルは全企業で共有されています。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>スキル名 *</Label>
              <Input
                value={h.newName}
                onChange={(e) => h.setNewName(e.target.value)}
                placeholder="スキル名を入力"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              <Input
                value={h.newCategory}
                onChange={(e) => h.setNewCategory(e.target.value)}
                placeholder="カテゴリ（任意）"
                list="skill-categories"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <datalist id="skill-categories">
                {existingCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={h.adding || !h.newName.trim()}>
              {h.adding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  追加中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  追加
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
