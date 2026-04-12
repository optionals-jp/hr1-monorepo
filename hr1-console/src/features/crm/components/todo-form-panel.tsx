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

interface TodoFormPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  todoTitle: string;
  setTodoTitle: (v: string) => void;
  todoDesc: string;
  setTodoDesc: (v: string) => void;
  todoDueDate: string;
  setTodoDueDate: (v: string) => void;
  todoAssignee: string;
  setTodoAssignee: (v: string) => void;
  employees: { id: string; email: string; display_name: string | null }[];
}

export function TodoFormPanel({
  open,
  onOpenChange,
  onSave,
  todoTitle,
  setTodoTitle,
  todoDesc,
  setTodoDesc,
  todoDueDate,
  setTodoDueDate,
  todoAssignee,
  setTodoAssignee,
  employees,
}: TodoFormPanelProps) {
  return (
    <EditPanel
      open={open}
      onOpenChange={onOpenChange}
      title="TODOを追加"
      onSave={onSave}
      saveLabel="追加"
      saveDisabled={!todoTitle.trim()}
    >
      <div className="space-y-4">
        <div>
          <Label>タイトル *</Label>
          <Input value={todoTitle} onChange={(e) => setTodoTitle(e.target.value)} />
        </div>
        <div>
          <Label>期限</Label>
          <Input type="date" value={todoDueDate} onChange={(e) => setTodoDueDate(e.target.value)} />
        </div>
        <div>
          <Label>担当</Label>
          <Select value={todoAssignee} onValueChange={(v) => setTodoAssignee(v ?? "")}>
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
          <Textarea value={todoDesc} onChange={(e) => setTodoDesc(e.target.value)} rows={3} />
        </div>
      </div>
    </EditPanel>
  );
}
