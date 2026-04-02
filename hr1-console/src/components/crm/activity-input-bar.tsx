"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { activityTypeLabels } from "@/lib/constants";
import { useCreateActivity } from "@/lib/hooks/use-crm";
import { useAuth } from "@/lib/auth-context";

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

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    const title = body.trim() || activityTypeLabels[activityType] || activityType;
    setSaving(true);
    const result = await createActivity({
      activity_type: activityType,
      title,
      description: null,
      deal_id: dealId ?? null,
      lead_id: leadId ?? null,
      company_id: companyId ?? null,
      contact_id: contactId ?? null,
      activity_date: new Date().toISOString(),
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (result.success) {
      setBody("");
      onAdded();
      showToast("活動を記録しました");
    } else {
      showToast("活動の記録に失敗しました", "error");
    }
  }, [
    saving,
    body,
    activityType,
    dealId,
    leadId,
    companyId,
    contactId,
    user,
    createActivity,
    onAdded,
    showToast,
  ]);

  const initial = (profile?.display_name ?? profile?.email ?? "U")[0].toUpperCase();

  return (
    <div className="sticky bottom-0 z-10 bg-white pt-3 pb-1">
      <div className="flex gap-3 items-start">
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 rounded-lg border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-colors">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="活動メモを入力..."
            rows={1}
            className="border-0 shadow-none focus-visible:ring-0 resize-none min-h-[38px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <Select value={activityType} onValueChange={(v) => v && setActivityType(v)}>
              <SelectTrigger className="w-auto gap-1.5 border-0 shadow-none h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(activityTypeLabels).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>
                    {lbl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSubmit} disabled={saving} className="h-7 text-xs">
              {saving ? "記録中..." : "記録する"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
