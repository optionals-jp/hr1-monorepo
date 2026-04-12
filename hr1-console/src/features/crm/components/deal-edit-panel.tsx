"use client";

import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import { EditPanel } from "@hr1/shared-ui/components/ui/edit-panel";

interface DealEditPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editStatus: string;
  setEditStatus: (v: string) => void;
  editAmount: string;
  setEditAmount: (v: string) => void;
  editStageId: string;
  setEditStageId: (v: string) => void;
  editProbability: string;
  setEditProbability: (v: string) => void;
  editCloseDate: string;
  setEditCloseDate: (v: string) => void;
  editAssignedTo: string;
  setEditAssignedTo: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  stages: { id: string; name: string }[];
  employees: { id: string; email: string; display_name: string | null }[];
}

export function DealEditPanel({
  open,
  onOpenChange,
  onSave,
  editTitle,
  setEditTitle,
  editStatus,
  setEditStatus,
  editAmount,
  setEditAmount,
  editStageId,
  setEditStageId,
  editProbability,
  setEditProbability,
  editCloseDate,
  setEditCloseDate,
  editAssignedTo,
  setEditAssignedTo,
  editDescription,
  setEditDescription,
  stages,
  employees,
}: DealEditPanelProps) {
  return (
    <EditPanel
      open={open}
      onOpenChange={onOpenChange}
      title="商談を編集"
      onSave={onSave}
      saveLabel="更新"
    >
      <div className="space-y-4">
        <div>
          <Label>商談名 *</Label>
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        </div>
        <div>
          <Label>ステータス</Label>
          <Select value={editStatus} onValueChange={(v) => setEditStatus(v ?? "")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">商談中</SelectItem>
              <SelectItem value="won">受注</SelectItem>
              <SelectItem value="lost">失注</SelectItem>
              <SelectItem value="cancelled">キャンセル</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>金額</Label>
          <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
        </div>
        <div>
          <Label>ステージ</Label>
          <Select value={editStageId} onValueChange={(v) => setEditStageId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="ステージを選択" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>確度 (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={editProbability}
            onChange={(e) => setEditProbability(e.target.value)}
          />
        </div>
        <div>
          <Label>予定クローズ日</Label>
          <Input
            type="date"
            value={editCloseDate}
            onChange={(e) => setEditCloseDate(e.target.value)}
          />
        </div>
        <div>
          <Label>担当</Label>
          <Select value={editAssignedTo} onValueChange={(v) => setEditAssignedTo(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="担当を選択" />
            </SelectTrigger>
            <SelectContent>
              {(employees ?? []).map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.display_name ?? emp.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>説明</Label>
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </EditPanel>
  );
}
