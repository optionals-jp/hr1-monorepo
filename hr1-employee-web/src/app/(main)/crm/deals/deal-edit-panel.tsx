"use client";

import { Dispatch, SetStateAction } from "react";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { dealStatusLabels } from "@/lib/constants";
import { getStagesFromPipeline } from "@/lib/hooks/use-pipelines";
import type { ValidationErrors } from "@/lib/validation";
import type { BcDeal, BcCompany, BcContact, CrmPipeline } from "@/types/database";

interface DealEditPanelProps {
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  editData: Partial<BcDeal>;
  setEditData: Dispatch<SetStateAction<Partial<BcDeal>>>;
  errors: ValidationErrors | null;
  handleSave: (showToast: (msg: string, type?: "success" | "error") => void) => void;
  handleDelete: (showToast: (msg: string, type?: "success" | "error") => void) => void;
  saving: boolean;
  deleting: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
  companies: BcCompany[] | undefined;
  contacts: BcContact[] | undefined;
  pipelines: CrmPipeline[] | undefined;
  defaultPipeline: CrmPipeline | null;
}

export function DealEditPanel({
  editOpen,
  setEditOpen,
  editData,
  setEditData,
  errors,
  handleSave,
  handleDelete,
  saving,
  deleting,
  showToast,
  companies,
  contacts,
  pipelines,
  defaultPipeline,
}: DealEditPanelProps) {
  const editPipeline = pipelines?.find((p) => p.id === editData.pipeline_id) ?? defaultPipeline;
  const editStages = getStagesFromPipeline(editPipeline);

  return (
    <EditPanel
      open={editOpen}
      onOpenChange={setEditOpen}
      title={editData.id ? "商談編集" : "商談登録"}
      onSave={() => handleSave(showToast)}
      saving={saving}
      onDelete={editData.id ? () => handleDelete(showToast) : undefined}
      deleting={deleting}
      confirmDeleteMessage="この商談を削除しますか？関連する見積書・連絡先の紐付けも削除されます。"
    >
      <div className="space-y-4">
        <div>
          <Label>商談名 *</Label>
          <Input
            value={editData.title ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
            className={errors?.title ? "border-destructive" : ""}
          />
          {errors?.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
        </div>

        <div>
          <Label>企業</Label>
          <Select
            value={editData.company_id ?? ""}
            onValueChange={(v) => setEditData((p) => ({ ...p, company_id: v || null }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="企業を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">未選択</SelectItem>
              {(companies ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>連絡先</Label>
          <Select
            value={editData.contact_id ?? ""}
            onValueChange={(v) => setEditData((p) => ({ ...p, contact_id: v || null }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="連絡先を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">未選択</SelectItem>
              {(contacts ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.last_name} {c.first_name ?? ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(pipelines ?? []).length > 1 && (
          <div>
            <Label>パイプライン</Label>
            <Select
              value={editData.pipeline_id ?? defaultPipeline?.id ?? ""}
              onValueChange={(v) => {
                const selectedPipeline = pipelines?.find((p) => p.id === v);
                const newStages = getStagesFromPipeline(selectedPipeline ?? null);
                const firstStage = newStages[0];
                setEditData((p) => ({
                  ...p,
                  pipeline_id: v,
                  stage_id: firstStage?.id ?? p.stage_id,
                  stage: firstStage?.name ?? p.stage,
                  probability: firstStage?.probability_default ?? p.probability,
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(pipelines ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>ステージ</Label>
            <Select
              value={editData.stage_id ?? editData.stage ?? editStages[0]?.id ?? ""}
              onValueChange={(v) => {
                const selectedStage = editStages.find((s) => s.id === v);
                const newStage = selectedStage?.name ?? v;
                setEditData(
                  (p) =>
                    ({
                      ...p,
                      stage_id: v,
                      stage: newStage,
                      probability: selectedStage?.probability_default ?? p.probability,
                    }) as Partial<BcDeal>
                );
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {editStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>ステータス</Label>
            <Select
              value={editData.status ?? "open"}
              onValueChange={(v) =>
                setEditData((p) => ({
                  ...p,
                  status: v as "open" | "won" | "lost",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dealStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>確度（{editData.probability ?? 0}%）</Label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={editData.probability ?? 0}
            onChange={(e) => setEditData((p) => ({ ...p, probability: Number(e.target.value) }))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>金額</Label>
            <Input
              type="number"
              value={editData.amount ?? ""}
              onChange={(e) =>
                setEditData((p) => ({
                  ...p,
                  amount: e.target.value ? Number(e.target.value) : null,
                }))
              }
              placeholder="¥"
            />
          </div>

          <div>
            <Label>見込み日</Label>
            <Input
              type="date"
              value={editData.expected_close_date ?? ""}
              onChange={(e) => setEditData((p) => ({ ...p, expected_close_date: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label>説明</Label>
          <Textarea
            value={editData.description ?? ""}
            onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
            rows={3}
          />
        </div>
      </div>
    </EditPanel>
  );
}
