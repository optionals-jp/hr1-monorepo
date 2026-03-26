"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApplicationStep, CustomForm, Interview } from "@/types/database";
import { format } from "date-fns";

interface ResourceSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: ApplicationStep | null;
  forms: CustomForm[];
  interviews: Interview[];
  loading: boolean;
  onSelect: (resourceId: string) => void;
}

export function ResourceSelectDialog({
  open,
  onOpenChange,
  step,
  forms,
  interviews,
  loading,
  onSelect,
}: ResourceSelectDialogProps) {
  if (!step) return null;

  const isForm = step.step_type === "form";
  const title = isForm ? "フォームを選択" : "面接を選択";
  const description = isForm
    ? "このステップに紐付けるフォームを選択してください"
    : "このステップに紐付ける面接を選択してください";
  const items = isForm ? forms : interviews;
  const createHref = isForm ? "/forms/new" : "/scheduling";
  const createLabel = isForm ? "新しいフォームを作成" : "新しい面接を作成";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pt-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">読み込み中...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isForm ? "フォームがありません" : "面接がありません"}
            </p>
          ) : isForm ? (
            forms.map((form) => (
              <button
                key={form.id}
                type="button"
                onClick={() => onSelect(form.id)}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <p className="text-sm font-medium">{form.title}</p>
                {form.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{form.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  作成日: {format(new Date(form.created_at), "yyyy/MM/dd")}
                </p>
              </button>
            ))
          ) : (
            interviews.map((interview) => (
              <button
                key={interview.id}
                type="button"
                onClick={() => onSelect(interview.id)}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{interview.title}</p>
                  <Badge
                    variant={interview.status === "confirmed" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {interview.status === "scheduling"
                      ? "未確定"
                      : interview.status === "confirmed"
                        ? "確定済み"
                        : interview.status}
                  </Badge>
                </div>
                {interview.location && (
                  <p className="text-xs text-muted-foreground mt-1">{interview.location}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  作成日: {format(new Date(interview.created_at), "yyyy/MM/dd")}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="pt-2 border-t">
          <Link href={createHref}>
            <Button variant="outline" size="sm" className="w-full">
              {createLabel}
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
