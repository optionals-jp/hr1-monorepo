"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useOrg } from "@/lib/org-context";
import { SectionCard } from "@/components/ui/section-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";
import { TabBar } from "@/components/layout/tab-bar";
import { StickyFilterBar } from "@/components/layout/sticky-filter-bar";
import { useFormDetailPage } from "@/lib/hooks/use-form-detail";
import { format } from "date-fns";
import { Trash2, List, MessageSquare, History } from "lucide-react";
import { fieldTypeLabels, formTargetLabels } from "@/lib/constants";
import { AuditLogPanel } from "@/components/ui/audit-log-panel";

const tabs = [
  { value: "fields", label: "フィールド", icon: List },
  { value: "responses", label: "回答", icon: MessageSquare },
  { value: "history", label: "変更ログ", icon: History },
];

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "fields", label: "フィールド" },
];

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const h = useFormDetailPage();
  const handleAuditLoaded = useCallback(() => {}, []);

  if (h.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!h.form) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        フォームが見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={h.form.title}
        description={h.form.description ?? undefined}
        breadcrumb={[{ label: "フォーム管理", href: "/forms" }]}
        sticky={false}
        action={<Badge variant="outline">{formTargetLabels[h.form.target] ?? h.form.target}</Badge>}
      />

      <StickyFilterBar>
        <TabBar tabs={tabs} activeTab={h.activeTab} onTabChange={h.setActiveTab} />
      </StickyFilterBar>

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        {/* ===== フィールドタブ ===== */}
        {h.activeTab === "fields" && (
          <div className="max-w-3xl">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={h.startEditing}>
                編集
              </Button>
            </div>
            {h.fields.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">フィールドがありません</p>
            ) : (
              <SectionCard>
                {h.fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-4 px-5 py-4">
                    <span className="text-sm font-bold text-muted-foreground w-6 pt-0.5">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{field.label}</p>
                        <Badge variant="outline" className="text-xs">
                          {fieldTypeLabels[field.type] ?? field.type}
                        </Badge>
                        {field.is_required && (
                          <Badge variant="destructive" className="text-xs">
                            必須
                          </Badge>
                        )}
                      </div>
                      {field.description && (
                        <p className="text-sm text-muted-foreground">{field.description}</p>
                      )}
                      {field.options && field.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {field.options.map((opt, i) => (
                            <Badge key={i} variant="secondary">
                              {opt}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </SectionCard>
            )}
          </div>
        )}

        {/* ===== 回答タブ ===== */}
        {h.activeTab === "responses" && (
          <>
            {h.responses.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">まだ回答がありません</p>
            ) : (
              <div className="overflow-x-auto bg-white rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white">応募者</TableHead>
                      {h.fields.map((field) => (
                        <TableHead key={field.id}>{field.label}</TableHead>
                      ))}
                      <TableHead>回答日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {h.responses.map((row) => (
                      <TableRow key={row.applicant_id}>
                        <TableCell className="font-medium sticky left-0 bg-white">
                          {row.applicant_name}
                        </TableCell>
                        {h.fields.map((field) => (
                          <TableCell key={field.id} className="max-w-xs truncate">
                            {row.answers[field.id] ?? "-"}
                          </TableCell>
                        ))}
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(row.created_at), "yyyy/MM/dd")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* ===== 変更ログタブ ===== */}
        {h.activeTab === "history" && organization && (
          <AuditLogPanel
            organizationId={organization.id}
            tableName="custom_forms"
            recordId={id}
            refreshKey={h.auditRefreshKey}
            onLoaded={handleAuditLoaded}
          />
        )}
      </div>

      <EditPanel
        open={h.editing}
        onOpenChange={h.setEditing}
        title="フォームを編集"
        tabs={editTabs}
        activeTab={h.editTab}
        onTabChange={h.setEditTab}
        onSave={h.handleSave}
        saving={h.saving}
        saveDisabled={!h.editTitle}
      >
        {h.editTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル *</Label>
              <Input
                value={h.editTitle}
                onChange={(e) => h.setEditTitle(e.target.value)}
                placeholder="フォームタイトル"
              />
            </div>
            <div className="space-y-2">
              <Label>対象 *</Label>
              <Select value={h.editTarget} onValueChange={(v) => v && h.setEditTarget(v)}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => formTargetLabels[v] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formTargetLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea
                value={h.editDescription}
                onChange={(e) => h.setEditDescription(e.target.value)}
                placeholder="フォームの説明"
                rows={3}
              />
            </div>
          </div>
        )}
        {h.editTab === "fields" && (
          <div className="space-y-4">
            {h.editFields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    フィールド {index + 1}
                    {field.isNew && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        新規
                      </Badge>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => h.removeField(field.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">ラベル *</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => h.updateField(field.id, "label", e.target.value)}
                      placeholder="質問内容"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">種類</Label>
                    <Select
                      value={field.field_type}
                      onValueChange={(v) => v && h.updateField(field.id, "field_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue>{(v: string) => fieldTypeLabels[v] ?? v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(fieldTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">説明</Label>
                  <Input
                    value={field.description}
                    onChange={(e) => h.updateField(field.id, "description", e.target.value)}
                    placeholder="質問の補足説明"
                  />
                </div>
                {["radio", "checkbox", "dropdown"].includes(field.field_type) && (
                  <div className="space-y-1">
                    <Label className="text-xs">選択肢（1行に1つ）</Label>
                    <Textarea
                      value={field.options}
                      onChange={(e) => h.updateField(field.id, "options", e.target.value)}
                      placeholder={"選択肢1\n選択肢2\n選択肢3"}
                      rows={3}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.is_required}
                    onChange={(e) => h.updateField(field.id, "is_required", e.target.checked)}
                    className="rounded"
                  />
                  必須項目
                </label>
              </div>
            ))}
            <Button variant="outline" onClick={h.addField} className="w-full">
              フィールドを追加
            </Button>
          </div>
        )}
      </EditPanel>
    </>
  );
}
