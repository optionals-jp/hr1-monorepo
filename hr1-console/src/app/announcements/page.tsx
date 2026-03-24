"use client";

import { useState } from "react";
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
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import type { Announcement } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { announcementTargetLabels } from "@/lib/constants";
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
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Pencil, Pin, Send, Undo2 } from "lucide-react";
import { mutate } from "swr";
import { QueryErrorBanner } from "@/components/ui/query-error-banner";
import { useToast } from "@/components/ui/toast";

function statusBadge(a: Announcement) {
  if (a.is_pinned && a.published_at) {
    return <Badge variant="default">固定</Badge>;
  }
  if (a.published_at) {
    return <Badge variant="secondary">公開中</Badge>;
  }
  return <Badge variant="outline">下書き</Badge>;
}

export default function AnnouncementsPage() {
  const { organization } = useOrg();
  const { user } = useAuth();
  const { showToast } = useToast();

  const cacheKey = organization ? `announcements-${organization.id}` : null;

  const {
    data: announcements = [],
    isLoading,
    error: announcementsError,
    mutate: mutateAnnouncements,
  } = useQuery<Announcement[]>(cacheKey, async () => {
    const { data } = await getSupabase()
      .from("announcements")
      .select("*")
      .eq("organization_id", organization!.id)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    return data ?? [];
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<string>("all");
  const [isPinned, setIsPinned] = useState(false);

  function openCreate() {
    setEditItem(null);
    setTitle("");
    setBody("");
    setTarget("all");
    setIsPinned(false);
    setEditOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditItem(a);
    setTitle(a.title);
    setBody(a.body);
    setTarget(a.target);
    setIsPinned(a.is_pinned);
    setEditOpen(true);
  }

  async function handleSave() {
    if (!organization || !user || !title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await getSupabase()
          .from("announcements")
          .update({
            title: title.trim(),
            body: body.trim(),
            target,
            is_pinned: isPinned,
          })
          .eq("id", editItem.id)
          .eq("organization_id", organization.id);
        if (error) {
          showToast("操作に失敗しました", "error");
          return;
        }
      } else {
        const { error } = await getSupabase().from("announcements").insert({
          organization_id: organization.id,
          title: title.trim(),
          body: body.trim(),
          target,
          is_pinned: isPinned,
          created_by: user.id,
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
    if (!editItem || !organization) return;
    setDeleting(true);
    try {
      const { error } = await getSupabase()
        .from("announcements")
        .delete()
        .eq("id", editItem.id)
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

  async function togglePublish(a: Announcement) {
    if (!organization) return;
    const published_at = a.published_at ? null : new Date().toISOString();
    const { error } = await getSupabase()
      .from("announcements")
      .update({ published_at })
      .eq("id", a.id)
      .eq("organization_id", organization.id);
    if (error) {
      showToast("操作に失敗しました", "error");
      return;
    }
    await mutate(cacheKey);
  }

  async function togglePin(a: Announcement) {
    if (!organization) return;
    const { error } = await getSupabase()
      .from("announcements")
      .update({ is_pinned: !a.is_pinned })
      .eq("id", a.id)
      .eq("organization_id", organization.id);
    if (error) {
      showToast("操作に失敗しました", "error");
      return;
    }
    await mutate(cacheKey);
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="お知らせ管理"
        description="全社お知らせの作成・管理"
        sticky={false}
        action={<Button onClick={openCreate}>お知らせを作成</Button>}
      />

      <QueryErrorBanner error={announcementsError} onRetry={() => mutateAnnouncements()} />

      <div className="bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ステータス</TableHead>
              <TableHead>タイトル</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>公開日</TableHead>
              <TableHead>更新日</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={6}
              isLoading={isLoading}
              isEmpty={announcements.length === 0}
              emptyMessage="お知らせがありません"
            >
              {announcements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{statusBadge(a)}</TableCell>
                  <TableCell className="font-medium max-w-sm">
                    <div className="truncate">{a.title}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {announcementTargetLabels[a.target] ?? a.target}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {a.published_at ? format(new Date(a.published_at), "yyyy/MM/dd HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(a.updated_at), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => togglePublish(a)}
                        title={a.published_at ? "非公開にする" : "公開する"}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        {a.published_at ? (
                          <Undo2 className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePin(a)}
                        title={a.is_pinned ? "固定を解除" : "固定する"}
                        className={`p-1.5 rounded-md transition-colors ${a.is_pinned ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"} hover:bg-accent`}
                      >
                        <Pin className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
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
        title={editItem ? "お知らせを編集" : "お知らせを作成"}
        onSave={handleSave}
        saving={saving}
        saveDisabled={!title.trim() || !body.trim()}
        onDelete={editItem ? handleDelete : undefined}
        deleting={deleting}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タイトル</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="お知らせのタイトルを入力"
            />
          </div>
          <div className="space-y-2">
            <Label>本文</Label>
            <MarkdownEditor value={body} onChange={setBody} rows={12} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>対象</Label>
              <Select value={target} onValueChange={(v) => v && setTarget(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(announcementTargetLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>固定表示</Label>
              <div className="flex items-center gap-2 pt-1.5">
                <Switch checked={isPinned} onCheckedChange={setIsPinned} />
                <span className="text-sm text-muted-foreground">
                  {isPinned ? "固定する" : "固定しない"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
