"use client";

import { useState } from "react";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Switch } from "@hr1/shared-ui/components/ui/switch";
import { SectionCard } from "@hr1/shared-ui/components/ui/section-card";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useNotificationTemplates } from "@/features/recruiting/hooks/use-notification-templates";
import { notificationTriggerEventLabels } from "@/lib/constants";

interface TemplateFormState {
  title_template: string;
  body_template: string;
  is_active: boolean;
}

const TRIGGER_EVENTS = Object.keys(notificationTriggerEventLabels);

export default function NotificationTemplatesPage() {
  const { templates, saveTemplate } = useNotificationTemplates();
  const { showToast } = useToast();

  const [editState, setEditState] = useState<Record<string, TemplateFormState>>({});
  const [savingEvent, setSavingEvent] = useState<string | null>(null);

  const getFormState = (triggerEvent: string): TemplateFormState => {
    if (editState[triggerEvent]) return editState[triggerEvent];
    const existing = templates.find((t) => t.trigger_event === triggerEvent);
    return {
      title_template: existing?.title_template ?? "",
      body_template: existing?.body_template ?? "",
      is_active: existing?.is_active ?? true,
    };
  };

  const updateField = (
    triggerEvent: string,
    field: keyof TemplateFormState,
    value: string | boolean
  ) => {
    setEditState((prev) => ({
      ...prev,
      [triggerEvent]: {
        ...getFormState(triggerEvent),
        [field]: value,
      },
    }));
  };

  const handleSave = async (triggerEvent: string) => {
    const state = getFormState(triggerEvent);
    setSavingEvent(triggerEvent);
    try {
      await saveTemplate(triggerEvent, state.title_template, state.body_template, state.is_active);
      setEditState((prev) => {
        const next = { ...prev };
        delete next[triggerEvent];
        return next;
      });
      showToast("テンプレートを保存しました");
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setSavingEvent(null);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="通知テンプレート"
        description="採用イベント発生時に送信される通知のテンプレートを管理します"
        sticky={false}
        border={false}
        breadcrumb={[{ label: "通知", href: "/notifications" }]}
      />
      <PageContent>
        <div className="space-y-6 max-w-3xl">
          {TRIGGER_EVENTS.map((event) => {
            const form = getFormState(event);
            const isSaving = savingEvent === event;

            return (
              <SectionCard key={event}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {notificationTriggerEventLabels[event]}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>有効</Label>
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(checked: boolean) =>
                        updateField(event, "is_active", checked)
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>タイトルテンプレート</Label>
                    <Input
                      placeholder="例: {job_title} の選考結果について"
                      value={form.title_template}
                      onChange={(e) => updateField(event, "title_template", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>本文テンプレート</Label>
                    <Textarea
                      placeholder="例: {job_title} にご応募いただきありがとうございました。"
                      value={form.body_template}
                      onChange={(e) => updateField(event, "body_template", e.target.value)}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {event.startsWith("step_")
                        ? `{step_label}, {job_title} などのプレースホルダーが利用できます`
                        : `{job_title} などのプレースホルダーが利用できます`}
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => handleSave(event)} disabled={isSaving}>
                      {isSaving ? "保存中..." : "保存"}
                    </Button>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      </PageContent>
    </div>
  );
}
