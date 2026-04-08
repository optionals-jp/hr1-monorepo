"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@hr1/shared-ui/components/ui/card";
import { Badge } from "@hr1/shared-ui/components/ui/badge";
import { Button } from "@hr1/shared-ui/components/ui/button";
import { Input } from "@hr1/shared-ui/components/ui/input";
import { Label } from "@hr1/shared-ui/components/ui/label";
import { Textarea } from "@hr1/shared-ui/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@hr1/shared-ui/components/ui/dialog";
import { PageHeader, PageContent } from "@hr1/shared-ui/components/layout/page-header";
import { getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { QueryErrorBanner } from "@hr1/shared-ui/components/ui/query-error-banner";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, AlertCircle } from "lucide-react";
import type { Plan } from "@/types/database";

export default function PlansPage() {
  const {
    data: plans,
    error,
    mutate,
  } = useQuery<Plan[]>("admin-plans", async () => {
    const { data } = await getSupabase()
      .from("plans")
      .select("*")
      .order("price_monthly", { ascending: true });
    return (data as Plan[]) ?? [];
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: "",
    price_monthly: "",
    max_employees: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setForm({
      name: "",
      price_monthly: "",
      max_employees: "",
      description: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setFormError(null);
    setForm({
      name: plan.name,
      price_monthly: String(plan.price_monthly),
      max_employees: plan.max_employees ? String(plan.max_employees) : "",
      description: plan.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name,
        price_monthly: parseInt(form.price_monthly, 10),
        max_employees: form.max_employees
          ? parseInt(form.max_employees, 10)
          : null,
        description: form.description || null,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error: updateError } = await getSupabase()
          .from("plans")
          .update(payload)
          .eq("id", editing.id);
        if (updateError) {
          setFormError("プランの更新に失敗しました。");
          return;
        }
      } else {
        const { error: insertError } = await getSupabase()
          .from("plans")
          .insert(payload);
        if (insertError) {
          setFormError("プランの作成に失敗しました。");
          return;
        }
      }
      setDialogOpen(false);
      mutate();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan: Plan) => {
    setToggleError(null);
    const { error: updateError } = await getSupabase()
      .from("plans")
      .update({
        is_active: !plan.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan.id);
    if (updateError) {
      setToggleError("プランの状態変更に失敗しました。");
      return;
    }
    mutate();
  };

  return (
    <>
      <PageHeader
        title="プラン管理"
        description="契約プランの作成・編集"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            新規プラン
          </Button>
        }
      />
      <PageContent>
        <QueryErrorBanner error={error} onRetry={() => mutate()} />
        {toggleError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{toggleError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(plans ?? []).map((plan) => (
            <Card
              key={plan.id}
              className={!plan.is_active ? "opacity-60" : undefined}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {!plan.is_active && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      無効
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => openEdit(plan)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">
                  ¥{formatCurrency(plan.price_monthly)}
                  <span className="text-sm font-normal text-muted-foreground">
                    /月
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  最大社員数:{" "}
                  {plan.max_employees
                    ? `${plan.max_employees.toLocaleString()}名`
                    : "無制限"}
                </div>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => toggleActive(plan)}
                >
                  {plan.is_active ? "無効にする" : "有効にする"}
                </Button>
              </CardContent>
            </Card>
          ))}

          {plans && plans.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
              プランがありません。新規プランを作成してください。
            </div>
          )}
        </div>
      </PageContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "プラン編集" : "新規プラン作成"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>プラン名</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="スタンダード"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>月額料金（円）</Label>
                <Input
                  type="number"
                  value={form.price_monthly}
                  onChange={(e) =>
                    setForm({ ...form, price_monthly: e.target.value })
                  }
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>最大社員数</Label>
                <Input
                  type="number"
                  value={form.max_employees}
                  onChange={(e) =>
                    setForm({ ...form, max_employees: e.target.value })
                  }
                  placeholder="空欄で無制限"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>説明</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="プランの説明..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.name || !form.price_monthly}
              >
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
