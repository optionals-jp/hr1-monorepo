"use client";

import { useState, useCallback } from "react";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import { Avatar, AvatarFallback } from "@hr1/shared-ui/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@hr1/shared-ui/components/ui/select";
import { DialogPanel } from "@hr1/shared-ui/components/ui/dialog";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { activityTypeLabels } from "@/lib/constants";
import { useCreateActivity } from "@/lib/hooks/use-crm";
import { useAuth } from "@/lib/auth-context";
import { FileText, Plus, X, Zap } from "lucide-react";
import { ACTIVITY_ICONS } from "@/components/crm/activity-icons";

// --- テンプレート型と localStorage 管理 ---

interface ActivityTemplate {
  id: string;
  type: string;
  label: string;
  description: string;
}

const STORAGE_KEY = "crm-activity-templates";

function loadTemplates(): ActivityTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: ActivityTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

// --- デフォルトのクイックアクション ---

const DEFAULT_ACTIONS = [
  { type: "call", label: "電話" },
  { type: "email", label: "メール" },
  { type: "visit", label: "訪問" },
  { type: "appointment", label: "アポイント" },
  { type: "memo", label: "メモ" },
];

// --- コンポーネント ---

interface ActivityInputBarProps {
  dealId?: string;
  leadId?: string;
  companyId?: string;
  contactId?: string;
  onAdded: () => void;
}

export function ActivityInputBar({
  dealId,
  leadId,
  companyId,
  contactId,
  onAdded,
}: ActivityInputBarProps) {
  const { showToast } = useToast();
  const createActivity = useCreateActivity();
  const { user, profile } = useAuth();

  const [body, setBody] = useState("");
  const [activityType, setActivityType] = useState("call");
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<ActivityTemplate[]>(loadTemplates);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("memo");
  const [newDescription, setNewDescription] = useState("");

  const recordActivity = useCallback(
    async (type: string, title: string, description?: string | null) => {
      if (saving) return false;
      setSaving(true);
      const result = await createActivity({
        activity_type: type,
        title,
        description: description || null,
        deal_id: dealId ?? null,
        lead_id: leadId ?? null,
        company_id: companyId ?? null,
        contact_id: contactId ?? null,
        activity_date: new Date().toISOString(),
        created_by: user?.id ?? null,
      });
      setSaving(false);
      if (result.success) {
        onAdded();
        showToast(`${title}を記録しました`);
        return true;
      }
      showToast("活動の記録に失敗しました", "error");
      return false;
    },
    [saving, dealId, leadId, companyId, contactId, user, createActivity, onAdded, showToast]
  );

  const handleSubmit = useCallback(async () => {
    const title = body.trim() || activityTypeLabels[activityType] || activityType;
    const ok = await recordActivity(activityType, title);
    if (ok) setBody("");
  }, [body, activityType, recordActivity]);

  const openAddDialog = () => {
    setNewLabel("");
    setNewType("memo");
    setNewDescription("");
    setDialogOpen(true);
  };

  const handleAddTemplate = () => {
    const label = newLabel.trim();
    if (!label) return;
    const tpl: ActivityTemplate = {
      id: crypto.randomUUID(),
      type: newType,
      label,
      description: newDescription.trim(),
    };
    const updated = [...templates, tpl];
    setTemplates(updated);
    saveTemplates(updated);
    setDialogOpen(false);
    showToast("テンプレートを追加しました");
  };

  const handleRemoveTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const initial = (profile?.display_name ?? profile?.email ?? "U")[0].toUpperCase();

  return (
    <div className="pt-3 pb-1 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground shrink-0">クイック記録:</span>
        {DEFAULT_ACTIONS.map((action) => {
          const Icon = ACTIVITY_ICONS[action.type] ?? FileText;
          return (
            <button
              key={action.type}
              type="button"
              disabled={saving}
              onClick={() => recordActivity(action.type, action.label)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Icon className="size-3.5" />
              {action.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {templates.length > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">
            <Zap className="size-3 inline mr-0.5" />
            テンプレート:
          </span>
        )}
        {templates.map((t) => {
          const Icon = ACTIVITY_ICONS[t.type] ?? FileText;
          return (
            <span key={t.id} className="inline-flex items-center gap-0.5 group">
              <button
                type="button"
                disabled={saving}
                onClick={() => recordActivity(t.type, t.label, t.description)}
                title={t.description || undefined}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Icon className="size-3.5" />
                {t.label}
              </button>
              <button
                type="button"
                onClick={() => handleRemoveTemplate(t.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={openAddDialog}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
        >
          <Plus className="size-3.5" />
          テンプレート追加
        </button>
      </div>

      <div className="flex gap-3 items-start">
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 rounded-2xl border bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-colors">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="活動メモを入力..."
            rows={1}
            className="border-0 shadow-none focus-visible:ring-0 resize-none min-h-[38px] px-5 pt-3"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between px-5 pb-2">
            <Select value={activityType} onValueChange={(v) => v && setActivityType(v)}>
              <SelectTrigger className="w-auto gap-1.5 shadow-none h-8 px-2 text-xs text-muted-foreground hover:text-foreground rounded border border-input">
                <span>{activityTypeLabels[activityType] ?? activityType}</span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(activityTypeLabels).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>
                    {lbl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                ⌘ Enter
              </kbd>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={saving}
                className="h-8 text-xs"
              >
                {saving ? "記録中..." : "記録する"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DialogPanel
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="テンプレートを追加"
        description="よく使う活動をテンプレートとして保存し、ワンクリックで記録できます。"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="primary" onClick={handleAddTemplate} disabled={!newLabel.trim()}>
              追加
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>テンプレート名 *</Label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="例: 初回コンタクト、資料送付"
              className="mt-1"
            />
          </div>
          <div>
            <Label>活動タイプ</Label>
            <Select value={newType} onValueChange={(v) => v && setNewType(v)}>
              <SelectTrigger className="w-full mt-1">
                <span>{activityTypeLabels[newType] ?? newType}</span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(activityTypeLabels).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>
                    {lbl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>詳細コメント</Label>
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="テンプレート使用時に自動で記録される詳細メモ"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
      </DialogPanel>
    </div>
  );
}
