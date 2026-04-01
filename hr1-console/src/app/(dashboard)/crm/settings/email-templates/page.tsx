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
import type { CrmEmailTemplate, CrmEmailTemplateCategory } from "@/types/database";
import { Plus, Mail, Copy, Eye } from "lucide-react";

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
    <div>
      <PageHeader
        title="メールテンプレート"
        breadcrumb={[{ label: "CRM設定", href: "/crm/settings/pipelines" }]}
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4 mr-1.5" />
            テンプレート追加
          </Button>
        }
      />

      <div className="space-y-3">
        {!templates && (
          <p className="text-sm text-muted-foreground text-center py-8">読み込み中...</p>
        )}
        {templates?.length === 0 && (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <Mail className="size-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              メールテンプレートがありません。
              <br />
              定型メールのテンプレートを作成できます。
            </p>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="size-4 mr-1.5" />
              最初のテンプレートを作成
            </Button>
          </div>
        )}

        {(templates ?? []).map((template) => (
          <div
            key={template.id}
            className="rounded-lg border bg-background p-4 cursor-pointer hover:bg-muted/30"
            onClick={() => openEdit(template)}
          >
            <div className="flex items-center gap-3">
              <Mail className="size-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{template.name}</p>
                <p className="text-xs text-muted-foreground truncate">件名: {template.subject}</p>
              </div>
              <Badge variant="outline">
                {emailTemplateCategoryLabels[template.category] ?? template.category}
              </Badge>
              {!template.is_active && <Badge variant="default">無効</Badge>}
            </div>
          </div>
        ))}
      </div>

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
                  <button
                    key={v.key}
                    onClick={() => insertVariable(v.key)}
                    className="px-2 py-0.5 text-xs rounded border bg-muted hover:bg-muted/80"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </EditPanel>
    </div>
  );
}
