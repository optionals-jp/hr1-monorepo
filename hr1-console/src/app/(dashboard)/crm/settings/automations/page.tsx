"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@hr1/shared-ui/components/layout/page-header";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useAutomationRules } from "@/lib/hooks/use-automation";
import { useOrg } from "@/lib/org-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as automationRepo from "@/lib/repositories/automation-repository";
import { automationTriggerLabels, automationActionLabels } from "@/lib/constants";
import type {
  CrmAutomationRule,
  CrmAutomationTrigger,
  CrmAutomationCondition,
  CrmAutomationAction,
} from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { TableEmptyState } from "@hr1/shared-ui/components/ui/table-empty-state";
import { TableSection } from "@hr1/shared-ui/components/layout/table-section";
import { Plus, Zap, ZapOff, ScrollText } from "lucide-react";
import Link from "next/link";
import { AutomationEditPanel } from "./automation-edit-panel";

type EditableRule = Partial<CrmAutomationRule>;

export default function AutomationSettingsPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { data: rules, mutate } = useAutomationRules();

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<EditableRule>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openCreate = useCallback(() => {
    setEditData({
      trigger_type: "deal_stage_changed",
      conditions: [],
      actions: [{ type: "create_todo", params: { title: "", due_days: 3 } }],
      is_active: true,
    });
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((rule: CrmAutomationRule) => {
    setEditData({ ...rule });
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!organization || saving) return;
    if (!editData.name?.trim()) {
      showToast("ルール名を入力してください", "error");
      return;
    }
    if (!editData.actions?.length) {
      showToast("アクションを1つ以上追加してください", "error");
      return;
    }

    setSaving(true);
    try {
      if (editData.id) {
        await automationRepo.updateRule(getSupabase(), editData.id, organization.id, {
          name: editData.name.trim(),
          description: editData.description || null,
          trigger_type: editData.trigger_type as CrmAutomationTrigger,
          conditions: editData.conditions ?? [],
          actions: editData.actions ?? [],
        });
        showToast("ルールを更新しました");
      } else {
        await automationRepo.createRule(getSupabase(), {
          organization_id: organization.id,
          name: editData.name.trim(),
          description: editData.description || null,
          is_active: editData.is_active ?? true,
          trigger_type: editData.trigger_type as CrmAutomationTrigger,
          conditions: (editData.conditions ?? []) as CrmAutomationCondition[],
          actions: (editData.actions ?? []) as CrmAutomationAction[],
          sort_order: rules?.length ?? 0,
        });
        showToast("ルールを作成しました");
      }
      setEditOpen(false);
      mutate();
    } catch {
      showToast("ルールの保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, saving, editData, rules, showToast, mutate]);

  const handleDelete = useCallback(async () => {
    if (!organization || !editData.id || deleting) return;
    setDeleting(true);
    try {
      await automationRepo.deleteRule(getSupabase(), editData.id, organization.id);
      showToast("ルールを削除しました");
      setEditOpen(false);
      mutate();
    } catch {
      showToast("ルールの削除に失敗しました", "error");
    } finally {
      setDeleting(false);
    }
  }, [organization, editData.id, deleting, showToast, mutate]);

  const handleToggleActive = async (rule: CrmAutomationRule) => {
    if (!organization) return;
    try {
      await automationRepo.toggleRuleActive(
        getSupabase(),
        rule.id,
        organization.id,
        !rule.is_active
      );
      mutate();
      showToast(rule.is_active ? "ルールを無効にしました" : "ルールを有効にしました");
    } catch {
      showToast("ルールの更新に失敗しました", "error");
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="自動化ルール"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM設定", href: "/crm/settings/pipelines" }]}
        action={
          <div className="flex gap-2">
            <Link href="/crm/settings/automations/logs">
              <Button variant="outline">
                <ScrollText className="size-4 mr-1.5" />
                実行ログ
              </Button>
            </Link>
            <Button onClick={openCreate}>
              <Plus className="size-4 mr-1.5" />
              ルール追加
            </Button>
          </div>
        }
      />

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>ルール名</TableHead>
              <TableHead>トリガー</TableHead>
              <TableHead>アクション</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={5}
              isLoading={!rules}
              isEmpty={rules?.length === 0}
              emptyMessage="自動化ルールがありません"
            >
              {(rules ?? []).map((rule) => (
                <TableRow key={rule.id} className="cursor-pointer" onClick={() => openEdit(rule)}>
                  <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleToggleActive(rule)}
                      className={rule.is_active ? "text-primary" : "text-muted-foreground"}
                      title={
                        rule.is_active ? "有効（クリックで無効化）" : "無効（クリックで有効化）"
                      }
                    >
                      {rule.is_active ? <Zap className="size-4" /> : <ZapOff className="size-4" />}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{rule.name}</span>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                        {rule.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {automationTriggerLabels[rule.trigger_type] ?? rule.trigger_type}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.actions.map((a) => automationActionLabels[a.type] ?? a.type).join("、")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.is_active ? "secondary" : "default"}>
                      {rule.is_active ? "有効" : "無効"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <AutomationEditPanel
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editData={editData}
        setEditData={setEditData}
        handleSave={handleSave}
        handleDelete={editData.id ? handleDelete : undefined}
        saving={saving}
        deleting={deleting}
      />
    </div>
  );
}
