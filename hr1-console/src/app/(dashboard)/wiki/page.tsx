"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { Badge } from "@/components/ui/badge";
import { EditPanel } from "@/components/ui/edit-panel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Pencil, Eye, EyeOff, FolderOpen, SlidersHorizontal, X } from "lucide-react";
import { SearchBar } from "@/components/ui/search-bar";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { TableSection } from "@/components/layout/table-section";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { useWikiPageEditor } from "@/lib/hooks/use-wiki";

export default function WikiPage_() {
  const { showToast } = useToast();
  const h = useWikiPageEditor();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="社内Wiki"
        description="社内ドキュメント・ナレッジベースの管理"
        sticky={false}
        border={false}
        action={<Button onClick={h.openCreate}>ページを作成</Button>}
      />

      <QueryErrorBanner error={h.pagesError} onRetry={() => h.mutatePages()} />

      <StickyFilterBar>
        <SearchBar
          value={h.searchQuery}
          onChange={h.setSearchQuery}
          placeholder="タイトル・本文で検索"
        />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 w-full h-12 bg-white px-4 sm:px-6 md:px-8 cursor-pointer">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground shrink-0">フィルター</span>
            {h.filterCategory !== "all" && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <Badge variant="secondary" className="shrink-0 gap-1 text-sm py-3 px-3">
                  カテゴリ：{h.filterCategory}
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
          <DropdownMenuContent align="start" className="w-auto py-2">
            <DropdownMenuItem className="py-2" onClick={() => h.setFilterCategory("all")}>
              <span className={cn(h.filterCategory === "all" && "font-medium")}>
                すべてのカテゴリ
              </span>
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
              <TableHead>タイトル</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>親ページ</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>更新日</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={6}
              isLoading={h.isLoading}
              isEmpty={h.filteredPages.length === 0}
              emptyMessage="Wikiページがありません"
            >
              {h.filteredPages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium max-w-sm">
                    <div className="truncate">{page.title}</div>
                  </TableCell>
                  <TableCell>
                    {page.category ? (
                      <Badge variant="outline">{page.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {h.getParentTitle(page.parent_id) ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span className="truncate max-w-32">
                          {h.getParentTitle(page.parent_id)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={async () => {
                        const result = await h.togglePublished(page);
                        if (!result.success && result.error) {
                          showToast(result.error, "error");
                        }
                      }}
                    >
                      {page.is_published ? (
                        <Badge variant="default" className="gap-1">
                          <Eye className="h-3 w-3" />
                          公開
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <EyeOff className="h-3 w-3" />
                          下書き
                        </Badge>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(page.updated_at), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => h.openEdit(page)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={h.editOpen}
        onOpenChange={h.setEditOpen}
        title={h.editPage ? "ページを編集" : "ページを作成"}
        onSave={async () => {
          const result = await h.handleSave();
          if (!result.success && result.error) {
            showToast(result.error, "error");
          }
        }}
        saving={h.saving}
        saveDisabled={!h.title.trim()}
        onDelete={
          h.editPage
            ? async () => {
                const result = await h.handleDelete();
                if (!result.success && result.error) {
                  showToast(result.error, "error");
                }
              }
            : undefined
        }
        deleting={h.deleting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タイトル</Label>
            <Input
              value={h.title}
              onChange={(e) => h.setTitle(e.target.value)}
              placeholder="ページタイトルを入力"
            />
          </div>
          <div className="space-y-2">
            <Label>本文</Label>
            <MarkdownEditor value={h.content} onChange={h.setContent} rows={12} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              {h.categories.length > 0 ? (
                <Select value={h.category} onValueChange={(v) => h.setCategory(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未分類</SelectItem>
                    {h.categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                value={h.newCategory}
                onChange={(e) => h.setNewCategory(e.target.value)}
                placeholder="新しいカテゴリ名"
              />
            </div>
            <div className="space-y-2">
              <Label>親ページ</Label>
              <Select value={h.parentId} onValueChange={(v) => h.setParentId(v ?? "none")}>
                <SelectTrigger>
                  <SelectValue placeholder="なし" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {h.pages
                    .filter((p) => p.id !== h.editPage?.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
