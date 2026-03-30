"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/org-context";
import type { CustomForm, FormField, AuditLog } from "@/types/database";
import { loadFormDetail, saveFormEdit } from "@/lib/hooks/use-forms";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { fieldTypeLabels, getAuditActionLabel, formTargetLabels } from "@/lib/constants";

interface FieldDraft {
  id: string;
  field_type: string;
  label: string;
  description: string;
  placeholder: string;
  is_required: boolean;
  options: string;
  sort_order: number;
  isNew?: boolean;
}

interface ResponseRow {
  applicant_id: string;
  applicant_name: string;
  answers: Record<string, string>;
  created_at: string;
}

const tabs = [
  { value: "fields", label: "フィールド" },
  { value: "responses", label: "回答" },
  { value: "history", label: "変更履歴" },
];

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "fields", label: "フィールド" },
];

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrg();
  const [form, setForm] = useState<CustomForm | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [changeLogs, setChangeLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fields");

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState<string>("both");
  const [editDescription, setEditDescription] = useState("");
  const [editFields, setEditFields] = useState<FieldDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organization) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, organization]);

  async function loadData() {
    if (!organization) return;
    setLoading(true);

    const result = await loadFormDetail(id, organization.id);
    setForm(result.form);
    setFields(result.fields);
    setResponses(result.responses);
    setChangeLogs(result.changeLogs);

    setLoading(false);
  }

  function startEditing() {
    if (!form) return;
    setEditTitle(form.title);
    setEditTarget(form.target ?? "both");
    setEditDescription(form.description ?? "");
    setEditFields(
      fields.map((f) => ({
        id: f.id,
        field_type: f.type,
        label: f.label,
        description: f.description ?? "",
        placeholder: f.placeholder ?? "",
        is_required: f.is_required,
        options: f.options?.join("\n") ?? "",
        sort_order: f.sort_order,
      }))
    );
    setEditTab("basic");
    setEditing(true);
  }

  function addField() {
    const maxOrder = editFields.length > 0 ? Math.max(...editFields.map((f) => f.sort_order)) : 0;
    setEditFields([
      ...editFields,
      {
        id: `new-${Date.now()}`,
        field_type: "shortText",
        label: "",
        description: "",
        placeholder: "",
        is_required: false,
        options: "",
        sort_order: maxOrder + 1,
        isNew: true,
      },
    ]);
  }

  function removeField(fieldId: string) {
    setEditFields(editFields.filter((f) => f.id !== fieldId));
  }

  function updateField(fieldId: string, key: string, value: string | boolean) {
    setEditFields(editFields.map((f) => (f.id === fieldId ? { ...f, [key]: value } : f)));
  }

  async function handleSave() {
    if (!form || !organization) return;
    setSaving(true);

    await saveFormEdit(
      form,
      fields,
      organization.id,
      editTitle,
      editTarget,
      editDescription,
      editFields
    );

    setSaving(false);
    setEditing(false);
    await loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        フォームが見つかりません
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={form.title}
        description={form.description ?? undefined}
        breadcrumb={[{ label: "フォーム管理", href: "/forms" }]}
        sticky={false}
        action={<Badge variant="outline">{formTargetLabels[form.target] ?? form.target}</Badge>}
      />

      <div className="sticky top-14 z-10 bg-white">
        <div className="flex items-center gap-6 border-b px-4 sm:px-6 md:px-8">
          {tabs.map((tab) => {
            const count =
              tab.value === "fields"
                ? fields.length
                : tab.value === "responses"
                  ? responses.length
                  : changeLogs.length;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "relative pb-2.5 pt-2 text-[15px] font-medium transition-colors",
                  activeTab === tab.value
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
                {activeTab === tab.value && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 md:px-8 md:py-6">
        {/* ===== フィールドタブ ===== */}
        {activeTab === "fields" && (
          <div className="max-w-3xl">
            <div className="flex justify-end mb-3">
              <Button variant="outline" size="sm" onClick={startEditing}>
                編集
              </Button>
            </div>
            {fields.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">フィールドがありません</p>
            ) : (
              <div className="rounded-lg bg-white border">
                {fields.map((field, index) => (
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
              </div>
            )}
          </div>
        )}

        {/* ===== 回答タブ ===== */}
        {activeTab === "responses" && (
          <>
            {responses.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">まだ回答がありません</p>
            ) : (
              <div className="overflow-x-auto bg-white rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white">応募者</TableHead>
                      {fields.map((field) => (
                        <TableHead key={field.id}>{field.label}</TableHead>
                      ))}
                      <TableHead>回答日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((row) => (
                      <TableRow key={row.applicant_id}>
                        <TableCell className="font-medium sticky left-0 bg-white">
                          {row.applicant_name}
                        </TableCell>
                        {fields.map((field) => (
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

        {/* ===== 変更履歴タブ ===== */}
        {activeTab === "history" && (
          <>
            {changeLogs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">変更履歴がありません</p>
            ) : (
              <div className="space-y-3 max-w-3xl">
                {changeLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 py-3 border-b last:border-0">
                    <div className="shrink-0 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {getAuditActionLabel(log)}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {(log.metadata as Record<string, string> | null)?.summary ??
                          (log.changes as Record<string, string> | null)?.summary ??
                          log.action}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(log.created_at), "yyyy/MM/dd HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <EditPanel
        open={editing}
        onOpenChange={setEditing}
        title="フォームを編集"
        tabs={editTabs}
        activeTab={editTab}
        onTabChange={setEditTab}
        onSave={handleSave}
        saving={saving}
        saveDisabled={!editTitle}
      >
        {editTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>タイトル *</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="フォームタイトル"
              />
            </div>
            <div className="space-y-2">
              <Label>対象 *</Label>
              <Select value={editTarget} onValueChange={(v) => v && setEditTarget(v)}>
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
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="フォームの説明"
                rows={3}
              />
            </div>
          </div>
        )}
        {editTab === "fields" && (
          <div className="space-y-4">
            {editFields.map((field, index) => (
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
                    onClick={() => removeField(field.id)}
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
                      onChange={(e) => updateField(field.id, "label", e.target.value)}
                      placeholder="質問内容"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">種類</Label>
                    <Select
                      value={field.field_type}
                      onValueChange={(v) => v && updateField(field.id, "field_type", v)}
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
                    onChange={(e) => updateField(field.id, "description", e.target.value)}
                    placeholder="質問の補足説明"
                  />
                </div>
                {["radio", "checkbox", "dropdown"].includes(field.field_type) && (
                  <div className="space-y-1">
                    <Label className="text-xs">選択肢（1行に1つ）</Label>
                    <Textarea
                      value={field.options}
                      onChange={(e) => updateField(field.id, "options", e.target.value)}
                      placeholder={"選択肢1\n選択肢2\n選択肢3"}
                      rows={3}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.is_required}
                    onChange={(e) => updateField(field.id, "is_required", e.target.checked)}
                    className="rounded"
                  />
                  必須項目
                </label>
              </div>
            ))}
            <Button variant="outline" onClick={addField} className="w-full">
              フィールドを追加
            </Button>
          </div>
        )}
      </EditPanel>
    </>
  );
}
