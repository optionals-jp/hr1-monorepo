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
import { getSupabase } from "@/lib/supabase";
import { useOrg } from "@/lib/org-context";
import type { CustomForm, FormField, FormChangeLog } from "@/types/database";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

const fieldTypeLabels: Record<string, string> = {
  shortText: "短文テキスト",
  longText: "長文テキスト",
  radio: "ラジオボタン",
  checkbox: "チェックボックス",
  dropdown: "ドロップダウン",
  date: "日付",
  fileUpload: "ファイルアップロード",
};

const changeTypeLabels: Record<string, string> = {
  created: "作成",
  title_updated: "タイトル変更",
  description_updated: "説明変更",
  field_added: "フィールド追加",
  field_updated: "フィールド変更",
  field_deleted: "フィールド削除",
};

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
  const [changeLogs, setChangeLogs] = useState<FormChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("fields");

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [editTitle, setEditTitle] = useState("");
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

    const [{ data: formData }, { data: fieldsData }, { data: responsesData }, { data: logsData }] =
      await Promise.all([
        getSupabase()
          .from("custom_forms")
          .select("*")
          .eq("id", id)
          .eq("organization_id", organization.id)
          .single(),
        getSupabase().from("form_fields").select("*").eq("form_id", id).order("sort_order"),
        getSupabase().from("form_responses").select("*").eq("form_id", id),
        getSupabase()
          .from("form_change_logs")
          .select("*")
          .eq("form_id", id)
          .order("created_at", { ascending: false }),
      ]);

    setForm(formData);
    setFields(fieldsData ?? []);
    setChangeLogs(logsData ?? []);

    // Group responses by applicant_id
    const grouped: Record<string, ResponseRow> = {};
    for (const resp of responsesData ?? []) {
      const applicantId = resp.applicant_id as string;
      if (!grouped[applicantId]) {
        grouped[applicantId] = {
          applicant_id: applicantId,
          applicant_name: applicantId,
          answers: {},
          created_at: resp.submitted_at,
        };
      }
      grouped[applicantId].answers[resp.field_id] = Array.isArray(resp.value)
        ? (resp.value as string[]).join(", ")
        : String(resp.value ?? "");
    }

    // Fetch profile names
    const applicantIds = Object.keys(grouped);
    if (applicantIds.length > 0) {
      const { data: profilesData } = await getSupabase()
        .from("profiles")
        .select("id, display_name, email")
        .in("id", applicantIds);
      for (const p of profilesData ?? []) {
        if (grouped[p.id]) {
          grouped[p.id].applicant_name = p.display_name ?? p.email ?? p.id;
        }
      }
    }

    setResponses(Object.values(grouped));

    setLoading(false);
  }

  function startEditing() {
    if (!form) return;
    setEditTitle(form.title);
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
    if (!form) return;
    setSaving(true);

    const logs: { change_type: string; summary: string; details?: Record<string, unknown> }[] = [];

    // 1. Update form title/description
    if (editTitle !== form.title || editDescription !== (form.description ?? "")) {
      await getSupabase()
        .from("custom_forms")
        .update({ title: editTitle, description: editDescription || null })
        .eq("id", form.id);

      if (editTitle !== form.title) {
        logs.push({
          change_type: "title_updated",
          summary: `タイトルを「${form.title}」から「${editTitle}」に変更`,
          details: { old: form.title, new: editTitle },
        });
      }
      if (editDescription !== (form.description ?? "")) {
        logs.push({ change_type: "description_updated", summary: "説明を変更" });
      }
    }

    // 2. Handle field changes
    const existingIds = fields.map((f) => f.id);
    const editIds = editFields.filter((f) => !f.isNew).map((f) => f.id);

    // Deleted fields
    const deletedIds = existingIds.filter((fid) => !editIds.includes(fid));
    if (deletedIds.length > 0) {
      await getSupabase().from("form_fields").delete().in("id", deletedIds);
      const deletedLabels = fields
        .filter((f) => deletedIds.includes(f.id))
        .map((f) => f.label)
        .join("、");
      logs.push({ change_type: "field_deleted", summary: `フィールド「${deletedLabels}」を削除` });
    }

    // New fields
    const newFields = editFields.filter((f) => f.isNew);
    if (newFields.length > 0) {
      await getSupabase()
        .from("form_fields")
        .insert(
          newFields.map((f, i) => ({
            id: `field-${form.id}-${Date.now()}-${i}`,
            form_id: form.id,
            type: f.field_type,
            label: f.label,
            description: f.description || null,
            placeholder: f.placeholder || null,
            is_required: f.is_required,
            options:
              f.options && ["radio", "checkbox", "dropdown"].includes(f.field_type)
                ? f.options.split("\n").filter(Boolean)
                : null,
            sort_order: f.sort_order,
          }))
        );
      const newLabels = newFields.map((f) => f.label).join("、");
      logs.push({ change_type: "field_added", summary: `フィールド「${newLabels}」を追加` });
    }

    // Updated existing fields
    for (const ef of editFields.filter((f) => !f.isNew && existingIds.includes(f.id))) {
      const original = fields.find((f) => f.id === ef.id);
      if (!original) continue;
      const changed =
        ef.label !== original.label ||
        ef.field_type !== original.type ||
        ef.description !== (original.description ?? "") ||
        ef.placeholder !== (original.placeholder ?? "") ||
        ef.is_required !== original.is_required ||
        ef.options !== (original.options?.join("\n") ?? "");

      if (changed) {
        await getSupabase()
          .from("form_fields")
          .update({
            type: ef.field_type,
            label: ef.label,
            description: ef.description || null,
            placeholder: ef.placeholder || null,
            is_required: ef.is_required,
            options:
              ef.options && ["radio", "checkbox", "dropdown"].includes(ef.field_type)
                ? ef.options.split("\n").filter(Boolean)
                : null,
            sort_order: ef.sort_order,
          })
          .eq("id", ef.id);
        logs.push({ change_type: "field_updated", summary: `フィールド「${ef.label}」を変更` });
      }
    }

    // 3. Save change logs
    if (logs.length > 0) {
      await getSupabase()
        .from("form_change_logs")
        .insert(
          logs.map((log, i) => ({
            id: `log-${form.id}-${Date.now()}-${i}`,
            form_id: form.id,
            change_type: log.change_type,
            summary: log.summary,
            details: log.details ?? null,
          }))
        );
    }

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
      />

      <div className="sticky top-0 z-10 bg-white">
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
                        {changeTypeLabels[log.change_type] ?? log.change_type}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.summary}</p>
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
