"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useSWRConfig } from "swr";
import { PageHeader, PageContent } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg } from "@/lib/org-context";
import { Trash2 } from "lucide-react";
import { createForm } from "@/lib/hooks/use-forms";
import { fieldTypeLabels, formTargetLabels } from "@/lib/constants";

interface FieldDraft {
  tempId: string;
  field_type: string;
  label: string;
  description: string;
  placeholder: string;
  is_required: boolean;
  options: string;
}

export default function NewFormPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { mutate } = useSWRConfig();
  const { organization } = useOrg();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<string>("both");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const addField = () => {
    setFields([
      ...fields,
      {
        tempId: `${Date.now()}`,
        field_type: "shortText",
        label: "",
        description: "",
        placeholder: "",
        is_required: false,
        options: "",
      },
    ]);
  };

  const removeField = (tempId: string) => {
    setFields(fields.filter((f) => f.tempId !== tempId));
  };

  const updateField = (tempId: string, field: string, value: string | boolean) => {
    setFields(fields.map((f) => (f.tempId === tempId ? { ...f, [field]: value } : f)));
  };

  const handleSubmit = async () => {
    if (!organization || !title) return;
    setSaving(true);

    const result = await createForm(organization.id, {
      title,
      target,
      description,
      fields,
    });

    if (result.success) {
      await mutate(`forms-${organization.id}`);
      showToast("フォームを作成しました");
      router.push("/forms");
    } else {
      showToast(result.error ?? "フォームの作成に失敗しました", "error");
    }
    setSaving(false);
  };

  return (
    <>
      <PageHeader title="フォームを作成" />

      <PageContent>
        <div className="space-y-6 max-w-3xl">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>タイトル *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="エントリーシート"
                />
              </div>
              <div className="space-y-2">
                <Label>対象 *</Label>
                <Select value={target} onValueChange={(v) => v && setTarget(v)}>
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="フォームの説明を入力してください"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* フィールド */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>フィールド</CardTitle>
              <Button variant="outline" size="sm" onClick={addField}>
                追加
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  フィールドを追加してください
                </p>
              ) : (
                fields.map((field, index) => (
                  <div key={field.tempId} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        フィールド {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field.tempId)}
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
                          onChange={(e) => updateField(field.tempId, "label", e.target.value)}
                          placeholder="質問内容"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">種類</Label>
                        <Select
                          value={field.field_type}
                          onValueChange={(v) => v && updateField(field.tempId, "field_type", v)}
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
                        onChange={(e) => updateField(field.tempId, "description", e.target.value)}
                        placeholder="質問の補足説明"
                      />
                    </div>
                    {["radio", "checkbox", "dropdown"].includes(field.field_type) && (
                      <div className="space-y-1">
                        <Label className="text-xs">選択肢（1行に1つ）</Label>
                        <Textarea
                          value={field.options}
                          onChange={(e) => updateField(field.tempId, "options", e.target.value)}
                          placeholder={"選択肢1\n選択肢2\n選択肢3"}
                          rows={3}
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.is_required}
                        onChange={(e) => updateField(field.tempId, "is_required", e.target.checked)}
                        className="rounded"
                      />
                      必須項目
                    </label>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.push("/forms")}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={!title || saving}>
              {saving ? "作成中..." : "フォームを作成"}
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
}
