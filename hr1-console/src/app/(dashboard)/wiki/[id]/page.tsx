"use client";

import { useParams } from "next/navigation";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useWikiPageDetail } from "@/lib/hooks/use-wiki";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { MarkdownEditor, markdownToHtml } from "@/components/ui/markdown-editor";
import { format } from "date-fns";
import { Pencil, Eye, EyeOff } from "lucide-react";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { useToast } from "@hr1/shared-ui/components/ui/toast";

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

  const { showToast } = useToast();

  const {
    page,
    isLoading,
    pageError,
    mutatePage,
    editing,
    setEditing,
    saving,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    startEdit,
    handleSave,
    togglePublished,
  } = useWikiPageDetail(id);

  async function onSave() {
    const result = await handleSave();
    if (!result.success && result.error) {
      showToast(result.error, "error");
    }
  }

  async function onTogglePublished() {
    const result = await togglePublished();
    if (!result.success && result.error) {
      showToast(result.error, "error");
    }
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
            <Button variant="ghost" size="icon-xs" onClick={onTogglePublished}>
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
              <Button onClick={onSave} disabled={saving || !editTitle.trim()}>
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
