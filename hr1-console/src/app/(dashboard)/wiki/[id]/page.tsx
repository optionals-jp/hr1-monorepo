"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import { useQuery } from "@/lib/use-query";
import type { WikiPage } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MarkdownEditor, markdownToHtml } from "@/components/ui/markdown-editor";
import { format } from "date-fns";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useToast } from "@/components/ui/toast";

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:my-1.5 [&_p]:leading-relaxed [&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-1.5 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5 [&_strong]:font-semibold [&_em]:italic [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:text-xs [&_code]:font-mono [&_hr]:my-3 [&_hr]:border-border [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:my-2 [&_a]:text-primary [&_a]:underline [&_.empty-line]:h-3"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  );
}

export default function WikiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const { user } = useAuth();
  const { showToast } = useToast();

  const cacheKey = organization && id ? `wiki-page-${organization.id}-${id}` : null;

  const {
    data: page,
    isLoading,
    error: pageError,
    mutate: mutatePage,
  } = useQuery<WikiPage | null>(cacheKey, async () => {
    const { data } = await getSupabase()
      .from("wiki_pages")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organization!.id)
      .single();
    return data ?? null;
  });

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  function startEdit() {
    if (!page) return;
    setEditTitle(page.title);
    setEditContent(page.content);
    setEditing(true);
  }

  async function handleSave() {
    if (!page || !user) return;
    setSaving(true);
    try {
      const { error } = await getSupabase()
        .from("wiki_pages")
        .update({
          title: editTitle.trim(),
          content: editContent,
          updated_by: user.id,
        })
        .eq("id", page.id)
        .eq("organization_id", organization!.id);
      if (error) {
        showToast("操作に失敗しました", "error");
        return;
      }
      await mutatePage();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    if (!page || !user) return;
    const { error } = await getSupabase()
      .from("wiki_pages")
      .update({ is_published: !page.is_published, updated_by: user.id })
      .eq("id", page.id)
      .eq("organization_id", organization!.id);
    if (error) {
      showToast("操作に失敗しました", "error");
      return;
    }
    await mutatePage();
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="読み込み中..."
          breadcrumb={[{ label: "社内Wiki", href: "/wiki" }]}
          sticky={false}
        />
        <PageContent>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-2/3" />
          </div>
        </PageContent>
      </div>
    );
  }

  if (pageError || !page) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="ページが見つかりません"
          breadcrumb={[{ label: "社内Wiki", href: "/wiki" }]}
          sticky={false}
        />
        <QueryErrorBanner error={pageError} onRetry={() => mutatePage()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={page.title}
        breadcrumb={[{ label: "社内Wiki", href: "/wiki" }]}
        sticky={false}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePublished}
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
            {!editing && (
              <Button variant="outline" onClick={startEdit}>
                <Pencil className="h-4 w-4 mr-1.5" />
                編集
              </Button>
            )}
          </div>
        }
      />

      <PageContent>
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>本文</Label>
              <MarkdownEditor value={editContent} onChange={setEditContent} rows={20} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving || !editTitle.trim()}>
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground">
              {page.category && <Badge variant="outline">{page.category}</Badge>}
              <span>更新日: {format(new Date(page.updated_at), "yyyy/MM/dd HH:mm")}</span>
            </div>
            <MarkdownPreview content={page.content} />
          </div>
        )}
      </PageContent>
    </div>
  );
}
