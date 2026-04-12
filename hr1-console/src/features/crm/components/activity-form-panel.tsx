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
import { activityTypeLabels } from "@/lib/constants/crm";

interface ActivityFormPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  actType: string;
  setActType: (v: string) => void;
  actTitle: string;
  setActTitle: (v: string) => void;
  actDesc: string;
  setActDesc: (v: string) => void;
  actDate: string;
  setActDate: (v: string) => void;
}

export function ActivityFormPanel({
  open,
  onOpenChange,
  onSave,
  actType,
  setActType,
  actTitle,
  setActTitle,
  actDesc,
  setActDesc,
  actDate,
  setActDate,
}: ActivityFormPanelProps) {
  return (
    <EditPanel
      open={open}
      onOpenChange={onOpenChange}
      title="活動を記録"
      onSave={onSave}
      saveLabel="記録"
      saveDisabled={!actTitle.trim()}
    >
      <div className="space-y-4">
        <div>
          <Label>種別</Label>
          <Select value={actType} onValueChange={(v) => setActType(v ?? "memo")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(activityTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>タイトル *</Label>
          <Input value={actTitle} onChange={(e) => setActTitle(e.target.value)} />
        </div>
        <div>
          <Label>日付</Label>
          <Input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} />
        </div>
        <div>
          <Label>説明</Label>
          <Textarea value={actDesc} onChange={(e) => setActDesc(e.target.value)} rows={3} />
        </div>
      </div>
    </EditPanel>
  );
}
