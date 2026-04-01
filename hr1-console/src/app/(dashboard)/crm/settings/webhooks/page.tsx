"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditPanel } from "@/components/ui/edit-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { useToast } from "@/components/ui/toast";
import { useWebhooks, useWebhookLogs } from "@/lib/hooks/use-webhooks";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as webhookRepo from "@/lib/repositories/webhook-repository";
import { webhookEventLabels } from "@/lib/constants/crm";
import { TableSection } from "@/components/layout/table-section";
import type { CrmWebhook } from "@/types/database";
import { Plus, ScrollText } from "lucide-react";

type EditableWebhook = Partial<CrmWebhook>;

const ALL_EVENTS = Object.keys(webhookEventLabels);

export default function WebhookSettingsPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { data: webhooks, mutate } = useWebhooks();
  const { data: logs } = useWebhookLogs();

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<EditableWebhook>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const openCreate = useCallback(() => {
    setEditData({
      url: "",
      events: [],
      headers: {},
      is_active: true,
    });
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((webhook: CrmWebhook) => {
    setEditData({ ...webhook });
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!organization || saving) return;
    if (!editData.name?.trim() || !editData.url?.trim()) {
      showToast("Webhook名とURLは必須です", "error");
      return;
    }
    if (!editData.events?.length) {
      showToast("イベントを1つ以上選択してください", "error");
      return;
    }

    setSaving(true);
    try {
      if (editData.id) {
        await webhookRepo.updateWebhook(getSupabase(), editData.id, organization.id, {
          name: editData.name.trim(),
          url: editData.url.trim(),
          secret: editData.secret || null,
          is_active: editData.is_active ?? true,
          events: editData.events ?? [],
          headers: editData.headers ?? {},
        });
        showToast("Webhookを更新しました");
      } else {
        await webhookRepo.createWebhook(getSupabase(), {
          organization_id: organization.id,
          name: editData.name.trim(),
          url: editData.url.trim(),
          secret: editData.secret || null,
          is_active: editData.is_active ?? true,
          events: editData.events ?? [],
          headers: editData.headers ?? {},
        });
        showToast("Webhookを作成しました");
      }
      setEditOpen(false);
      mutate();
    } catch {
      showToast("Webhookの保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, saving, editData, showToast, mutate]);

  const handleDelete = useCallback(async () => {
    if (!organization || !editData.id || deleting) return;
    setDeleting(true);
    try {
      await webhookRepo.deleteWebhook(getSupabase(), editData.id, organization.id);
      showToast("Webhookを削除しました");
      setEditOpen(false);
      mutate();
    } catch {
      showToast("Webhookの削除に失敗しました", "error");
    } finally {
      setDeleting(false);
    }
  }, [organization, editData.id, deleting, showToast, mutate]);

  const toggleEvent = (event: string) => {
    setEditData((prev) => {
      const events = prev.events ?? [];
      const next = events.includes(event) ? events.filter((e) => e !== event) : [...events, event];
      return { ...prev, events: next };
    });
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Webhook設定"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM設定", href: "/crm/settings/pipelines" }]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowLogs(!showLogs)}>
              <ScrollText className="size-4 mr-1.5" />
              {showLogs ? "Webhook一覧" : "送信ログ"}
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4 mr-1.5" />
              Webhook追加
            </Button>
          </div>
        }
      />

      {!showLogs ? (
        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Webhook名</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>イベント</TableHead>
                <TableHead>成功/失敗</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={5}
                isLoading={!webhooks}
                isEmpty={webhooks?.length === 0}
                emptyMessage="Webhookがありません"
              >
                {(webhooks ?? []).map((webhook) => (
                  <TableRow
                    key={webhook.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(webhook)}
                  >
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-xs">
                      {webhook.url}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {webhook.events.map((e) => webhookEventLabels[e] ?? e).join("、")}
                    </TableCell>
                    <TableCell className="tabular-nums text-xs">
                      {webhook.success_count} / {webhook.failure_count}
                    </TableCell>
                    <TableCell>
                      <Badge variant={webhook.is_active ? "secondary" : "default"}>
                        {webhook.is_active ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      ) : (
        <TableSection>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>実行日時</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>イベント</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>レスポンス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmptyState
                colSpan={5}
                isLoading={!logs}
                isEmpty={(logs ?? []).length === 0}
                emptyMessage="送信ログがありません"
              >
                {(logs ?? []).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs tabular-nums">
                      {new Date(log.executed_at).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-sm">{log.crm_webhooks?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {webhookEventLabels[log.event_type] ?? log.event_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.success ? "secondary" : "destructive"}>
                        {log.response_status ?? (log.success ? "OK" : "Error")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-48 truncate">
                      {log.error_message ?? log.response_body ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableEmptyState>
            </TableBody>
          </Table>
        </TableSection>
      )}

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "Webhook編集" : "Webhook追加"}
        onSave={handleSave}
        saving={saving}
        onDelete={editData.id ? handleDelete : undefined}
        deleting={deleting}
        confirmDeleteMessage="このWebhookを削除しますか？この操作は元に戻せません。"
      >
        <div className="space-y-4">
          <div>
            <Label>Webhook名 *</Label>
            <Input
              value={editData.name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
              placeholder="例: Slack通知"
            />
          </div>

          <div>
            <Label>URL *</Label>
            <Input
              value={editData.url ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://example.com/webhook"
              type="url"
            />
          </div>

          <div>
            <Label>シークレットキー（HMAC署名用）</Label>
            <Input
              value={editData.secret ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, secret: e.target.value }))}
              placeholder="任意のシークレット"
              type="password"
            />
          </div>

          <div>
            <Label>購読イベント *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ALL_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(editData.events ?? []).includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded accent-primary"
                  />
                  {webhookEventLabels[event] ?? event}
                </label>
              ))}
            </div>
          </div>
        </div>
      </EditPanel>
    </div>
  );
}
