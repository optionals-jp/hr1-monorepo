"use client";

import { useState, useMemo } from "react";
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
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useQuery } from "@/lib/use-query";
import type { WikiPage } from "@/types/database";
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
import { Pencil, Eye, EyeOff, Search, FolderOpen } from "lucide-react";
import { mutate } from "swr";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useToast } from "@/components/ui/toast";

export default function WikiPage_() {
  const { organization } = useOrg();
  const { user } = useAuth();
  const { showToast } = useToast();

  const cacheKey = organization ? `wiki-pages-${organization.id}` : null;

  const {
    data: pages = [],
    isLoading,
    error: pagesError,
    mutate: mutatePages,
  } = useQuery<WikiPage[]>(cacheKey, async () => {
    const { data } = await getSupabase()
      .from("wiki_pages")
      .select("*")
      .eq("organization_id", organization!.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    return data ?? [];
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editPage, setEditPage] = useState<WikiPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [parentId, setParentId] = useState<string>("none");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    pages.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [pages]);

  const filteredPages = useMemo(() => {
    let result = pages;
    if (filterCategory !== "all") {
      result = result.filter((p) => p.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [pages, filterCategory, searchQuery]);

  function openCreate() {
    setEditPage(null);
    setTitle("");
    setContent("");
    setCategory("");
    setNewCategory("");
    setParentId("none");
    setEditOpen(true);
  }

  function openEdit(page: WikiPage) {
    setEditPage(page);
    setTitle(page.title);
    setContent(page.content);
    setCategory(page.category ?? "");
    setNewCategory("");
    setParentId(page.parent_id ?? "none");
    setEditOpen(true);
  }

  async function handleSave() {
    if (!organization || !user || !title.trim()) return;
    setSaving(true);
    const resolvedCategory = newCategory.trim() || category || null;
    try {
      if (editPage) {
        const { error } = await getSupabase()
          .from("wiki_pages")
          .update({
            title: title.trim(),
            content,
            category: resolvedCategory,
            parent_id: parentId === "none" ? null : parentId,
            updated_by: user.id,
          })
          .eq("id", editPage.id)
          .eq("organization_id", organization.id);
        if (error) {
          showToast("操作に失敗しました", "error");
          return;
        }
      } else {
        const maxOrder = pages.length > 0 ? Math.max(...pages.map((p) => p.sort_order)) + 1 : 0;
        const { error } = await getSupabase()
          .from("wiki_pages")
          .insert({
            organization_id: organization.id,
            title: title.trim(),
            content,
            category: resolvedCategory,
            parent_id: parentId === "none" ? null : parentId,
            created_by: user.id,
            sort_order: maxOrder,
          });
        if (error) {
          showToast("操作に失敗しました", "error");
          return;
        }
      }
      await mutate(cacheKey);
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editPage || !organization) return;
    setDeleting(true);
    try {
      const { error } = await getSupabase()
        .from("wiki_pages")
        .delete()
        .eq("id", editPage.id)
        .eq("organization_id", organization.id);
      if (error) {
        showToast("操作に失敗しました", "error");
        return;
      }
      await mutate(cacheKey);
      setEditOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  async function togglePublished(page: WikiPage) {
    if (!organization) return;
    const newVal = !page.is_published;
    const { error } = await getSupabase()
      .from("wiki_pages")
      .update({ is_published: newVal, updated_by: user?.id })
      .eq("id", page.id)
      .eq("organization_id", organization.id);
    if (error) {
      showToast("操作に失敗しました", "error");
      return;
    }
    await mutate(cacheKey);
  }

  function getParentTitle(parentId: string | null) {
    if (!parentId) return null;
    const parent = pages.find((p) => p.id === parentId);
    return parent?.title ?? null;
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="社内Wiki"
        description="社内ドキュメント・ナレッジベースの管理"
        sticky={false}
        action={<Button onClick={openCreate}>ページを作成</Button>}
      />

      <QueryErrorBanner error={pagesError} onRetry={() => mutatePages()} />

      <div className="px-4 sm:px-6 md:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タイトル・本文で検索"
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのカテゴリ</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white">
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
              isLoading={isLoading}
              isEmpty={filteredPages.length === 0}
              emptyMessage="Wikiページがありません"
            >
              {filteredPages.map((page) => (
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
                    {getParentTitle(page.parent_id) ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span className="truncate max-w-32">{getParentTitle(page.parent_id)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => togglePublished(page)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
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
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(page.updated_at), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(page)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </div>

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editPage ? "ページを編集" : "ページを作成"}
        onSave={handleSave}
        saving={saving}
        saveDisabled={!title.trim()}
        onDelete={editPage ? handleDelete : undefined}
        deleting={deleting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タイトル</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ページタイトルを入力"
            />
          </div>
          <div className="space-y-2">
            <Label>本文</Label>
            <MarkdownEditor value={content} onChange={setContent} rows={12} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>カテゴリ</Label>
              {categories.length > 0 ? (
                <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">未分類</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="新しいカテゴリ名"
              />
            </div>
            <div className="space-y-2">
              <Label>親ページ</Label>
              <Select value={parentId} onValueChange={(v) => setParentId(v ?? "none")}>
                <SelectTrigger>
                  <SelectValue placeholder="なし" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {pages
                    .filter((p) => p.id !== editPage?.id)
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
