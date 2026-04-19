"use client";

import { useState } from "react";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { FormField, FormInput, FormTextarea } from "@hr1/shared-ui/components/ui/form-field";
import { Input } from "@hr1/shared-ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useCreateRecruiterTask } from "@/features/recruiting/hooks/use-recruiter-tasks";
import { useForms } from "@/features/recruiting/hooks/use-forms";
import { useSchedulingList } from "@/features/recruiting/hooks/use-scheduling";
import { useOrgQuery } from "@/lib/hooks/use-org-query";
import { getSupabase } from "@/lib/supabase/browser";
import type { RecruiterTaskActionType } from "@/lib/repositories/recruiter-task-repository";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string;
  applicantName: string;
}

export function RecruiterTaskIndividualDialog({
  open,
  onOpenChange,
  applicantId,
  applicantName,
}: Props) {
  const { showToast } = useToast();
  const { create, saving } = useCreateRecruiterTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [actionType, setActionType] = useState<RecruiterTaskActionType>("none");
  const [actionRefId, setActionRefId] = useState("");
  const [actionUrl, setActionUrl] = useState("");

  const { data: forms = [] } = useForms();
  const { data: interviews = [] } = useSchedulingList();
  const { data: applicantSurveys = [] } = useOrgQuery<{ id: string; title: string }[]>(
    "applicant-surveys",
    async (orgId) => {
      const { data } = await getSupabase()
        .from("pulse_surveys")
        .select("id, title")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .in("target", ["applicant", "both"])
        .order("created_at", { ascending: false });
      return (data ?? []) as { id: string; title: string }[];
    }
  );

  const reset = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setActionType("none");
    setActionRefId("");
    setActionUrl("");
  };

  const actionValid = (() => {
    if (actionType === "none" || actionType === "announcement") return true;
    if (actionType === "custom_url") return actionUrl.trim().length > 0;
    return actionRefId.length > 0;
  })();

  const handleSave = async () => {
    try {
      const needsRef =
        actionType === "form" || actionType === "interview" || actionType === "survey";
      await create({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        action_type: actionType,
        action_ref_id: needsRef ? actionRefId : null,
        action_url: actionType === "custom_url" ? actionUrl.trim() : null,
        target_mode: "individual",
        target_criteria: { applicant_ids: [applicantId] },
      });
      showToast(`「${applicantName}」にタスクを送信しました`);
      reset();
      onOpenChange(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "タスクの作成に失敗しました", "error");
    }
  };

  return (
    <EditPanel
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title={`「${applicantName}」にタスクを送信`}
      onSave={handleSave}
      saving={saving}
      saveDisabled={!title.trim() || !actionValid}
      saveLabel="送信"
    >
      <div className="space-y-4">
        <FormInput
          label="タイトル"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="履歴書を提出してください"
        />
        <FormTextarea
          label="説明"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="タスクの詳細"
          rows={3}
        />
        <FormField label="期日">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="アクション種別">
            <Select
              value={actionType}
              onValueChange={(v) => {
                if (!v) return;
                setActionType(v as RecruiterTaskActionType);
                setActionRefId("");
                setActionUrl("");
              }}
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string) =>
                    ({
                      none: "遷移先なし",
                      form: "フォーム回答",
                      interview: "面接日程予約",
                      survey: "サーベイ回答",
                      announcement: "お知らせ",
                      custom_url: "URL直接指定",
                    })[v] ?? v
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">遷移先なし</SelectItem>
                <SelectItem value="form">フォーム回答</SelectItem>
                <SelectItem value="interview">面接日程予約</SelectItem>
                <SelectItem value="survey">サーベイ回答</SelectItem>
                <SelectItem value="announcement">お知らせ</SelectItem>
                <SelectItem value="custom_url">URL直接指定</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {actionType === "form" && (
            <FormField label="フォーム" required>
              <Select value={actionRefId} onValueChange={(v) => setActionRefId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="フォームを選択">
                    {(v: string) => forms.find((f) => f.id === v)?.title ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {forms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {actionType === "interview" && (
            <FormField label="面接" required>
              <Select value={actionRefId} onValueChange={(v) => setActionRefId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="面接を選択">
                    {(v: string) => interviews.find((i) => i.id === v)?.title ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {interviews.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {actionType === "survey" && (
            <FormField label="サーベイ" required>
              <Select value={actionRefId} onValueChange={(v) => setActionRefId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="サーベイを選択">
                    {(v: string) => applicantSurveys.find((s) => s.id === v)?.title ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {applicantSurveys.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {actionType === "custom_url" && (
            <FormInput
              label="URL"
              required
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="https://example.com/..."
            />
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          応募者アプリのタスク一覧に表示されます。通知も送信されます。
        </p>
      </div>
    </EditPanel>
  );
}
