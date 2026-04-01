"use client";

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
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useCreateForm } from "@/lib/hooks/use-forms";
import { fieldTypeLabels, formTargetLabels } from "@/lib/constants";

export default function NewFormPage() {
  const { showToast } = useToast();
  const {
    title,
    setTitle,
    target,
    setTarget,
    description,
    setDescription,
    fields,
    saving,
    addField,
    removeField,
    updateField,
    handleSubmit,
    cancel,
  } = useCreateForm();

  const onSubmit = async () => {
    const result = await handleSubmit();
    if (result.success) {
      showToast("フォームを作成しました");
    } else if (result.error) {
      showToast(result.error, "error");
    }
  };

  return (
    <>
      <PageHeader title="フォームを作成" />

      <PageContent>
        <div className="space-y-6 max-w-3xl">
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
            <Button variant="outline" onClick={cancel}>
              キャンセル
            </Button>
            <Button onClick={onSubmit} disabled={!title || saving}>
              {saving ? "作成中..." : "フォームを作成"}
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
}
