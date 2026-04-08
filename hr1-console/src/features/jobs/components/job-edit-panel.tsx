"use client";

import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { EditPanel, type EditPanelTab } from "@/components/ui/edit-panel";

const editTabs: EditPanelTab[] = [
  { value: "basic", label: "基本情報" },
  { value: "description", label: "説明" },
];

interface JobEditPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTab: string;
  setEditTab: (v: string) => void;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editDepartment: string;
  setEditDepartment: (v: string) => void;
  editLocation: string;
  setEditLocation: (v: string) => void;
  editEmploymentType: string;
  setEditEmploymentType: (v: string) => void;
  editSalaryRange: string;
  setEditSalaryRange: (v: string) => void;
  savingInfo: boolean;
  saveInfo: () => void;
}

export function JobEditPanel({
  open,
  onOpenChange,
  editTab,
  setEditTab,
  editTitle,
  setEditTitle,
  editDescription,
  setEditDescription,
  editDepartment,
  setEditDepartment,
  editLocation,
  setEditLocation,
  editEmploymentType,
  setEditEmploymentType,
  editSalaryRange,
  setEditSalaryRange,
  savingInfo,
  saveInfo,
}: JobEditPanelProps) {
  return (
    <EditPanel
      open={open}
      onOpenChange={onOpenChange}
      title="求人情報を編集"
      tabs={editTabs}
      activeTab={editTab}
      onTabChange={setEditTab}
      onSave={saveInfo}
      saving={savingInfo}
      saveDisabled={!editTitle}
    >
      {editTab === "basic" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タイトル *</Label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="バックエンドエンジニア"
            />
          </div>
          <div className="space-y-2">
            <Label>部署</Label>
            <Input
              value={editDepartment}
              onChange={(e) => setEditDepartment(e.target.value)}
              placeholder="エンジニアリング"
            />
          </div>
          <div className="space-y-2">
            <Label>勤務地</Label>
            <Input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder="東京"
            />
          </div>
          <div className="space-y-2">
            <Label>雇用形態</Label>
            <Input
              value={editEmploymentType}
              onChange={(e) => setEditEmploymentType(e.target.value)}
              placeholder="正社員"
            />
          </div>
          <div className="space-y-2">
            <Label>年収</Label>
            <Input
              value={editSalaryRange}
              onChange={(e) => setEditSalaryRange(e.target.value)}
              placeholder="500万〜800万"
            />
          </div>
        </div>
      )}
      {editTab === "description" && (
        <div className="space-y-2">
          <Label>説明</Label>
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="求人の説明"
            rows={8}
          />
        </div>
      )}
    </EditPanel>
  );
}
