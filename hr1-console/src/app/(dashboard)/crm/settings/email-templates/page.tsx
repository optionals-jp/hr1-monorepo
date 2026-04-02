"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditPanel } from "@/components/ui/edit-panel";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmailTemplates } from "@/lib/hooks/use-email-templates";
import { useOrg } from "@/lib/org-context";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase/browser";
import * as templateRepo from "@/lib/repositories/email-template-repository";
import { emailTemplateCategoryLabels } from "@/lib/constants/crm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableEmptyState } from "@/components/ui/table-empty-state";
import { TableSection } from "@/components/layout/table-section";
import type { CrmEmailTemplate, CrmEmailTemplateCategory } from "@/types/database";
import { Plus, Copy, Eye } from "lucide-react";

type EditableTemplate = Partial<CrmEmailTemplate>;

const TEMPLATE_VARIABLES = [
  { key: "contact_name", label: "連絡先名" },
  { key: "company_name", label: "企業名" },
  { key: "deal_title", label: "商談名" },
  { key: "deal_amount", label: "商談金額" },
  { key: "user_name", label: "送信者名" },
  { key: "today", label: "今日の日付" },
];

export default function EmailTemplatesPage() {
  const { showToast } = useToast();
  const { organization } = useOrg();
  const { user } = useAuth();
  const { data: templates, mutate } = useEmailTemplates();

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<EditableTemplate>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const openCreate = useCallback(() => {
    setEditData({
      category: "general",
      is_active: true,
      subject: "",
      body: "",
    });
    setPreviewMode(false);
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((template: CrmEmailTemplate) => {
    setEditData({ ...template });
    setPreviewMode(false);
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!organization || saving) return;
    if (!editData.name?.trim() || !editData.subject?.trim()) {
      showToast("テンプレート名と件名は必須です", "error");
      return;
    }

    setSaving(true);
    try {
      if (editData.id) {
        await templateRepo.updateTemplate(getSupabase(), editData.id, organization.id, {
          name: editData.name.trim(),
          subject: editData.subject.trim(),
          body: editData.body ?? "",
          category: editData.category as CrmEmailTemplateCategory,
          is_active: editData.is_active ?? true,
        });
        showToast("テンプレートを更新しました");
      } else {
        await templateRepo.createTemplate(getSupabase(), {
          organization_id: organization.id,
          name: editData.name.trim(),
          subject: editData.subject.trim(),
          body: editData.body ?? "",
          category: (editData.category ?? "general") as CrmEmailTemplateCategory,
          is_active: editData.is_active ?? true,
          sort_order: templates?.length ?? 0,
          created_by: user?.id ?? null,
        });
        showToast("テンプレートを作成しました");
      }
      setEditOpen(false);
      mutate();
    } catch {
      showToast("テンプレートの保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  }, [organization, saving, editData, templates, user, showToast, mutate]);

  const handleDelete = useCallback(async () => {
    if (!organization || !editData.id || deleting) return;
    setDeleting(true);
    try {
      await templateRepo.deleteTemplate(getSupabase(), editData.id, organization.id);
      showToast("テンプレートを削除しました");
      setEditOpen(false);
      mutate();
    } catch {
      showToast("テンプレートの削除に失敗しました", "error");
    } finally {
      setDeleting(false);
    }
  }, [organization, editData.id, deleting, showToast, mutate]);

  const insertVariable = (key: string) => {
    setEditData((prev) => ({
      ...prev,
      body: (prev.body ?? "") + `{{${key}}}`,
    }));
  };

  const previewBody = templateRepo.renderTemplate(editData.body ?? "", {
    contact_name: "山田太郎",
    company_name: "株式会社サンプル",
    deal_title: "システム導入案件",
    deal_amount: "¥1,500,000",
    user_name: "営業担当者",
    today: new Date().toLocaleDateString("ja-JP"),
  });

  const previewSubject = templateRepo.renderTemplate(editData.subject ?? "", {
    contact_name: "山田太郎",
    company_name: "株式会社サンプル",
    deal_title: "システム導入案件",
    deal_amount: "¥1,500,000",
    user_name: "営業担当者",
    today: new Date().toLocaleDateString("ja-JP"),
  });

  return (
    <div className="flex flex-col">
      <PageHeader
        title="メールテンプレート"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "CRM設定", href: "/crm/settings/pipelines" }]}
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-1.5" />
            テンプレート追加
          </Button>
        }
      />

      <TableSection>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>テンプレート名</TableHead>
              <TableHead>件名</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableEmptyState
              colSpan={4}
              isLoading={!templates}
              isEmpty={templates?.length === 0}
              emptyMessage="メールテンプレートがありません"
            >
              {(templates ?? []).map((template) => (
                <TableRow
                  key={template.id}
                  className="cursor-pointer"
                  onClick={() => openEdit(template)}
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-xs">
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {emailTemplateCategoryLabels[template.category] ?? template.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!template.is_active && <Badge variant="default">無効</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableEmptyState>
          </TableBody>
        </Table>
      </TableSection>

      <EditPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        title={editData.id ? "テンプレート編集" : "テンプレート作成"}
        onSave={handleSave}
        saving={saving}
        onDelete={editData.id ? handleDelete : undefined}
        deleting={deleting}
        confirmDeleteMessage="このテンプレートを削除しますか？この操作は元に戻せません。"
      >
        <div className="space-y-4">
          <div>
            <Label>テンプレート名 *</Label>
            <Input
              value={editData.name ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
              placeholder="例: フォローアップメール"
            />
          </div>

          <div>
            <Label>カテゴリ</Label>
            <Select
              value={editData.category ?? "general"}
              onValueChange={(v) =>
                setEditData((p) => ({ ...p, category: v as CrmEmailTemplateCategory }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(emailTemplateCategoryLabels).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>
                    {lbl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>件名 *</Label>
            <Input
              value={editData.subject ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, subject: e.target.value }))}
              placeholder="例: {{company_name}} 様 - ご提案のご案内"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="mb-0">{previewMode ? "プレビュー" : "本文"}</Label>
              <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
                {previewMode ? (
                  <>
                    <Copy className="size-3 mr-1" />
                    編集
                  </>
                ) : (
                  <>
                    <Eye className="size-3 mr-1" />
                    プレビュー
                  </>
                )}
              </Button>
            </div>
            {previewMode ? (
              <div className="rounded-lg border p-4 min-h-32 bg-muted/20">
                <p className="text-sm font-medium mb-2">件名: {previewSubject}</p>
                <div className="border-t pt-2">
                  <p className="text-sm whitespace-pre-wrap">{previewBody}</p>
                </div>
              </div>
            ) : (
              <Textarea
                value={editData.body ?? ""}
                onChange={(e) => setEditData((p) => ({ ...p, body: e.target.value }))}
                rows={8}
                placeholder="メール本文を入力..."
              />
            )}
          </div>

          {!previewMode && (
            <div>
              <Label className="text-xs text-muted-foreground">変数を挿入:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {TEMPLATE_VARIABLES.map((v) => (
                  <Button
                    key={v.key}
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => insertVariable(v.key)}
                    className="px-2 py-0.5 text-xs rounded border bg-muted hover:bg-muted/80"
                  >
                    {v.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </EditPanel>
    </div>
  );
}
