"use client";

import { useState } from "react";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import { FormField, FormInput, FormTextarea } from "@hr1/shared-ui/components/ui/form-field";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { useCreateRecruiterTask } from "@/features/recruiting/hooks/use-recruiter-tasks";

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
  const [actionUrl, setActionUrl] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setActionUrl("");
  };

  const handleSave = async () => {
    try {
      await create({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        action_url: actionUrl.trim() || null,
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
      saveDisabled={!title.trim()}
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
        <div className="grid grid-cols-2 gap-3">
          <FormField label="期日">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FormField>
          <FormInput
            label="アクション URL"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="/forms/xxx"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          応募者アプリのタスク一覧に表示されます。通知も送信されます。
        </p>
      </div>
    </EditPanel>
  );
}
